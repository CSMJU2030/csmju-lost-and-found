# การเชื่อม Lost & Found กับ Core Hub

Lost & Found ไม่มีหน้า login และไม่เก็บรหัสผ่าน ผู้ใช้ login ที่ **Core Hub** แล้วเข้ามาผ่าน Central SSO
ตามสัญญา [`auth-contract.md`](../standards/docs/auth-contract.md) **ฉบับ 1.0 ใน submodule `standards/` (v1.0.4)**
— backend ตรวจ token เองด้วยกุญแจสาธารณะจาก JWKS ของ Core Hub

## ลำดับการเข้าระบบ (SSO 1.0)

```text
เบราว์เซอร์ → http://localhost:3220/<หน้าไหนก็ได้>
  API ตอบ 401 → หน้าเว็บพาไป /auth/login?next=<หน้านั้น>        (route ของ frontend)
  → 302 เว็บ Core Hub /api/sso/csmju-lost-and-found                   (login ที่ Core Hub ก่อนถ้ายังไม่ได้ login)
  → 302 http://localhost:3220/auth/callback?access_token=…&state=…
  → frontend ส่งต่อให้ backend ตรวจ token (RS256 · JWKS · kid · iss · aud · exp · sub) + แมป role
  → ตั้งคุกกี้ core_hub_access_token (HttpOnly · SameSite=Lax · อายุเท่า token) → กลับไปหน้าเดิม
```

- กดชื่อระบบในเมนูของ Core Hub ก็ได้ผลเหมือนกัน (Core Hub เริ่ม SSO ให้เอง)
- token เสีย → `401` · core role ที่ระบบนี้ไม่รับ → `403` · ไม่มี token → `400` — ทุกกรณีไม่ตั้งคุกกี้
- token หมดอายุ (15 นาที) → API ตอบ `401` → หน้าเว็บพาไป `/auth/login` อีกรอบ ถ้า Core Hub ยัง login อยู่จะกลับมาเองทันที
- ออกจากระบบ (`POST /auth/logout`) ลบคุกกี้ของระบบนี้แล้วพากลับเว็บ Core Hub — สัญญา 1.0 ยังไม่มี logout ทั้งระบบ

## ค่าที่ต้องตั้ง

`backend/.env`

| ตัวแปร | ค่า (เครื่อง dev) | หมายเหตุ |
|---|---|---|
| `CORE_HUB_URL` | `http://localhost:3000` | API ของ Core Hub |
| `CORE_HUB_JWKS_URL` | `http://localhost:3000/api/v1/.well-known/jwks.json` | production ต้องเป็น https |
| `CORE_HUB_ISSUER` / `CORE_HUB_AUDIENCE` | `core-hub` / `csmju2030` | ค่าคงที่ของสัญญา ห้ามเปลี่ยน |
| `SUBSYSTEM_ID` | `csmju-lost-and-found` | ต้องตรงกับชื่อในทะเบียนและ `subsystem.yaml` |

`frontend/.env.local` (ไม่ตั้งก็ได้ถ้าใช้ค่าเริ่มต้น)

| ตัวแปร | ค่าเริ่มต้น |
|---|---|
| `BACKEND_URL` | `http://localhost:4220` |
| `CORE_HUB_WEB_URL` | `http://localhost:3100` |
| `SUBSYSTEM_ID` | `csmju-lost-and-found` |

## ลงทะเบียนกับ Core Hub (ครั้งเดียว)

ใช้ Core Hub branch `main` ล่าสุด (`git pull` → `pnpm install` → ใน `backend/`: `pnpm exec prisma migrate deploy` → `pnpm run build` → `node dist/prisma/seed.js`)
แล้วรันใน Git Bash

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@core.local","password":"password1"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.access_token))")

curl -s -X POST http://localhost:3000/api/v1/subsystems -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"csmju-lost-and-found","displayName":"Lost & Found","owner":"admin","repo":"CSMJU2030/csmju-lost-and-found",
       "standardsVersion":"1.0.4","callbackUrl":"http://localhost:3220/auth/callback",
       "defaultRoleMapping":{"student":"STUDENT","alumni":"ALUMNI","staff":"STAFF","admin":"ADMIN"},
       "requestedExceptions":[]}'
# นำ "id" ที่ได้มาใส่แทน <ID>
curl -s -X POST http://localhost:3000/api/v1/subsystems/<ID>/approve  -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/v1/subsystems/<ID>/activate -H "Authorization: Bearer $TOKEN"
```

- เคยลงทะเบียนไว้แล้ว: `PATCH /api/v1/subsystems/<ID>` ส่ง `{"standardsVersion":"1.0.4"}`
- `callbackUrl` คือที่อยู่ของ **frontend** (`:3220`) ซึ่งส่งต่อ `/auth/callback` ให้ backend
- `defaultRoleMapping` ต้องตรงกับ [src/auth/role-mapping.ts](src/auth/role-mapping.ts) และ `subsystem.yaml`

## ทดสอบว่าเชื่อมได้

```bash
STAFF=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"staff@core.local","password":"password3"}' \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.access_token))")
curl -s http://localhost:3220/api/v1/me -H "Authorization: Bearer $STAFF"    # "subsystemRole":"STAFF"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3220/api/v1/me     # 401
node standards/conformance/run.js                                             # ต้องได้ CONFORMANT L3
```

> บน `localhost` คุกกี้ไม่แยกตาม port: ระบบย่อยทุกตัวที่ใช้สัญญา 1.0 ใช้ชื่อคุกกี้ `core_hub_access_token` เหมือนกัน
> ถ้าเปิดหลายระบบย่อยพร้อมกันในเครื่อง คุกกี้จะทับกันได้ (สัญญา 1.1 แก้ด้วยชื่อ `<ชื่อระบบ>_access_token`)
