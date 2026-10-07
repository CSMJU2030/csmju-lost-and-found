const path = require('node:path');

/** @type {import('next').NextConfig} */

// backend (NestJS) ของระบบนี้ — เบราว์เซอร์เรียกผ่าน origin เดียวกับหน้าเว็บ
// จึงได้คุกกี้ session ของ SSO โดยไม่ต้องเปิด CORS · /auth/* เป็น route handler ใน src/app/auth/
// BACKEND_URL ถูกฝังตอน next build (dev: .env · image: frontend/Dockerfile = http://api:4000)
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4220').replace(/\/$/, '');

const nextConfig = {
  // deployment.md ข้อ 3: image มีแค่ standalone server ที่ trace แล้ว (DEP-04)
  output: 'standalone',
  // pnpm เก็บ dependency ไว้ที่รากของ workspace — ต้อง trace จากราก ไม่งั้น standalone ขาดแพ็กเกจ
  outputFileTracingRoot: path.join(__dirname, '..'),
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
