/**
 * Central SSO ตาม auth-contract 1.0 ข้อ 5 (standards v1.0.2):
 * Core Hub -> GET /auth/callback?access_token=… -> คุกกี้ core_hub_access_token (HttpOnly) -> ใช้ API ได้
 */
import request from 'supertest';
import { bootApp } from './helpers/boot-app';
import { signCoreHubToken, tamperPayload } from './helpers/token-factory';

const SESSION = 'core_hub_access_token';

const cookieNamed = (res: request.Response, name: string): string | undefined =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));
const pair = (cookie: string) => cookie.split(';')[0];

describe('Central SSO 1.0 (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootApp>>;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await bootApp();
    token = await signCoreHubToken(ctx.key, { sub: 'user-002', email: 'student@core.local', role: 'student' });
  });
  afterAll(() => ctx.close());

  it('callback ที่ token ถูกต้อง (มีหรือไม่มี state) -> ตั้งคุกกี้ session แบบ HttpOnly · คุกกี้อย่างเดียวเรียก API ได้', async () => {
    for (const state of ['', '&state=from-core-hub']) {
      const res = await http()
        .get(`/auth/callback?access_token=${token}&token_type=Bearer&expires_in=900${state}`)
        .expect(200);
      const session = cookieNamed(res, SESSION)!;
      expect(session).toMatch(/HttpOnly/i);
      expect(session).toMatch(/SameSite=Lax/i);
      expect(Number(/Max-Age=(\d+)/i.exec(session)?.[1])).toBeLessThanOrEqual(900);
      if (state) expect(res.body.data.state).toBe('from-core-hub');

      const me = await http().get('/api/v1/me').set('Cookie', pair(session)).expect(200);
      expect(me.body.data.id).toBe('user-002');
      await http().get('/api/v1/items').set('Cookie', pair(session)).expect(200);
    }
  });

  it('token เสีย / ถูกแก้ -> 401 และไม่ออกคุกกี้ · ไม่มี token -> 400', async () => {
    const tampered = await http()
      .get(`/auth/callback?access_token=${tamperPayload(token, { role: 'admin' })}`)
      .expect(401);
    expect(tampered.headers['set-cookie']).toBeUndefined();
    await http().get('/auth/callback').expect(400);
  });

  it('core role ที่ระบบนี้ไม่รับ -> 403 และไม่ออกคุกกี้', async () => {
    const guest = await signCoreHubToken(ctx.key, { sub: 'user-900', role: 'guest' });
    const res = await http().get(`/auth/callback?access_token=${guest}`).expect(403);
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
