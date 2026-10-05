'use client';
import { color } from '@/csmju/tokens';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Clock, Tag, Building2 } from 'lucide-react';
import { LostItem } from '@/types';
import { getReportType } from '@/lib/storage';

const HeatMap = dynamic(() => import('@/components/map/HeatMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] w-full bg-surface flex items-center justify-center rounded-xl border border-line text-on-surface-variant text-xs">
      กำลังโหลดแผนที่...
    </div>
  )
});

type TypeFilter = 'all' | 'lost' | 'found';

const BAR_COLOR = color.primaryContainer;

function countBy<T>(list: T[], key: (x: T) => string) {
  const map = new Map<string, number>();
  list.forEach((x) => {
    const k = key(x);
    if (k) map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

export default function AdminStats({ items }: { items: LostItem[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('lost');
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const filtered = useMemo(
    () => items.filter((i) => typeFilter === 'all' || getReportType(i) === typeFilter),
    [items, typeFilter]
  );

  // จุดบนแผนที่ + ข้อมูลสำหรับ popup (รูป ชื่อ สถานะ) — memo ไว้ ไม่ให้แผนที่ถูกสร้างใหม่ทุกครั้งที่ render
  const points = useMemo(
    () =>
      filtered
        .filter((i) => i.pinX != null && i.pinY != null)
        .map((i) => ({
          id: i.id,
          lat: i.pinX as number,
          lng: i.pinY as number,
          label: `${i.name} (${i.dateLost} ${i.timeLost || ''})`,
          item: { id: i.id, name: i.name, imageUrl: i.imageUrl, status: i.status, reportType: i.reportType },
        })),
    [filtered]
  );

  const hourly = useMemo(() => {
    const counts = Array(24).fill(0) as number[];
    filtered.forEach((i) => {
      const h = parseInt((i.timeLost || '').split(':')[0], 10);
      if (!Number.isNaN(h) && h >= 0 && h < 24) counts[h]++;
    });
    return counts;
  }, [filtered]);
  const maxHourly = Math.max(1, ...hourly);
  const peakHour = hourly.indexOf(Math.max(...hourly));

  const byCategory = countBy(filtered, (i) => i.category);
  const byPlace = countBy(filtered, (i) => i.faculty || i.location.split(' (')[0]).slice(0, 5);
  const maxCategory = Math.max(1, ...byCategory.map(([, n]) => n));

  const cardClass = 'bg-white rounded-2xl border border-line/80 p-4 space-y-3';
  const titleClass = 'text-xs font-bold text-on-surface flex items-center gap-1.5';

  return (
    <div className="p-4 space-y-4 text-xs">
      {/* ตัวกรองประเภท */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex bg-surface-variant/70 p-0.5 rounded-xl font-semibold">
          {([
            { id: 'lost', label: 'ของหาย' },
            { id: 'found', label: 'ของที่พบ' },
            { id: 'all', label: 'ทั้งหมด' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${typeFilter === t.id ? 'bg-white text-primary-container shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-on-surface-variant">{filtered.length} รายการ • ปักหมุด {points.length} รายการ</p>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-outline">ยังไม่มีข้อมูลสำหรับสร้างสถิติ</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* แผนที่จุดเสี่ยง */}
          <div className={`${cardClass} lg:col-span-3`}>
            <p className={titleClass}><MapPin className="w-3.5 h-3.5 text-red-600" /> แผนที่จุดเสี่ยง</p>
            {points.length > 0 ? (
              <HeatMap points={points} />
            ) : (
              <div className="h-[340px] flex items-center justify-center rounded-xl border border-dashed border-outline-variant text-outline">
                ยังไม่มีรายการที่ปักหมุดตำแหน่ง
              </div>
            )}
            <p className="text-[11px] text-on-surface-variant">บริเวณที่สีแดงเข้มคือจุดที่มีการแจ้งซ้อนกันหลายรายการ</p>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* สถานที่ที่แจ้งบ่อย */}
            <div className={cardClass}>
              <p className={titleClass}><Building2 className="w-3.5 h-3.5 text-primary-container" /> สถานที่ที่แจ้งบ่อยที่สุด</p>
              <ol className="space-y-1.5">
                {byPlace.map(([place, n], idx) => (
                  <li key={place} className="flex items-center justify-between gap-2">
                    <span className="truncate text-on-surface-variant"><span className="font-mono text-outline mr-1.5">{idx + 1}.</span>{place}</span>
                    <span className="font-mono font-bold text-on-surface shrink-0">{n}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* หมวดหมู่ */}
            <div className={cardClass}>
              <p className={titleClass}><Tag className="w-3.5 h-3.5 text-primary-container" /> แยกตามหมวดหมู่</p>
              <div className="space-y-2">
                {byCategory.map(([cat, n]) => (
                  <div key={cat} className="space-y-0.5" title={`${cat}: ${n} รายการ`}>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-on-surface-variant truncate">{cat}</span>
                      <span className="font-mono text-on-surface font-semibold">{n}</span>
                    </div>
                    <div className="h-2 bg-surface-container rounded-full">
                      <div className="h-2 rounded-full" style={{ width: `${(n / maxCategory) * 100}%`, background: BAR_COLOR }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ช่วงเวลา */}
          <div className={`${cardClass} lg:col-span-5`}>
            <div className="flex items-center justify-between">
              <p className={titleClass}><Clock className="w-3.5 h-3.5 text-primary-container" /> ช่วงเวลาที่เกิดเหตุ (รายชั่วโมง)</p>
              <p className="text-on-surface-variant">
                {hoverHour != null
                  ? `${String(hoverHour).padStart(2, '0')}:00–${String(hoverHour).padStart(2, '0')}:59 • ${hourly[hoverHour]} รายการ`
                  : `ช่วงที่เกิดบ่อยที่สุด: ${String(peakHour).padStart(2, '0')}:00 น. (${hourly[peakHour]} รายการ)`}
              </p>
            </div>
            <div className="flex items-end gap-[2px] h-28 border-b border-line" onMouseLeave={() => setHoverHour(null)}>
              {hourly.map((n, h) => (
                <div
                  key={h}
                  className="flex-1 h-full flex items-end cursor-default"
                  onMouseEnter={() => setHoverHour(h)}
                  aria-label={`${h}:00 น. ${n} รายการ`}
                >
                  <div
                    className="w-full rounded-t-[4px] transition-opacity"
                    style={{
                      height: n > 0 ? `${Math.max(4, (n / maxHourly) * 100)}%` : 0,
                      background: BAR_COLOR,
                      opacity: hoverHour == null || hoverHour === h ? 1 : 0.45
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-outline font-mono">
              {[0, 6, 12, 18, 23].map((h) => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
