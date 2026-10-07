import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { FakeCoreHub } from './fake-core-hub';
import { createTestDatabase } from './test-db';
import { TestSigningKey, createSigningKey } from './token-factory';

/**
 * บูตแอปแบบเดียวกับ main.ts (prefix, pipe, guard, filter ครบ) กับ
 * Core Hub ปลอมที่ให้แค่ JWKS และฐานข้อมูล PostgreSQL ชั่วคราว
 */
export async function bootApp(): Promise<{
  app: NestExpressApplication;
  key: TestSigningKey;
  coreHub: FakeCoreHub;
  close(): Promise<void>;
}> {
  const key = await createSigningKey('core-hub-2026');
  const coreHub = new FakeCoreHub();
  await coreHub.start([key]);
  const db = await createTestDatabase();

  Object.assign(process.env, {
    CORE_HUB_URL: coreHub.url,
    CORE_HUB_JWKS_URL: coreHub.jwksUrl,
    DATABASE_URL: db.url,
  });

  // import หลังตั้ง env เพื่อให้ ConfigModule อ่านค่าของชุดทดสอบนี้
  const { AppModule } = await import('../../src/app.module');
  const { ROUTES_OUTSIDE_API_PREFIX, configureApp } = await import('../../src/app-setup');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  app.setGlobalPrefix('api', { exclude: ROUTES_OUTSIDE_API_PREFIX });
  configureApp(app);
  await app.init();

  return {
    app,
    key,
    coreHub,
    async close() {
      await app.close();
      await coreHub.stop();
      await db.drop();
    },
  };
}
