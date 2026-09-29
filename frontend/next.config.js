/** @type {import('next').NextConfig} */

// backend (NestJS) ของระบบนี้ — เบราว์เซอร์เรียกผ่าน origin เดียวกับหน้าเว็บ
// จึงได้คุกกี้ session ของ SSO โดยไม่ต้องเปิด CORS · /auth/* เป็น route handler ใน src/app/auth/
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
