'use client';

import React, { useState, useEffect } from 'react';
import { Noto_Sans_Thai, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { RoleProvider } from '@/context/RoleContext';

// ฟอนต์ตาม ui-design-system.md ข้อ 4.1 (โหลดผ่าน next/font = self-host ตอน build)
// - เนื้อความ/UI: Noto Sans Thai  - หัวเรื่อง/ตัวเลข: Plus Jakarta Sans (ไม่มีอักขระไทย จึงต่อท้ายด้วย Noto Sans Thai ใน tailwind.config)
// เป็น variable font ทั้งคู่ ไฟล์เดียวครอบคลุมทุกน้ำหนัก
const bodyFont = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-body',
  display: 'swap',
});

const displayFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display-face', // ชื่อต่างจาก token --font-display ใน @theme (กันอ้างตัวเอง)
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // เปิด Sidebar อัตโนมัติบนเดสก์ท็อป (1024px ขึ้นไป)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <html lang="th" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <head>
        <title>Missing Items — ระบบแจ้งของหาย ม.แม่โจ้</title>
      </head>
      <body className="font-sans bg-surface text-ink antialiased">
        <RoleProvider>
          <div className="flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-[272px]' : 'lg:ml-0'}`}>
              <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

              <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </RoleProvider>
      </body>
    </html>
  );
}
