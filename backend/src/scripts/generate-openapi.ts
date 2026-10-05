// สร้าง backend/openapi.json จาก decorator ของ controller/DTO: pnpm --filter backend generate:openapi
// (CI กฎ API-01 รันคำสั่งนี้แล้วตรวจว่าไฟล์ที่ commit ไว้ตรงกับโค้ด)
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function main(): Promise<void> {
  // ไม่ต่อฐานข้อมูลหรือ Core Hub: preview mode ไม่สร้าง provider ใด ๆ
  // ค่านี้มีไว้ให้ env validation ผ่านเท่านั้น และไม่มี user/password (SEC-01)
  process.env.DATABASE_URL ??= 'postgresql://localhost/openapi_generation_only';

  const { AppModule } = await import('../app.module');
  const { ROUTES_OUTSIDE_API_PREFIX } = await import('../app-setup');

  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  app.setGlobalPrefix('api', { exclude: ROUTES_OUTSIDE_API_PREFIX });

  const config = new DocumentBuilder()
    .setTitle('Lost & Found API')
    .setDescription(
      'ระบบย่อย csmju-lost-and-found ของ CSMJU2030 · ทุก response ห่อด้วย { success, data, meta? } ' +
        'หรือ { success: false, error: { code, message, details? } } · ยืนยันตัวตนด้วย Core Hub access token',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('core_hub_access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  writeFileSync(resolve(__dirname, '../../../openapi.json'), `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void main();
