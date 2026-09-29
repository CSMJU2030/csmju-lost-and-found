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
  X,
  ArrowRight
} from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { useRole } from '@/context/RoleContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'เมนูหลัก',
    items: [
      { label: 'หน้าแรก', icon: Home, href: '/' },
      { label: 'ค้นหาของหาย', icon: PackageSearch, href: '/items' },
      { label: 'แจ้งของหาย / พบของ', icon: FilePlus2, href: '/report' },
      { label: 'รับของคืน / ส่งคืนเจ้าของ', icon: HandHelping, href: '/claim' },
      { label: 'รายการของฉัน', icon: ClipboardList, href: '/my-items' },
    ],
  },
  {
    title: 'สำหรับเจ้าหน้าที่',
    items: [{ label: 'แผงควบคุมแอดมิน', icon: Shield, href: '/admin', adminOnly: true }],
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
        className={`fixed inset-y-0 left-0 z-50 w-[272px] bg-white border-r border-line transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between">
          <Link href="/" onClick={() => window.innerWidth < 1024 && onClose()}>
            <Logo />
          </Link>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container" aria-label="ปิดเมนู">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-6 space-y-6 overflow-y-auto">
          {visibleGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold text-outline">{group.title}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-on-surface-variant hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-600' : 'text-outline group-hover:text-on-surface-variant'}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* CTA card */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white">
            <div className="absolute inset-0 bg-dots opacity-60 pointer-events-none" />
            <div className="relative space-y-1">
              <p className="font-display font-semibold text-sm">เก็บของได้ใช่ไหม?</p>
              <p className="text-xs text-white/80 leading-relaxed">แจ้งพบของในไม่กี่นาที ระบบจะช่วยจับคู่กับเจ้าของให้อัตโนมัติ</p>
              <Link
                href="/report"
                onClick={() => window.innerWidth < 1024 && onClose()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
              >
                แจ้งพบของ <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
