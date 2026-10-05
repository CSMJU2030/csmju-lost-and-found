import { NextResponse, type NextRequest } from 'next/server';
import { CORE_HUB_WEB_URL, NEXT_COOKIE, SUBSYSTEM_ID, safeNext } from '@/lib/sso';

// GET /auth/login?next=<path> — พาเบราว์เซอร์ไปเริ่ม SSO ที่เว็บ Core Hub (ระบบนี้ไม่มีหน้า login เอง)
// Core Hub login ให้ก่อนถ้าจำเป็น แล้วส่งกลับมาที่ /auth/callback ที่ลงทะเบียนไว้
export function GET(request: NextRequest) {
  const res = NextResponse.redirect(`${CORE_HUB_WEB_URL}/api/sso/${encodeURIComponent(SUBSYSTEM_ID)}`, 302);
  res.headers.set('Cache-Control', 'no-store');
  const next = safeNext(request.nextUrl.searchParams.get('next'));
  if (next) {
    res.cookies.set(NEXT_COOKIE, next, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/auth/callback',
      maxAge: 600,
    });
  }
  return res;
}
