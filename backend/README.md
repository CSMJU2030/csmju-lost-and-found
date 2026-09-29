# Lost & Found Backend API

NestJS 11 + TypeScript + PostgreSQL ผ่าน **Prisma 7.9.1** (driver adapter `PrismaPg`) — ระบบย่อย `csmju-lost-and-found` ของ CSMJU2030
ตัวตนมาจาก **Core Hub** เท่านั้น (RS256 + JWKS ด้วย `jose`) ชั้น auth คัดลอกจาก reference implementation
`demo-student-subsystem` ตาม [`ai/AGENTS.md`](../standards/ai/AGENTS.md) ข้อ 2 (branch `main` = สัญญา 1.0 ของมาตรฐาน v1.0.2)

## เริ่มใช้งาน

```bash
pnpm install                        # จากรากของ repo (สร้าง Prisma Client ให้อัตโนมัติ)
cp backend/.env.example backend/.env
docker compose -f backend/docker-compose.yml up -d
pnpm --filter backend prisma:deploy # สร้างฐานข้อมูล lost_and_found_db และตารางตาม migration
pnpm --filter backend start:dev     # http://localhost:4000 (รีโหลดอัตโนมัติเมื่อแก้โค้ด)
```

ต้องมี Core Hub รันอยู่ (`CORE_HUB_URL`) เพื่อดึง JWKS — ไม่มีโหมดข้ามการตรวจ token แม้ตอนพัฒนา (auth-contract ข้อ 9)
เบราว์เซอร์ใช้งานผ่าน frontend (:3002) ซึ่งส่งต่อ `/api` `/auth` `/uploads` มาที่นี่

## การยืนยันตัวตนและสิทธิ์

| ขั้น | รายละเอียด |
|---|---|
| รับ token | `Authorization: Bearer <Core Hub token>` หรือคุกกี้ `core_hub_access_token` (HttpOnly จาก SSO) |
| ตรวจ | ครบ 8 ขั้นตาม auth-contract ข้อ 4 (RS256 เท่านั้น · เลือกกุญแจจาก `kid` · `iss`/`aud`/`exp`/`sub`) |
| core role → subsystem role | `student→STUDENT` · `alumni→ALUMNI` · `staff→STAFF` · `admin→ADMIN` ([role-mapping.ts](src/auth/role-mapping.ts)) |
| permission | [permissions.ts](src/auth/permissions.ts): STUDENT/ALUMNI = ผู้ใช้ทั่วไป · STAFF/ADMIN = เจ้าหน้าที่ (ทุกสิทธิ์) |
| ผู้ใช้ในระบบนี้ | แถวใน `members` สร้างอัตโนมัติครั้งแรกที่เรียก API (`core_user_id` = `sub`) |

- ไม่มี token / token เสีย → `401 UNAUTHORIZED` (JSON ไม่ redirect) · สิทธิ์ไม่พอ → `403 FORBIDDEN`
- ไม่เชื่อตัวตนจาก body / query / custom header ใด ๆ
- SSO (auth-contract 1.0): Core Hub → `GET /auth/callback?access_token=…` → ตรวจ token → ตั้งคุกกี้ `core_hub_access_token`
  (`/auth/login` และ `/auth/logout` เป็น route ของ frontend: พาไปเริ่ม SSO ที่เว็บ Core Hub / ลบคุกกี้)
- ลงทะเบียนกับ Core Hub: [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md)

## ฐานข้อมูล

| | ค่า |
|---|---|
| ฐานข้อมูล | PostgreSQL 17 ใน Docker (`docker-compose.yml`) ชื่อ `lost_and_found_db` |
| เชื่อมต่อ | `DATABASE_URL` ใน `.env` — ห้ามใส่ connection string ในโค้ด |
| โครงสร้าง | [prisma/schema.prisma](prisma/schema.prisma) · ประวัติ [prisma/migrations/](prisma/migrations) |
| ฐานข้อมูลทดสอบ | `lost_and_found_test_db` (e2e สร้างให้เอง ใช้ schema ชั่วคราวแล้วลบทิ้ง) |
| รูปภาพ | ไฟล์ใน `uploads/` (ฐานข้อมูลเก็บแค่ path) |

