import { mkdirSync, rm, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException, ErrorCode } from '../common/errors';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 2 * 1024 * 1024;

/** เก็บรูปที่แนบมากับรายการเป็นไฟล์ใน uploads/ (ฐานข้อมูลเก็บแค่ path) */
@Injectable()
export class ImagesService {
  private readonly dir: string;

  constructor(config: ConfigService) {
    this.dir = config.get<string>('uploadDir', 'uploads');
  }

  // รับ data URL จากหน้าเว็บ แล้วคืน path ที่เปิดดูได้ (/uploads/xxx.jpg)
  save(dataUrl: string): string {
    if (dataUrl.startsWith('/uploads/')) return dataUrl; // รูปที่บันทึกไว้แล้ว
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WEBP', HttpStatus.BAD_REQUEST, [
        'images: รูปแบบรูปภาพไม่ถูกต้อง',
      ]);
    }
    const [, mime, base64] = match;
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_BYTES) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'รูปภาพต้องมีขนาดไม่เกิน 2 MB ต่อรูป', HttpStatus.BAD_REQUEST, [
        'images: รูปภาพใหญ่เกินไป',
      ]);
    }

    mkdirSync(this.dir, { recursive: true });
    const filename = `${randomUUID()}.${EXT[mime]}`;
    writeFileSync(join(this.dir, filename), buffer);
    return `/uploads/${filename}`;
  }

  remove(urls: string[]): void {
    for (const url of urls) {
      if (!url.startsWith('/uploads/')) continue;
      rm(join(this.dir, basename(url)), { force: true }, () => undefined);
    }
  }
}
