import { RequestMethod, ValidationPipe } from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Routes outside the `/api` prefix: only the central SSO callback, because
 * that is the URL registered for this subsystem in the Core Hub Subsystem
 * Registry (auth-contract 1.0 ข้อ 5).
 *
 * main.ts declares `setGlobalPrefix('api', ...)` itself (API-02 looks for it
 * there) and the e2e suites pass this same list, so they cannot drift.
 */
export const ROUTES_OUTSIDE_API_PREFIX: RouteInfo[] = [{ path: 'auth/callback', method: RequestMethod.GET }];

/** Everything main.ts applies before it listens, shared with the e2e suites. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  // รูปภาพส่งมาเป็น data URL ใน JSON (สูงสุด 6 รูป รูปละไม่เกิน 2 MB)
  app.useBodyParser('json', { limit: '15mb' });
  // รูปที่อัปโหลดแล้ว (/uploads/<uuid>.jpg) — ชื่อไฟล์เป็น UUID สุ่ม
  app.useStaticAssets(config.get<string>('uploadDir', 'uploads'), { prefix: '/uploads/', index: false, maxAge: '7d' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
}
