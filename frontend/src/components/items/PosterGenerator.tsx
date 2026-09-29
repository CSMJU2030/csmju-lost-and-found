'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, X, Share2, CheckCircle2, ImageIcon, Lightbulb } from 'lucide-react';
import { LostItem } from '@/types';
import { color } from '@/csmju/tokens';

interface PosterGeneratorProps {
  item: LostItem;
  isOpen: boolean;
  onClose: () => void;
}

export default function PosterGenerator({ item, isOpen, onClose }: PosterGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const itemUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/items/${item.id}`
    : `/items/${item.id}`;

  // ของที่มีคนเก็บได้ = ประกาศตามหาเจ้าของ / ของที่หาย = ประกาศตามหาของ
  const isFoundPost = item.reportType === 'found';
  const posterTitle = isFoundPost ? 'ประกาศตามหาเจ้าของ!' : 'ประกาศตามหาของ!';
  const dateLabel = isFoundPost ? 'วันที่พบ' : 'วันที่หาย';

  const statusLabel = item.status === 'searching' ? 'กำลังค้นหา' : item.status === 'found' ? 'พบแล้ว' : 'รับคืนแล้ว';

  // Pre-load item image
  useEffect(() => {
    if (!isOpen || !item.imageUrl) {
      setLoadedImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedImage(img);
    img.onerror = () => setLoadedImage(null);
    img.src = item.imageUrl;
  }, [isOpen, item.imageUrl]);

  // Generate preview when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure QR canvas is rendered
      const timer = setTimeout(() => renderPoster(true), 300);
      return () => clearTimeout(timer);
    } else {
      setPreviewUrl(null);
    }
  }, [isOpen, loadedImage]);

  const renderPoster = useCallback((forPreview = false) => {
    const W = 840;  // 2x for crisp
    const H = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // ====== BACKGROUND ======
    ctx.fillStyle = color.white;
    ctx.fillRect(0, 0, W, H);

    // ====== TOP BANNER ======
    const grd = ctx.createLinearGradient(0, 0, W, 200);
    grd.addColorStop(0, color.primaryContainer);
    grd.addColorStop(0.5, color.primary);
    grd.addColorStop(1, color.secondaryPurple);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 200);
    ctx.quadraticCurveTo(W / 2, 230, 0, 200);
    ctx.closePath();
    ctx.fill();

    // Decorative circles
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.arc(W - 40, 30, 100, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.arc(60, 170, 80, 0, Math.PI * 2); ctx.fill();

    // Badge
    ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
    roundRect(ctx, 48, 30, 300, 28, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, 48, 30, 300, 28, 14);
    ctx.stroke();

    ctx.font = `bold 16px ${posterFont()}`;
    ctx.fillStyle = color.highlight;
    ctx.textBaseline = 'middle';
    ctx.fillText('MISSING ITEMS SYSTEM', 64, 44);

    // Title
    ctx.font = `bold 48px ${posterFont()}`;
    ctx.fillStyle = color.white;
    ctx.fillText(posterTitle, 48, 110);

    // Subtitle
    ctx.font = `18px ${posterFont()}`;
    ctx.fillStyle = 'rgba(191, 219, 254, 0.9)';
    ctx.fillText(isFoundPost ? 'มีผู้เก็บสิ่งของนี้ได้ หากเป็นของคุณโปรดติดต่อเพื่อรับคืน' : 'กรุณาช่วยแจ้งเบาะแสหากพบสิ่งของดังต่อไปนี้', 48, 155);

    // ====== ITEM IMAGE ======
    const imgX = 48;
    const imgY = 250;
    const imgW = W - 96;
    const imgH = 320;

    // Image container rounded rect
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, imgX, imgY, imgW, imgH, 20);
    ctx.clip();

    if (loadedImage) {
      // Cover-fit the image
      const iw = loadedImage.naturalWidth;
      const ih = loadedImage.naturalHeight;
      const scale = Math.max(imgW / iw, imgH / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const sx = imgX + (imgW - sw) / 2;
      const sy = imgY + (imgH - sh) / 2;
      ctx.drawImage(loadedImage, sx, sy, sw, sh);
    } else {
      ctx.fillStyle = color.surfaceContainerLow;
      ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.font = `24px ${posterFont()}`;
      ctx.fillStyle = color.outline;
      ctx.textAlign = 'center';
      ctx.fillText('ไม่มีรูปภาพ', W / 2, imgY + imgH / 2);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Image border
    ctx.strokeStyle = color.surfaceVariant;
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, imgX, imgY, imgW, imgH, 20);
    ctx.stroke();

    // ====== ITEM NAME & CODE ======
    let curY = imgY + imgH + 40;

    ctx.font = `bold 38px ${posterFont()}`;
    ctx.fillStyle = color.onSurface;
    const nameLines = wrapText(ctx, item.name, W - 96, 700);
    nameLines.forEach(line => {
      ctx.fillText(line, 48, curY);
      curY += 46;
    });

    if (item.code) {
      curY += 4;
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = color.onSurfaceVariant;
      ctx.fillText(item.code, 48, curY);

      // Status badge
      const statusBg = item.status === 'searching' ? color.statusSearchingBg : item.status === 'found' ? color.statusFoundBg : color.statusReturnedBg;
      const statusFg = item.status === 'searching' ? color.statusSearchingFg : item.status === 'found' ? color.statusFoundFg : color.statusReturnedFg;
      const statusW = ctx.measureText(statusLabel).width + 30;
      ctx.fillStyle = statusBg;
      roundRect(ctx, W - 48 - statusW, curY - 14, statusW, 26, 13);
      ctx.fill();
      ctx.font = `bold 14px ${posterFont()}`;
      ctx.fillStyle = statusFg;
      ctx.fillText(statusLabel, W - 48 - statusW + 15, curY);
      curY += 30;
    }

    // ====== DESCRIPTION ======
    if (item.description) {
      curY += 10;
      // Blue left border line
      ctx.fillStyle = color.primaryContainer;
      ctx.fillRect(48, curY - 4, 4, 40);

      ctx.font = `18px ${posterFont()}`;
      ctx.fillStyle = color.onSurfaceVariant;
      const descText = item.description.length > 100 ? item.description.slice(0, 100) + '...' : item.description;
      const descLines = wrapText(ctx, descText, W - 120, 700);
      descLines.forEach(line => {
        ctx.fillText(line, 64, curY + 10);
        curY += 26;
      });
      curY += 10;
    }

    // ====== INFO BOXES ======
    curY += 10;
    const boxW = (W - 96 - 16) / 2;
    const boxH = 80;

    // Location box
    drawInfoBox(ctx, 48, curY, boxW, boxH, color.primaryContainer, 'สถานที่', item.location || 'ไม่ระบุ');
    // Date box
    drawInfoBox(ctx, 48 + boxW + 16, curY, boxW, boxH, color.accent, dateLabel, item.dateLost || item.createdAt || 'ไม่ระบุ');

    curY += boxH + 16;

    // ====== CONTACT BAR ======
    if (item.reporterPhone || item.reporterContact) {
      ctx.fillStyle = color.brand50;
      roundRect(ctx, 48, curY, W - 96, 70, 16);
      ctx.fill();
      ctx.strokeStyle = color.brand200;
      ctx.lineWidth = 1;
      roundRect(ctx, 48, curY, W - 96, 70, 16);
      ctx.stroke();

      // Phone circle
      ctx.fillStyle = color.primaryContainer;
      ctx.beginPath(); ctx.arc(96, curY + 35, 22, 0, Math.PI * 2); ctx.fill();
      ctx.font = `bold 14px ${posterFont()}`;
      ctx.fillStyle = color.white;
      ctx.textAlign = 'center';
      ctx.fillText('โทร', 96, curY + 36);
      ctx.textAlign = 'left';

      ctx.font = `bold 12px ${posterFont()}`;
      ctx.fillStyle = color.accent;
      ctx.fillText('ช่องทางติดต่อ', 132, curY + 24);
      ctx.font = `bold 22px ${posterFont()}`;
      ctx.fillStyle = color.onSurface;
      ctx.fillText(item.reporterPhone || item.reporterContact || '', 132, curY + 52);
      curY += 86;
    }

    // ====== BOTTOM: QR + UNIVERSITY ======
    curY = Math.max(curY + 10, H - 110);
    ctx.strokeStyle = color.surfaceVariant;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, curY); ctx.lineTo(W - 48, curY); ctx.stroke();
    curY += 20;

    ctx.font = `14px ${posterFont()}`;
    ctx.fillStyle = color.outline;
    ctx.fillText('สแกน QR Code เพื่อดูรายละเอียดเพิ่มเติม', 48, curY + 10);
    ctx.font = `bold 16px ${posterFont()}`;
    ctx.fillStyle = color.onSurfaceVariant;
    ctx.fillText('Missing Items System', 48, curY + 34);
    ctx.font = `12px ${posterFont()}`;
    ctx.fillStyle = color.outline;
    ctx.fillText('ระบบแจ้งทรัพย์สินสูญหาย • มหาวิทยาลัยแม่โจ้', 48, curY + 54);

    // Draw QR Code from hidden canvas
    const qrCanvas = qrRef.current?.querySelector('canvas');
    if (qrCanvas) {
      const qrSize = 80;
      ctx.fillStyle = color.white;
      roundRect(ctx, W - 48 - qrSize - 16, curY - 6, qrSize + 16, qrSize + 16, 12);
      ctx.fill();
      ctx.strokeStyle = color.surfaceVariant;
      ctx.lineWidth = 1;
      roundRect(ctx, W - 48 - qrSize - 16, curY - 6, qrSize + 16, qrSize + 16, 12);
      ctx.stroke();
      ctx.drawImage(qrCanvas, W - 48 - qrSize - 8, curY + 2, qrSize, qrSize);
    }

    if (forPreview) {
      setPreviewUrl(canvas.toDataURL('image/png'));
    }

    return canvas;
  }, [item, loadedImage, statusLabel, itemUrl, posterTitle, dateLabel, isFoundPost]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      const canvas = renderPoster(false);
      if (!canvas) throw new Error('Canvas render failed');

      // Use toBlob for better compatibility
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png',
          1.0
        );
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `ประกาศตามหา-${item.code || item.name}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const canvas = renderPoster(false);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>ใบประกาศตามหา - ${item.name}</title>
        <style>*{margin:0;padding:0}body{display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;height:auto}@media print{body{margin:0}}</style>
        </head>
        <body><img src="${dataUrl}" /></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); printWindow.close(); };
  };

  // ฟังก์ชันแชร์ที่อัปเกรดแล้ว: แชร์ข้อความ ลิงก์ และ "รูปภาพ" ไปพร้อมกัน
  const handleShare = async () => {
    setIsDownloading(true);
    try {
      const shareText = `${posterTitle}\n\nสิ่งของ: ${item.name}\nสถานที่: ${item.location || 'ไม่ระบุ'}\n${dateLabel}: ${item.dateLost || 'ไม่ระบุ'}\nติดต่อ: ${item.reporterPhone || item.reporterContact || 'ดูรายละเอียดในลิงก์'}\n\nลิงก์: ${itemUrl}`;

      if (navigator.share) {
        const canvas = renderPoster(false);
        if (canvas) {
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
              'image/png',
              1.0
            );
          });

          const file = new File([blob], `ประกาศตามหา-${item.code || 'item'}.png`, { type: 'image/png' });

          // ลองเช็คว่าเครื่องนี้รองรับการแชร์ไฟล์ไปพร้อมข้อความเลยหรือไม่
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `ประกาศตามหา: ${item.name}`,
              text: shareText,
              files: [file]
            });
            return; 
          }
        }
        
        // Fallback: ถ้าวาดรูปไม่ผ่าน หรือเบราว์เซอร์ไม่ให้แชร์ไฟล์ ก็แชร์แค่ลิงก์ตามปกติ
        await navigator.share({ 
          title: `ประกาศตามหา: ${item.name}`, 
          text: shareText, 
          url: itemUrl 
        });
        
      } else {
        // Fallback 2: เครื่องที่ไม่รองรับ Web Share API เลย (เช่น Chrome PC บางรุ่น)
        await navigator.clipboard.writeText(shareText);
        alert('คัดลอกข้อความและลิงก์สำเร็จแล้ว! นำไปวางแชร์ได้เลย');
      }
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <button type="button" aria-label="ปิดหน้าต่าง" className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-default" onClick={onClose} />

      {/* Container */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-line overflow-hidden my-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-brand-gradient text-white">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" aria-hidden />
            <h3 className="text-sm font-bold">{isFoundPost ? 'สร้างใบประกาศตามหาเจ้าของ' : 'สร้างใบประกาศตามหาของ'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-surface border-b border-line">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-primary-container hover:bg-primary text-white'
            } disabled:opacity-50`}
          >
            {isDownloading ? (
              <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> กำลังเตรียมไฟล์...</>
            ) : downloadSuccess ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> ดาวน์โหลดสำเร็จ!</>
            ) : (
              <><Download className="w-3.5 h-3.5" /> ดาวน์โหลดรูปภาพ (.PNG)</>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-line text-on-surface-variant rounded-xl hover:bg-surface shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> สั่งพิมพ์
          </button>
          
          {/* ปุ่ม Share หลัก */}
          <button
            onClick={handleShare}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary-container hover:bg-primary text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> กำลังเปิด...</>
            ) : (
              <><Share2 className="w-3.5 h-3.5" /> แชร์ด่วน</>
            )}
          </button>
        </div>

        {/* Poster Preview */}
        <div className="px-5 py-5 max-h-[calc(85vh-180px)] overflow-y-auto bg-surface-container/50 flex justify-center">
          {previewUrl ? (
            <img src={previewUrl} alt="ตัวอย่างโปสเตอร์" className="w-full max-w-[420px] rounded-2xl shadow-lg border border-line" />
          ) : (
            <div className="w-full max-w-[420px] h-[600px] bg-white rounded-2xl border border-line flex items-center justify-center">
              <div className="text-center space-y-2">
                <svg className="animate-spin w-8 h-8 mx-auto text-primary-container" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <p className="text-xs text-on-surface-variant">กำลังสร้างโปสเตอร์...</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden QR Canvas for rendering */}
        <div ref={qrRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <QRCodeCanvas value={itemUrl} size={160} level="M" bgColor={color.white} fgColor={color.primaryContainer} />
        </div>

        {/* Tips Footer */}
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-800 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 shrink-0" aria-hidden />
          <span>กดปุ่ม <b>แชร์ด่วน</b> เพื่อส่งรูปภาพโปสเตอร์พร้อมข้อความเข้าไลน์ หรือแชร์ลงโซเชียลได้ทันทีโดยไม่ต้องโหลดลงเครื่อง</span>
        </div>
      </div>
    </div>
  );
}

// ============ CANVAS HELPER FUNCTIONS ============

// ใช้ฟอนต์เดียวกับหน้าเว็บ (โหลดผ่าน next/font จึงต้องอ่านชื่อจริงจาก CSS)
function posterFont() {
  return typeof document !== 'undefined' ? getComputedStyle(document.body).fontFamily : 'sans-serif';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, _maxTotalWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
      if (lines.length >= 2) {
        currentLine = currentLine.slice(0, -1) + '...';
        lines.push(currentLine);
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawInfoBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  markerColor: string, label: string, value: string
) {
  ctx.fillStyle = color.surface;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = color.surfaceVariant;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();

  // จุดสีหน้าหัวข้อ (แทนไอคอน emoji)
  ctx.fillStyle = markerColor;
  ctx.beginPath(); ctx.arc(x + 22, y + 24, 6, 0, Math.PI * 2); ctx.fill();

  ctx.font = `bold 11px ${posterFont()}`;
  ctx.fillStyle = color.onSurfaceVariant;
  ctx.fillText(label.toUpperCase(), x + 38, y + 26);

  ctx.font = `bold 16px ${posterFont()}`;
  ctx.fillStyle = color.onSurface;
  // Truncate value if too long
  let displayValue = value;
  while (ctx.measureText(displayValue).width > w - 52 && displayValue.length > 3) {
    displayValue = displayValue.slice(0, -4) + '...';
  }
  ctx.fillText(displayValue, x + 14, y + 56);
}