'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, Clock, MapPin, Phone, HandHeart, PackageCheck } from 'lucide-react';
import { ClaimRequest, LostItem } from '@/types';
import { canConfirmHandover, confirmHandover, handoverParties, myHandoverRole } from '@/lib/handover';
import { errorMessage } from '@/lib/api';

interface HandoverConfirmProps {
  claim: ClaimRequest;
  items: LostItem[];
  memberId: string;
}

const fmtTime = (iso: string) => new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

// "2026-09-25 13:00" -> "25 ก.ย. 2569 เวลา 13:00 น."
function fmtMeet(value: string) {
  const [date, time] = value.split(' ');
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString('th-TH', { dateStyle: 'medium' })}${time ? ` เวลา ${time} น.` : ''}`;
}

// การ์ดนัดส่งมอบของโดยตรงระหว่างสองฝ่าย: นัดเจอ -> ส่ง/รับของ -> ต่างคนต่างกดยืนยัน -> ระบบปิดรายการให้เอง
export default function HandoverConfirm({ claim, items, memberId }: HandoverConfirmProps) {
  const [busy, setBusy] = useState(false);
  const role = myHandoverRole(claim, items, memberId);
  if (!role || !canConfirmHandover(claim)) return null;

  const p = handoverParties(claim, items);
  const item = items.find((i) => i.id === claim.itemId);
  const isGiver = role === 'giver';
  const otherName = isGiver ? p.receiverName : p.giverName;
  const myConfirmedAt = isGiver ? claim.giverConfirmedAt : claim.receiverConfirmedAt;
  const otherConfirmedAt = isGiver ? claim.receiverConfirmedAt : claim.giverConfirmedAt;

  // ช่องทางติดต่ออีกฝ่าย: ถ้าฉันเป็นคนยื่นคำขอ อีกฝ่ายคือเจ้าของโพสต์ ไม่เช่นนั้นอีกฝ่ายคือผู้ยื่นคำขอ
  const iAmClaimant = claim.claimantId === memberId;
  const otherContact = iAmClaimant
    ? [item?.reporterPhone, item?.reporterContact].filter(Boolean).join(' • ')
    : claim.contact;

  const onConfirm = async () => {
    const question = isGiver
      ? `ยืนยันว่าคุณส่ง "${claim.itemName}" ให้ ${otherName} แล้ว?`
      : `ยืนยันว่าคุณได้รับ "${claim.itemName}" จาก ${otherName} แล้ว?`;
    if (!confirm(question)) return;
    setBusy(true);
    try {
      const done = await confirmHandover(claim.requestId);
      alert(done
        ? 'ยืนยันครบทั้งสองฝ่ายแล้ว ปิดรายการเรียบร้อย'
        : `บันทึกการยืนยันของคุณแล้ว รอ ${otherName} กดยืนยัน`);
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const Step = ({ n, done, title, children }: { n: number; done?: boolean; title: string; children: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${done ? 'bg-success text-white' : 'bg-brand-50 text-primary-container'}`}>
        {done ? <CheckCircle2 className="w-4 h-4" aria-hidden /> : n}
      </span>
      <div className="min-w-0 pb-1 space-y-1">
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <div className="text-sm text-on-surface-variant leading-relaxed space-y-0.5">{children}</div>
      </div>
    </li>
  );

  const partyStatus = (label: string, name: string, at?: string) => (
    <li className="flex items-center justify-between gap-2">
      <span>{label}: <strong className="text-on-surface">{name}</strong></span>
      {at ? (
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-success" aria-hidden /> ยืนยันแล้ว
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-outline">
          <Clock className="w-4 h-4" aria-hidden /> ยังไม่ยืนยัน
        </span>
      )}
    </li>
  );

  return (
    <article className="rounded-2xl border border-primary-container/30 bg-surface-container-lowest shadow-card overflow-hidden">
      <header className="flex items-start gap-3 px-5 py-4 bg-brand-50">
        <span className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0">
          {isGiver ? <HandHeart className="w-5 h-5" aria-hidden /> : <PackageCheck className="w-5 h-5" aria-hidden />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary-container">{isGiver ? 'คุณเป็นคนส่งของ' : 'คุณเป็นคนรับของ'}</p>
          <h3 className="text-base font-semibold text-on-surface">
            {isGiver ? 'ส่ง' : 'รับ'} <Link href={`/items/${claim.itemId}`} className="hover:underline">&quot;{claim.itemName}&quot;</Link>{' '}
            {isGiver ? 'คืนให้' : 'คืนจาก'} {otherName}
          </h3>
        </div>
      </header>

      <div className="p-5 space-y-5">
        <ol className="space-y-4">
          <Step n={1} title="นัดเจอกัน">
            <p className="flex items-start gap-1.5"><CalendarClock className="w-4 h-4 mt-0.5 shrink-0 text-outline" aria-hidden />{fmtMeet(claim.claimDateTime)}</p>
            {claim.claimLocation && <p className="flex items-start gap-1.5"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-outline" aria-hidden />{claim.claimLocation}</p>}
            {otherContact && <p className="flex items-start gap-1.5"><Phone className="w-4 h-4 mt-0.5 shrink-0 text-outline" aria-hidden />ติดต่อ {otherName}: {otherContact}</p>}
          </Step>
          <Step n={2} title={isGiver ? 'ส่งของให้อีกฝ่าย' : 'รับของและตรวจดูให้ถูกชิ้น'}>
            <p>{isGiver ? 'ตรวจว่าเป็นคนเดียวกับที่นัดไว้ก่อนส่งของ' : 'ตรวจดูของให้ครบก่อนกดยืนยัน'}</p>
          </Step>
          <Step n={3} done={!!myConfirmedAt} title="กดยืนยันทั้งสองฝ่าย">
            <ul className="space-y-1">
              {partyStatus('ผู้ส่ง', p.giverName, claim.giverConfirmedAt)}
              {partyStatus('ผู้รับ', p.receiverName, claim.receiverConfirmedAt)}
            </ul>
          </Step>
        </ol>

        {myConfirmedAt ? (
          <p role="status" className="rounded-xl bg-surface px-4 py-3 text-sm text-on-surface-variant">
            คุณยืนยันแล้วเมื่อ {fmtTime(myConfirmedAt)} — รอ {otherName} กดยืนยัน รายการจะปิดให้อัตโนมัติ
          </p>
        ) : (
          <div className="space-y-2">
            {otherConfirmedAt && (
              <p className="text-sm font-semibold text-amber-800">{otherName} ยืนยันแล้ว เหลือคุณคนเดียว</p>
            )}
            <button
              onClick={onConfirm}
              disabled={busy}
              aria-busy={busy}
              className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl btn-gradient px-4 py-3 text-sm font-semibold text-white shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden />
              {busy ? 'กำลังบันทึก...' : isGiver ? 'ฉันส่งของให้แล้ว' : 'ฉันได้รับของแล้ว'}
            </button>
            <p className="text-xs text-on-surface-variant text-center">กดหลังจากส่งของกันเรียบร้อยแล้วเท่านั้น</p>
          </div>
        )}
      </div>
    </article>
  );
}
