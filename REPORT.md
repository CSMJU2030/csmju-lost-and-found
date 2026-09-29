# REPORT — lost-and-found

มาตรฐาน: csmju2030-standards **v1.0.2** (submodule `standards/` ที่ tag `v1.0.2`) · ตรวจวันที่ 2026-09-28
Core Hub ที่ใช้ทดสอบ: branch `main` (SSO 1.0) รันจริงในเครื่อง

## ผลรัน

```
$ node standards/conformance/run.js
RESULT: 62 passed · 0 failed · 0 skipped
✅ CONFORMANT — lost-and-found meets standard v1.0 L3
```

```
$ pnpm --filter backend test          Tests: 47 passed, 47 total
$ pnpm --filter backend test:e2e      Tests: 20 passed, 20 total   (PostgreSQL จริง + Core Hub ปลอม)
$ pnpm -r typecheck · lint · build    ผ่าน (frontend: next typegen && tsc --noEmit · Next.js 15.5 · Tailwind v4)
```

```
$ ./standards/scripts/run-all-checks.sh .        (branch feature/lost-and-found/standards-v1-0-2)
❌ 2 / 18 checks failed — merge would be blocked.
```

| กฎ | ผล | สาเหตุ |
|---|---|---|
| GH-01 · GH-03 · GH-04 (1.0.2) · SEC-03 · SEC-04/05 · ARC-01 · ARC-02/03 · API-01 · API-02..07 · DD-01/02 · DD-03 · DD-04 · DD-05 · UI-01 · EXC-01 · QA-01..06 | ✅ | |
| GH-02 | ❌ | ตอนรันในเครื่อง สคริปต์ตรวจ commit ล่าสุด (`02`) — ยังไม่ได้ commit งานรอบนี้ · commit ใหม่ต้องเป็น `feat(lost-and-found): …` (บน CI ตรวจเฉพาะ commit ใน PR) |
| SEC-01 | ❌ | เจอเฉพาะ `backend/.env` ในเครื่อง (git ignore แล้ว ไม่ขึ้น CI) |

**เทียบกับรอบที่ตรวจด้วย 1.2.0: ไม่มีข้อไหนที่เคยผ่านแล้วตก**

สิ่งที่จัดการเพื่อให้ผ่าน:
- ย้าย `csmju2030-standards/` (สำเนาเก่า) และ `csmju-core-hub/` ออกไปไว้ข้าง repo — เคยทำให้ DD-03 และ QA-06 ตก
- ย้าย `backend/.git` ที่ว่างเปล่า (`git init` ไว้โดยไม่มี commit) ออก เพื่อให้ `backend/` อยู่ใน repo หลักจริง
- ทำงานบน branch `feature/lost-and-found/standards-v1-0-2` (GH-01)

> Windows: `jq.exe` คืนบรรทัดแบบ CRLF ทำให้ ARC-02 ตกหลอกทุก dependency (แม้แต่ `@nestjs/common`)
> ต้องกรอง `\r` ออกก่อน (ครอบ jq ด้วย `tr -d '\r'`) จึงได้ผลจริงข้างบน — อาจแจ้งทีม standards ให้สคริปต์รองรับ

## สิ่งที่แก้ในรอบนี้

### บั๊ก: 401 `missing_token` ไม่หยุด (log ที่แนบมา)

- **สาเหตุ:** ระบบทำ SSO ตามสัญญา 1.1 แต่ Core Hub `main` ยังเป็น 1.0
  ตอน Core Hub ส่งกลับมาที่ `/auth/callback` ระบบ (ตามกฎ 1.1) ทิ้ง token แล้วส่งไป `/auth/login`
  ซึ่งพาไป `/sso/authorize` ของเว็บ Core Hub ที่ `main` ไม่มี → ไม่เคยได้คุกกี้ session → ทุก API ได้ 401
- **แก้:** ย้ายชั้น auth/common ของ backend ไปใช้ reference implementation สัญญา 1.0 (`demo-student-subsystem` branch `main`) ทั้งชุด ไม่แก้ตรรกะ
  - callback รับ token ทั้งแบบมีและไม่มี `state` แล้วตั้งคุกกี้ `core_hub_access_token`
  - `/auth/login` `/auth/callback` `/auth/logout` ฝั่งเบราว์เซอร์เป็น route ของ frontend
    - `/auth/login` พาไปเริ่ม SSO ที่เว็บ Core Hub `/api/sso/lost-and-found`
    - `/auth/callback` ส่งต่อให้ backend ตรวจ แล้วพากลับหน้าที่ตั้งใจจะเข้า
- **ทดสอบ flow จริงแบบเบราว์เซอร์ (cookie jar):** login ที่เว็บ Core Hub → `/auth/login?next=/my-items` → Core Hub → callback 302 กลับ `/my-items` → `/api/v1/members/me` 200 → logout → 401
- เอา rate limit ของ 1.1 ออกด้วย เพราะ error code `TOO_MANY_REQUESTS` ไม่อยู่ใน 7 ค่าของสัญญา 1.0 (ถ้าคงไว้ API-04 จะตก)

### ผูกมาตรฐาน v1.0.2 (ครบ 4 ที่ตามที่ PM สั่ง)

- `ci.yml` → `@v1.0.2`
- submodule `standards/` → tag `v1.0.2`
- `.standards-version` → `1.0.2`
- `subsystem.yaml` → `standards_version: "1.0.2"` (`public_endpoints` เหลือ `GET /api/health` · `GET /auth/callback` ตามสัญญา 1.0)
- ทะเบียนใน Core Hub อัปเดตเป็น `standardsVersion: "1.0.2"` แล้ว
- เอา `conformance-nightly.yml` ออก เพราะ v1.0.2 ไม่มี template นี้ (มาใน 1.1)
- **PR นี้แก้ `.github/workflows` และ `standards` จะตก GH-03 เป็นปกติ → ต้องส่งให้ PM merge**

