import { Injectable } from '@nestjs/common';
import type { CoreRole, Member, MemberRole } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import { CollectionResult } from '../common/api-response';
import { CoreHubIdentity, SubsystemRole } from '../auth/core-hub-identity';
import { Permission, can } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { toIso } from '../lib/time';
import { MemberView } from './member-view.dto';

/** ผู้เรียก API ในมุมของโค้ดธุรกิจ: แถวใน members + subsystem role จาก token */
export interface Actor {
  memberId: string;
  displayName: string;
  subsystemRole: SubsystemRole;
}

const CORE_ROLES: Record<string, CoreRole> = {
  student: 'STUDENT',
  alumni: 'ALUMNI',
  staff: 'STAFF',
  admin: 'ADMIN',
};

// members.role เป็นสำเนาของสิทธิ์ที่แมปจาก core role (ไว้แสดงในหน้าจัดการผู้ใช้) — ไม่ได้ใช้ตัดสินสิทธิ์
const memberRoleOf = (role: SubsystemRole): MemberRole =>
  can(role, Permission.CLAIM_REVIEW) ? 'ADMIN' : 'USER';

export const toMemberView = (m: Member): MemberView => ({
  id: m.id,
  studentId: m.studentCode ?? '',
  fullName: m.displayName,
  email: m.email ?? '',
  phone: m.phone ?? '',
  role: m.role === 'ADMIN' ? 'admin' : 'user',
  createdAt: toIso(m.createdAt),
});

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ผู้ใช้ Core Hub ที่ผ่านการตรวจ token แล้ว -> แถวใน members (สร้างให้อัตโนมัติครั้งแรก)
   * ตัวตนมาจาก claim ที่ verify แล้วเท่านั้น (`sub` -> core_user_id) ไม่เชื่อ body/header ใด ๆ
   */
  async resolve(user: CoreHubIdentity): Promise<Member> {
    const synced = {
      email: user.email || null,
      coreRole: CORE_ROLES[user.coreRole] ?? null,
      role: memberRoleOf(user.subsystemRole),
    };

    const existing = await this.prisma.member.findUnique({ where: { coreUserId: user.id } });
    if (existing) {
      const changed =
        existing.email !== synced.email || existing.coreRole !== synced.coreRole || existing.role !== synced.role;
      return changed ? this.prisma.member.update({ where: { id: existing.id }, data: synced }) : existing;
    }

    try {
      return await this.prisma.member.create({
        // Core Hub v1.0 ยังไม่ส่งชื่อ จึงใช้อีเมลเป็นชื่อที่แสดงไปก่อน
        data: { coreUserId: user.id, displayName: user.email || user.id, ...synced },
      });
    } catch (error) {
      // request แรกของผู้ใช้คนเดียวกันเข้ามาพร้อมกัน -> อีกอันสร้างไปแล้ว
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.member.findUniqueOrThrow({ where: { coreUserId: user.id } });
      }
      throw error;
    }
  }

  async actorFor(user: CoreHubIdentity): Promise<Actor> {
    const member = await this.resolve(user);
    return { memberId: member.id, displayName: member.displayName, subsystemRole: user.subsystemRole };
  }

  async list(page: number, limit: number): Promise<CollectionResult<MemberView>> {
    const [total, rows] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.findMany({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return new CollectionResult(rows.map(toMemberView), buildPaginationMeta(total, page, limit));
  }

  count(): Promise<number> {
    return this.prisma.member.count();
  }
}
