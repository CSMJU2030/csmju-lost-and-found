import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// แนบ datasource เฉพาะตอนมี DATABASE_URL จริง (แบบเดียวกับ Core Hub)
// เพราะ `prisma generate` รันตอน postinstall ซึ่งยังไม่มี .env — generate ไม่ต้องต่อฐานข้อมูล
// ส่วนคำสั่งที่ต้องต่อจริง (migrate deploy, db seed) จะแจ้ง error เองถ้าไม่ได้ตั้งค่า
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
