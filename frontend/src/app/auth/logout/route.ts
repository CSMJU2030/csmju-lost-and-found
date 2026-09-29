import { NextResponse } from 'next/server';
import { CORE_HUB_WEB_URL, SESSION_COOKIE } from '@/lib/sso';

// POST /auth/logout — ลบคุกกี้ session ของระบบนี้ แล้วกลับไปเว็บ Core Hub
// (สัญญา 1.0 ยังไม่มี logout ทั้งระบบ — ออกจาก Core Hub ได้ที่เว็บของ Core Hub)
export function POST() {
  const res = NextResponse.redirect(`${CORE_HUB_WEB_URL}/`, 303);
  res.headers.set('Cache-Control', 'no-store');
  res.cookies.set(SESSION_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
