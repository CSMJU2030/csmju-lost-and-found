import { LostItem, ClaimRequest } from '@/types';
import { getReportType } from './storage';

// คำที่ใช้กับ "คำขอ" แยกตามประเภทของรายการ เพื่อไม่ให้สับสนระหว่างสองกรณี:
// - lost  = เจ้าของโพสต์ตามหาของ -> คนที่กดคือ "ผู้พบ" ที่จะนำของไปส่งคืน
// - found = มีคนเก็บของได้แล้วโพสต์ -> คนที่กดคือ "เจ้าของ" ที่มาขอรับคืน
export type ClaimType = 'lost' | 'found';

export interface ClaimWording {
  cta: string;                 // ปุ่มสั้นบนการ์ด
  ctaLong: string;             // ปุ่มในหน้ารายละเอียด
  hint: string;                // คำอธิบายในหน้ารายละเอียดว่าควรกดเมื่อไร
  formTitle: string;
  formIntro: string;
  submit: string;
  submitting: string;
  success: string;
  successHint: string;
  typeBadge: string;           // ป้ายประเภทคำขอ
  personLabel: string;         // เรียกผู้ยื่นคำขอ
  meet: string;                // "นัดรับ" / "นัดส่งคืน"
  noteLabel: string;
  notePlaceholder: string;
  activeCount: (n: number) => string;
  doneLabel: string;           // ป้ายบนรายการที่ปิดแล้ว
  status: Record<ClaimRequest['status'], string>;
  approvedToast: (itemName: string) => string;
  adminNotif: string;
  posterNotif: string;         // แจ้งเตือนเจ้าของโพสต์เมื่อมีคนยื่นคำขอ
}

export const claimWording: Record<ClaimType, ClaimWording> = {
  lost: {
    cta: 'ฉันเจอของชิ้นนี้',
    ctaLong: 'ฉันเจอของชิ้นนี้ นัดส่งคืนเจ้าของ',
    hint: 'เจ้าของกำลังตามหาของชิ้นนี้ ถ้าคุณเจอ กดปุ่มด้านบนเพื่อนัดส่งคืนผ่านเจ้าหน้าที่',
    formTitle: 'แจ้งพบของ เพื่อนัดส่งคืนเจ้าของ',
    formIntro: 'ของที่คุณเจอและจะนำไปส่งคืนเจ้าของ:',
    submit: 'ส่งข้อมูลให้แอดมินประสานส่งคืน',
    submitting: 'กำลังส่งข้อมูล...',
    success: 'แจ้งว่าเจอของสำเร็จ! ขอบคุณที่ช่วยส่งคืน',
    successHint: 'แอดมินจะตรวจสอบ เมื่ออนุมัติแล้วให้นัดส่งของกับเจ้าของ แล้วกดยืนยันที่',
    typeBadge: 'แจ้งส่งคืน',
    personLabel: 'ผู้พบของ',
    meet: 'นัดส่งคืน',
    noteLabel: 'เจอที่ไหน / สภาพของ / รายละเอียดเพิ่มเติม',
    notePlaceholder: 'เช่น เจอที่โต๊ะหน้าห้อง 204 สภาพปกติ ตอนนี้เก็บไว้กับตัว...',
    activeCount: (n) => `มีคนแจ้งว่าเจอของชิ้นนี้แล้ว ${n} ราย`,
    doneLabel: 'เจ้าของได้คืนแล้ว',
    status: {
      pending: 'รอแอดมินตรวจสอบ',
      approved: 'อนุมัติแล้ว • นัดส่งของ แล้วกดยืนยัน',
      at_office: 'ส่งของถึงเจ้าหน้าที่แล้ว • รอเจ้าของมารับ',
      completed: 'ส่งคืนเจ้าของเรียบร้อย',
      rejected: 'ไม่ผ่านการอนุมัติ',
    },
    approvedToast: (itemName) => `อนุมัติการส่งคืน "${itemName}" แล้ว ทั้งสองฝ่ายนัดส่งของกันเองได้เลย`,
    adminNotif: 'มีคนแจ้งว่าเจอของที่ประกาศตามหา',
    posterNotif: 'มีคนเจอของที่คุณตามหา!',
  },
  found: {
    cta: 'นี่คือของฉัน',
    ctaLong: 'นี่คือของฉัน ขอรับของคืน',
    hint: 'มีคนเก็บของชิ้นนี้ได้ ถ้าเป็นของคุณ กดปุ่มด้านบนเพื่อยืนยันตัวตนและขอรับคืน',
    formTitle: 'ยืนยันตัวตนเพื่อขอรับของคืน',
    formIntro: 'ของที่คุณกำลังขอรับคืน:',
    submit: 'ยืนยันและส่งคำขอรับคืน',
    submitting: 'กำลังส่งคำขอ...',
    success: 'ส่งคำขอรับของคืนสำเร็จ!',
    successHint: 'แอดมินจะตรวจสอบ เมื่ออนุมัติแล้วให้นัดรับของกับผู้เก็บได้ แล้วกดยืนยันที่',
    typeBadge: 'ขอรับคืน',
    personLabel: 'ผู้ขอรับ (เจ้าของ)',
    meet: 'นัดรับ',
    noteLabel: 'หมายเหตุ / จุดสังเกตยืนยันความเป็นเจ้าของ',
    notePlaceholder: 'ระบุตำหนิพิเศษหรือรายละเอียดที่มีแต่เจ้าของรู้ เพื่อยืนยันตัวตน...',
    activeCount: (n) => `มีคำขอรับคืนรอดำเนินการ ${n} รายการ`,
    doneLabel: 'เจ้าของรับคืนแล้ว',
    status: {
      pending: 'รอแอดมินตรวจสอบ',
      approved: 'อนุมัติแล้ว • นัดรับของ แล้วกดยืนยัน',
      at_office: 'ของอยู่ที่เจ้าหน้าที่ • รอรับของ',
      completed: 'รับของคืนเรียบร้อย',
      rejected: 'ไม่ผ่านการอนุมัติ',
    },
    approvedToast: (itemName) => `อนุมัติคำขอรับคืน "${itemName}" แล้ว ทั้งสองฝ่ายนัดส่งของกันเองได้เลย`,
    adminNotif: 'มีคำขอรับของคืนเข้ามาใหม่',
    posterNotif: 'มีคนขอรับของที่คุณเก็บได้',
  },
};

export const wordingForItem = (item: LostItem) => claimWording[getReportType(item)];

// ประเภทของคำขอ: ใช้ค่าที่บันทึกไว้ ถ้าเป็นข้อมูลเก่าให้ดูจากรายการที่ขอ
export function claimTypeOf(claim: ClaimRequest, items: LostItem[]): ClaimType {
  if (claim.claimType) return claim.claimType;
  const item = items.find((i) => i.id === claim.itemId);
  return item ? getReportType(item) : 'found';
}

export const wordingForClaim = (claim: ClaimRequest, items: LostItem[]) => claimWording[claimTypeOf(claim, items)];
