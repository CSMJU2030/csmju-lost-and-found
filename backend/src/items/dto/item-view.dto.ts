// รูปแบบรายการที่ API ส่งออก (field camelCase · ค่า enum ตัวพิมพ์เล็กตามที่ frontend ใช้)

export type ReportTypeValue = 'lost' | 'found';
export type ItemStatusValue = 'searching' | 'found' | 'returned';
export type ItemUrgencyValue = 'normal' | 'high';

export class ItemView {
  id!: string;
  /** รหัสที่แสดงให้ผู้ใช้ เช่น LF-2026-00001 */
  code!: string;
  reportType!: ReportTypeValue;
  name!: string;
  description!: string;
  category!: string;
  location!: string;
  faculty!: string;
  building!: string;
  room!: string;
  /** วันที่ของหาย/พบของ (YYYY-MM-DD) */
  dateLost!: string;
  /** เวลาโดยประมาณ (HH:MM เวลาไทย) */
  timeLost!: string;
  status!: ItemStatusValue;
  urgency!: ItemUrgencyValue;
  /** รูปหลัก (path /uploads/...) หรือค่าว่าง */
  imageUrl!: string;
  thumbnails!: string[];
  pinX?: number;
  pinY?: number;
  secretQuestion?: string;
  /** ส่งให้เฉพาะเจ้าของโพสต์และเจ้าหน้าที่ */
  secretAnswer?: string;
  /** id ใน members ของผู้แจ้ง */
  reporterId!: string;
  reporterName!: string;
  reporterStudentId!: string;
  reporterPhone!: string;
  reporterContact!: string;
  createdAt!: string;
  /** จำนวนคำขอที่ยังดำเนินการอยู่ */
  activeClaims!: number;
}

/** รายการฝั่งตรงข้ามที่อาจเป็นชิ้นเดียวกัน */
export class MatchView {
  item!: ItemView;
  /** 0-100 */
  score!: number;
  reasons!: string[];
}

export class DeletedView {
  id!: string;
  deleted!: true;
}

export class ItemStatsView {
  totalItems!: number;
  searching!: number;
  found!: number;
  returned!: number;
  pendingClaims!: number;
  totalUsers!: number;
}