| ตาราง | เก็บอะไร |
|---|---|
| `members` | ผู้ใช้งานระบบนี้ (local data) — `core_user_id`, `core_role`, สำเนาสิทธิ์ `role` (`USER`/`ADMIN`) · **ไม่มีรหัสผ่าน** |
| `items` | รายการแจ้งของหาย (`LOST`) / แจ้งพบของ (`FOUND`) รหัส `LF-YYYY-NNNNN` |
| `claims` | คำขอรับคืน / แจ้งส่งคืน รหัส `REQ-XXXXXXXX` · คำขอที่ยังไม่ปิดได้ 1 คำขอต่อคนต่อรายการ (partial unique index) |
| `secret_attempts` | จำนวนครั้งที่ตอบคำถามยืนยันผิด ต่อรายการ ต่อผู้ใช้ |

แก้โครงสร้าง: แก้ `schema.prisma` → `pnpm --filter backend prisma:migrate --name <สิ่งที่เปลี่ยน>` → commit `prisma/migrations/`
→ `pnpm --filter backend prisma:check` ต้องได้ `No difference detected.`
ห้ามแก้/ลบ migration เดิม · เปลี่ยนชื่อคอลัมน์ต้องใช้ `--create-only` แล้วเขียน `ALTER TABLE … RENAME COLUMN` เอง

ย้ายข้อมูลจากฐานข้อมูลเดิม (`lostfound` ก่อนใช้ Prisma): ตั้ง `LEGACY_DATABASE_URL` แล้ว `pnpm --filter backend prisma:import-legacy`
(รันซ้ำได้ ไม่ย้ายรหัสผ่าน · ผู้ใช้เดิมยังไม่ผูกกับบัญชี Core Hub เพราะไม่มีข้อมูลให้จับคู่ได้อย่างปลอดภัย)

## คำสั่ง

| คำสั่ง (`pnpm --filter backend …`) | ใช้ทำอะไร |
|---|---|
| `start:dev` / `start:prod` | รันแบบพัฒนา / รันจาก `dist` |
| `build` · `typecheck` · `lint` | build · ตรวจ TypeScript · ESLint |
| `test` | unit test (auth, permission, config — ไม่ต้องมีฐานข้อมูล) |
| `test:e2e` | ทุก flow ผ่าน HTTP กับ PostgreSQL จริง + Core Hub ปลอม (JWKS) |
| `generate:openapi` | สร้าง `openapi.json` จาก controller/DTO (ต้อง commit ทุกครั้งที่ API เปลี่ยน) |
| `prisma:deploy` · `prisma:migrate` · `prisma:status` · `prisma:check` · `prisma:studio` | จัดการ migration / ตรวจ drift / ดูข้อมูล |
| `prisma:import-legacy` | ย้ายข้อมูลจากฐานข้อมูลเดิม |

## โครงสร้าง

```text
src/
├── main.ts               setGlobalPrefix('api') ยกเว้น /auth/callback
├── app-setup.ts          validation pipe, body limit, /uploads (ใช้ร่วมกับ e2e)
├── app.module.ts         guard ทั้งระบบ: CoreHubJwtGuard → PermissionsGuard
├── auth/                 ⬅ คัดลอกจาก reference implementation (แก้ได้เฉพาะ role-mapping / permissions)
├── common/               ⬅ คัดลอก: envelope, exception filter, pagination
├── config/               ค่าจาก .env + ตรวจ env
├── prisma/               PrismaService (Prisma 7 + PrismaPg)
├── health/               GET /api/health
├── members/              ผู้ใช้ในระบบนี้ (สร้างจากตัวตน Core Hub)
├── items/                รายการ + จับคู่อัตโนมัติ + รูปภาพ
├── claims/               คำขอรับคืน / แจ้งส่งคืน / ส่งมอบ
├── stats/                ตัวเลขสรุปของเจ้าหน้าที่
├── lib/                  time, enums, validation
└── scripts/              generate-openapi, import-legacy
test/                     e2e (lost-and-found, sso) + helpers (Core Hub ปลอม, ฐานข้อมูลทดสอบ)
```