### dependency ตามที่ PM อนุมัติ

- `lucide-react` · `leaflet` · `qrcode.react` อยู่ใน `dependencies` · `@types/leaflet` อยู่ใน devDependencies
- เอา `react-leaflet` ออก แผนที่ 3 ตัว (ปักหมุดตอนแจ้ง · ดูตำแหน่ง · แผนที่ความหนาแน่นของเจ้าหน้าที่) เขียนใหม่ด้วย `leaflet` ตรง ๆ ตาม tech-stack ข้อ 1.4.2
- tile เปลี่ยนเป็น OpenStreetMap และแสดงเครดิต OSM
  - เดิมใช้ tile ของ Google Maps (ภาพดาวเทียม) โดยไม่มี API key ซึ่งขัดเงื่อนไขของ Google
  - ผลคือแผนที่เป็นแผนที่ถนน ไม่ใช่ภาพดาวเทียมแล้ว
- รูปหมุดใช้ไฟล์จากแพ็กเกจ `leaflet` เอง ไม่โหลดจาก CDN แล้ว (ถ้าตั้ง CSP ต้องเพิ่มแค่ `tile.openstreetmap.org` ใน `img-src`)
- QR บนโปสเตอร์ใส่แค่ลิงก์หน้ารายการ (ข้อมูลสาธารณะ) ไม่มี token หรือข้อมูลบุคคล

### Tailwind v4

- ย้าย token จาก `tailwind.config.ts` ไป `@theme` ใน `frontend/src/app/globals.css` (ลบ `tailwind.config.ts` และ `autoprefixer` · ใช้ `@tailwindcss/postcss`)
- ชื่อ class ที่ v4 เปลี่ยนความหมาย (`shadow-sm` → `shadow-xs`, `ring` ฯลฯ) แก้ด้วยเครื่องมือทางการ `@tailwindcss/upgrade`
- แก้ตัวแปรฟอนต์ที่เครื่องมือสร้างให้อ้างตัวเอง (`--font-display`)
- **ยังไม่ได้เปิดดูหน้าจอจริงหลังย้ายเป็น v4** — build ผ่าน แต่ควรเปิดดูว่าหน้าตาเหมือนเดิม

## ชั้น auth ที่คัดลอกมา

- จาก `demo-student-subsystem` branch `main` (สัญญา 1.0): `src/auth/` ทั้งหมด (ยกเว้น `permissions.ts`), `src/common/` ทั้งหมด, `src/config/` (`configuration.ts` เพิ่มค่าของระบบนี้ เช่น port 4000, `uploadDir`), `src/health/`, `src/main.ts` (เรียก `configureApp` เพิ่ม), `test/helpers/fake-core-hub.ts` · `token-factory.ts`
- แก้ไข: ไม่ได้แก้ตรรกะใน `auth/` และ `common/` · `permissions.ts` และ spec ของ permission เขียนเองตามโดเมน (AGENTS ข้อ 2 อนุญาต)

## Role mapping (ตรงกับ default_role_mapping ในทะเบียน)

| core role | subsystem role | ในระบบนี้ |
|---|---|---|
| student | STUDENT | ผู้ใช้ทั่วไป |
| alumni | ALUMNI | ผู้ใช้ทั่วไป |
| staff | STAFF | เจ้าหน้าที่ |
| admin | ADMIN | เจ้าหน้าที่ |

## ข้อสมมติที่ตั้งเอง

1. frontend (:3002) เป็น `base_url` และ `callback_url` · `/auth/login` `/auth/callback` `/auth/logout` เป็น route ของ Next.js
   - backend ยังเป็นผู้ตรวจ token และตั้งคุกกี้เองตาม reference
   - frontend แค่ส่งต่อคำขอ แล้ว redirect กลับหน้าที่ผู้ใช้ตั้งใจจะเข้า (callback ของ reference ตอบเป็น JSON ซึ่งเบราว์เซอร์ใช้ต่อไม่ได้)
2. `state` จาก Core Hub ระบบนี้ตรวจไม่ได้ (Core Hub สุ่มเอง) จึงส่งกลับใน body ของ backend ตามข้อ 5.1 "ควรส่งกลับให้ client ตรวจได้"
3. logout ลบแค่คุกกี้ของระบบนี้แล้วกลับเว็บ Core Hub (สัญญา 1.0 ยังไม่มี logout ทั้งระบบ)

## ข้อจำกัดที่ต้องรู้ (สัญญา 1.0)

- บน `localhost` ระบบย่อยทุกตัวที่ใช้สัญญา 1.0 ตั้งคุกกี้ชื่อ `core_hub_access_token` เหมือนกัน ถ้าเปิดหลายระบบย่อยพร้อมกันในเครื่อง คุกกี้ทับกันได้ (แก้ใน 1.1)
- ยังไม่มี silent re-SSO: token หมดอายุ 15 นาทีแล้วหน้าเว็บจะพาไป `/auth/login` อีกรอบ (ถ้า Core Hub ยัง login อยู่จะกลับมาเองโดยไม่ต้องกรอกรหัส)

## สิ่งที่ยังไม่ได้ทดสอบ

- ยังไม่ได้คลิกผ่านหน้าเว็บในเบราว์เซอร์จริง: ทดสอบ SSO ด้วย cookie jar + conformance, ทดสอบทุก flow ผ่าน API (e2e), และ build ทุกหน้าผ่าน
- หน้าตาหลังย้ายเป็น Tailwind v4 และแผนที่ที่เขียนใหม่ ต้องเปิดดูด้วยตา
