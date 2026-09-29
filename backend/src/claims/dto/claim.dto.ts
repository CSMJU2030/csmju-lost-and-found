import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { IsCalendarDate, IsPhoneOrLineId, STUDENT_CODE_PATTERN, TIME_PATTERN, Trim } from '../../lib/validation';
import type { ReportTypeValue } from '../../items/dto/item-view.dto';

const tooLong = (max: number) => `ยาวเกินกำหนด (สูงสุด ${max} ตัวอักษร)`;

export type ClaimStatusValue = 'pending' | 'approved' | 'at_office' | 'rejected' | 'completed';

/** POST /api/v1/claims — ของที่มีคนเก็บได้ = ขอรับคืน · ของที่มีคนตามหา = แจ้งส่งคืน */
export class CreateClaimDto {
  @IsUUID('all', { message: 'ไม่ได้ระบุรายการ' })
  itemId!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณากรอกชื่อจริง' }) @MaxLength(50, { message: tooLong(50) })
  firstName!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณากรอกนามสกุล' }) @MaxLength(50, { message: tooLong(50) })
  lastName!: string;

  /** รหัสนักศึกษา 10 หลัก (ไม่บังคับ) */
  @IsOptional() @Trim() @Matches(STUDENT_CODE_PATTERN, { message: 'รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก' })
  studentId?: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณากรอกสังกัดหรือคณะ' }) @MaxLength(80, { message: tooLong(80) })
  department!: string;

  /** วันที่นัด YYYY-MM-DD (เวลาไทย) */
  @IsCalendarDate({ message: 'วันที่นัดต้องเป็นรูปแบบ YYYY-MM-DD และมีอยู่จริง' })
  meetDate!: string;

  /** เวลานัด HH:MM (เวลาไทย) */
  @Matches(TIME_PATTERN, { message: 'รูปแบบเวลาต้องเป็น HH:MM' })
  meetTime!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณาระบุสถานที่นัด' }) @MaxLength(100, { message: tooLong(100) })
  meetLocation!: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกช่องทางติดต่อ (เบอร์โทรหรือ Line ID)' })
  @MaxLength(50, { message: tooLong(50) })
  @IsPhoneOrLineId({ message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0' })
  contact!: string;

  @IsOptional() @Trim() @IsString() @MaxLength(300, { message: tooLong(300) })
  note?: string;

  /** คำตอบคำถามยืนยันความเป็นเจ้าของ (เมื่อขอรับคืนของที่มีคำถามลับ) */
  @IsOptional() @Trim() @IsString() @MaxLength(100, { message: tooLong(100) })
  secretAnswer?: string;

  /** โพสต์ของผู้ยื่นเองที่เป็นเรื่องเดียวกัน เช่น เจ้าของเคยแจ้งหายไว้ — ปิดพร้อมกันเมื่อคืนสำเร็จ */
  @IsOptional() @IsUUID('all', { message: 'รายการที่ผูกไว้ไม่ถูกต้อง' })
  linkedItemId?: string;
}

/** POST /api/v1/claims/:id/verify */
export class VerifyCodeDto {
  @Matches(/^\d{6}$/, { message: 'รหัสต้องเป็นตัวเลข 6 หลัก' })
  code!: string;
}

/** GET /api/v1/claims · scope=mine = คำขอที่ฉันยื่น + คำขอกับรายการของฉัน (ค่าเริ่มต้นของผู้ใช้ทั่วไป) */
export class QueryClaimsDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['mine', 'all'])
  scope?: 'mine' | 'all';
}

export class ClaimView {
  /** UUID ใช้เรียก API */
  requestId!: string;
  /** รหัสที่แสดงให้ผู้ใช้ เช่น REQ-1A2B3C4D */
  requestCode!: string;
  itemId!: string;
  itemName!: string;
  itemCode!: string;
  /** found = เจ้าของขอรับคืน · lost = ผู้พบแจ้งส่งคืน */
  claimType!: ReportTypeValue;
  claimantId!: string;
  claimerName!: string;
  studentId!: string;
  department!: string;
  /** วันเวลานัด "YYYY-MM-DD HH:MM" เวลาไทย */
  claimDateTime!: string;
  claimLocation!: string;
  contact!: string;
  note!: string;
  requestDate!: string;
  status!: ClaimStatusValue;
  /** ส่งให้เฉพาะเจ้าหน้าที่ */
  secretAnswerGiven?: string;
  /** ส่งให้เฉพาะผู้ยื่นคำขอและเจ้าหน้าที่ */
  handoverCode?: string;
  /** ส่งให้เฉพาะเจ้าของโพสต์และเจ้าหน้าที่ */
  pickupCode?: string;
  approvedAt?: string;
  droppedOffAt?: string;
  handedOverAt?: string;
  handedOverBy?: string;
  giverConfirmedAt?: string;
  receiverConfirmedAt?: string;
  linkedItemId?: string;
}
