import { SubsystemRole } from './core-hub-identity';

/**
 * Lost & Found permissions (authorization.md ข้อ 4).
 *
 *   Core JWT -> Core Role -> Subsystem Role -> Permission -> Business Operation
 *
 * โค้ดธุรกิจขอ permission เสมอ ไม่ถาม `role === 'admin'`
 * `:own` = ผ่าน guard ได้ แล้ว service ตรวจความเป็นเจ้าของกับข้อมูลจริงอีกชั้น
 * (เจ้าของ = members.core_user_id ตรงกับ token.sub)
 *
 *   STUDENT / ALUMNI = ผู้ใช้ทั่วไป · STAFF / ADMIN = เจ้าหน้าที่ศูนย์รับแจ้งของหาย
 */
export enum Permission {
  ITEM_READ = 'item:read',
  ITEM_CREATE = 'item:create',
  ITEM_UPDATE_OWN = 'item:update:own',
  ITEM_UPDATE_ANY = 'item:update:any',
  ITEM_DELETE_OWN = 'item:delete:own',
  ITEM_DELETE_ANY = 'item:delete:any',

  CLAIM_CREATE = 'claim:create',
  CLAIM_READ_OWN = 'claim:read:own',
  CLAIM_READ_ANY = 'claim:read:any',
  /** อนุมัติ / ปฏิเสธคำขอ */
  CLAIM_REVIEW = 'claim:review',
  /** ผู้ส่ง/ผู้รับยืนยันการส่งมอบฝั่งตัวเอง */
  CLAIM_CONFIRM_OWN = 'claim:confirm:own',
  /** เจ้าหน้าที่ยืนยันรหัส 6 หลักตอนส่งมอบผ่านห้องเจ้าหน้าที่ */
  CLAIM_VERIFY = 'claim:verify',

  MEMBER_READ_ANY = 'member:read:any',
  STATS_READ = 'stats:read',
}

const MEMBER_PERMISSIONS: Permission[] = [
  Permission.ITEM_READ,
  Permission.ITEM_CREATE,
  Permission.ITEM_UPDATE_OWN,
  Permission.ITEM_DELETE_OWN,
  Permission.CLAIM_CREATE,
  Permission.CLAIM_READ_OWN,
  Permission.CLAIM_CONFIRM_OWN,
];

const STAFF_PERMISSIONS: Permission[] = Object.values(Permission);

export const ROLE_PERMISSIONS: Readonly<Record<SubsystemRole, readonly Permission[]>> =
  Object.freeze({
    [SubsystemRole.STUDENT]: Object.freeze(MEMBER_PERMISSIONS),
    [SubsystemRole.ALUMNI]: Object.freeze(MEMBER_PERMISSIONS),
    [SubsystemRole.STAFF]: Object.freeze(STAFF_PERMISSIONS),
    [SubsystemRole.ADMIN]: Object.freeze(STAFF_PERMISSIONS),
  });

/** Does this subsystem role hold the given permission? */
export function can(role: SubsystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Does this subsystem role hold at least one of the given permissions? */
export function canAny(role: SubsystemRole, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}
