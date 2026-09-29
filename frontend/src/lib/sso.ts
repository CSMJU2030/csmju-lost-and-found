// ค่าที่ route handler ของ SSO ใช้ (ฝั่ง server เท่านั้น) — auth-contract 1.0 ข้อ 5 (standards v1.0.2)

/** backend (NestJS) ของระบบนี้ */
export const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
/** เว็บของ Core Hub — เริ่ม SSO ที่ {CORE_HUB_WEB_URL}/api/sso/<ชื่อระบบ> (login ให้ก่อนถ้ายังไม่ได้ login) */
export const CORE_HUB_WEB_URL = (process.env.CORE_HUB_WEB_URL || 'http://localhost:3100').replace(/\/$/, '');
/** ชื่อระบบในทะเบียน Core Hub */
export const SUBSYSTEM_ID = process.env.SUBSYSTEM_ID || 'csmju-lost-and-found';

/** คุกกี้ session ตามสัญญา 1.0 (backend ตั้งให้ตอน /auth/callback) */
export const SESSION_COOKIE = 'core_hub_access_token';
/** หน้าที่จะกลับไปหลัง login — ใช้ได้ครั้งเดียว ส่งกลับมาเฉพาะที่ /auth/callback */
export const NEXT_COOKIE = 'lost_and_found_sso_next';

/**
 * path ภายในระบบนี้เท่านั้น (กัน open redirect): ขึ้นต้น / แต่ไม่ใช่ // · ไม่มี \ และอักขระควบคุม
 * · ยาวไม่เกิน 512 · ไม่ชี้กลับเข้า /auth
 */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes(String.fromCharCode(92))) return null;
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return null;
  }
  const base = new URL('http://self.invalid');
  const url = new URL(raw, base);
  if (url.origin !== base.origin || url.pathname === '/auth' || url.pathname.startsWith('/auth/')) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
