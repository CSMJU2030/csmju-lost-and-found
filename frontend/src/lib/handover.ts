import { ClaimRequest, LostItem } from '@/types';
import { api } from './api';
import { claimTypeOf } from './wording';

// ใครเป็นผู้ส่งของ / ผู้รับของในคำขอนี้ (ตรงกับ backend: claims.service.ts handoverRoleOf)
// เทียบด้วย id ใน members (reporterId / claimantId) ซึ่งมาจากบัญชี Core Hub ไม่ใช่รหัสนักศึกษาที่พิมพ์เอง
// - ขอรับคืน (found): ผู้ส่ง = คนที่เก็บของได้ (เจ้าของโพสต์), ผู้รับ = เจ้าของที่ยื่นคำขอ
// - แจ้งส่งคืน (lost): ผู้ส่ง = ผู้พบที่ยื่นคำขอ, ผู้รับ = เจ้าของที่โพสต์ตามหา
export type HandoverRole = 'giver' | 'receiver';

export function handoverParties(claim: ClaimRequest, items: LostItem[]) {
  const item = items.find((i) => i.id === claim.itemId);
  const posterId = item?.reporterId ?? '';
  const posterName = item?.reporterName ?? 'เจ้าของโพสต์';
  return claimTypeOf(claim, items) === 'found'
    ? { giverId: posterId, giverName: posterName, receiverId: claim.claimantId, receiverName: claim.claimerName }
    : { giverId: claim.claimantId, giverName: claim.claimerName, receiverId: posterId, receiverName: posterName };
}

export function myHandoverRole(claim: ClaimRequest, items: LostItem[], memberId: string): HandoverRole | null {
  const p = handoverParties(claim, items);
  if (memberId && memberId === p.giverId) return 'giver';
  if (memberId && memberId === p.receiverId) return 'receiver';
  return null;
}

// ยืนยันได้เมื่อแอดมินอนุมัติแล้วและยังไม่ได้ส่งผ่านเจ้าหน้าที่
export const canConfirmHandover = (claim: ClaimRequest) => claim.status === 'approved';

// บันทึกการยืนยันของฝั่งตัวเองที่เซิร์ฟเวอร์ คืนค่า true ถ้าครบสองฝ่ายและปิดรายการแล้ว
export async function confirmHandover(requestId: string): Promise<boolean> {
  const claim = await api.claimAction(requestId, 'confirm');
  return claim.status === 'completed';
}
