/**
 * ค่าคงที่ของชุดทดสอบ e2e — รันก่อนไฟล์ทดสอบ (ก่อน import AppModule)
 * ค่าที่ชุดทดสอบตรวจถูกตั้งไว้ทั้งหมด เพื่อไม่ให้ backend/.env ของแต่ละเครื่องมีผล
 * ฐานข้อมูล: test/helpers/test-db.ts ตั้ง DATABASE_URL ให้แต่ละไฟล์ทดสอบเอง
 */
process.env.NODE_ENV = 'test';
process.env.CORE_HUB_ISSUER = 'core-hub';
process.env.CORE_HUB_AUDIENCE = 'csmju2030';
process.env.JWKS_CACHE_TTL_MS = '60000';
process.env.JWKS_MIN_REFRESH_INTERVAL_MS = '1';
process.env.SUBSYSTEM_ID = 'csmju-lost-and-found';
process.env.CORE_HUB_WEB_URL = 'http://hub-web.test';
process.env.SSO_STATE_TTL_SEC = '600';
process.env.SSO_POST_LOGIN_REDIRECT = '/';
process.env.TRUST_PROXY = '';
process.env.MAX_SECRET_ATTEMPTS = '3';

// ชุดทดสอบยิง request จากที่อยู่เดียวเร็วมาก — ยก rate limit ไม่ให้ 429 บังผลทดสอบจริง
for (const layer of ['IP', 'USER']) {
  process.env[`THROTTLE_${layer}_BURST_LIMIT`] = '100000';
  process.env[`THROTTLE_${layer}_SUSTAINED_LIMIT`] = '100000';
}
