import { randomInt, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Claim, Prisma } from '../../generated/prisma/client';
import { Permission, can } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import { AppException } from '../common/errors';
import { ACTIVE_CLAIM_STATUSES, ItemsService } from '../items/items.service';
import { toApiEnum, toDbEnum } from '../lib/enums';
import { fromLocalDateTime, toIso, toIsoOrUndefined, toLocalDateTime } from '../lib/time';
import { Actor } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimView, CreateClaimDto, QueryClaimsDto } from './dto/claim.dto';

// join จากตาราง items
const withItem = { item: { select: { name: true, code: true, reporterId: true } } } satisfies Prisma.ClaimInclude;
type ClaimRow = Claim & { item: { name: string; code: string; reporterId: string } };

const DUPLICATE_ACTIVE_CLAIM = 'คุณมีคำขอของรายการนี้ที่รอดำเนินการอยู่แล้ว';
const NOT_FOUND_CLAIM = 'ไม่พบคำขอ';
const newCode = () => String(randomInt(100000, 1000000));

// เทียบคำตอบลับแบบหลวม: ไม่สนตัวพิมพ์/ช่องว่าง และยอมรับถ้าข้อความหนึ่งอยู่ในอีกข้อความ
export function isSecretAnswerMatch(given: string, expected: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const a = norm(given);
  const b = norm(expected);
  if (!a || !b) return false;
  return a === b || (a.length >= 2 && b.includes(a)) || (b.length >= 2 && a.includes(b));
}

// ใครเป็นผู้ส่ง/ผู้รับของ:
// - ขอรับคืน (FOUND): ผู้ส่ง = คนที่เก็บของได้ (เจ้าของโพสต์), ผู้รับ = ผู้ยื่นคำขอ
// - แจ้งส่งคืน (LOST): ผู้ส่ง = ผู้พบที่ยื่นคำขอ, ผู้รับ = เจ้าของที่โพสต์ตามหา
export function handoverRoleOf(r: ClaimRow, memberId: string): 'giver' | 'receiver' | null {
  const giverId = r.claimType === 'FOUND' ? r.item.reporterId : r.claimantId;
  const receiverId = r.claimType === 'FOUND' ? r.claimantId : r.item.reporterId;
  if (memberId === giverId) return 'giver';
  if (memberId === receiverId) return 'receiver';
  return null;
}

