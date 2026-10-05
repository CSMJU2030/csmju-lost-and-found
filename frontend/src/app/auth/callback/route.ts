import { NextResponse, type NextRequest } from 'next/server';
import { BACKEND_URL, NEXT_COOKIE, safeNext } from '@/lib/sso';

// GET /auth/callback — callback_url ที่ลงทะเบียนกับ Core Hub
// ส่งต่อให้ backend ตรวจ token และตั้งคุกกี้ session (ชั้น auth ของ reference implementation ไม่แก้)
// ผ่าน -> พาไปหน้าที่ผู้ใช้ตั้งใจจะเข้า · ไม่ผ่าน -> ตอบสถานะเดิมของ backend (400/401/403) โดยไม่มีคุกกี้ session
export async function GET(request: NextRequest) {
  const target = new URL('/auth/callback', BACKEND_URL);
  target.search = request.nextUrl.search;

  let upstream: Response;
  try {
    upstream = await fetch(target, { cache: 'no-store', redirect: 'manual' });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'เชื่อมต่อ backend ไม่ได้' } },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  if (upstream.status !== 200) {
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { ...headers, 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  }

  const next = safeNext(request.cookies.get(NEXT_COOKIE)?.value) ?? '/';
  const res = NextResponse.redirect(new URL(next, request.url), 302);
  for (const [key, value] of Object.entries(headers)) res.headers.set(key, value);
  // ต่อ header เองทีละบรรทัด (res.cookies.set จะเขียนทับ Set-Cookie ที่ได้จาก backend)
  // คุกกี้ session ของ backend ต้องมาก่อน แล้วค่อยลบคุกกี้ next ที่ใช้ครั้งเดียว
  for (const cookie of upstream.headers.getSetCookie()) res.headers.append('Set-Cookie', cookie);
  res.headers.append('Set-Cookie', `${NEXT_COOKIE}=; Path=/auth/callback; Max-Age=0; HttpOnly; SameSite=Lax`);
  return res;
}
