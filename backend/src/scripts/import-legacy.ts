// ย้ายข้อมูลจากฐานข้อมูลเดิม (ก่อนใช้ Prisma: ตาราง users/items/claims/secret_attempts)
// เข้าฐานข้อมูลใหม่ตามมาตรฐาน: pnpm --filter backend prisma:import-legacy
//
// - อ่านจาก LEGACY_DATABASE_URL (ค่าใน .env) เขียนลง DATABASE_URL — ต้อง pnpm prisma:deploy ก่อน
// - รันซ้ำได้: แถวที่ย้ายแล้ว (id เดิม หรือรหัส LF-/REQ- เดิม) จะถูกข้าม
// - ไม่ย้ายรหัสผ่าน (password_hash) เพราะระบบนี้ไม่เก็บรหัสผ่านอีกต่อไป
// - ไฟล์รูปใน uploads/ ใช้ต่อได้ทันทีไม่ต้องย้าย
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client, types } from 'pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { fromDateOnly } from '../lib/time';
import { toDbEnum } from '../lib/enums';

async function main(): Promise<void> {

const legacyUrl = process.argv[2] || process.env.LEGACY_DATABASE_URL;
if (!legacyUrl) {
  console.error('ต้องตั้ง LEGACY_DATABASE_URL ใน .env หรือส่ง URL เป็น argument');
  process.exit(1);
}

type Row = Record<string, unknown>;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const legacy = new Client({ connectionString: legacyUrl });
// อ่านวันที่/เวลาเป็นข้อความตามที่เก็บ แล้วแปลงเอง
legacy.setTypeParser(types.builtins.DATE, (v: string) => v);
await legacy.connect();
const rows = async (sql: string) => (await legacy.query(sql)).rows as Row[];

const str = (v: unknown) => (v == null ? '' : String(v));
const opt = (v: unknown) => (v == null || v === '' ? null : String(v));
const date = (v: unknown) => (v == null ? null : new Date(v as string));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keepId = (v: unknown) => (typeof v === 'string' && UUID.test(v) ? v : undefined);

// วันเวลานัดเดิมเก็บเป็นข้อความ "YYYY-MM-DD HH:MM" (เวลาไทย) -> timestamptz
function meetAt(v: unknown, fallback: Date) {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(str(v));
  const d = m ? new Date(`${m[1]}T${m[2]}:00+07:00`) : fallback;
  return Number.isNaN(d.getTime()) ? fallback : d;
}

const hasTable = async (name: string) =>
  !!(await legacy.query('SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1', [name])).rowCount;

if (!(await hasTable('users')) || !(await hasTable('items'))) {
  console.error('ไม่พบตาราง users/items ในฐานข้อมูลเดิม — ตรวจ LEGACY_DATABASE_URL');
  process.exit(1);
}

await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  const db = () => tx;
  // ---------- users -> members (ผู้ใช้ที่มีรหัสนักศึกษานี้อยู่แล้วใช้แถวเดิม) ----------
  const memberId = new Map<string, string>();
  let membersAdded = 0;
  const users = await rows('SELECT * FROM users ORDER BY created_at');
  for (const u of users) {
    const studentCode = str(u.student_id);
    const existing = await db().member.findUnique({ where: { studentCode } });
    if (existing) {
      memberId.set(str(u.id), existing.id);
      continue;
    }
    const created = await db().member.create({
      data: {
        id: keepId(u.id),
        studentCode,
        displayName: str(u.full_name) || studentCode,
        email: opt(u.email),
        phone: opt(u.phone),
        role: ['admin', 'teacher'].includes(str(u.role)) ? 'ADMIN' : 'USER',
        createdAt: date(u.created_at) ?? undefined,
      },
    });
    memberId.set(str(u.id), created.id);
    membersAdded++;
  }
  console.log(`members: เพิ่ม ${membersAdded} จาก ${users.length} แถว`);

  // ---------- items ----------
  const itemId = new Map<string, string>();
  let itemsAdded = 0;
  const items = await rows('SELECT * FROM items ORDER BY created_at');
  for (const i of items) {
    const existing = await db().item.findUnique({ where: { code: str(i.code) } });
    if (existing) {
      itemId.set(str(i.id), existing.id);
      continue;
    }
    const thumbnails = Array.isArray(i.thumbnails) ? (i.thumbnails as string[]) : [];
    const imageUrls = thumbnails.length ? thumbnails : opt(i.image_url) ? [str(i.image_url)] : [];
    const created = await db().item.create({
      data: {
        id: keepId(i.id),
        code: str(i.code),
        reportType: toDbEnum(str(i.report_type) as 'lost' | 'found'),
        name: str(i.name),
        description: str(i.description),
        category: str(i.category),
        location: str(i.location),
        faculty: str(i.faculty),
        building: str(i.building),
        room: str(i.room),
        incidentDate: fromDateOnly(str(i.date_lost).slice(0, 10)),
        incidentTime: str(i.time_lost),
        status: toDbEnum(str(i.status) as 'searching' | 'found' | 'returned'),
        urgency: str(i.urgency) === 'high' ? 'HIGH' : 'NORMAL',
        imageUrls,
        pinLat: (i.pin_lat as number | null) ?? null,
        pinLng: (i.pin_lng as number | null) ?? null,
        secretQuestion: opt(i.secret_question),
        secretAnswer: opt(i.secret_answer),
        reporterId: memberId.get(str(i.reporter_id))!,
        reporterName: str(i.reporter_name),
        reporterStudentCode: opt(i.reporter_student_id),
        reporterPhone: str(i.reporter_phone),
        reporterContact: str(i.reporter_contact),
        createdAt: date(i.created_at) ?? undefined,
      },
    });
    itemId.set(str(i.id), created.id);
    itemsAdded++;
  }
  console.log(`items: เพิ่ม ${itemsAdded} จาก ${items.length} แถว`);

  // ---------- claims (id เดิม REQ-XXXXXXXX กลายเป็นรหัสแสดงผล code) ----------
  let claimsAdded = 0;
  const claims = (await hasTable('claims')) ? await rows('SELECT * FROM claims ORDER BY created_at') : [];
  for (const c of claims) {
    const code = str(c.id);
    if (await db().claim.findUnique({ where: { code } })) continue;
    const createdAt = date(c.created_at) ?? new Date();
    await db().claim.create({
      data: {
        code,
        itemId: itemId.get(str(c.item_id))!,
        claimantId: memberId.get(str(c.claimant_id))!,
        linkedItemId: c.linked_item_id ? itemId.get(str(c.linked_item_id)) ?? null : null,
        claimType: toDbEnum(str(c.claim_type) as 'lost' | 'found'),
        claimantName: str(c.claimer_name),
        claimantStudentCode: opt(c.student_id),
        claimantAffiliation: str(c.department),
        meetAt: meetAt(c.meet_at, createdAt),
        meetLocation: str(c.meet_location),
        contact: str(c.contact),
        note: str(c.note),
        secretAnswerGiven: opt(c.secret_answer_given),
        status: toDbEnum(str(c.status) as 'pending' | 'approved' | 'at_office' | 'rejected' | 'completed'),
        handoverCode: opt(c.handover_code),
        pickupCode: opt(c.pickup_code),
        approvedAt: date(c.approved_at),
        droppedOffAt: date(c.dropped_off_at),
        handedOverAt: date(c.handed_over_at),
        handedOverBy: opt(c.handed_over_by),
        giverConfirmedAt: date(c.giver_confirmed_at),
        receiverConfirmedAt: date(c.receiver_confirmed_at),
        createdAt,
      },
    });
    claimsAdded++;
  }
  console.log(`claims: เพิ่ม ${claimsAdded} จาก ${claims.length} แถว`);

  // ---------- secret_attempts ----------
  let attemptsAdded = 0;
  const attempts = (await hasTable('secret_attempts')) ? await rows('SELECT * FROM secret_attempts') : [];
  for (const a of attempts) {
    const item = itemId.get(str(a.item_id));
    // คอลัมน์ผู้ใช้ของตารางเดิม (ชื่อที่มาตรฐานห้ามใช้แล้ว) — หยิบจากคอลัมน์ *_id ที่ไม่ใช่ item_id
    const legacyMemberId = Object.entries(a).find(([k]) => k.endsWith('_id') && k !== 'item_id')?.[1];
    const member = memberId.get(str(legacyMemberId));
    if (!item || !member) continue;
    const result = await db().secretAttempt.createMany({
      data: [{ itemId: item, memberId: member, attemptCount: Number(a.count) || 0 }],
      skipDuplicates: true,
    });
    attemptsAdded += result.count;
  }
  console.log(`secret_attempts: เพิ่ม ${attemptsAdded} จาก ${attempts.length} แถว`);
}, { timeout: 120_000 }).finally(async () => {
  await legacy.end();
  await prisma.$disconnect();
});
console.log('ย้ายข้อมูลเสร็จแล้ว');
}

void main();
