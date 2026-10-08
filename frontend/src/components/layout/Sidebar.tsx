'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Home, FilePlus2, PackageSearch, HandHelping, ClipboardList } from 'lucide-react';
import { ArrowBackIcon, CloseIcon, CsmjuLogo, LogoutIcon } from '@/csmju';
import { useRole } from '@/context/RoleContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  /** ชื่อไทย (หลัก) */
  label: string;
  /** ชื่ออังกฤษ แสดงจางๆ ต่อท้ายชื่อไทย */
  labelEn: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { label: 'หน้าแรก', labelEn: 'Home', icon: Home, href: '/' },
  { label: 'ค้นหาของหาย', labelEn: 'Search', icon: PackageSearch, href: '/items' },
  { label: 'แจ้งของหาย / พบของ', labelEn: 'Report', icon: FilePlus2, href: '/report' },
  { label: 'รับของคืน / ส่งคืนเจ้าของ', labelEn: 'Claim', icon: HandHelping, href: '/claim' },
  { label: 'รายการของฉัน', labelEn: 'My items', icon: ClipboardList, href: '/my-items' },
  { label: 'แผงควบคุมแอดมิน', labelEn: 'Admin', icon: Shield, href: '/admin', adminOnly: true },
];

// ออกจากระบบ = POST /auth/logout ของระบบนี้ (auth-contract.md ข้อ 5) — ลิงก์ GET ไปไม่ถึง route นี้
const LOGOUT_ACTION = '/auth/logout';

/**
 * Side nav หน้าตาเดียวกับ CsmjuAppShell ของมาตรฐาน v1.8.4 (standards/templates/csmju-subsystem-web):
 * พื้น brand-gradient · โลโก้ในกรอบขาว · "กลับ CSMJU Portal" · เมนูไทย+อังกฤษ · ปุ่มออกจากระบบ
 * บนมือถือเป็น drawer (เปิด/ปิดด้วย isOpen) · ตั้งแต่ md ขึ้นไปแสดงถาวร
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  // สิทธิ์เจ้าหน้าที่มาจาก Core Hub (core role staff/admin) — ผู้ใช้ทั่วไปไม่เห็นเมนูเจ้าหน้าที่
  const { isAdmin } = useRole();

  const nav = NAV.filter((item) => !item.adminOnly || isAdmin);
  const rootHref = nav[0]?.href ?? '/';

  return (
    <>
      {/* Scrim ของ drawer บนมือถือ */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`brand-gradient fixed left-0 top-0 z-30 flex h-dvh w-64 flex-col py-4 shadow-xl transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 shrink-0 px-4 pt-4">
          <div className="mb-6 flex items-center justify-between gap-2">
            <CsmjuLogo framed priority className="w-full" />
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดเมนู"
              className="self-start rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* ออกไปเว็บ Core Hub (คนละ origin) — ใช้ <a> ไม่ใช่ Link; /portal ส่งต่อไป CORE_HUB_WEB_URL */}
          <a
            href="/portal"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-label-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowBackIcon className="h-4 w-4 shrink-0" />
            กลับ CSMJU Portal
          </a>
        </div>

        {/* เมนูเลื่อนเองได้ เพื่อให้ปุ่มออกจากระบบอยู่ในจอเสมอ */}
        <nav className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label="เมนูหลัก">
          <ul className="space-y-1">
            {nav.map(({ href, label, labelEn, icon: Icon }) => {
              const active = href === rootHref ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 py-3 duration-200 ${
                      active
                        ? 'border-l-4 border-accent bg-white/10 pl-6 text-white'
                        : 'pl-7 text-white/70 transition-colors hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="text-label-md">{label}</span>
                    <span className="text-caption text-white/50">{labelEn}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form action={LOGOUT_ACTION} method="post" className="mx-4 mt-4 shrink-0">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 py-2.5 text-label-md text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <LogoutIcon className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </form>
      </aside>
    </>
  );
}
