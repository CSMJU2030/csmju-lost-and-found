import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  FULL_NAME_PATTERN,
  IsCalendarDate,
  PHONE_PATTERN,
  STUDENT_CODE_PATTERN,
  TIME_PATTERN,
  Trim,
} from '../../lib/validation';
import type { ItemStatusValue, ItemUrgencyValue, ReportTypeValue } from './item-view.dto';

const REPORT_TYPES = ['lost', 'found'];
const ITEM_STATUSES = ['searching', 'found', 'returned'];
const tooLong = (max: number) => `ยาวเกินกำหนด (สูงสุด ${max} ตัวอักษร)`;

/** POST /api/v1/items — แจ้งของหาย / แจ้งพบของ */
export class CreateItemDto {
  @IsIn(REPORT_TYPES, { message: 'ประเภทต้องเป็น lost หรือ found' })
  reportType!: ReportTypeValue;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณากรอกชื่อสิ่งของ' }) @MaxLength(100, { message: tooLong(100) })
  name!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณาอธิบายลักษณะสิ่งของ' }) @MaxLength(500, { message: tooLong(500) })
  description!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณาเลือกหมวดหมู่' }) @MaxLength(50, { message: tooLong(50) })
  category!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณาระบุสถานที่' }) @MaxLength(300, { message: tooLong(300) })
  location!: string;

  @IsOptional() @Trim() @IsString() @MaxLength(100, { message: tooLong(100) })
  faculty?: string;

  @IsOptional() @Trim() @IsString() @MaxLength(100, { message: tooLong(100) })
  building?: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณากรอกห้องหรือชั้น' }) @MaxLength(50, { message: tooLong(50) })
  room!: string;

  /** YYYY-MM-DD */
  @IsCalendarDate({ message: 'วันที่ต้องเป็นรูปแบบ YYYY-MM-DD และมีอยู่จริง' })
  dateLost!: string;

  /** HH:MM */
  @Matches(TIME_PATTERN, { message: 'รูปแบบเวลาต้องเป็น HH:MM' })
  timeLost!: string;

  @IsOptional() @IsIn(['normal', 'high'], { message: 'ความเร่งด่วนต้องเป็น normal หรือ high' })
  urgency?: ItemUrgencyValue;

  /** รูปแบบ data URL (JPG/PNG/WEBP ไม่เกิน 2 MB ต่อรูป) — เก็บในฐานข้อมูล ชนิดไฟล์ตรวจจาก byte ต้นไฟล์ */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'แนบรูปได้ไม่เกิน 6 รูป' })
  @IsString({ each: true })
  @MaxLength(3_000_000, { each: true, message: 'รูปภาพใหญ่เกินไป' })
  images?: string[];

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  pinX?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  pinY?: number;

  @IsOptional() @Trim() @IsString() @MaxLength(150, { message: tooLong(150) })
  secretQuestion?: string;

  @ValidateIf((o: CreateItemDto) => !!o.secretQuestion || o.secretAnswer !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกคำตอบของคำถามยืนยัน' })
  @MaxLength(100, { message: tooLong(100) })
  secretAnswer?: string;

  @Trim() @Matches(FULL_NAME_PATTERN, { message: 'กรุณากรอกทั้งชื่อและนามสกุล (เว้นวรรคระหว่างกัน)' }) @MaxLength(80, { message: tooLong(80) })
  reporterName!: string;

  /** รหัสนักศึกษา 10 หลัก (ไม่บังคับ) */
  @IsOptional() @Trim() @Matches(STUDENT_CODE_PATTERN, { message: 'รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก' })
  reporterStudentId?: string;

  @Matches(PHONE_PATTERN, { message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0' })
  reporterPhone!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'กรุณากรอก Line ID หรืออีเมล' }) @MaxLength(100, { message: tooLong(100) })
  reporterContact!: string;
}

/** PATCH /api/v1/items/:id */
export class UpdateItemDto {
  @IsIn(ITEM_STATUSES, { message: 'สถานะต้องเป็น searching, found หรือ returned' })
  status!: ItemStatusValue;
}

/** GET /api/v1/items */
export class QueryItemsDto extends PaginationQueryDto {
  /** ค้นหาในชื่อ รหัส สถานที่ และรายละเอียด */
  @IsOptional() @Trim() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsIn(ITEM_STATUSES)
  status?: ItemStatusValue;

  @IsOptional() @IsIn(REPORT_TYPES)
  type?: ReportTypeValue;

  @IsOptional() @IsString() @MaxLength(50)
  category?: string;

  /** true = เฉพาะรายการที่ฉันแจ้ง */
  @IsOptional() @IsIn(['true', 'false'])
  mine?: 'true' | 'false';
}
