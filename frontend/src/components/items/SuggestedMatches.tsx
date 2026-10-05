'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Calendar, ChevronDown, ChevronUp, MapPin, Navigation, Package, Sparkles, Tag } from 'lucide-react';
import { LostItem } from '@/types';
import { MatchResult, distanceMeters } from '@/lib/matching';
import { getReportType } from '@/lib/storage';
import { color } from '@/csmju/tokens';

const ViewMap = dynamic(() => import('@/components/map/ViewMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] w-full bg-surface flex items-center justify-center rounded-lg border border-line text-on-surface-variant text-xs">
      กำลังโหลดแผนที่...
    </div>
  ),
});

interface SuggestedMatchesProps {
  /** รายการที่กำลังดูอยู่ (ใช้เทียบข้อมูลและระยะห่างของหมุด) */
  source: LostItem;
  /** ผลจาก GET /api/v1/items/:id/matches */
  matches: MatchResult[];
  emptyText?: string;
}

const hasPin = (item: LostItem): item is LostItem & { pinX: number; pinY: number } => item.pinX != null && item.pinY != null;

const formatDistance = (meters: number) => (meters < 1000 ? `${Math.round(meters)} ม.` : `${(meters / 1000).toFixed(1)} กม.`);

const kindLabel = (item: LostItem) => (getReportType(item) === 'found' ? 'แจ้งพบ' : 'แจ้งหาย');

const when = (item: LostItem) => `${item.dateLost || item.createdAt}${item.timeLost ? ` ${item.timeLost} น.` : ''}`;

function Thumb({ item }: { item: LostItem }) {
  return (
    <div className="aspect-square w-full rounded-xl bg-surface-container border border-line overflow-hidden flex items-center justify-center">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <Package className="w-6 h-6 text-outline" />
      )}
    </div>
  );
}

// แถวเทียบข้อมูล: ค่าที่ตรงกันเน้นสีเขียว
function CompareRow({ icon: Icon, label, left, right, same }: { icon: typeof Tag; label: string; left: string; right: string; same: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-[11px]">
      <p className={`text-right truncate ${same ? 'font-semibold text-emerald-700' : 'text-on-surface-variant'}`} title={left}>{left || '-'}</p>
      <span className="flex items-center gap-1 text-outline" title={label}>
        <Icon className="w-3 h-3" />
      </span>
      <p className={`truncate ${same ? 'font-semibold text-emerald-700' : 'text-on-surface-variant'}`} title={right}>{right || '-'}</p>
    </div>
  );
}

function MatchCard({ source, match }: { source: LostItem; match: MatchResult }) {
  const [showMap, setShowMap] = useState(false);
  const { item, score, reasons } = match;
  const distance = hasPin(source) && hasPin(item) ? distanceMeters(source.pinX, source.pinY, item.pinX, item.pinY) : null;
  const pinned = hasPin(item);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3 space-y-3">
      {/* หัวการ์ด: คะแนนความตรงกัน + เหตุผล */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-on-surface-variant truncate">{reasons.join(' • ')}</p>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-0.5 text-xs font-black font-mono text-amber-700">
          <Sparkles className="w-3 h-3" />
          {score}%
        </span>
      </div>

      {/* เทียบรูป: รายการนี้ ↔ รายการที่อาจตรงกัน */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Thumb item={source} />
          <p className="text-[10px] text-outline text-center">รายการนี้ ({kindLabel(source)})</p>
        </div>
        <div className="space-y-1">
          <Thumb item={item} />
          <p className="text-[10px] text-outline text-center">อาจตรงกัน ({kindLabel(item)})</p>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-line p-2.5 space-y-1.5">
        <CompareRow icon={Package} label="ชื่อ" left={source.name} right={item.name} same={source.name.trim() === item.name.trim()} />
        <CompareRow icon={Tag} label="หมวดหมู่" left={source.category} right={item.category} same={source.category === item.category} />
        <CompareRow icon={MapPin} label="สถานที่" left={source.location} right={item.location} same={!!source.faculty && source.faculty === item.faculty} />
        <CompareRow icon={Calendar} label="วันที่" left={when(source)} right={when(item)} same={source.dateLost === item.dateLost} />
        {item.description && (
          <p className="pt-1.5 border-t border-line text-[11px] text-on-surface-variant line-clamp-2 whitespace-pre-line">{item.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {distance != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-100 px-2 py-0.5 text-[11px] font-semibold text-primary-container">
            <Navigation className="w-3 h-3" />
            หมุดห่างกันประมาณ {formatDistance(distance)}
          </span>
        )}
        {pinned && (
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant hover:text-primary-container cursor-pointer"
          >
            {showMap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showMap ? 'ซ่อนแผนที่' : 'ดูจุดบนแผนที่'}
          </button>
        )}
        <Link href={`/items/${item.id}`} className="ml-auto text-[11px] font-bold text-primary-container hover:underline">
          ดูรายละเอียด
        </Link>
      </div>

      {showMap && pinned && (
        <div className="space-y-1.5">
          <ViewMap
            heightClass="h-[220px]"
            lat={hasPin(source) ? source.pinX : undefined}
            lng={hasPin(source) ? source.pinY : undefined}
            item={{ id: source.id, name: source.name, imageUrl: source.imageUrl, status: source.status, reportType: source.reportType }}
            compare={{ lat: item.pinX, lng: item.pinY, item: { id: item.id, name: item.name, imageUrl: item.imageUrl, status: item.status, reportType: item.reportType } }}
          />
          <p className="flex flex-wrap items-center gap-3 text-[10px] text-outline">
            {hasPin(source) && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-primary-container" /> รายการนี้</span>}
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: color.highlight, borderColor: color.brandNavy }} /> รายการที่อาจตรงกัน</span>
          </p>
        </div>
      )}
    </div>
  );
}

// การ์ดเทียบรายการที่อาจตรงกัน: รูป ข้อมูลหลัก และระยะห่างของจุดที่ปักหมุด
export default function SuggestedMatches({ source, matches, emptyText }: SuggestedMatchesProps) {
  if (matches.length === 0) {
    return emptyText ? <p className="text-xs text-outline">{emptyText}</p> : null;
  }
  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <MatchCard key={m.item.id} source={source} match={m} />
      ))}
    </div>
  );
}
