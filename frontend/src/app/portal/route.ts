import { NextResponse } from 'next/server';
import { CORE_HUB_WEB_URL } from '@/lib/sso';

// GET /portal — ปุ่ม "กลับ CSMJU Portal" ใน sidebar: พาไปเว็บ Core Hub (ค่ามาจาก env ฝั่ง server ไม่ฝังใน client)
export function GET() {
  const res = NextResponse.redirect(`${CORE_HUB_WEB_URL}/`, 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
