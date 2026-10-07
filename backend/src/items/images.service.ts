import { createHash } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException, ErrorCode } from '../common/errors';

const MAX_BYTES = 2 * 1024 * 1024;
const DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/;

export interface ParsedImage {
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  content: Uint8Array<ArrayBuffer>;
}

/**
 * ตรวจและแปลงรูปที่แนบมากับรายการ — ไฟล์ต้นฉบับเก็บในตาราง item_images
 * (container เขียนดิสก์ไม่ได้ · standards deployment.md ข้อ 4.3: ชนิดไฟล์ตรวจจาก byte ต้นไฟล์ ไม่เชื่อ Content-Type)
 */
@Injectable()
export class ImagesService {
  /** รับ data URL จากหน้าเว็บ แล้วคืนไฟล์ที่ตรวจแล้ว (ชนิดมาจาก byte ต้นไฟล์ ไม่ใช่จาก prefix ของ data URL) */
  parse(dataUrl: string): ParsedImage {
    const match = DATA_URL.exec(dataUrl);
    const content = match ? Buffer.from(match[1], 'base64') : null;
    const mimeType = content ? sniffMime(content) : null;
    if (!content || !mimeType) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WEBP', HttpStatus.BAD_REQUEST, [
        'images: รูปแบบรูปภาพไม่ถูกต้อง',
      ]);
    }
    if (content.length > MAX_BYTES) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'รูปภาพต้องมีขนาดไม่เกิน 2 MB ต่อรูป', HttpStatus.BAD_REQUEST, [
        'images: รูปภาพใหญ่เกินไป',
      ]);
    }
    return {
      mimeType,
      sizeBytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex'),
      content: new Uint8Array(content),
    };
  }
}

/** JPEG `FF D8 FF` · PNG `89 50 4E 47` · WebP `RIFF....WEBP` — ชนิดอื่น (รวม SVG/HTML) ไม่รับ */
function sniffMime(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