@Injectable()
export class ClaimsService {
  private readonly maxSecretAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsService,
    config: ConfigService,
  ) {
    this.maxSecretAttempts = config.get<number>('maxSecretAttempts', 3);
  }

  // รหัส 6 หลักเป็นความลับ: handoverCode เห็นเฉพาะผู้ยื่นคำขอ, pickupCode เห็นเฉพาะเจ้าของโพสต์ (เจ้าหน้าที่เห็นทั้งหมด)
  toView(r: ClaimRow, actor: Actor): ClaimView {
    const isStaff = can(actor.subsystemRole, Permission.CLAIM_READ_ANY);
    const isClaimant = actor.memberId === r.claimantId;
    const isItemOwner = actor.memberId === r.item.reporterId;
    return {
      requestId: r.id,
      requestCode: r.code,
      itemId: r.itemId,
      itemName: r.item.name,
      itemCode: r.item.code,
      claimType: toApiEnum(r.claimType),
      claimantId: r.claimantId,
      claimerName: r.claimantName,
      studentId: r.claimantStudentCode ?? '',
      department: r.claimantAffiliation,
      claimDateTime: toLocalDateTime(r.meetAt),
      claimLocation: r.meetLocation,
      contact: r.contact,
      note: r.note,
      requestDate: toIso(r.createdAt),
      status: toApiEnum(r.status),
      ...(isStaff && r.secretAnswerGiven != null ? { secretAnswerGiven: r.secretAnswerGiven } : {}),
      ...((isStaff || isClaimant) && r.handoverCode ? { handoverCode: r.handoverCode } : {}),
      ...((isStaff || isItemOwner) && r.pickupCode ? { pickupCode: r.pickupCode } : {}),
      approvedAt: toIsoOrUndefined(r.approvedAt),
      droppedOffAt: toIsoOrUndefined(r.droppedOffAt),
      handedOverAt: toIsoOrUndefined(r.handedOverAt),
      ...(r.handedOverBy ? { handedOverBy: r.handedOverBy } : {}),
      giverConfirmedAt: toIsoOrUndefined(r.giverConfirmedAt),
      receiverConfirmedAt: toIsoOrUndefined(r.receiverConfirmedAt),
      ...(r.linkedItemId ? { linkedItemId: r.linkedItemId } : {}),
    };
  }

  private async findRowOrThrow(id: string, db: Prisma.TransactionClient = this.prisma): Promise<ClaimRow> {
    const row = await db.claim.findUnique({ where: { id }, include: withItem });
    if (!row) throw AppException.notFound(NOT_FOUND_CLAIM);
    return row;
  }

  /** เจ้าหน้าที่เห็นทั้งหมด · ผู้ใช้ทั่วไปเห็นคำขอที่ตัวเองยื่น + คำขอที่คนอื่นยื่นกับรายการของตัวเอง */
  async list(actor: Actor, query: QueryClaimsDto): Promise<CollectionResult<ClaimView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const all = query.scope !== 'mine' && can(actor.subsystemRole, Permission.CLAIM_READ_ANY);
    if (query.scope === 'all' && !all) throw AppException.forbidden('ดูคำขอทั้งหมดได้เฉพาะเจ้าหน้าที่');

    const where: Prisma.ClaimWhereInput = all
      ? {}
      : { OR: [{ claimantId: actor.memberId }, { item: { reporterId: actor.memberId } }] };
    const [total, rows] = await Promise.all([
      this.prisma.claim.count({ where }),
      this.prisma.claim.findMany({
        where,
        include: withItem,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return new CollectionResult(
      rows.map((r) => this.toView(r, actor)),
      buildPaginationMeta(total, page, limit),
    );
  }

  async create(actor: Actor, dto: CreateClaimDto): Promise<ClaimView> {
    const item = await this.items.findRowOrThrow(dto.itemId);
    if (item.status === 'RETURNED') throw AppException.conflict('รายการนี้ส่งคืนเจ้าของไปแล้ว');
    if (item.reporterId === actor.memberId) throw AppException.conflict('ไม่สามารถยื่นคำขอกับรายการที่คุณแจ้งเองได้');

    const active = await this.prisma.claim.findFirst({
      where: { itemId: item.id, claimantId: actor.memberId, status: { in: [...ACTIVE_CLAIM_STATUSES] } },
      select: { id: true },
    });
    if (active) throw AppException.conflict(DUPLICATE_ACTIVE_CLAIM);

    // ตรวจคำถามยืนยันความเป็นเจ้าของที่ฝั่งเซิร์ฟเวอร์ (คำตอบจริงไม่เคยถูกส่งไปหน้าเว็บ)
    if (item.reportType === 'FOUND' && item.secretQuestion && item.secretAnswer) {
      if ((await this.secretAttempts(item.id, actor.memberId)) >= this.maxSecretAttempts) {
        throw AppException.forbidden(
          `ตอบคำถามยืนยันผิดครบ ${this.maxSecretAttempts} ครั้งแล้ว ไม่สามารถยื่นคำขอรายการนี้ได้ กรุณาติดต่อเจ้าหน้าที่`,
        );
      }
      if (!dto.secretAnswer || !isSecretAnswerMatch(dto.secretAnswer, item.secretAnswer)) {
        const left = this.maxSecretAttempts - (await this.addSecretAttempt(item.id, actor.memberId));
        throw AppException.forbidden(
          left > 0
            ? `คำตอบไม่ตรงกับข้อมูลของผู้พบ (เหลือโอกาสอีก ${left} ครั้ง)`
            : `ตอบผิดครบ ${this.maxSecretAttempts} ครั้งแล้ว ระบบล็อกการยื่นคำขอรายการนี้`,
        );
      }
    }

    // โพสต์ที่ผูกไว้ต้องเป็นของผู้ยื่นเอง เป็นประเภทตรงข้าม และยังไม่ปิด
    if (dto.linkedItemId) {
      const linked = await this.prisma.item.findUnique({ where: { id: dto.linkedItemId } });
      if (
        !linked ||
        linked.reporterId !== actor.memberId ||
        linked.reportType === item.reportType ||
        linked.status === 'RETURNED'
      ) {
        throw AppException.badRequest('รายการที่เลือกผูกไว้ไม่ถูกต้อง', [
          'linkedItemId: เลือกได้เฉพาะรายการของคุณที่ยังไม่ปิด',
        ]);
      }
    }

    try {
      const created = await this.prisma.claim.create({
        data: {
          code: `REQ-${randomUUID().slice(0, 8).toUpperCase()}`,
          itemId: item.id,
          claimantId: actor.memberId,
          linkedItemId: dto.linkedItemId ?? null,
          claimType: item.reportType,
          claimantName: `${dto.firstName} ${dto.lastName}`,
          claimantStudentCode: dto.studentId || null,
          claimantAffiliation: dto.department,
          meetAt: fromLocalDateTime(dto.meetDate, dto.meetTime),
          meetLocation: dto.meetLocation,
          contact: dto.contact,
          note: dto.note ?? '',
          secretAnswerGiven: dto.secretAnswer ?? null,
          status: 'PENDING',
        },
        include: withItem,
      });
      return this.toView(created, actor);
    } catch (error) {
      // กดส่งซ้ำพร้อมกันจนผ่านการเช็กด้านบนทั้งคู่ -> claims_active_claimant_key กันไว้อีกชั้น
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppException.conflict(DUPLICATE_ACTIVE_CLAIM);
      }
      throw error;
    }
  }

  // ทำงานกับคำขอหนึ่งรายการแบบล็อกแถวไว้ใน transaction — กันสองคนกดพร้อมกันแล้วเขียนทับกัน
  private async withLockedClaim(
    actor: Actor,
    id: string,
    fn: (tx: Prisma.TransactionClient, claim: ClaimRow) => Promise<void>,
  ): Promise<ClaimView> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM claims WHERE id = ${id}::uuid FOR UPDATE`;
      await fn(tx, await this.findRowOrThrow(id, tx));
    });
    return this.toView(await this.findRowOrThrow(id), actor);
  }

  // คืนของสำเร็จ: ปิดรายการที่ยื่นขอ และรายการที่ผู้ยื่นผูกไว้ให้หายจากหน้ารายการพร้อมกัน
  private async closeItems(tx: Prisma.TransactionClient, c: ClaimRow): Promise<void> {
    await this.items.setStatus(tx, c.itemId, 'returned');
    if (c.linkedItemId) await this.items.setStatus(tx, c.linkedItemId, 'returned');
  }

  /** อนุมัติ = ออกรหัส 6 หลักให้ผู้ยื่นคำขอ */
  approve(actor: Actor, id: string): Promise<ClaimView> {
    return this.withLockedClaim(actor, id, async (tx, c) => {
      if (c.status !== 'PENDING') throw AppException.conflict('คำขอนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ');
      await tx.claim.update({
        where: { id },
        data: { status: 'APPROVED', handoverCode: newCode(), approvedAt: new Date() },
      });
    });
  }

  reject(actor: Actor, id: string): Promise<ClaimView> {
    return this.withLockedClaim(actor, id, async (tx, c) => {
      if (c.status !== 'PENDING') throw AppException.conflict('คำขอนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ');
      await tx.claim.update({ where: { id }, data: { status: 'REJECTED' } });
    });
  }

  /** ส่งมอบกันเอง: ผู้ส่งและผู้รับต่างกดยืนยัน ครบสองฝ่ายแล้วปิดคำขออัตโนมัติ */
  confirm(actor: Actor, id: string): Promise<ClaimView> {
    return this.withLockedClaim(actor, id, async (tx, c) => {
      const role = handoverRoleOf(c, actor.memberId);
      if (!role) throw AppException.forbidden('เฉพาะผู้ส่งและผู้รับของในคำขอนี้เท่านั้นที่ยืนยันได้');
      if (c.status !== 'APPROVED') throw AppException.conflict('คำขอนี้ยังไม่ได้รับอนุมัติ หรือปิดไปแล้ว');

      const at = new Date();
      const giverConfirmedAt = c.giverConfirmedAt ?? (role === 'giver' ? at : null);
      const receiverConfirmedAt = c.receiverConfirmedAt ?? (role === 'receiver' ? at : null);
      const done = !!giverConfirmedAt && !!receiverConfirmedAt;
      await tx.claim.update({
        where: { id },
        data: {
          giverConfirmedAt,
          receiverConfirmedAt,
          ...(done ? { status: 'COMPLETED', handedOverAt: at, handedOverBy: 'ยืนยันโดยผู้ส่งและผู้รับ' } : {}),
        },
      });
      if (done) await this.closeItems(tx, c);
    });
  }

  /**
   * เจ้าหน้าที่ยืนยันรหัส 6 หลักตอนพบกันจริง (กรณีส่งผ่านเจ้าหน้าที่)
   * - ขอรับคืน: APPROVED + handoverCode -> COMPLETED
   * - แจ้งส่งคืน ขั้นที่ 1: APPROVED + handoverCode ของผู้พบ -> AT_OFFICE (ออก pickupCode ให้เจ้าของ)
   * - แจ้งส่งคืน ขั้นที่ 2: AT_OFFICE + pickupCode ของเจ้าของ -> COMPLETED
   */
  verify(actor: Actor, id: string, code: string): Promise<ClaimView> {
    return this.withLockedClaim(actor, id, async (tx, c) => {
      const expected = c.status === 'AT_OFFICE' ? c.pickupCode : c.status === 'APPROVED' ? c.handoverCode : null;
      if (!expected) throw AppException.conflict('คำขอนี้ยังไม่พร้อมส่งมอบ');
      if (code !== expected) throw AppException.badRequest('รหัสไม่ถูกต้อง', ['code: รหัสไม่ถูกต้อง']);

      if (c.claimType === 'LOST' && c.status === 'APPROVED') {
        await tx.claim.update({
          where: { id },
          data: { status: 'AT_OFFICE', droppedOffAt: new Date(), pickupCode: newCode() },
        });
        await this.items.setStatus(tx, c.itemId, 'found');
      } else {
        await tx.claim.update({
          where: { id },
          data: { status: 'COMPLETED', handedOverAt: new Date(), handedOverBy: actor.displayName },
        });
        await this.closeItems(tx, c);
      }
    });
  }

  countPending(): Promise<number> {
    return this.prisma.claim.count({ where: { status: toDbEnum('pending') } });
  }

  // ---------- จำนวนครั้งที่ตอบคำถามลับผิด ----------
  private async secretAttempts(itemId: string, memberId: string): Promise<number> {
    const row = await this.prisma.secretAttempt.findUnique({ where: { itemId_memberId: { itemId, memberId } } });
    return row?.attemptCount ?? 0;
  }

  // เพิ่มและคืนค่าในคำสั่งเดียว (กันการกดพร้อมกันหลายครั้งแล้วนับพลาด)
  private async addSecretAttempt(itemId: string, memberId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ attempt_count: number }[]>`
      INSERT INTO secret_attempts (id, item_id, member_id, attempt_count, created_at, updated_at)
      VALUES (${randomUUID()}::uuid, ${itemId}::uuid, ${memberId}::uuid, 1, now(), now())
      ON CONFLICT (item_id, member_id)
      DO UPDATE SET attempt_count = secret_attempts.attempt_count + 1, updated_at = now()
      RETURNING attempt_count`;
    return row.attempt_count;
  }
}
