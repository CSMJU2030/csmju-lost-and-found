import { SubsystemRole } from './core-hub-identity';
import { Permission, ROLE_PERMISSIONS, can, canAny } from './permissions';

describe('Lost & Found permission model (authorization.md ข้อ 4)', () => {
  describe.each([SubsystemRole.STUDENT, SubsystemRole.ALUMNI])('%s', (role) => {
    it('reads items, reports its own items and files claims', () => {
      expect(can(role, Permission.ITEM_READ)).toBe(true);
      expect(can(role, Permission.ITEM_CREATE)).toBe(true);
      expect(can(role, Permission.ITEM_UPDATE_OWN)).toBe(true);
      expect(can(role, Permission.CLAIM_CREATE)).toBe(true);
      expect(can(role, Permission.CLAIM_CONFIRM_OWN)).toBe(true);
    });

    it('cannot act on other people’s data or review claims', () => {
      expect(can(role, Permission.ITEM_UPDATE_ANY)).toBe(false);
      expect(can(role, Permission.ITEM_DELETE_ANY)).toBe(false);
      expect(can(role, Permission.CLAIM_READ_ANY)).toBe(false);
      expect(can(role, Permission.CLAIM_REVIEW)).toBe(false);
      expect(can(role, Permission.CLAIM_VERIFY)).toBe(false);
      expect(can(role, Permission.MEMBER_READ_ANY)).toBe(false);
      expect(can(role, Permission.STATS_READ)).toBe(false);
    });
  });

  describe.each([SubsystemRole.STAFF, SubsystemRole.ADMIN])('%s', (role) => {
    it('holds every permission (เจ้าหน้าที่ศูนย์รับแจ้งของหาย)', () => {
      for (const permission of Object.values(Permission)) {
        expect(can(role, permission)).toBe(true);
      }
    });
  });

  it('canAny passes when at least one permission matches', () => {
    expect(canAny(SubsystemRole.STUDENT, [Permission.ITEM_UPDATE_ANY, Permission.ITEM_UPDATE_OWN])).toBe(true);
    expect(canAny(SubsystemRole.ALUMNI, [Permission.CLAIM_REVIEW, Permission.STATS_READ])).toBe(false);
  });

  it('defines permissions for every subsystem role', () => {
    for (const role of Object.values(SubsystemRole)) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });
});
