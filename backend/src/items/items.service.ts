import { Injectable } from '@nestjs/common';
import { Item, Prisma } from '../../generated/prisma/client';
import { Permission, can } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import { AppException } from '../common/errors';
import { toApiEnum, toDbEnum } from '../lib/enums';
import { fromDateOnly, toDateOnly, toIso } from '../lib/time';
import { Actor } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto, QueryItemsDto } from './dto/item-input.dto';
import { DeletedView, ItemStatusValue, ItemView, MatchView } from './dto/item-view.dto';
import { ImagesService } from './images.service';
import { findMatches } from './matching';

// คำขอที่ยังดำเนินการอยู่ (ใช้นับว่ามีคนยื่นเรื่องกับรายการนี้แล้ว)
export const ACTIVE_CLAIM_STATUSES = ['PENDING', 'APPROVED', 'AT_OFFICE'] as const;

const withActiveClaims = {
  _count: { select: { claims: { where: { status: { in: [...ACTIVE_CLAIM_STATUSES] } } } } },
} satisfies Prisma.ItemInclude;

export type ItemRow = Item & { _count?: { claims: number } };

export const NOT_FOUND_ITEM = 'ไม่พบรายการ';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {}

  // คำตอบลับเห็นได้เฉพาะเจ้าของโพสต์และเจ้าหน้าที่
  toView(r: ItemRow, actor?: Actor): ItemView {
    const canSeeSecret =
      !!actor && (actor.memberId === r.reporterId || can(actor.subsystemRole, Permission.ITEM_UPDATE_ANY));
    return {
      id: r.id,
      code: r.code,
      reportType: toApiEnum(r.reportType),
      name: r.name,
      description: r.description,
      category: r.category,
      location: r.location,
      faculty: r.faculty,
      building: r.building,
      room: r.room,
      dateLost: toDateOnly(r.incidentDate),
      timeLost: r.incidentTime,
      status: toApiEnum(r.status),
      urgency: toApiEnum(r.urgency),
      imageUrl: r.imageUrls[0] ?? '',
      thumbnails: r.imageUrls,
      ...(r.pinLat != null && r.pinLng != null ? { pinX: r.pinLat, pinY: r.pinLng } : {}),
      ...(r.secretQuestion ? { secretQuestion: r.secretQuestion } : {}),
      ...(r.secretAnswer && canSeeSecret ? { secretAnswer: r.secretAnswer } : {}),
      reporterId: r.reporterId,
      reporterName: r.reporterName,
      reporterStudentId: r.reporterStudentCode ?? '',
      reporterPhone: r.reporterPhone,
      reporterContact: r.reporterContact,
      createdAt: toIso(r.createdAt),
      activeClaims: r._count?.claims ?? 0,
    };
  }

  /** ข้อมูลดิบ (รวมคำตอบลับ) สำหรับใช้ภายในเซิร์ฟเวอร์เท่านั้น */
  async findRowOrThrow(id: string, db: Prisma.TransactionClient = this.prisma): Promise<ItemRow> {
    const row = await db.item.findUnique({ where: { id }, include: withActiveClaims });
    if (!row) throw AppException.notFound(NOT_FOUND_ITEM);
    return row;
  }

  async list(actor: Actor, query: QueryItemsDto): Promise<CollectionResult<ItemView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
    const where: Prisma.ItemWhereInput = {
      ...(query.status ? { status: toDbEnum(query.status) } : {}),
      ...(query.type ? { reportType: toDbEnum(query.type) } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.mine === 'true' ? { reporterId: actor.memberId } : {}),
      // ค้นหาคำเดียวในหลายคอลัมน์ ไม่สนตัวพิมพ์เล็ก/ใหญ่
      ...(query.q
        ? {
            OR: [
              { name: contains(query.q) },
              { code: contains(query.q) },
              { location: contains(query.q) },
              { description: contains(query.q) },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.item.count({ where }),
      this.prisma.item.findMany({
        where,
        include: withActiveClaims,
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

  async get(actor: Actor, id: string): Promise<ItemView> {
    return this.toView(await this.findRowOrThrow(id), actor);
  }

  /** รายการฝั่งตรงข้ามที่อาจเป็นชิ้นเดียวกัน */
  async matches(actor: Actor, id: string): Promise<CollectionResult<MatchView>> {
    const item = await this.get(actor, id);
    const matches = item.status === 'returned' ? [] : findMatches(item, await this.allForMatching());
    return new CollectionResult(matches, buildPaginationMeta(matches.length, 1, Math.max(matches.length, 1)));
  }

  private async allForMatching(): Promise<ItemView[]> {
    return (await this.prisma.item.findMany({ where: { status: { not: 'RETURNED' } } })).map((r) => this.toView(r));
  }

  async create(actor: Actor, dto: CreateItemDto): Promise<ItemView> {
    const urls = (dto.images ?? []).map((image) => this.images.save(image));
    const isFound = dto.reportType === 'found';
    try {
      // มีคนแจ้งพร้อมกันอาจได้รหัสเดียวกัน -> ลองรหัสถัดไปใหม่ (unique เดียวนอกจาก id คือ code)
      for (let attempt = 0; ; attempt++) {
        try {
          const created = await this.prisma.item.create({
            data: {
              code: await this.nextItemCode(),
              reportType: toDbEnum(dto.reportType),
              name: dto.name,
              description: dto.description,
              category: dto.category,
              location: dto.location,
              faculty: dto.faculty ?? '',
              building: dto.building ?? '',
              room: dto.room,
              incidentDate: fromDateOnly(dto.dateLost),
              incidentTime: dto.timeLost,
              status: isFound ? 'FOUND' : 'SEARCHING',
              urgency: toDbEnum(dto.urgency ?? 'normal'),
              imageUrls: urls,
              pinLat: dto.pinX ?? null,
              pinLng: dto.pinY ?? null,
              secretQuestion: isFound ? dto.secretQuestion || null : null,
              secretAnswer: isFound ? dto.secretAnswer || null : null,
              reporterId: actor.memberId,
              reporterName: dto.reporterName,
              reporterStudentCode: dto.reporterStudentId || null,
              reporterPhone: dto.reporterPhone,
              reporterContact: dto.reporterContact,
            },
            include: withActiveClaims,
          });
          return this.toView(created, actor);
        } catch (error) {
          const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
          if (!duplicate || attempt >= 4) throw error;
        }
      }
    } catch (error) {
      this.images.remove(urls); // บันทึกไม่สำเร็จ -> ไม่ทิ้งไฟล์รูปค้างไว้
      throw error;
    }
  }

  // รหัสรายการแบบ LF-2026-00001 เรียงตามปี
  private async nextItemCode(): Promise<string> {
    const prefix = `LF-${new Date().getFullYear()}-`;
    const last = await this.prisma.item.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const next = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  private assertOwnerOrStaff(actor: Actor, row: ItemRow, anyPermission: Permission): void {
    if (row.reporterId !== actor.memberId && !can(actor.subsystemRole, anyPermission)) {
      throw AppException.forbidden('แก้ไขได้เฉพาะรายการที่คุณแจ้งเอง');
    }
  }

  // เจ้าของโพสต์หรือเจ้าหน้าที่เปลี่ยนสถานะได้ (เช่น เจ้าของได้ของคืนเองแล้วปิดรายการ)
  async updateStatus(actor: Actor, id: string, status: ItemStatusValue): Promise<ItemView> {
    const row = await this.findRowOrThrow(id);
    this.assertOwnerOrStaff(actor, row, Permission.ITEM_UPDATE_ANY);
    // มีคำขอที่อนุมัติแล้ว -> ต้องปิดผ่านการยืนยันสองฝ่ายหรือเจ้าหน้าที่ ไม่ให้เจ้าของโพสต์ปิดเองฝ่ายเดียว
    if (status === 'returned' && !can(actor.subsystemRole, Permission.ITEM_UPDATE_ANY)) {
      const open = await this.prisma.claim.findFirst({
        where: { itemId: id, status: { in: ['APPROVED', 'AT_OFFICE'] } },
        select: { id: true },
      });
      if (open) throw AppException.conflict('รายการนี้มีการนัดส่งมอบอยู่ กรุณายืนยันการส่งมอบทั้งสองฝ่ายแทน');
    }
    await this.prisma.item.update({ where: { id }, data: { status: toDbEnum(status) } });
    return this.get(actor, id);
  }

  // คำขอที่เกี่ยวข้องและจำนวนครั้งที่ตอบผิดถูกลบตาม (ON DELETE CASCADE)
  async remove(actor: Actor, id: string): Promise<DeletedView> {
    const row = await this.findRowOrThrow(id);
    this.assertOwnerOrStaff(actor, row, Permission.ITEM_DELETE_ANY);
    await this.prisma.item.delete({ where: { id } });
    this.images.remove(row.imageUrls);
    return { id, deleted: true };
  }

  async setStatus(db: Prisma.TransactionClient, id: string, status: ItemStatusValue): Promise<void> {
    await db.item.update({ where: { id }, data: { status: toDbEnum(status) } });
  }

  /** ตัวเลขสรุปของรายการ แยกตามสถานะ */
  async statusCounts() {
    const byStatus = await this.prisma.item.groupBy({ by: ['status'], _count: { _all: true } });
    const count = (s: Item['status']) => byStatus.find((g) => g.status === s)?._count._all ?? 0;
    return {
      totalItems: byStatus.reduce((sum, g) => sum + g._count._all, 0),
      searching: count('SEARCHING'),
      found: count('FOUND'),
      returned: count('RETURNED'),
    };
  }
}
