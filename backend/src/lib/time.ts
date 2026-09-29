// แปลงวันเวลาระหว่างฐานข้อมูล (timestamptz / date) กับรูปแบบที่ API ใช้
// มาตรฐาน: date = YYYY-MM-DD · datetime = ISO 8601 UTC ลงท้าย Z

export const TIME_ZONE = 'Asia/Bangkok';

// คอลัมน์ @db.Date: Prisma คืนเป็น Date เวลา 00:00 UTC
export const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
export const fromDateOnly = (v: string) => new Date(`${v}T00:00:00.000Z`);

export const toIso = (d: Date) => d.toISOString();
export const toIsoOrUndefined = (d: Date | null) => (d ? d.toISOString() : undefined);

// วันเวลานัดที่ผู้ใช้เลือก (เวลาไทย) -> timestamptz
export const fromLocalDateTime = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);

// timestamptz -> "YYYY-MM-DD HH:MM" เวลาไทย (รูปแบบที่หน้าเว็บแสดง)
const localFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export const toLocalDateTime = (d: Date) => localFormat.format(d);
