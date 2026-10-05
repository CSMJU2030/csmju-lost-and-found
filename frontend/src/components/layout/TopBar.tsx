'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Settings,
  Shield,
  CheckCircle2,
  ExternalLink,
  LogOut,
  PackageCheck,
  FileText,
  Search
} from 'lucide-react';
import { LogoMark } from '@/components/layout/Logo';
import Modal from '@/components/ui/Modal';
import { getReportType } from '@/lib/storage';
import { api, DATA_CHANGED, signOut } from '@/lib/api';
import { findMatches } from '@/lib/matching';
import { wordingForClaim, claimTypeOf } from '@/lib/wording';
import { myHandoverRole } from '@/lib/handover';
import { useRole } from '@/context/RoleContext';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  // ซ่อนช่องค้นหาบนแถบด้านบนในหน้าที่มีช่องค้นหาหลักอยู่แล้ว (หน้าแรก รายการ รับของคืน)
  // และหน้าที่ไม่ต้องใช้การค้นหา (แจ้งของหาย/พบของ รายการของฉัน)
  const HIDE_SEARCH_ON = ['/', '/items', '/claim', '/report', '/my-items'];
  const hasPageSearch = HIDE_SEARCH_ON.includes(pathname) || pathname.startsWith('/claim/');
  
  // บัญชีและสิทธิ์มาจาก Core Hub (SSO) — สลับสิทธิ์จากหน้าเว็บไม่ได้
  const { currentRole, memberId, member, email, loading: sessionLoading } = useRole();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [soundNotif, setSoundNotif] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const displayName = member?.fullName || email || 'ผู้ใช้งาน';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // โหลดค่าตั้งค่าที่บันทึกไว้
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('userSettings') || '{}');
      if (typeof saved.emailNotif === 'boolean') setEmailNotif(saved.emailNotif);
      if (typeof saved.soundNotif === 'boolean') setSoundNotif(saved.soundNotif);
    } catch {}
  }, []);

  // โหลดรายการแจ้งเตือนและซิงค์สถานะการอ่าน
  // แอดมิน: เห็นรายการใหม่และคำขอที่รอตรวจ / ผู้ใช้ทั่วไป: เห็นเฉพาะเรื่องที่เกี่ยวกับรหัสนักศึกษาของตัวเอง
  useEffect(() => {
    let cancelled = false;
    const loadDynamicNotifications = async () => {
      if (sessionLoading) return; // รอรู้ก่อนว่าเป็นใคร
      let dynamicList: any[] = [];
      const savedReadState: string[] = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
      // โหลดจาก backend: แอดมินเห็นคำขอทั้งหมด ผู้ใช้ทั่วไปเห็นเฉพาะคำขอที่เกี่ยวกับตัวเอง
      let items, claims;
      try {
        [items, claims] = await Promise.all([
          api.listItems(),
          currentRole === 'admin' ? api.allClaims() : api.myClaims(),
        ]);
      } catch {
        return; // เซิร์ฟเวอร์ไม่ตอบ -> คงรายการแจ้งเตือนเดิมไว้ แล้วลองใหม่รอบถัดไป
      }
      if (cancelled) return;
      const push = (n: { id: string; targetUrl: string; title: string; desc: string; time: string; type: string }) =>
        dynamicList.push({ ...n, read: savedReadState.includes(n.id) });

      if (currentRole === 'admin') {
        items.forEach((item) => push({
          id: `item-${item.id}`,
          targetUrl: `/items/${item.id}`,
          title: getReportType(item) === 'found' ? 'มีผู้แจ้งพบสิ่งของใหม่' : 'มีผู้แจ้งของหายใหม่',
          desc: `สิ่งของ: ${item.name} (${item.location || 'ไม่ระบุสถานที่'})`,
          time: item.dateLost ? `วันที่: ${item.dateLost}` : 'เมื่อสักครู่',
          type: 'item'
        }));
        claims.filter(c => c.status === 'pending').forEach((claim) => push({
          id: `claim-${claim.requestId}`,
          targetUrl: '/admin',
          title: wordingForClaim(claim, items).adminNotif,
          desc: claimTypeOf(claim, items) === 'lost'
            ? `${claim.claimerName || 'นักศึกษา'} แจ้งว่าเจอ "${claim.itemName}"`
            : `${claim.claimerName || 'นักศึกษา'} ขอรับคืน "${claim.itemName}"`,
          time: claim.claimDateTime || 'เร็วๆ นี้',
          type: 'claim'
        }));
        // แจ้งแอดมินเมื่อทั้งสองฝ่ายยืนยันการส่งมอบกันเองแล้ว
        claims.filter(c => c.status === 'completed' && c.giverConfirmedAt && c.receiverConfirmedAt).forEach((claim) => push({
          id: `handover-done-${claim.requestId}`,
          targetUrl: '/admin',
          title: 'ส่งมอบของสำเร็จ (ยืนยันทั้งสองฝ่าย)',
          desc: `"${claim.itemName}" ผู้ส่งและผู้รับกดยืนยันครบแล้ว`,
          time: claim.handedOverAt ? new Date(claim.handedOverAt).toLocaleString('th-TH') : '',
          type: 'claim'
        }));
      } else {
        const myId = memberId;
        const myItems = items.filter(i => i.reporterId === myId);

        claims.filter(c => c.claimantId === myId && c.status !== 'pending').forEach((claim) => push({
          // ใส่สถานะใน id เพื่อให้แจ้งเตือนใหม่ทุกครั้งที่สถานะเปลี่ยน
          id: `myclaim-${claim.requestId}-${claim.status}`,
          targetUrl: '/my-items',
          title: wordingForClaim(claim, items).status[claim.status],
          desc: claim.status === 'approved'
            ? `"${claim.itemName}" นัดเจออีกฝ่าย แล้วกดยืนยันที่รายการของฉันเมื่อส่งของกันแล้ว`
            : `"${claim.itemName}"`,
          time: claim.claimDateTime || '',
          type: 'claim'
        }));

        claims.filter(c => c.claimantId !== myId && myItems.some(i => i.id === c.itemId)).forEach((claim) => push({
          // ใส่สถานะใน id เพื่อให้แจ้งเตือนอีกครั้งตอนแอดมินอนุมัติ (ถึงเวลานัดส่งมอบ)
          id: `claim-on-mine-${claim.requestId}${claim.status === 'approved' ? '-approved' : ''}`,
          targetUrl: '/my-items',
          title: claim.status === 'approved' ? 'ถึงเวลานัดส่งมอบของแล้ว' : wordingForClaim(claim, items).posterNotif,
          desc: claim.status === 'approved'
            ? `"${claim.itemName}" นัดเจอ ${claim.claimerName} แล้วกดยืนยันที่รายการของฉันเมื่อส่งของกันแล้ว`
            : claimTypeOf(claim, items) === 'lost'
              ? `${claim.claimerName} แจ้งว่าเจอ "${claim.itemName}" ของคุณ`
              : `${claim.claimerName} ขอรับ "${claim.itemName}" ที่คุณเก็บได้`,
          time: claim.claimDateTime || '',
          type: 'claim'
        }));

        // อีกฝ่ายกดยืนยันการส่งมอบแล้ว แต่ฉันยังไม่ได้กด
        claims.filter(c => c.status === 'approved').forEach((claim) => {
          const role = myHandoverRole(claim, items, myId);
          if (!role) return;
          const mine = role === 'giver' ? claim.giverConfirmedAt : claim.receiverConfirmedAt;
          const other = role === 'giver' ? claim.receiverConfirmedAt : claim.giverConfirmedAt;
          if (other && !mine) push({
            id: `handover-wait-${claim.requestId}`,
            targetUrl: '/my-items',
            title: 'อีกฝ่ายยืนยันการส่งมอบแล้ว',
            desc: `"${claim.itemName}" กรุณากดยืนยันฝั่งคุณเพื่อปิดรายการ`,
            time: new Date(other).toLocaleString('th-TH'),
            type: 'claim'
          });
        });

        myItems.filter(i => i.status !== 'returned').forEach((item) => {
          findMatches(item, items, 3).forEach((m) => push({
            id: `match-${item.id}-${m.item.id}`,
            targetUrl: `/items/${m.item.id}`,
            title: `พบรายการที่อาจตรงกัน (${m.score}%)`,
            desc: `"${m.item.name}" อาจตรงกับ "${item.name}" ของคุณ`,
            time: m.item.dateLost ? `วันที่: ${m.item.dateLost}` : '',
            type: 'item'
          }));
        });
      }

      if (dynamicList.length === 0) {
        dynamicList = [
          {
            id: 'sys-1',
            targetUrl: '/',
            title: 'ยินดีต้อนรับสู่ Missing Items System',
            desc: 'ระบบสารสนเทศติดตามทรัพย์สินสูญหายภายในสถาบัน',
            time: 'พร้อมใช้งาน',
            read: savedReadState.includes('sys-1'),
            type: 'system'
          }
        ];
      }

      setNotifications(dynamicList);
    };

    loadDynamicNotifications();
    
    window.addEventListener('storage', loadDynamicNotifications);
    window.addEventListener(DATA_CHANGED, loadDynamicNotifications);
    const interval = setInterval(loadDynamicNotifications, 15000);
    
    return () => {
      cancelled = true;
      window.removeEventListener('storage', loadDynamicNotifications);
      window.removeEventListener(DATA_CHANGED, loadDynamicNotifications);
      clearInterval(interval);
    };
  }, [currentRole, memberId, sessionLoading]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // เล่นเสียงสั้นๆ เมื่อมีแจ้งเตือนที่ยังไม่อ่านเพิ่มขึ้น (ถ้าเปิดไว้ในการตั้งค่า)
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = unreadCount;
    if (prev === null || unreadCount <= prev || !soundNotif) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch {}
  }, [unreadCount, soundNotif]);

  const handleNotificationClick = (notif: any) => {
    const savedReadState = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
    if (!savedReadState.includes(notif.id)) {
      const updatedRead = [...savedReadState, notif.id];
      localStorage.setItem('readNotificationIds', JSON.stringify(updatedRead));
    }

    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setIsNotifOpen(false);
    router.push(notif.targetUrl);
  };

  const markAllNotifsAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('readNotificationIds', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 md:gap-4 h-16 px-3 sm:px-6 bg-white/80 backdrop-blur-xl border-b border-line">

      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 text-on-surface-variant rounded-xl hover:bg-surface-container hover:text-ink transition-colors cursor-pointer"
          title="สลับเมนูข้าง"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className={hasPageSearch ? '' : 'sm:hidden'}><LogoMark size={32} /></span>
        {/* ค้นหาด่วน: ส่งคำค้นไปหน้ารายการของหาย (ไม่แสดงในหน้าที่มีช่องค้นหาหลักแล้ว) */}
        {!hasPageSearch && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = searchText.trim();
            router.push(q ? `/items?q=${encodeURIComponent(q)}` : '/items');
            window.dispatchEvent(new CustomEvent('items-search', { detail: q }));
          }}
          className="hidden sm:flex items-center flex-1 max-w-md relative"
        >
          <Search className="w-4 h-4 text-outline absolute left-3.5 pointer-events-none" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="ค้นหาของหาย เช่น กระเป๋าสตางค์, บัตรนักศึกษา..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container/80 border border-transparent text-sm placeholder:text-outline focus:outline-hidden focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all"
          />
        </form>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2.5">
        
        {/* Notifications Dropdown (ซ่อนตัวเลข เอาแค่จุดแดงกระพริบ) */}
        <div className="relative" ref={notifMenuRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2.5 text-on-surface-variant rounded-xl hover:bg-brand-50 hover:text-primary-container transition-colors focus:outline-hidden cursor-pointer"
            title="การแจ้งเตือน"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 bg-white rounded-2xl shadow-2xl border border-line py-3 z-50 animate-fade-in">
              <div className="flex items-center justify-between px-4 pb-2.5 border-b border-line">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-on-surface font-display">การแจ้งเตือนล่าสุด</h4>
                  {unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-error" />
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllNotifsAsRead}
                    className="text-xs text-primary-container hover:text-primary font-semibold cursor-pointer"
                  >
                    อ่านทั้งหมดแล้ว
                  </button>
                )}
              </div>

              <div className="divide-y divide-background max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-brand-50/80 transition-colors flex gap-3 cursor-pointer ${!n.read ? 'bg-brand-50/60' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-primary-container' : 'bg-transparent'}`} />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-on-surface font-display flex items-center gap-1.5">
                        {n.type === 'claim' ? <PackageCheck className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-brand-600" />}
                        {n.title}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{n.desc}</p>
                      <span className="text-[10px] text-secondary mt-1 block">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 pt-2.5 border-t border-line text-center">
                <span className="text-[11px] text-secondary">คลิกที่รายการเพื่อดูรายละเอียดข้อมูล</span>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 text-on-surface-variant rounded-xl hover:bg-brand-50 hover:text-primary-container transition-colors focus:outline-hidden cursor-pointer"
          title="ตั้งค่าพื้นฐาน"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Profile & Role Switcher Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:pr-3 rounded-xl hover:bg-brand-50 transition-colors focus:outline-hidden border border-transparent hover:border-line cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0 shadow-xs font-display font-bold">
              {initial}
            </div>
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-bold text-on-surface leading-tight font-display max-w-40 truncate">{displayName}</span>
              <span className="text-[10px] font-semibold text-primary-container">
                {currentRole === 'admin' ? 'เจ้าหน้าที่' : 'ผู้ใช้งาน'}
              </span>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-3 w-72 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-line p-4 z-50 animate-fade-in space-y-4">
              
              <div className="flex items-center gap-3 pb-3 border-b border-line">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0 shadow-xs font-display font-bold">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-on-surface truncate font-display">{displayName}</h4>
                  <p className="text-xs text-on-surface-variant truncate">{email}</p>
                  {member?.studentId && (
                    <span className="inline-block font-mono text-[11px] text-secondary mt-0.5">รหัสนักศึกษา: {member.studentId}</span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant">
                สิทธิ์: <strong className="text-on-surface">{currentRole === 'admin' ? 'เจ้าหน้าที่' : 'ผู้ใช้งาน'}</strong> (ตามบทบาทในบัญชี Core Hub)
              </p>

              <div className="pt-2 border-t border-line space-y-2">
                {currentRole === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 bg-brand-navy hover:bg-primary text-white p-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all"
                  >
                    <Shield className="w-4 h-4" />
                    <span>เข้าสู่หน้าแอดมิน (Admin Panel)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-variant text-on-surface-variant p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {isSettingsOpen && (
        <Modal
          isOpen={isSettingsOpen}
          onClose={() => { setIsSettingsOpen(false); setSettingsSaved(false); }}
          title="การตั้งค่าพื้นฐานระบบ (System Settings)"
        >
          <div className="space-y-5 text-xs text-on-surface-variant">
            {settingsSaved && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2 font-semibold animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-bold text-on-surface border-b border-line pb-2 text-sm font-display">การตั้งค่าการแจ้งเตือน</h4>
              
              <div className="flex items-center justify-between p-3.5 bg-background rounded-xl border border-line">
                <div>
                  <p className="font-semibold text-on-surface">แจ้งเตือนผ่านอีเมล</p>
                  <p className="text-[11px] text-secondary">รับอีเมลแจ้งเตือนเมื่อมีคนพบสิ่งของหรืออัปเดตคำขอ (จะส่งจริงเมื่อเชื่อมต่อ backend)</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailNotif} 
                  onChange={(e) => setEmailNotif(e.target.checked)}
                  className="w-4 h-4 text-primary-container rounded-sm cursor-pointer accent-primary-container"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-background rounded-xl border border-line">
                <div>
                  <p className="font-semibold text-on-surface">เสียงแจ้งเตือนในระบบ</p>
                  <p className="text-[11px] text-secondary">เล่นเสียงเตือนเบาๆ เมื่อมีรายการใหม่เข้ามา</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={soundNotif} 
                  onChange={(e) => setSoundNotif(e.target.checked)}
                  className="w-4 h-4 text-primary-container rounded-sm cursor-pointer accent-primary-container"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between text-secondary text-[11px]">
                <span>เวอร์ชันระบบ: <strong>v1.0.4 (Academic MIS)</strong></span>
                <span>ผู้ใช้งาน: <strong>aom123@gmail.com</strong></span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-variant text-on-surface-variant font-semibold rounded-xl transition-colors cursor-pointer"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('userSettings', JSON.stringify({ emailNotif, soundNotif }));
                  } catch {}
                  setSettingsSaved(true);
                  setTimeout(() => {
                    setSettingsSaved(false);
                    setIsSettingsOpen(false);
                  }, 1200);
                }}
                className="px-4 py-2 bg-primary-container hover:bg-primary text-white font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
}