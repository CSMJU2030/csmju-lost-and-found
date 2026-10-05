import { LostItem } from '@/types';

// ข้อมูลรายการและคำขอเก็บที่ Backend แล้ว (ดู lib/api.ts)
// ตัวตนของผู้ใช้มาจาก Core Hub (คุกกี้ HttpOnly ที่หน้าเว็บอ่านไม่ได้) — ไฟล์นี้เหลือแค่ตัวช่วยเล็กๆ

export const getReportType = (item: LostItem) => item.reportType ?? 'lost';

// ย่อรูปให้กว้างไม่เกิน maxSize px แล้วแปลงเป็น data URL เพื่อส่งให้ backend
export function fileToCompressedDataUrl(file: File, maxSize = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
