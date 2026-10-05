'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, X, Share2, CheckCircle2, AlertCircle, ImageIcon, Lightbulb } from 'lucide-react';
import { LostItem } from '@/types';
import { color } from '@/csmju/tokens';

interface PosterGeneratorProps {
  item: LostItem;
  isOpen: boolean;
  onClose: () => void;
}

interface Toast {
  tone: 'success' | 'error';
  message: string;
}

const Spinner = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
);

export default function PosterGenerator({ item, isOpen, onClose }: PosterGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // ไฟล์รูปใบประกาศที่เตรียมไว้ตั้งแต่สร้างตัวอย่าง: ตอนกดแชร์ต้องเรียก navigator.share ทันที
  // (Safari/iOS ยอมให้แชร์เฉพาะตอนที่ผู้ใช้เพิ่งกด ถ้ารอวาดรูปก่อนจะแชร์ไม่ได้)
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const itemUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/items/${item.id}`
    : `/items/${item.id}`;

  // ของที่มีคนเก็บได้ = ประกาศตามหาเจ้าของ / ของที่หาย = ประกาศตามหาของ
  const isFoundPost = item.reportType === 'found';
  const posterTitle = isFoundPost ? 'ประกาศตามหาเจ้าของ!' : 'ประกาศตามหาของ!';
  const dateLabel = isFoundPost ? 'วันที่พบ' : 'วันที่หาย';
  const dateText = formatThaiDate(item.dateLost || item.createdAt);
  const locationText = item.location || 'ไม่ระบุ';

  const statusLabel = item.status === 'searching' ? 'กำลังค้นหา' : item.status === 'found' ? 'พบแล้ว' : 'รับคืนแล้ว';

  const showToast = (next: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

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
      setPosterFile(null);
    }
  }, [isOpen, loadedImage]);

  const renderPoster = useCallback((forPreview = false) => {
    const W = 840;  // 2x for crisp
    const H = 1200;
    const PAD = 48;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const font = posterFont();

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

    // Decorative circles (สีจาก token + ความโปร่งใสด้วย globalAlpha)
    withAlpha(ctx, 0.07, () => { ctx.fillStyle = color.white; ctx.beginPath(); ctx.arc(W - 40, 30, 100, 0, Math.PI * 2); ctx.fill(); });
    withAlpha(ctx, 0.04, () => { ctx.fillStyle = color.white; ctx.beginPath(); ctx.arc(60, 170, 80, 0, Math.PI * 2); ctx.fill(); });

    // Badge
    withAlpha(ctx, 0.2, () => { ctx.fillStyle = color.highlight; roundRect(ctx, PAD, 30, 300, 28, 14); ctx.fill(); });
    withAlpha(ctx, 0.4, () => { ctx.strokeStyle = color.highlight; ctx.lineWidth = 1; roundRect(ctx, PAD, 30, 300, 28, 14); ctx.stroke(); });

    ctx.font = `bold 16px ${font}`;
    ctx.fillStyle = color.highlight;
    ctx.textBaseline = 'middle';
    ctx.fillText('MISSING ITEMS SYSTEM', 64, 44);

    // Title
    ctx.font = `bold 48px ${font}`;
    ctx.fillStyle = color.white;
    ctx.fillText(posterTitle, PAD, 110);

    // Subtitle
    ctx.font = `18px ${font}`;
    ctx.fillStyle = color.brand100;
    ctx.fillText(isFoundPost ? 'มีผู้เก็บสิ่งของนี้ได้ หากเป็นของคุณโปรดติดต่อเพื่อรับคืน' : 'กรุณาช่วยแจ้งเบาะแสหากพบสิ่งของดังต่อไปนี้', PAD, 155);

    // ====== ITEM IMAGE ======
    const imgX = PAD;
    const imgY = 250;
    const imgW = W - PAD * 2;
    const imgH = 320;

    ctx.save();
    roundRect(ctx, imgX, imgY, imgW, imgH, 20);
    ctx.clip();
    ctx.fillStyle = color.surfaceContainerLow;
    ctx.fillRect(imgX, imgY, imgW, imgH);

    if (loadedImage) {
      // object-cover + object-center: ตัดส่วนเกินจากกึ่งกลางภาพให้พอดีกรอบ ไม่ยืดสัดส่วน
      drawImageCover(ctx, loadedImage, imgX, imgY, imgW, imgH);
    } else {
      ctx.font = `24px ${font}`;
      ctx.fillStyle = color.outline;
      ctx.textAlign = 'center';
      ctx.fillText('ไม่มีรูปภาพ', W / 2, imgY + imgH / 2);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Image border
    ctx.strokeStyle = color.surfaceVariant;
    ctx.lineWidth = 2;
    roundRect(ctx, imgX, imgY, imgW, imgH, 20);
    ctx.stroke();

    // ====== ITEM NAME & CODE ======
    let curY = imgY + imgH + 44;

    ctx.font = `bold 38px ${font}`;
    ctx.fillStyle = color.onSurface;
    wrapText(ctx, item.name, W - PAD * 2, 2).forEach(line => {
      ctx.fillText(line, PAD, curY);
      curY += 46;
    });

    if (item.code) {
      curY += 2;
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = color.onSurfaceVariant;
      ctx.fillText(item.code, PAD, curY);

      // Status badge
      const statusBg = item.status === 'searching' ? color.statusSearchingBg : item.status === 'found' ? color.statusFoundBg : color.statusReturnedBg;
      const statusFg = item.status === 'searching' ? color.statusSearchingFg : item.status === 'found' ? color.statusFoundFg : color.statusReturnedFg;
      ctx.font = `bold 14px ${font}`;
      const statusW = ctx.measureText(statusLabel).width + 30;
      ctx.fillStyle = statusBg;
      roundRect(ctx, W - PAD - statusW, curY - 14, statusW, 28, 14);
      ctx.fill();
      ctx.fillStyle = statusFg;
      ctx.fillText(statusLabel, W - PAD - statusW + 15, curY);
      curY += 34;
    }

    // ====== DESCRIPTION (สูงสุด 3 บรรทัด ตัดที่ขอบคำแล้วใส่ …) ======
    if (item.description) {
      curY += 8;
      ctx.font = `18px ${font}`;
      const descLines = wrapText(ctx, item.description, W - PAD * 2 - 20, 3);
      const lineH = 28;
      // Blue left border line สูงเท่าข้อความ
      ctx.fillStyle = color.primaryContainer;
      ctx.fillRect(PAD, curY - 4, 4, descLines.length * lineH);
      ctx.fillStyle = color.onSurfaceVariant;
      descLines.forEach(line => {
        ctx.fillText(line, PAD + 16, curY + 10);
        curY += lineH;
      });
      curY += 12;
    }

    // ====== INFO BOXES (สถานที่ยาว ๆ ขึ้นบรรทัดใหม่ได้ 2 บรรทัด — line-clamp-2) ======
    curY += 8;
    const gap = 16;
    const boxW = (W - PAD * 2 - gap) / 2;
    ctx.font = `bold 16px ${font}`;
    const locationLines = wrapText(ctx, locationText, boxW - 28, 2);
    const dateLines = wrapText(ctx, dateText, boxW - 28, 2);
    const boxH = 48 + Math.max(locationLines.length, dateLines.length) * 24 + 8;

    drawInfoBox(ctx, PAD, curY, boxW, boxH, color.primaryContainer, 'สถานที่', locationLines);
    drawInfoBox(ctx, PAD + boxW + gap, curY, boxW, boxH, color.accent, dateLabel, dateLines);

    curY += boxH + 16;

    // ====== CONTACT BAR ======
    if (item.reporterPhone || item.reporterContact) {
      ctx.fillStyle = color.brand50;
      roundRect(ctx, PAD, curY, W - PAD * 2, 70, 16);
      ctx.fill();
      ctx.strokeStyle = color.brand200;
      ctx.lineWidth = 1;
      roundRect(ctx, PAD, curY, W - PAD * 2, 70, 16);
      ctx.stroke();

      // Phone circle
      ctx.fillStyle = color.primaryContainer;
      ctx.beginPath(); ctx.arc(96, curY + 35, 22, 0, Math.PI * 2); ctx.fill();
      ctx.font = `bold 14px ${font}`;
      ctx.fillStyle = color.white;
      ctx.textAlign = 'center';
      ctx.fillText('โทร', 96, curY + 36);
      ctx.textAlign = 'left';

      ctx.font = `bold 12px ${font}`;
      ctx.fillStyle = color.accent;
      ctx.fillText('ช่องทางติดต่อ', 132, curY + 24);
      ctx.font = `bold 22px ${font}`;
      ctx.fillStyle = color.onSurface;
      ctx.fillText(wrapText(ctx, item.reporterPhone || item.reporterContact || '', W - PAD * 2 - 100, 1)[0] ?? '', 132, curY + 50);
      curY += 86;
    }

    // ====== BOTTOM: QR + UNIVERSITY ======
    curY = Math.max(curY + 10, H - 110);
    ctx.strokeStyle = color.surfaceVariant;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, curY); ctx.lineTo(W - PAD, curY); ctx.stroke();
    curY += 20;

    ctx.font = `14px ${font}`;
    ctx.fillStyle = color.outline;
    ctx.fillText('สแกน QR Code เพื่อดูรายละเอียดเพิ่มเติม', PAD, curY + 10);
    ctx.font = `bold 16px ${font}`;
    ctx.fillStyle = color.onSurfaceVariant;
    ctx.fillText('Missing Items System', PAD, curY + 34);
    ctx.font = `12px ${font}`;
    ctx.fillStyle = color.outline;
    ctx.fillText('ระบบแจ้งทรัพย์สินสูญหาย • มหาวิทยาลัยแม่โจ้', PAD, curY + 54);

    // Draw QR Code from hidden canvas
    const qrCanvas = qrRef.current?.querySelector('canvas');
    if (qrCanvas) {
      const qrSize = 80;
      ctx.fillStyle = color.white;
      roundRect(ctx, W - PAD - qrSize - 16, curY - 6, qrSize + 16, qrSize + 16, 12);
      ctx.fill();
      ctx.strokeStyle = color.surfaceVariant;
      ctx.lineWidth = 1;
      roundRect(ctx, W - PAD - qrSize - 16, curY - 6, qrSize + 16, qrSize + 16, 12);
      ctx.stroke();
      ctx.drawImage(qrCanvas, W - PAD - qrSize - 8, curY + 2, qrSize, qrSize);
    }

    if (forPreview) {
      setPreviewUrl(canvas.toDataURL('image/png'));
      canvas.toBlob((b) => setPosterFile(b ? new File([b], `poster-${item.code || item.id}.png`, { type: 'image/png' }) : null), 'image/png');
    }

    return canvas;
  }, [item, loadedImage, statusLabel, itemUrl, posterTitle, dateLabel, dateText, locationText, isFoundPost]);

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
      showToast({ tone: 'error', message: 'ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
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
        <head><title>ใบประกาศตามหา - ${escapeHtml(item.name)}</title>
        <style>*{margin:0;padding:0}body{display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;height:auto}@media print{body{margin:0}}</style>
        </head>
        <body><img src="${dataUrl}" /></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); printWindow.close(); };
  };

  // แชร์ด่วน: ใช้ Web Share API ของเครื่อง (LINE, Facebook, Messenger ฯลฯ ตามที่เครื่องมี)
  // ถ้าเบราว์เซอร์ไม่รองรับ -> คัดลอกลิงก์ให้แทน แล้วแจ้งด้วย toast
  const handleShare = async () => {
    const title = `ประกาศตามหา: ${item.name}`;
    const text = isFoundPost
      ? `มีคนพบ ${item.name} ที่ ${locationText} เมื่อ ${dateText} หากเป็นของคุณ ดูรายละเอียดเพิ่มเติมได้ที่ลิงก์นี้`
      : `ช่วยด้วย! ฉันทำ ${item.name} หายที่ ${locationText} เมื่อ ${dateText} ดูรายละเอียดเพิ่มเติมได้ที่ลิงก์นี้`;
    // 1) รูปใบประกาศ + ข้อความ + ลิงก์ (LINE / Messenger บนมือถือได้รูปพร้อมลิงก์ในครั้งเดียว)
    //    ใส่ลิงก์ไว้ในข้อความ เพราะหลายแอปทิ้งค่า url เมื่อมีไฟล์แนบ
    // 2) เครื่องที่แชร์ไฟล์ไม่ได้ -> แชร์ข้อความ + ลิงก์
    // 3) ไม่มี Web Share API เลย -> คัดลอกลิงก์
    const attempts: ShareData[] = [
      ...(posterFile ? [{ title, text: [text, itemUrl].join('\n'), files: [posterFile] }] : []),
      { title, text, url: itemUrl },
    ];

    setIsSharing(true);
    try {
      if (typeof navigator.share === 'function') {
        for (const data of attempts) {
          if (navigator.canShare && !navigator.canShare(data)) continue;
          try {
            await navigator.share(data);
            return;
          } catch (err) {
            // ผู้ใช้กดยกเลิกเอง ไม่ต้องทำอะไรต่อ / error อื่นลองวิธีถัดไป
            if (err instanceof DOMException && err.name === 'AbortError') return;
          }
        }
      }
      const copied = await copyToClipboard(itemUrl);
      showToast(copied
        ? { tone: 'success', message: 'คัดลอกลิงก์แล้ว นำไปวางแชร์ได้เลย' }
        : { tone: 'error', message: 'คัดลอกลิงก์ไม่สำเร็จ กรุณาคัดลอกจากแถบที่อยู่ของเบราว์เซอร์' });
    } finally {
      setIsSharing(false);
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
          <button onClick={onClose} aria-label="ปิด" className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer">
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
              <><Spinner /> กำลังเตรียมไฟล์...</>
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

          {/* ปุ่มแชร์ด่วน (Web Share API / คัดลอกลิงก์) */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-primary-container text-primary-container hover:bg-brand-50 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSharing ? (
              <><Spinner /> กำลังเปิด...</>
            ) : (
              <><Share2 className="w-3.5 h-3.5" /> แชร์ด่วน</>
            )}
          </button>
        </div>

        {/* Poster Preview — items-start + h-auto กันรูปถูกยืดในกล่อง flex (โดยเฉพาะ Safari) */}
        <div className="px-5 py-5 max-h-[calc(85vh-180px)] supports-[height:100dvh]:max-h-[calc(85dvh-180px)] overflow-y-auto bg-surface-container/50 flex items-start justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`ตัวอย่างใบประกาศ ${item.name}`}
              className="block w-full max-w-[420px] h-auto aspect-[7/10] object-contain object-center rounded-2xl shadow-lg border border-line"
            />
          ) : (
            <div className="w-full max-w-[420px] aspect-[7/10] bg-white rounded-2xl border border-line flex items-center justify-center">
              <div className="text-center space-y-2">
                <Spinner className="w-8 h-8 mx-auto text-primary-container" />
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
          <span>กด <b>แชร์ด่วน</b> เพื่อส่งรูปใบประกาศพร้อมลิงก์ไปยังแอปที่เครื่องรองรับ เช่น LINE, Facebook, Messenger — ถ้าเครื่องไม่รองรับ ระบบจะคัดลอกลิงก์ให้แทน</span>
        </div>
      </div>

      {/* Toast แจ้งผลการคัดลอกลิงก์ */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-2 max-w-[calc(100vw-32px)] rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg animate-fade-in ${
            toast.tone === 'success' ? 'bg-on-surface text-white' : 'bg-error-container text-on-error-container'
          }`}
        >
          {toast.tone === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-success" aria-hidden />
            : <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// ============ HELPERS ============

// วันที่แบบไทย เช่น 2 ตุลาคม 2569 (dateLost เป็น YYYY-MM-DD เวลาไทย)
function formatThaiDate(value?: string) {
  if (!value) return 'ไม่ระบุ';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' });
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // เบราว์เซอร์เก่าหรือไม่ได้อนุญาต clipboard -> ใช้ textarea ชั่วคราว
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

// ============ CANVAS HELPER FUNCTIONS ============

// ใช้ฟอนต์เดียวกับหน้าเว็บ (โหลดผ่าน next/font จึงต้องอ่านชื่อจริงจาก CSS)
function posterFont() {
  return typeof document !== 'undefined' ? getComputedStyle(document.body).fontFamily : 'sans-serif';
}

function withAlpha(ctx: CanvasRenderingContext2D, alpha: number, draw: () => void) {
  ctx.save();
  ctx.globalAlpha = alpha;
  draw();
  ctx.restore();
}

// เทียบเท่า object-cover object-center: ครอปจากกึ่งกลางภาพ คงสัดส่วนเดิม
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
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

// แบ่งข้อความเป็นคำ (ภาษาไทยไม่มีช่องว่าง จึงใช้ Intl.Segmenter) หรือเป็นตัวอักษรที่ประกอบสระ/วรรณยุกต์แล้ว
function segments(text: string, granularity: 'word' | 'grapheme') {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(new Intl.Segmenter('th', { granularity }).segment(text), (s) => s.segment);
  }
  return granularity === 'word' ? text.split(/(\s+)/) : Array.from(text);
}

// ตัดบรรทัดที่ขอบคำ สูงสุด maxLines บรรทัด ถ้ายาวเกินใส่ … ท้ายบรรทัดสุดท้าย (แบบ line-clamp)
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const units = segments(text.replace(/\s+/g, ' ').trim(), 'word')
    .flatMap((u) => (ctx.measureText(u).width > maxWidth ? segments(u, 'grapheme') : [u]));
  const lines: string[] = [];
  let line = '';
  for (const unit of units) {
    const next = line + unit;
    if (!line || ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    lines.push(line.trimEnd());
    if (lines.length === maxLines) return ellipsize(ctx, lines, maxWidth);
    line = unit.trimStart();
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

function ellipsize(ctx: CanvasRenderingContext2D, lines: string[], maxWidth: number) {
  let chars = segments(lines[lines.length - 1], 'grapheme');
  while (chars.length && ctx.measureText(`${chars.join('').trimEnd()}…`).width > maxWidth) chars = chars.slice(0, -1);
  lines[lines.length - 1] = `${chars.join('').trimEnd()}…`;
  return lines;
}

function drawInfoBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  markerColor: string, label: string, valueLines: string[]
) {
  const font = posterFont();
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

  ctx.font = `bold 11px ${font}`;
  ctx.fillStyle = color.onSurfaceVariant;
  ctx.fillText(label, x + 38, y + 25);

  ctx.font = `bold 16px ${font}`;
  ctx.fillStyle = color.onSurface;
  valueLines.forEach((line, i) => ctx.fillText(line, x + 14, y + 54 + i * 24));
}
