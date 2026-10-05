'use client';

import React from 'react';
import Link from 'next/link';
import {
  Package,
  CheckCircle2,
  Trash2,
  Sparkles,
  ClipboardList,
  Plus,
  Hourglass,
  BellRing,
  History,
  XCircle,
  Check
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import MatchList from '@/components/items/MatchList';
import HandoverConfirm from '@/components/items/HandoverConfirm';
import { LostItem, ClaimRequest } from '@/types';
import { getReportType } from '@/lib/storage';
import { useRole } from '@/context/RoleContext';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import ApiError from '@/components/ui/ApiError';
import { findMatches } from '@/lib/matching';
import { wordingForClaim, claimTypeOf } from '@/lib/wording';
import { myHandoverRole } from '@/lib/handover';
import PageHeader from '@/components/layout/PageHeader';

const statusBadge = (status: LostItem['status']) =>
  status === 'searching' ? <Badge variant="searching">กำลังค้นหา</Badge>
    : status === 'found' ? <Badge variant="found">พบแล้ว</Badge>
      : <Badge variant="returned">คืนแล้ว</Badge>;

const isOpenClaim = (c: ClaimRequest) => c.status === 'pending' || c.status === 'approved' || c.status === 'at_office';

// ความคืบหน้าของรายการที่ฉันแจ้ง
function ItemTimeline({ item, claims }: { item: LostItem; claims: ClaimRequest[] }) {
  const itemClaims = claims.filter(c => c.itemId === item.id);
  const steps = [
    { label: 'แจ้งเข้าระบบ', done: true },
    { label: getReportType(item) === 'found' ? 'เจ้าของติดต่อมา' : 'มีคนเจอของ', done: itemClaims.length > 0 },
    { label: 'นัดส่งมอบ', done: itemClaims.some(c => c.status === 'approved' || c.status === 'completed') },
    { label: 'คืนแล้ว', done: item.status === 'returned' },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs" aria-label="ความคืบหน้า">
      {steps.map((s, idx) => (
        <li key={s.label} className="flex items-center gap-1">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${s.done ? 'bg-success text-white' : 'bg-surface-variant text-on-surface-variant'}`}>
            {s.done ? <Check className="w-3 h-3" aria-hidden /> : idx + 1}
          </span>
          <span className={s.done ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}>{s.label}</span>
          {idx < steps.length - 1 && <span className="w-4 h-px bg-outline-variant mx-0.5" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function SectionTitle({ icon, title, count, action }: { icon: React.ReactNode; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold flex items-center gap-2 border-l-4 border-primary-container pl-3">
        {icon} {title}{count !== undefined && <span className="text-on-surface-variant font-normal">({count})</span>}
      </h2>
      {action}
    </div>
  );
}

export default function MyItemsPage() {
  // ตัวตนมาจากบัญชี Core Hub ที่ login อยู่ (id ใน members) ไม่ต้องกรอกรหัสนักศึกษาเอง
  const { memberId } = useRole();
  // รายการทั้งหมด (ใช้หาชื่อ/ช่องทางติดต่อของอีกฝ่ายและจับคู่) + คำขอที่เกี่ยวกับฉัน
  const { data, loading, error, reload } = useApi<{ items: LostItem[]; claims: ClaimRequest[] }>(
    async () => {
      const [items, claims] = await Promise.all([api.listItems(), api.myClaims()]);
      return { items, claims };
    },
    { items: [], claims: [] },
    [memberId]
  );
  const { items, claims } = data;

  const myItems = items.filter(i => i.reporterId === memberId);
  const activeItems = myItems.filter(i => i.status !== 'returned');
  const returnedItems = myItems.filter(i => i.status === 'returned');

  // คำขอที่เกี่ยวกับฉัน: ฉันยื่นเอง หรือมีคนยื่นกับรายการของฉัน
  const relatedClaims = claims.filter(c => c.claimantId === memberId || myItems.some(i => i.id === c.itemId));
  const todo = relatedClaims.filter(c => c.status === 'approved' && myHandoverRole(c, items, memberId));
  const waiting = relatedClaims.filter(c => c.status === 'pending');
  const finishedClaims = relatedClaims.filter(c => c.status === 'completed' || c.status === 'rejected');


  const closeItem = (item: LostItem) => {
    const message = getReportType(item) === 'found'
      ? `ยืนยันว่าได้คืน "${item.name}" ให้เจ้าของแล้ว? รายการจะถูกนำออกจากหน้าค้นหา`
      : `ได้ "${item.name}" คืนแล้วใช่ไหม? รายการจะถูกนำออกจากหน้าค้นหา`;
    if (!confirm(message)) return;
    api.setItemStatus(item.id, 'returned').catch((err) => alert(errorMessage(err)));
  };

  const deleteItem = (item: LostItem) => {
    if (!confirm(`ลบรายการ "${item.name}"? รายการนี้จะถูกลบถาวร`)) return;
    api.deleteItem(item.id).catch((err) => alert(errorMessage(err)));
  };

  const claimLine = (c: ClaimRequest) => {
    const mine = c.claimantId === memberId;
    const lostClaim = claimTypeOf(c, items) === 'lost';
    return mine
      ? (lostClaim ? `คุณแจ้งว่าเจอ "${c.itemName}"` : `คุณขอรับคืน "${c.itemName}"`)
      : (lostClaim ? `${c.claimerName} แจ้งว่าเจอ "${c.itemName}" ของคุณ` : `${c.claimerName} ขอรับ "${c.itemName}" ที่คุณเก็บได้`);
  };

  return (
    <div className="pb-8">
      <div className="space-y-8">
        <PageHeader
          title="รายการของฉัน"
          description="ดูว่าต้องทำอะไรต่อ ติดตามของที่คุณแจ้ง และยืนยันเมื่อส่งของคืนกันเรียบร้อยแล้ว"
          icon={<ClipboardList className="w-5 h-5" />}
        />

        <ApiError message={error} onRetry={reload} />
        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
            <div className="h-40 rounded-2xl bg-surface-variant/60 animate-pulse" />
            <div className="h-24 rounded-2xl bg-surface-variant/60 animate-pulse" />
          </div>
        )}

        {/* 1) สิ่งที่ต้องทำตอนนี้: นัดส่งมอบแล้วกดยืนยัน */}
        {!loading && todo.length > 0 && (
          <section className="space-y-4">
            <SectionTitle icon={<BellRing className="w-5 h-5 text-primary-container" aria-hidden />} title="ต้องทำตอนนี้" count={todo.length} />
            <p className="text-sm text-on-surface-variant -mt-2">แอดมินอนุมัติแล้ว นัดเจออีกฝ่ายเพื่อส่งของ แล้วกดยืนยันทั้งสองคน รายการจะปิดให้อัตโนมัติ</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {todo.map((c) => <HandoverConfirm key={c.requestId} claim={c} items={items} memberId={memberId} />)}
            </div>
          </section>
        )}

        {/* 2) รอแอดมินตรวจสอบ */}
        {!loading && waiting.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={<Hourglass className="w-5 h-5 text-amber-600" aria-hidden />} title="รอแอดมินตรวจสอบ" count={waiting.length} />
            <ul className="rounded-2xl border border-line bg-surface-container-lowest divide-y divide-line shadow-card">
              {waiting.map((c) => (
                <li key={c.requestId} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{claimLine(c)}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">ยื่นเมื่อ {new Date(c.requestDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })} • เมื่ออนุมัติแล้วจะแสดงในหัวข้อ &quot;ต้องทำตอนนี้&quot;</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden /> รอตรวจสอบ
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 3) รายการที่ฉันแจ้ง (ยังไม่ปิด) */}
        {!loading && (
          <section className="space-y-4">
            <SectionTitle
              icon={<Package className="w-5 h-5 text-primary-container" aria-hidden />}
              title="รายการที่ฉันแจ้ง"
              count={activeItems.length}
              action={
                <Link href="/report" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-container hover:underline">
                  <Plus className="w-4 h-4" aria-hidden /> แจ้งรายการใหม่
                </Link>
              }
            />
            {activeItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center space-y-2">
                <Package className="w-8 h-8 text-outline mx-auto" aria-hidden />
                <p className="text-sm font-semibold text-on-surface">ไม่มีรายการที่กำลังดำเนินการ</p>
                <p className="text-sm text-on-surface-variant">ของที่คืนเรียบร้อยแล้วอยู่ในหัวข้อประวัติด้านล่าง</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeItems.map((item) => {
                  const matches = findMatches(item, items, 3);
                  const isFound = getReportType(item) === 'found';
                  const hasOpenClaim = claims.some(c => c.itemId === item.id && isOpenClaim(c));
                  return (
                    <div key={item.id} className="rounded-2xl border border-line bg-surface-container-lowest p-5 shadow-card space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-28 h-28 rounded-xl bg-brand-50 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-outline" aria-hidden />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-on-surface-variant"><span className="font-mono tabular-nums">{item.code}</span> • {isFound ? 'แจ้งพบของ' : 'แจ้งของหาย'}</p>
                              <Link href={`/items/${item.id}`} className="text-base font-semibold text-on-surface hover:text-primary-container truncate block">{item.name}</Link>
                              <p className="text-sm text-on-surface-variant truncate">{item.location}</p>
                            </div>
                            {statusBadge(item.status)}
                          </div>
                          <ItemTimeline item={item} claims={claims} />
                          <div className="flex flex-wrap gap-2">
                            {hasOpenClaim ? (
                              <p className="text-xs text-on-surface-variant">มีคำขอกำลังดำเนินการ รายการจะปิดเองเมื่อยืนยันส่งมอบครบสองฝ่าย</p>
                            ) : (
                              <button onClick={() => closeItem(item)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-variant/50 cursor-pointer">
                                <CheckCircle2 className="w-4 h-4" aria-hidden /> {isFound ? 'คืนเจ้าของแล้ว' : 'ได้ของคืนแล้ว'}
                              </button>
                            )}
                            <button onClick={() => deleteItem(item)} aria-label={`ลบ ${item.name}`} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-outline hover:text-error hover:bg-error-container/50 cursor-pointer">
                              <Trash2 className="w-4 h-4" aria-hidden /> ลบ
                            </button>
                          </div>
                        </div>
                      </div>
                      {!hasOpenClaim && (
                        <div className="pt-3 border-t border-line space-y-2">
                          <p className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-primary-container" aria-hidden />
                            {isFound ? 'รายการแจ้งหายที่อาจเป็นของชิ้นนี้' : 'ของที่มีคนแจ้งพบซึ่งอาจเป็นของคุณ'}
                          </p>
                          <MatchList matches={matches} emptyText="ยังไม่พบรายการที่ตรงกัน" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 4) ประวัติ: คืนเรียบร้อย / ไม่ผ่านการอนุมัติ */}
        {!loading && (finishedClaims.length > 0 || returnedItems.length > 0) && (
          <details className="group rounded-2xl border border-line bg-surface-container-lowest shadow-card">
            <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none">
              <span className="text-base font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-outline" aria-hidden /> ประวัติ
                <span className="text-on-surface-variant font-normal">({finishedClaims.length + returnedItems.length})</span>
              </span>
              <span className="text-sm text-primary-container group-open:hidden">แสดง</span>
              <span className="text-sm text-primary-container hidden group-open:inline">ซ่อน</span>
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {finishedClaims.map((c) => {
                const done = c.status === 'completed';
                return (
                  <li key={c.requestId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-on-surface truncate">{claimLine(c)}</p>
                      {done && c.handedOverAt && (
                        <p className="text-xs text-on-surface-variant">คืนเมื่อ {new Date(c.handedOverAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      )}
                    </div>
                    {done ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-4 h-4 text-success" aria-hidden /> {wordingForClaim(c, items).status.completed}</span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-on-error-container"><XCircle className="w-4 h-4 text-error" aria-hidden /> ไม่ผ่านการอนุมัติ</span>
                    )}
                  </li>
                );
              })}
              {returnedItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/items/${item.id}`} className="text-sm text-on-surface hover:text-primary-container truncate">
                    {getReportType(item) === 'found' ? 'โพสต์แจ้งพบ' : 'โพสต์แจ้งหาย'}: {item.name}
                  </Link>
                  <span className="shrink-0 text-xs text-on-surface-variant">ปิดรายการแล้ว</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