## API

ทุกคำตอบห่อด้วย `{ success: true, data, meta? }` หรือ `{ success: false, error: { code, message, details? } }`
`code` มาจาก 9 ค่าปิดใน `contracts/error-codes.json` · ข้อมูลไม่ถูกต้อง → `400 VALIDATION_ERROR` พร้อม `details: string[]`
รายการแบบแบ่งหน้า: `?page=1&limit=20` (สูงสุด 100) พร้อม `meta { total, page, limit, totalPages }` · id ที่ไม่ใช่ UUID → `400`
สัญญาเต็ม: [openapi.json](openapi.json)

| Method | Path | สิทธิ์ | รายละเอียด |
|---|---|---|---|
| GET | `/api/health` | public | `{ status, service: "csmju-lost-and-found" }` |
| GET | `/auth/callback?access_token=…` | public | รับ token จาก Core Hub ตั้งคุกกี้ session (200 · token เสีย 401 · role ไม่รับ 403 · ไม่มี token 400) |
| GET | `/api/v1/me` | login | ตัวตนจาก token |
| GET | `/api/v1/members/me` | login | แถวใน members ของตัวเอง (id ใช้เทียบ `reporterId` / `claimantId`) |
| GET | `/api/v1/members` | เจ้าหน้าที่ | ผู้ใช้ทั้งหมด |
| GET | `/api/v1/items?q=&status=&type=&category=&mine=true` | login | ค้นหา/กรอง |
| GET | `/api/v1/items/:id` | login | รายละเอียด (`secretAnswer` เห็นเฉพาะเจ้าของโพสต์/เจ้าหน้าที่) |
| GET | `/api/v1/items/:id/matches` | login | รายการฝั่งตรงข้ามที่อาจเป็นชิ้นเดียวกัน |
| POST | `/api/v1/items` | login | แจ้งรายการ รูปส่งเป็น data URL ใน `images: []` → `201` |
| PATCH | `/api/v1/items/:id` | เจ้าของโพสต์/เจ้าหน้าที่ | `{ status }` |
| DELETE | `/api/v1/items/:id` | เจ้าของโพสต์/เจ้าหน้าที่ | `200 { id, deleted: true }` |
| GET | `/api/v1/claims?scope=mine\|all` | login | เจ้าหน้าที่: ทั้งหมด · ผู้ใช้: ที่ตัวเองยื่น + ที่คนอื่นยื่นกับรายการของตัวเอง |
| POST | `/api/v1/claims` | login | ยื่นคำขอ (ของที่มีคนเก็บได้ต้องตอบคำถามลับ ผิดได้ 3 ครั้ง) → `201` |
| POST | `/api/v1/claims/:id/approve` · `/reject` | เจ้าหน้าที่ | อนุมัติ (ออกรหัส 6 หลัก) / ปฏิเสธ |
| POST | `/api/v1/claims/:id/confirm` | ผู้ส่ง/ผู้รับของ | ยืนยันการส่งมอบฝั่งตัวเอง ครบสองฝ่ายแล้วปิดอัตโนมัติ |
| POST | `/api/v1/claims/:id/verify` | เจ้าหน้าที่ | `{ code }` ยืนยันรหัส (ส่งผ่านห้องเจ้าหน้าที่) |
| GET | `/api/v1/stats` | เจ้าหน้าที่ | ตัวเลขสรุป |

ลำดับสถานะเมื่อ**ส่งผ่านเจ้าหน้าที่** (รหัส 6 หลัก):
- **ขอรับคืน (found):** `pending` → `approved` (เจ้าของได้ `handoverCode`) → ยืนยันรหัส → `completed`
- **แจ้งส่งคืน (lost):** `pending` → `approved` (ผู้พบได้ `handoverCode`) → ยืนยันรหัส → `at_office` (เจ้าของได้ `pickupCode`) → ยืนยันรหัส → `completed`

รหัส 6 หลักเป็นความลับ: `handoverCode` เห็นเฉพาะผู้ยื่นคำขอ, `pickupCode` เห็นเฉพาะเจ้าของโพสต์ (เจ้าหน้าที่เห็นทั้งหมด)
