'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Home,
  FilePlus2,
  PackageSearch,
  HandHelping,
  ClipboardList,
  LogOut,
  ArrowLeft,
  X,
} from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { useRole } from '@/context/RoleContext';
import { signOut } from '@/lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  /** ชื่อภาษาอังกฤษ แสดงเป็นตัวรองต่อท้ายชื่อไทย */
  sub: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
}

const navGroups: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: 'หน้าแรก', sub: 'Home', icon: Home, href: '/' },
      { label: 'ค้นหาของหาย', sub: 'Search', icon: PackageSearch, href: '/items' },
      { label: 'แจ้งของหาย / พบของ', sub: 'Report', icon: FilePlus2, href: '/report' },
      { label: 'รับของคืน / ส่งคืนเจ้าของ', sub: 'Claim', icon: HandHelping, href: '/claim' },
      { label: 'รายการของฉัน', sub: 'My items', icon: ClipboardList, href: '/my-items' },
    ],
  },
  {
    title: 'สำหรับเจ้าหน้าที่',
    items: [{ label: 'แผงควบคุมแอดมิน', sub: 'Admin', icon: Shield, href: '/admin', adminOnly: true }],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  // สิทธิ์เจ้าหน้าที่มาจาก Core Hub (core role staff/admin) — ผู้ใช้ทั่วไปไม่เห็นเมนูเจ้าหน้าที่
  const { isAdmin } = useRole();

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || isAdmin) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button type="button" aria-label="ปิดเมนู" className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] lg:hidden cursor-default" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[272px] bg-brand-gradient text-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* โลโก้ในกรอบขาว */}
        <div className="relative px-4 pt-6">
          <Link
            href="/"
            onClick={handleNavClick}
            className="flex items-center justify-center rounded-xl bg-white px-4 py-6"
            aria-label="Lost & Found — หน้าแรก"
          >
            <Logo />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden absolute top-8 right-7 p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* กลับเว็บ Core Hub */}
        <a
          href="/portal"
          className="mt-6 mx-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-[18px] h-[18px]" aria-hidden="true" />
          กลับ CSMJU Portal
        </a>

        {/* Navigation */}
        <nav className="flex-1 pt-6 pb-6 space-y-6 overflow-y-auto" aria-label="เมนูหลัก">
          {visibleGroups.map((group) => (
            <div key={group.title ?? 'main'} className="space-y-1">
              {group.title && <p className="px-6 pb-1 text-[11px] font-semibold text-primary-fixed/80">{group.title}</p>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 border-l-4 pl-5 pr-4 py-3 text-sm rounded-r-lg transition-colors ${
                      active ? 'border-accent bg-white/15' : 'border-transparent hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold">{item.label}</span>
                      <span className="ml-2 text-xs text-primary-fixed/80">{item.sub}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ออกจากระบบ */}
        <div className="p-4">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" aria-hidden="true" />
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}
