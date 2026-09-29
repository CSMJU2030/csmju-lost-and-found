/**
 * ทุก flow ของ Lost & Found ผ่าน HTTP จริง: แอป Nest ทั้งตัว + Core Hub ปลอม (JWKS) + PostgreSQL จริง
 * ตัวตนมาจาก Core Hub token (RS256) เท่านั้น — ชุดทดสอบเซ็น token ด้วยกุญแจที่สร้างขึ้นเฉพาะในการทดสอบ
 */
import request from 'supertest';
import { bootApp } from './helpers/boot-app';
import { createAlgNoneToken, signCoreHubToken, signHs256Token, tamperPayload } from './helpers/token-factory';

// รูป PNG ขนาด 1x1 สำหรับทดสอบอัปโหลด
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const people = {
  finder: { sub: 'user-101', email: 'finder@core.local', role: 'student' },
  owner: { sub: 'user-102', email: 'owner@core.local', role: 'student' },
  other: { sub: 'user-103', email: 'other@core.local', role: 'alumni' },
  staff: { sub: 'user-201', email: 'staff@core.local', role: 'staff' },
};
type Person = keyof typeof people;

const itemBody = (over: Record<string, unknown> = {}) => ({
  reportType: 'found',
  name: 'iPhone 15 เคสใส',
  description: 'เคสใส มีสติกเกอร์แมว',
  category: 'อิเล็กทรอนิกส์',
  location: 'คณะวิทยาศาสตร์ (อาคารจุฬา)',
  faculty: 'คณะวิทยาศาสตร์',
  building: 'อาคารจุฬา',
  room: 'ห้อง 204',
  dateLost: '2026-09-21',
  timeLost: '12:30',
  pinX: 18.8983,
  pinY: 99.013,
  reporterName: 'ผู้พบ ทดสอบ',
  reporterStudentId: '6704100001',
  reporterPhone: '0812345678',
  reporterContact: 'Line: finder',
  ...over,
});

const claimBody = (itemId: string, over: Record<string, unknown> = {}) => ({
  itemId,
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  studentId: '6704100002',
  department: 'คณะวิทยาศาสตร์',
  meetDate: '2026-09-25',
  meetTime: '13:00',
  meetLocation: 'คณะวิทยาศาสตร์',
  contact: '0899999999',
  ...over,
});

