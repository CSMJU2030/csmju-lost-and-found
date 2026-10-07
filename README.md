# Lost & Found Web Project

ระบบแจ้งของหายและรับคืนสิ่งของสูญหายของมหาวิทยาลัยแม่โจ้ — ระบบย่อย `csmju-lost-and-found` ของ CSMJU2030
ทำตามมาตรฐาน [`csmju2030-standards`](standards/README.md) **v1.0.2** (git submodule ที่ `standards/`) (ผลตรวจล่าสุดอยู่ใน [REPORT.md](REPORT.md))

## โครงสร้างโปรเจกต์

```text
LostAndFound/                 pnpm workspace (backend + frontend)
├── subsystem.yaml            manifest ของระบบย่อย (CI + conformance อ่านไฟล์นี้)
├── .standards-version        เวอร์ชันมาตรฐานที่ผูกอยู่
├── .github/                  CI (compliance + conformance nightly), CODEOWNERS, PR template จาก standards/templates
├── backend/                  NestJS 11 + Prisma 7.9.1 + PostgreSQL (รายละเอียดใน backend/README.md)
│   └── openapi.json          สัญญา API ที่ generate จากโค้ด
└── frontend/                 Next.js 15.5 + React 19 + Tailwind CSS
    └── src/
        ├── app/              หน้าเว็บ (App Router)
        │   ├── page.tsx          หน้าแรก
        │   ├── items/            ค้นหาของหาย + หน้ารายละเอียด [id]
        │   ├── report/           แจ้งของหาย / แจ้งพบของ
        │   ├── claim/            ขอรับของคืน
        │   ├── my-items/         รายการของฉัน (สถานะ, รหัสส่งมอบ)
        │   └── admin/            แผงควบคุมเจ้าหน้าที่
        ├── components/       layout · ui · items · map · admin
        ├── lib/              api.ts (เรียก backend + re-SSO), useApi, matching, wording, handover, validation
        ├── context/          RoleContext (ผู้ใช้ปัจจุบันและสิทธิ์ที่มาจาก Core Hub)
        ├── csmju/            tokens.ts — ค่าสี design token สำหรับ canvas/SVG
        ├── data/             mockData (หมวดหมู่, คณะ/อาคาร)
        └── types/            api.d.ts (generate จาก backend/openapi.json) + index.ts
```

## การเข้าสู่ระบบ

ระบบนี้**ไม่มีหน้า login และไม่เก็บรหัสผ่าน** — ผู้ใช้ login ที่ **Core Hub** แล้วเข้ามาผ่าน SSO
(auth-contract 1.0: เว็บ Core Hub `/api/sso/csmju-lost-and-found` → `/auth/callback` → คุกกี้ `core_hub_access_token` แบบ HttpOnly)
เข้าได้ 2 ทาง: กดชื่อระบบในเมนูของ Core Hub หรือเปิดหน้าเว็บนี้แล้วระบบพาไป login ให้เอง (`/auth/login`)
สิทธิ์มาจาก core role ในบัญชี Core Hub: `staff` / `admin` = เจ้าหน้าที่ · `student` / `alumni` = ผู้ใช้ทั่วไป

## วิธีรัน (ต้องมี Node 22+, pnpm, Docker Desktop และ Core Hub)

| ระบบ | ที่อยู่ |
|---|---|
| Core Hub API | http://localhost:3000 |
| Core Hub web (หน้า login) | http://localhost:3100 |
| Lost & Found backend | http://localhost:4220 |
| **Lost & Found (เปิดที่นี่)** | **http://localhost:3220** — ส่งต่อ `/api` และ `/auth/callback` ไปที่ backend |

1. **Core Hub** — ทำตาม [LOCAL_INTEGRATION_GUIDE.md](standards/docs/LOCAL_INTEGRATION_GUIDE.md) ข้อ 4
   แล้วลงทะเบียนระบบนี้ครั้งเดียวตาม [backend/AUTH_INTEGRATION.md](backend/AUTH_INTEGRATION.md)
2. **ระบบนี้**

```bash
git submodule update --init                    # ดึง standards/ (v1.0.2) ครั้งแรก
pnpm install                                   # ทั้ง backend และ frontend (สร้าง Prisma Client ให้เอง)
cp backend/.env.example backend/.env
docker compose -f backend/docker-compose.yml up -d   # เปิด PostgreSQL
pnpm --filter backend prisma:deploy            # สร้างตารางตาม migration
pnpm --filter backend start:dev                # backend :4220
pnpm --filter frontend dev                     # หน้าเว็บ :3220 (อีก terminal)
```

เปิด http://localhost:3220 → ระบบพาไป login ที่ Core Hub (บัญชีทดสอบ เช่น `staff@core.local` / `password3`) แล้วกลับมาเอง

## ตรวจตามมาตรฐาน

```bash
pnpm --filter backend test          # unit test (ไม่ต้องมีฐานข้อมูล)
pnpm --filter backend test:e2e      # ทุก flow กับ PostgreSQL จริง + Core Hub ปลอม
pnpm -r typecheck                   # frontend = next typegen && tsc --noEmit
pnpm -r lint
pnpm --filter frontend gen:api      # สร้าง type ของ API ใหม่หลัง backend เปลี่ยน openapi.json
pnpm checks                         # static checks ของ standards (ต้องมี jq — บน Windows jq.exe คืนบรรทัดแบบ CRLF ทำให้ ARC-02 ตกหลอก ให้กรอง  ออก)
pnpm conformance                    # ยิงระบบที่รันอยู่จริง (ต้องเปิดครบทั้ง 4 ระบบ)
```

> ถ้าหน้าเว็บแสดงผลแบบไม่มี CSS ให้หยุด server แล้วลบโฟลเดอร์ `frontend/.next` จากนั้นรัน `pnpm --filter frontend dev` ใหม่
