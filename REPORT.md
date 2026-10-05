# REPORT — csmju-lost-and-found

มาตรฐาน: csmju2030-standards **v1.0.4** (submodule `standards/` ที่ tag `v1.0.4`) · ตรวจวันที่ 2026-09-29
repo: `CSMJU2030/csmju-lost-and-found` · Core Hub ที่ใช้ทดสอบ: branch `main` (SSO 1.0) รันจริงในเครื่อง

## PR ที่ส่ง (แยกตามที่ PM ขอ)

| PR | branch | เนื้อหา | CI |
|---|---|---|---|
| **1 เลื่อน pin** | `feature/lost-and-found/pin-standards-v1-0-4` | submodule `standards` → `v1.0.4` · `.standards-version` → `1.0.4` · `subsystem.yaml` `standards_version: "1.0.4"` · ลบ `.github/workflows/conformance-nightly.yml` (4 ไฟล์) | ตก GH-03 ตามปกติ → **PM merge** |
| **2 งานทั้งหมด** | `feature/lost-and-found/app-standards-v1-0-4` (ต่อจาก PR 1) | backend · frontend · auth 1.0 · แผนที่ · Tailwind v4 ฯลฯ ไม่แตะ `.github/workflows/` `.github/CODEOWNERS` `standards` | ต้องผ่านเอง — ผลในเครื่องด้านล่าง |