describe('Lost & Found API (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootApp>>;
  const tokens = {} as Record<Person, string>;
  const http = () => request(ctx.app.getHttpServer());

  const call = (method: 'get' | 'post' | 'patch' | 'delete', url: string, who?: Person, body?: unknown) => {
    const req = http()[method](url);
    if (who) req.set('Authorization', `Bearer ${tokens[who]}`);
    return body === undefined ? req : req.send(body as object);
  };
  const claimOf = async (who: Person, id: string) =>
    (await call('get', '/api/v1/claims?scope=mine&limit=100', who)).body.data.find(
      (c: { requestId: string }) => c.requestId === id,
    );

  beforeAll(async () => {
    ctx = await bootApp();
    for (const [name, p] of Object.entries(people)) {
      tokens[name as Person] = await signCoreHubToken(ctx.key, p);
    }
  });
  afterAll(() => ctx.close());

  let foundItemId = '';
  let lostItemId = '';

  describe('สัญญากลาง: health · envelope · 401/403', () => {
    it('GET /api/health เป็น public และบอกชื่อระบบ', async () => {
      const res = await http().get('/api/health').expect(200);
      expect(res.body).toEqual({ success: true, data: { status: 'ok', service: 'csmju-lost-and-found' } });
    });

    it('ไม่มี token / token ปลอม -> 401 UNAUTHORIZED (JSON ไม่ใช่ redirect)', async () => {
      const none = await http().get('/api/v1/items').expect(401);
      expect(none.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
      await http().get('/api/v1/items').set('Authorization', `Bearer ${await signHs256Token()}`).expect(401);
      await http().get('/api/v1/items').set('Authorization', `Bearer ${createAlgNoneToken()}`).expect(401);
      const escalated = tamperPayload(tokens.finder, { role: 'admin' });
      await http().get('/api/v1/stats').set('Authorization', `Bearer ${escalated}`).expect(401);
    });

    it('เชื่อตัวตนจาก token เท่านั้น — header X-Student-Id แบบเดิมไม่มีผล', async () => {
      await http().get('/api/v1/items').set('X-Student-Id', '6704101361').set('X-User-Role', 'admin').expect(401);
    });

    it('core role ที่ระบบไม่รู้จัก -> 403', async () => {
      const guest = await signCoreHubToken(ctx.key, { sub: 'user-900', role: 'guest' });
      const res = await http().get('/api/v1/items').set('Authorization', `Bearer ${guest}`).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('ผู้ใช้ถูกสร้างใน members อัตโนมัติ และ /api/v1/me คืนตัวตนจาก token', async () => {
      const me = await call('get', '/api/v1/me', 'finder').expect(200);
      expect(me.body.data).toMatchObject({ id: 'user-101', coreRole: 'student', subsystemRole: 'STUDENT' });
      const member = await call('get', '/api/v1/members/me', 'staff').expect(200);
      expect(member.body.data).toMatchObject({ email: 'staff@core.local', role: 'admin' });
    });
  });

  describe('รายการของหาย / ของที่พบ', () => {
    it('แจ้งพบของ: ตรวจข้อมูล (400 VALIDATION_ERROR), บันทึกรูป, ซ่อนคำตอบลับ', async () => {
      const bad = await call('post', '/api/v1/items', 'finder', itemBody({ name: '', reporterPhone: '123' })).expect(400);
      expect(bad.body.error.code).toBe('VALIDATION_ERROR');
      expect(bad.body.error.details).toEqual(expect.arrayContaining(['กรุณากรอกชื่อสิ่งของ']));
      await call('post', '/api/v1/items', 'finder', itemBody({ userId: 'x' })).expect(400); // field แปลกปลอม

      const created = await call(
        'post',
        '/api/v1/items',
        'finder',
        itemBody({ images: [PNG], secretQuestion: 'ภาพพื้นหลังเป็นรูปอะไร?', secretAnswer: 'แมวสีส้ม' }),
      ).expect(201);
      const item = created.body.data;
      foundItemId = item.id;
      expect(item.code).toMatch(/^LF-\d{4}-00001$/);
      expect(item.status).toBe('found');
      expect(item.reporterStudentId).toBe('6704100001');
      expect(item.createdAt).toMatch(/Z$/);
      expect(item.imageUrl).toMatch(/^\/uploads\/.+\.png$/);
      await http().get(item.imageUrl).expect(200);

      const publicView = await call('get', `/api/v1/items/${foundItemId}`, 'other').expect(200);
      expect(publicView.body.data.secretQuestion).toBe('ภาพพื้นหลังเป็นรูปอะไร?');
      expect(publicView.body.data.secretAnswer).toBeUndefined();
      expect((await call('get', `/api/v1/items/${foundItemId}`, 'finder')).body.data.secretAnswer).toBe('แมวสีส้ม');
      expect((await call('get', `/api/v1/items/${foundItemId}`, 'staff')).body.data.secretAnswer).toBe('แมวสีส้ม');
    });

    it('แจ้งของหาย + จับคู่อัตโนมัติ + ค้นหา + แบ่งหน้า', async () => {
      const created = await call(
        'post',
        '/api/v1/items',
        'owner',
        itemBody({ reportType: 'lost', name: 'iPhone 15 สีดำ', dateLost: '2026-09-20', reporterName: 'เจ้าของ ทดสอบ' }),
      ).expect(201);
      lostItemId = created.body.data.id;
      expect(created.body.data.status).toBe('searching');

      const matches = await call('get', `/api/v1/items/${lostItemId}/matches`, 'owner').expect(200);
      expect(matches.body.data[0]?.item.id).toBe(foundItemId);
      expect(matches.body.data[0].score).toBeGreaterThanOrEqual(40);

      const search = await call('get', '/api/v1/items?q=iphone&type=lost', 'other').expect(200);
      expect(search.body.data.map((i: { id: string }) => i.id)).toEqual([lostItemId]);
      expect(search.body.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });

      const mine = await call('get', '/api/v1/items?mine=true', 'owner').expect(200);
      expect(mine.body.data).toHaveLength(1);

      const page = await call('get', '/api/v1/items?limit=1&page=2', 'other').expect(200);
      expect(page.body.meta).toEqual({ total: 2, page: 2, limit: 1, totalPages: 2 });
      await call('get', '/api/v1/items?limit=101', 'other').expect(400);

      const empty = await call('get', '/api/v1/items?q=ไม่มีแน่นอน', 'other').expect(200);
      expect(empty.body).toEqual({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    });

    it('id ที่ไม่ใช่ UUID -> 400 · ไม่มีอยู่ -> 404', async () => {
      await call('get', '/api/v1/items/not-a-uuid', 'owner').expect(400);
      const missing = await call('get', '/api/v1/items/99999999-9999-4999-8999-999999999999', 'owner').expect(404);
      expect(missing.body.error.code).toBe('NOT_FOUND');
    });

    it('แก้/ลบรายการได้เฉพาะเจ้าของโพสต์หรือเจ้าหน้าที่ (403)', async () => {
      await call('patch', `/api/v1/items/${lostItemId}`, 'other', { status: 'returned' }).expect(403);
      await call('delete', `/api/v1/items/${lostItemId}`, 'other').expect(403);
    });
  });

  describe('คำขอรับคืน / แจ้งส่งคืน', () => {
    it('ขอรับคืน: คำถามลับ, ล็อก 3 ครั้ง, อนุมัติ, ยืนยันรหัส', async () => {
      // ยื่นกับของที่ตัวเองแจ้งไม่ได้
      await call('post', '/api/v1/claims', 'finder', claimBody(foundItemId, { secretAnswer: 'แมว' })).expect(409);

      // คนอื่นตอบผิด 3 ครั้ง -> ถูกล็อก แม้ครั้งที่ 4 จะตอบถูก
      for (const left of [2, 1, 0]) {
        const wrong = await call('post', '/api/v1/claims', 'other', claimBody(foundItemId, { secretAnswer: 'หมา' })).expect(403);
        if (left > 0) expect(wrong.body.error.message).toMatch(new RegExp(`อีก ${left} ครั้ง`));
      }
      await call('post', '/api/v1/claims', 'other', claimBody(foundItemId, { secretAnswer: 'แมว' })).expect(403);

      // เจ้าของตัวจริงตอบถูก
      await call('post', '/api/v1/claims', 'owner', claimBody(foundItemId, { contact: '12345' })).expect(400);
      const claim = await call('post', '/api/v1/claims', 'owner', claimBody(foundItemId, { secretAnswer: 'แมว' })).expect(201);
      const c = claim.body.data;
      expect(c).toMatchObject({ claimType: 'found', studentId: '6704100002', claimDateTime: '2026-09-25 13:00' });
      expect(c.requestCode).toMatch(/^REQ-[0-9A-F]{8}$/);
      await call('post', '/api/v1/claims', 'owner', claimBody(foundItemId, { secretAnswer: 'แมว' })).expect(409);
      const id = c.requestId;

      // อนุมัติได้เฉพาะเจ้าหน้าที่
      await call('post', `/api/v1/claims/${id}/approve`, 'owner', {}).expect(403);
      const approved = await call('post', `/api/v1/claims/${id}/approve`, 'staff', {}).expect(200);
      expect(approved.body.data).toMatchObject({ status: 'approved', secretAnswerGiven: 'แมว' });

      // รหัสเห็นได้เฉพาะผู้ยื่นคำขอ ผู้พบ (เจ้าของโพสต์) ไม่เห็น
      const code = (await claimOf('owner', id)).handoverCode;
      expect(code).toMatch(/^\d{6}$/);
      expect((await claimOf('finder', id)).handoverCode).toBeUndefined();

      await call('post', `/api/v1/claims/${id}/verify`, 'staff', { code: code === '000000' ? '111111' : '000000' }).expect(400);
      const done = await call('post', `/api/v1/claims/${id}/verify`, 'staff', { code }).expect(200);
      expect(done.body.data).toMatchObject({ status: 'completed', handedOverBy: 'staff@core.local' });
      expect((await call('get', `/api/v1/items/${foundItemId}`, 'owner')).body.data.status).toBe('returned');
    });

    it('แจ้งส่งคืน: ผู้พบส่งของ -> เจ้าของมารับด้วยรหัสรับของ', async () => {
      const claim = await call('post', '/api/v1/claims', 'finder', claimBody(lostItemId, { note: 'เจอที่ลานจอดรถ' })).expect(201);
      expect(claim.body.data.claimType).toBe('lost');
      const id = claim.body.data.requestId;
      await call('post', `/api/v1/claims/${id}/approve`, 'staff', {}).expect(200);

      // ขั้นที่ 1: ผู้พบนำของมาส่งด้วยรหัสของผู้พบ
      const finderCode = (await claimOf('finder', id)).handoverCode;
      const dropped = await call('post', `/api/v1/claims/${id}/verify`, 'staff', { code: finderCode }).expect(200);
      expect(dropped.body.data.status).toBe('at_office');
      expect((await call('get', `/api/v1/items/${lostItemId}`, 'owner')).body.data.status).toBe('found');

      // รหัสรับของเห็นได้เฉพาะเจ้าของ ผู้พบไม่เห็น
      const pickupCode = (await claimOf('owner', id)).pickupCode;
      expect(pickupCode).toMatch(/^\d{6}$/);
      expect((await claimOf('finder', id)).pickupCode).toBeUndefined();

      // ขั้นที่ 2: รหัสของผู้พบใช้ซ้ำไม่ได้ ต้องใช้รหัสรับของของเจ้าของ
      if (finderCode !== pickupCode) {
        await call('post', `/api/v1/claims/${id}/verify`, 'staff', { code: finderCode }).expect(400);
      }
      const done = await call('post', `/api/v1/claims/${id}/verify`, 'staff', { code: pickupCode }).expect(200);
      expect(done.body.data.status).toBe('completed');
      expect((await call('get', `/api/v1/items/${lostItemId}`, 'owner')).body.data.status).toBe('returned');
    });

    it('ผู้ใช้ทั่วไปขอดูคำขอทั้งหมดไม่ได้ · เจ้าหน้าที่ได้', async () => {
      await call('get', '/api/v1/claims?scope=all', 'owner').expect(403);
      const all = await call('get', '/api/v1/claims', 'staff').expect(200);
      expect(all.body.meta.total).toBe(2);
    });

    it('ส่งมอบกันเอง: ผู้ส่งและผู้รับยืนยันครบสองฝ่าย -> ปิดรายการอัตโนมัติ', async () => {
      const item = await call('post', '/api/v1/items', 'finder', itemBody({ name: 'ร่มสีแดง', description: 'ด้ามดำ', category: 'อื่นๆ' })).expect(201);
      const itemId = item.body.data.id;
      const id = (await call('post', '/api/v1/claims', 'owner', claimBody(itemId)).expect(201)).body.data.requestId;

      // ยังไม่อนุมัติ -> ยืนยันไม่ได้
      await call('post', `/api/v1/claims/${id}/confirm`, 'owner', {}).expect(409);
      await call('post', `/api/v1/claims/${id}/approve`, 'staff', {}).expect(200);

      // คนที่ไม่เกี่ยวข้องยืนยันแทนไม่ได้ และเจ้าของโพสต์ปิดรายการเองฝ่ายเดียวไม่ได้
      await call('post', `/api/v1/claims/${id}/confirm`, 'other', {}).expect(403);
      await call('patch', `/api/v1/items/${itemId}`, 'finder', { status: 'returned' }).expect(409);

      // ผู้รับยืนยันก่อน -> ยังไม่ปิด, กดซ้ำไม่เปลี่ยนเวลาเดิม
      const first = await call('post', `/api/v1/claims/${id}/confirm`, 'owner', {}).expect(200);
      expect(first.body.data.status).toBe('approved');
      expect(first.body.data.receiverConfirmedAt).toBeTruthy();
      expect(first.body.data.giverConfirmedAt).toBeUndefined();
      const again = await call('post', `/api/v1/claims/${id}/confirm`, 'owner', {}).expect(200);
      expect(again.body.data.receiverConfirmedAt).toBe(first.body.data.receiverConfirmedAt);

      // ผู้ส่งยืนยัน -> ครบสองฝ่าย ปิดอัตโนมัติ
      const done = await call('post', `/api/v1/claims/${id}/confirm`, 'finder', {}).expect(200);
      expect(done.body.data).toMatchObject({ status: 'completed', handedOverBy: 'ยืนยันโดยผู้ส่งและผู้รับ' });
      expect((await call('get', `/api/v1/items/${itemId}`, 'owner')).body.data.status).toBe('returned');
      await call('post', `/api/v1/claims/${id}/confirm`, 'finder', {}).expect(409);
    });

    it('กดพร้อมกัน: ยื่นซ้ำพร้อมกัน / ยืนยันสองฝ่ายพร้อมกัน ไม่ทำให้ข้อมูลเพี้ยน', async () => {
      const item = await call('post', '/api/v1/items', 'finder', itemBody({ name: 'หมวกกันน็อก', description: 'สีขาว', category: 'อื่นๆ' })).expect(201);
      const itemId = item.body.data.id;

      const attempts = await Promise.all(Array.from({ length: 5 }, () => call('post', '/api/v1/claims', 'owner', claimBody(itemId))));
      expect(attempts.map((a) => a.status).sort()).toEqual([201, 409, 409, 409, 409]);
      const id = attempts.find((a) => a.status === 201)!.body.data.requestId;
      await call('post', `/api/v1/claims/${id}/approve`, 'staff', {}).expect(200);

      await Promise.all([
        call('post', `/api/v1/claims/${id}/confirm`, 'finder', {}),
        call('post', `/api/v1/claims/${id}/confirm`, 'owner', {}),
      ]);
      const claim = await claimOf('owner', id);
      expect(claim.status).toBe('completed');
      expect(claim.giverConfirmedAt && claim.receiverConfirmedAt).toBeTruthy();
      expect((await call('get', `/api/v1/items/${itemId}`, 'owner')).body.data.status).toBe('returned');
    });

    it('คืนของสำเร็จ: โพสต์แจ้งหายเดิมของเจ้าของที่ผูกไว้ปิดตามอัตโนมัติ', async () => {
      const lost = await call('post', '/api/v1/items', 'owner', itemBody({ reportType: 'lost', name: 'กระติกน้ำสีเขียว', description: 'มีสติกเกอร์', category: 'อื่นๆ' })).expect(201);
      const found = await call('post', '/api/v1/items', 'finder', itemBody({ name: 'กระติกน้ำเขียว', description: 'สติกเกอร์', category: 'อื่นๆ' })).expect(201);
      const lostId = lost.body.data.id;
      const foundId = found.body.data.id;

      // ผูกได้เฉพาะรายการของตัวเองที่เป็นประเภทตรงข้าม
      await call('post', '/api/v1/claims', 'owner', claimBody(foundId, { linkedItemId: foundId })).expect(400);
      await call('post', '/api/v1/claims', 'other', claimBody(foundId, { linkedItemId: lostId })).expect(400);

      const claim = await call('post', '/api/v1/claims', 'owner', claimBody(foundId, { linkedItemId: lostId })).expect(201);
      expect(claim.body.data.linkedItemId).toBe(lostId);
      const id = claim.body.data.requestId;
      await call('post', `/api/v1/claims/${id}/approve`, 'staff', {}).expect(200);
      await call('post', `/api/v1/claims/${id}/confirm`, 'owner', {}).expect(200);
      await call('post', `/api/v1/claims/${id}/confirm`, 'finder', {}).expect(200);

      expect((await call('get', `/api/v1/items/${foundId}`, 'owner')).body.data.status).toBe('returned');
      expect((await call('get', `/api/v1/items/${lostId}`, 'owner')).body.data.status).toBe('returned');
    });
  });

  describe('เจ้าหน้าที่', () => {
    it('รายชื่อผู้ใช้และสถิติ: ผู้ใช้ทั่วไป 403 · เจ้าหน้าที่ 200', async () => {
      await call('get', '/api/v1/members', 'owner').expect(403);
      await call('get', '/api/v1/stats', 'other').expect(403);
      const members = await call('get', '/api/v1/members', 'staff').expect(200);
      expect(members.body.meta.total).toBe(4);
      const stats = await call('get', '/api/v1/stats', 'staff').expect(200);
      expect(stats.body.data).toMatchObject({ totalItems: 6, returned: 6, pendingClaims: 0, totalUsers: 4 });
    });

    it('ลบรายการ -> 200 { id, deleted: true } (ไม่ใช่ 204)', async () => {
      const item = await call('post', '/api/v1/items', 'owner', itemBody({ reportType: 'lost', name: 'ปากกา' })).expect(201);
      const id = item.body.data.id;
      const res = await call('delete', `/api/v1/items/${id}`, 'staff').expect(200);
      expect(res.body).toEqual({ success: true, data: { id, deleted: true } });
      await call('get', `/api/v1/items/${id}`, 'owner').expect(404);
    });
  });
});
