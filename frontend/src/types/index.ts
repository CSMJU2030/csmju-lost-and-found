// type ของข้อมูลจาก API สร้างจาก backend/openapi.json (pnpm --filter frontend gen:api) — ห้ามเขียนเอง
// ตามมาตรฐาน tech-stack.md ข้อ 3 · เมื่อ backend เปลี่ยน endpoint ให้ generate ใหม่ใน PR เดียวกัน
import type { components } from './api';

type Schemas = components['schemas'];

/** รายการแจ้งของหาย / แจ้งพบของ (GET /api/v1/items) */
export type LostItem = Schemas['ItemView'];
/** คำขอรับคืน / แจ้งส่งคืน (GET /api/v1/claims) */
export type ClaimRequest = Schemas['ClaimView'];
/** ผู้ใช้ในระบบนี้ (GET /api/v1/members) */
export type ApiUser = Schemas['MemberView'];
/** รายการที่อาจเป็นชิ้นเดียวกัน (GET /api/v1/items/:id/matches) */
export type ApiMatch = Schemas['MatchView'];
export type NewItemInput = Schemas['CreateItemDto'];
export type NewClaimInput = Schemas['CreateClaimDto'];

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  studentId: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface LocationOption {
  id: string;
  name: string;
  buildings: { id: string; name: string; floors: string[] }[];
}