- **`ci.yml` ไม่ได้แก้:** ใน repo เป็น entry point `@v1.5.2` อยู่แล้ว (commit #2 ของ scaffold) ซึ่งเลือกชุดกฎตาม `.standards-version` เอง
  ถ้าแก้เป็น `@v1.0.4` จะเป็นการถอย entry point ของ DevOps จึงผูก 1.0.4 ผ่าน `.standards-version` แทน
- **ลำดับ:** เปิด PR 2 หลัง PM merge PR 1 แล้ว — ถ้าเปิดก่อน diff ของ PR 2 จะมี submodule `standards` ติดมาด้วย และ PR 2 จะตก GH-03

## ผลรัน

```
$ node standards/conformance/run.js
RESULT: 62 passed · 0 failed · 0 skipped
✅ CONFORMANT — csmju-lost-and-found meets standard v1.0 L3
```

```
$ ./standards/scripts/run-all-checks.sh .      (PR 2 เทียบกับ PR 1 = สภาพหลัง merge PR 1 · ใช้ jq.exe ของ Windows ตรง ๆ ไม่ครอบ)
✅ 17/18 · ❌ SEC-01 เจอเฉพาะ backend/.env ในเครื่อง
$ (checkout ใหม่ที่ไม่มี .env) check-no-secrets.sh
✅ [SEC-01/02] ไม่พบ secret หรือ .env ที่มีค่าจริง
```

| กฎ | ผล |
|---|---|
| GH-01 · GH-02 · GH-03 · GH-04 (1.0.4) · SEC-01/02 (checkout ใหม่) · SEC-03 · SEC-04/05 · ARC-01 · ARC-02/03 · API-01 · API-02..07 · DD-01..05 · UI-01 · EXC-01 · QA-01..06 | ✅ |

```
$ pnpm --filter backend test          Tests: 47 passed, 47 total
$ pnpm --filter backend test:e2e      Tests: 20 passed, 20 total   (PostgreSQL จริง + Core Hub ปลอม)
$ pnpm -r typecheck · lint · build    ผ่าน
```

- v1.0.4 แก้ปัญหา `jq.exe` ของ Windows ได้จริง: รันด้วย `jq.exe` ตรง ๆ แล้ว ARC-02 / QA-06 ผ่าน ไม่ต้องครอบ `tr -d '\r'` แล้ว

## เปิดดูหน้าจอจริง (Chrome · 29 ก.ย.)

login ที่ Core Hub ด้วยบัญชีทดสอบ `staff@core.local` แล้วไล่ดูทีละหน้า

| หน้า / ส่วน | ผล |
|---|---|
| เปิด `/` ยังไม่ login | พาไปหน้า login ของ Core Hub เอง → login แล้วกลับมาหน้าเดิม |
| หน้าแรก · ค้นหา · แจ้งของ · รับของคืน · รายการของฉัน · แอดมิน | แสดงปกติหลังย้ายเป็น Tailwind v4 · โหลดข้อมูลจาก API ได้ · ไม่มี error ใน console |
| แผนที่ดูตำแหน่ง (หน้ารายละเอียด) | tile ของ OSM โหลดครบ · มีหมุด (รูปจากแพ็กเกจ leaflet ไม่ใช้ CDN) · มีเครดิต "© OpenStreetMap contributors" |
| แผนที่ปักหมุด (หน้าแจ้งของ) | คลิกแล้วหมุดขึ้น · ฟอร์มบันทึกพิกัด |
| แผนที่จุดเสี่ยง (แอดมิน > สถิติ) | วงความหนาแน่นขึ้นตรงตำแหน่ง · มีเครดิต OSM |
| เมนูผู้ใช้ | แสดงอีเมลจริงและสิทธิ์ "เจ้าหน้าที่ (ตามบทบาทในบัญชี Core Hub)" · ไม่มีตัวสลับสิทธิ์หรือช่องรหัสผ่าน |
| ออกจากระบบ | พากลับเว็บ Core Hub · เรียก API ต่อได้ 401 (คุกกี้ถูกลบ) |

เจอและแก้ระหว่างตรวจ: ตอนยังไม่ login หน้าเว็บโชว์แถบแดง "กรุณาเข้าสู่ระบบอีกครั้ง" แวบหนึ่งก่อนถูกพาไป login → ตอนนี้แสดงเป็นกำลังโหลดแทน

## ตรวจว่าไม่มีข้อมูลที่ห้ามติดไป

- `csmju-core-hub/` ย้ายไปอยู่นอก repo แล้ว (`Desktop/csmju-core-hub`) · ใน PR 2 มี 151 ไฟล์ ไม่มี `.env` `.env.local` `*.pem` `*.key` `csmju-core-hub` `node_modules` `dist` `.next` `uploads/` หรือฐานข้อมูลเก่า
- `.gitignore` ใช้ของ scaffold (`.env` · `*.pem` · `*.key` ฯลฯ) รวมกับของระบบนี้

## สิ่งที่เปลี่ยนเพื่อให้ตรงกับ repo จริง

- ชื่อระบบเป็น **`csmju-lost-and-found`** ตาม scaffold (เดิมผมตั้งเป็น `lost-and-found`)
  - เปลี่ยนใน `SUBSYSTEM_ID` · `/api/health` · `subsystem.yaml` · ทะเบียน Core Hub (entry เดิม เปลี่ยนชื่อ + `standardsVersion: "1.0.4"` + `repo` ยังเป็น APPROVED / ACTIVE)
- `subsystem.yaml` คง `owners` · `display_name` · `repo` · `status: proposed` ของ scaffold ไว้
- `package.json` ที่ราก ใช้ `pnpm@12.3.4` ตาม tech-stack 1.1 (scaffold เป็น `pnpm@9.15.9`)
- `.env.example` ที่ราก ชี้ไป `backend/.env.example` และ `frontend/.env.example` (ของ scaffold เป็นค่าตัวอย่าง `CHANGE-ME`)

## สิ่งที่แก้ในรอบก่อน (ยังอยู่ใน PR 2)

- **บั๊ก 401 `missing_token`:** ชั้น auth ใช้ reference สัญญา 1.0 (`demo-student-subsystem` main) ไม่แก้ตรรกะ · `/auth/login` `/auth/callback` `/auth/logout` ฝั่งเบราว์เซอร์เป็น route ของ frontend
- **dependency:** ถอด `react-leaflet` ออก ใช้ `leaflet` ตรง ๆ · `lucide-react` · `leaflet` · `qrcode.react` อยู่ใน dependencies · QR มีแค่ลิงก์หน้ารายการ
- **แผนที่:** tile OpenStreetMap พร้อมเครดิต · เดิมใช้ Google Maps โดยไม่มี API key (ภาพดาวเทียม) — **รอ PM ตัดสินเรื่องภาพดาวเทียม (ข้อ 2 ของ PM ยังว่าง)**
- **Tailwind v4:** token อยู่ใน `@theme` ของ `globals.css`

## Role mapping (ตรงกับ default_role_mapping ในทะเบียน)

| core role | subsystem role | ในระบบนี้ |
|---|---|---|
| student | STUDENT | ผู้ใช้ทั่วไป |
| alumni | ALUMNI | ผู้ใช้ทั่วไป |
| staff | STAFF | เจ้าหน้าที่ |
| admin | ADMIN | เจ้าหน้าที่ |

## ข้อจำกัดที่ต้องรู้ (สัญญา 1.0)

- บน `localhost` ระบบย่อยทุกตัวใช้คุกกี้ชื่อ `core_hub_access_token` เหมือนกัน เปิดหลายระบบย่อยพร้อมกันในเครื่องแล้วคุกกี้ทับกันได้ (แก้ใน 1.1)
- ออกจากระบบลบแค่คุกกี้ของระบบนี้ Core Hub ยัง login อยู่ เปิดระบบนี้อีกครั้งจะเข้าได้ทันที (1.0 ยังไม่มี logout ทั้งระบบ)
