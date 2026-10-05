'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Package,
  ArrowRight,
  MapPin,
  Calendar,
  FilePlus2,
  HandHeart,
  Sparkles,
  KeyRound,
  PackageSearch,
  PackageCheck,
  Hourglass,
  Smartphone,
  BookOpen,
  Wallet,
  PenTool,
  Key,
  Shirt,
  MoreHorizontal,
  LucideIcon
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { LostItem } from '@/types';
import { categories } from '@/data/mockData';
import { getReportType } from '@/lib/storage';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import ApiError from '@/components/ui/ApiError';

// ชื่อไอคอนใน mockData.categories -> คอมโพเนนต์ lucide
const categoryIcons: Record<string, LucideIcon> = {
  Smartphone, BookOpen, Wallet, PenTool, Key, Shirt, MoreHorizontal
};

const statusBadge = (status: LostItem['status']) =>
  status === 'searching' ? <Badge variant="searching" size="sm">กำลังค้นหา</Badge>
    : status === 'found' ? <Badge variant="found" size="sm">พบแล้ว</Badge>
      : <Badge variant="returned" size="sm">รับคืนแล้ว</Badge>;

const steps = [
  { icon: FilePlus2, title: 'แจ้งเข้าระบบ', desc: 'บอกรายละเอียด แนบรูป และปักหมุดตำแหน่งบนแผนที่ ใช้เวลาไม่ถึง 2 นาที' },
  { icon: Sparkles, title: 'ระบบจับคู่ให้อัตโนมัติ', desc: 'เทียบหมวดหมู่ คำอธิบาย ระยะทาง และวันที่ แล้วแจ้งเตือนเมื่อพบรายการที่อาจตรงกัน' },
  { icon: KeyRound, title: 'นัดเจอแล้วยืนยันสองฝ่าย', desc: 'แอดมินตรวจคำขอ แล้วนัดส่งของกันเอง เมื่อทั้งผู้ส่งและผู้รับกดยืนยัน รายการจะปิดให้อัตโนมัติ' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: items, error, reload } = useApi<LostItem[]>(() => api.listItems(), []);
  const [query, setQuery] = useState('');

  const total = items.length;
  const searching = items.filter(i => i.status === 'searching').length;
  const found = items.filter(i => i.status === 'found').length;
  const returned = items.filter(i => i.status === 'returned').length;
  const successRate = total > 0 ? Math.round((returned / total) * 100) : 0;
  const recentItems = items.filter(i => i.status !== 'returned').slice(0, 4);

  const stats = [
    { label: 'รายการทั้งหมด', value: total, icon: PackageSearch, tone: 'bg-brand-50 text-primary-container' },
    { label: 'กำลังตามหา', value: searching, icon: Hourglass, tone: 'bg-amber-50 text-amber-600' },
    { label: 'มีคนเก็บได้', value: found, icon: HandHeart, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'ส่งคืนเจ้าของแล้ว', value: returned, icon: PackageCheck, tone: 'bg-brand-50 text-primary-container' },
  ];

  return (
    <div className="space-y-7 md:space-y-10 pb-6 md:pb-8">
      <ApiError message={error} onRetry={reload} />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[28px] bg-brand-gradient text-white">
        <div className="absolute inset-0 bg-dots pointer-events-none" />
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 md:gap-8 p-5 sm:p-7 md:p-10 lg:p-12">
          <div className="space-y-5 md:space-y-6">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              ศูนย์รวมของหาย–ของที่พบ ภายในมหาวิทยาลัย
            </span>
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-semibold leading-[1.35]">
                ทำของหาย หรือเก็บของได้?<br />
                <span className="text-amber-300">แจ้งที่นี่</span> เราช่วยตามหาให้
              </h1>
              <p className="text-white/80 text-sm sm:text-base max-w-xl leading-relaxed">
                แจ้งได้ในไม่กี่นาที ระบบจะจับคู่ของหายกับของที่มีคนพบให้อัตโนมัติ พร้อมยืนยันตัวตนก่อนส่งมอบทุกครั้ง
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(query.trim() ? `/items?q=${encodeURIComponent(query.trim())}` : '/items');
              }}
              className="flex w-full max-w-xl items-center gap-1.5 md:gap-2 rounded-2xl bg-white p-1.5 shadow-lift"
            >
              <Search className="ml-2 md:ml-3 w-5 h-5 text-outline shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา เช่น หูฟัง, บัตรนักศึกษา, กุญแจ..."
                className="flex-1 min-w-0 bg-transparent px-1 py-2 text-base md:text-sm text-ink placeholder:text-outline focus:outline-hidden"
              />
              <button type="submit" className="shrink-0 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white transition-colors">
                ค้นหา
              </button>
            </form>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 md:gap-3">
              <Link href="/report" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-3 md:py-2.5 text-sm font-semibold ring-1 ring-white/30 transition-colors">
                <FilePlus2 className="w-4 h-4" /> แจ้งของหาย
              </Link>
              <Link href="/report?type=found" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-3 md:py-2.5 text-sm font-semibold ring-1 ring-white/30 transition-colors">
                <HandHeart className="w-4 h-4" /> ฉันเก็บของได้
              </Link>
            </div>
          </div>

          {/* การ์ดสรุปอัตราส่งคืน */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-full max-w-xs rounded-3xl bg-white/10 p-6 ring-1 ring-white/25 backdrop-blur-md space-y-5">
              <div>
                <p className="text-sm text-white/75">อัตราการส่งคืนสำเร็จ</p>
                <p className="font-display text-6xl font-semibold mt-1">{successRate}<span className="text-3xl text-white/70">%</span></p>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-amber-300" style={{ width: `${successRate}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/70 text-xs">ส่งคืนแล้ว</p>
                  <p className="font-display text-2xl font-semibold">{returned}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-white/70 text-xs">รอเจ้าของ</p>
                  <p className="font-display text-2xl font-semibold">{searching + found}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Link key={label} href="/items" className="group rounded-2xl bg-white p-4 md:p-5 border border-line shadow-card hover:border-brand-200 hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon className="w-5 h-5" />
              </span>
              <ArrowRight className="w-4 h-4 text-outline-variant group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="mt-3 md:mt-4 font-display text-2xl md:text-3xl font-semibold text-ink">{value}</p>
            <p className="text-xs md:text-sm text-on-surface-variant">{label}</p>
          </Link>
        ))}
      </section>

      {/* How it works */}
      <section className="space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">ใช้งานง่ายใน 3 ขั้นตอน</h2>
          <p className="text-sm text-on-surface-variant mt-1">ตั้งแต่แจ้งจนได้ของคืน ทุกขั้นตอนติดตามได้ในหน้ารายการของฉัน</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3 md:gap-4">
          {steps.map(({ icon: Icon, title, desc }, idx) => (
            <div key={title} className="relative flex items-start gap-4 md:block rounded-2xl bg-white p-4 md:p-6 border border-line shadow-card">
              <span className="absolute top-3 right-4 md:top-5 md:right-5 font-display text-3xl md:text-4xl font-semibold text-slate-100">0{idx + 1}</span>
              <span className="w-11 h-11 shrink-0 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-lift">
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 pr-8 md:pr-0">
                <h3 className="md:mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Items */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">รายการล่าสุด</h2>
            <p className="text-sm text-on-surface-variant mt-1">ของที่เพิ่งมีการแจ้งเข้ามาในระบบ</p>
          </div>
          <Link href="/items" className="shrink-0 text-sm text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 group">
            ดูทั้งหมด <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 md:p-10 text-center border border-dashed border-line">
            <Package className="w-10 h-10 text-outline-variant mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink">ยังไม่มีรายการในระบบ</p>
            <p className="text-xs text-on-surface-variant mt-1">เริ่มต้นแจ้งรายการแรกได้จากปุ่ม &quot;แจ้งของหาย&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {recentItems.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="group flex sm:block rounded-2xl bg-white border border-line shadow-card overflow-hidden hover:-translate-y-1 hover:shadow-lift transition-all">
                <div className="w-28 shrink-0 self-stretch min-h-28 sm:w-auto sm:min-h-0 sm:aspect-4/3 bg-surface-container relative overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-outline-variant" /></div>
                  )}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3">{statusBadge(item.status)}</div>
                </div>
                <div className="flex-1 min-w-0 p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                  <p className="text-[11px] font-semibold text-brand-600">{getReportType(item) === 'found' ? 'มีคนเก็บได้' : 'แจ้งของหาย'} • {item.category}</p>
                  <h3 className="font-semibold text-ink truncate group-hover:text-brand-600 transition-colors">{item.name}</h3>
                  <div className="space-y-1 text-xs text-on-surface-variant">
                    <p className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 shrink-0" />{item.location}</p>
                    <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" />{item.dateLost ? new Date(item.dateLost).toLocaleDateString('th-TH') : 'ไม่ระบุวันที่'}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">เลือกดูตามหมวดหมู่</h2>
          <p className="text-sm text-on-surface-variant mt-1">กดเพื่อกรองรายการในหมวดนั้นทันที</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.icon] || Package;
            const count = items.filter(i => i.category === cat.name).length;
            return (
              <Link
                key={cat.id}
                href={`/items?category=${encodeURIComponent(cat.name)}`}
                className="group rounded-2xl bg-white p-3 sm:p-4 border border-line shadow-card hover:border-brand-200 hover:-translate-y-0.5 transition-all flex flex-col items-center text-center gap-1.5 sm:gap-2"
              >
                <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-xs sm:text-sm font-semibold text-ink leading-snug">{cat.name}</span>
                <span className="text-[11px] text-outline">{count} รายการ</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
