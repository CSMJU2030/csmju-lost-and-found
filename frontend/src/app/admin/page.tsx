'use client'

import React, { useState } from 'react'
import {
  Search,
  PackageCheck,
  Eye,
  Edit,
  Trash2,
  UserCog,
  CheckCircle,
  ShieldAlert,
  Check,
  BellRing,
  Package,
  Layers,
  BarChart3,
  AlertTriangle
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import AdminStats from '@/components/admin/AdminStats'
import { useRole } from '@/context/RoleContext'
import { LostItem, ClaimRequest, ApiUser } from '@/types'
import { getReportType } from '@/lib/storage'
import PageHeader from '@/components/layout/PageHeader'
import { wordingForClaim, claimTypeOf } from '@/lib/wording'
import { handoverParties } from '@/lib/handover'
import { isSecretAnswerMatch } from '@/lib/validation'
import { api, errorMessage } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import ApiErrorBanner from '@/components/ui/ApiError'

export default function AdminDashboardPage() {
  const { isAdmin, loading: sessionLoading } = useRole()

  // ข้อมูลทั้งหมดโหลดจาก backend (ต้องเป็นแอดมิน) และโหลดใหม่อัตโนมัติหลังทุกการเปลี่ยนแปลง
  const { data, error: loadError, reload } = useApi<{ items: LostItem[]; claims: ClaimRequest[]; users: ApiUser[] }>(
    async () => {
      if (!isAdmin) return { items: [], claims: [], users: [] }
      const [items, claims, users] = await Promise.all([api.listItems(), api.allClaims(), api.listUsers()])
      return { items, claims, users }
    },
    { items: [], claims: [], users: [] },
    [isAdmin]
  )
  const { items, claims: claimRequests, users } = data
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'pending' | 'returned' | 'claims' | 'stats'>('all')
  const [viewingItem, setViewingItem] = useState<LostItem | null>(null)
  const [editingItem, setEditingItem] = useState<LostItem | null>(null)
  const [newStatus, setNewStatus] = useState<LostItem['status']>('searching')
  const [showUserModal, setShowUserModal] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  // เรียก API แล้วแสดงผลเป็น toast (สำเร็จ) หรือ alert (ไม่สำเร็จ)
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      showToast(success)
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  // อนุมัติ = ให้ทั้งสองฝ่ายนัดส่งของกันเอง แล้วกดยืนยันคนละครั้ง ระบบปิดรายการให้เอง (แอดมินไม่ต้องทำอะไรต่อ)
  const handleApproveClaim = (req: ClaimRequest) =>
    run(() => api.claimAction(req.requestId, 'approve'), wordingForClaim(req, items).approvedToast(req.itemName))

  const handleRejectClaim = (requestId: string, itemName: string) =>
    run(() => api.claimAction(requestId, 'reject'), `ปฏิเสธคำขอ "${itemName}" เรียบร้อย`)

  const handleStatusChange = async (id: string, status: LostItem['status']) => {
    await run(() => api.setItemStatus(id, status), 'อัปเดตสถานะสำเร็จ!')
    setEditingItem(null)
  }

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`ต้องการลบรายการ "${name}" ใช่หรือไม่?`)) {
      run(() => api.deleteItem(id), `ลบรายการ "${name}" เรียบร้อย`)
    }
  }

  const computedAdminStats = {
    totalItems: items.length,
    searching: items.filter(i => String(i.status).includes('searching')).length,
    returned: items.filter(i => String(i.status).includes('returned')).length,
    pendingClaims: claimRequests.filter(r => r.status === 'pending').length,
    totalUsers: users.length
  }

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.reporterName && item.reporterName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()))

    if (activeFilterTab === 'pending') return matchesSearch && item.status !== 'returned'
    if (activeFilterTab === 'returned') return matchesSearch && item.status === 'returned'
    return matchesSearch
  })

  const getStatusBadge = (status: LostItem['status']) => {
    switch (status) {
      case 'searching': return <Badge variant="searching">กำลังค้นหา</Badge>
      case 'found': return <Badge variant="found">พบแล้ว</Badge>
      case 'returned': return <Badge variant="returned">รับคืนแล้ว</Badge>
      default: return <Badge variant="pending">{status}</Badge>
    }
  }

  if (sessionLoading) return null

  if (!isAdmin) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-line/80 shadow-xl text-center max-w-sm space-y-4">
          <div className="w-14 h-14 bg-brand-50 text-primary-container rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-on-surface font-display">เฉพาะเจ้าหน้าที่เท่านั้น</h2>
          <p className="text-xs text-on-surface-variant">สิทธิ์มาจากบัญชี Core Hub (บทบาท staff หรือ admin) หากควรมีสิทธิ์ กรุณาติดต่อผู้ดูแล Core Hub</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8">
      {notification && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold animate-bounce border border-emerald-400/30">
          <CheckCircle className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      <div className="space-y-5">

        <PageHeader
          eyebrow="แผงควบคุมแอดมิน"
          title="แผงควบคุมผู้ดูแลระบบ"
          description="ตรวจสอบรายการ อนุมัติคำขอรับคืน ยืนยันการส่งมอบ และดูสถิติจุดเสี่ยงภายในมหาวิทยาลัย"
          icon={<ShieldAlert className="w-5 h-5" />}
          actions={
            <button
              onClick={() => setShowUserModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-line px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface cursor-pointer"
            >
              <UserCog className="w-4 h-4 text-brand-600" />
              จัดการผู้ใช้ ({users.length})
            </button>
          }
        />

        <ApiErrorBanner message={loadError} onRetry={reload} />

        {/* Stats Grid แบบมีการ์ดลูกเล่น Hover ยกตัวและเปลี่ยนสีขอบ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <button type="button" onClick={() => setActiveFilterTab('all')} className={`text-left w-full bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 group ${activeFilterTab === 'all' ? 'border-primary-container bg-brand-50/40 ring-2 ring-primary-container/20' : 'border-line hover:border-brand-200'}`}>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-on-surface-variant">รายการทั้งหมด</p>
              <Layers className="w-3.5 h-3.5 text-brand-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-2xl font-semibold text-ink font-display mt-0.5">{computedAdminStats.totalItems}</h3>
          </button>

          <button type="button" onClick={() => setActiveFilterTab('pending')} className={`text-left w-full bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 group ${activeFilterTab === 'pending' ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20' : 'border-line hover:border-amber-300'}`}>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-on-surface-variant">กำลังค้นหา</p>
              <Search className="w-3.5 h-3.5 text-amber-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-2xl font-semibold text-ink font-display mt-0.5">{computedAdminStats.searching}</h3>
          </button>

          <button type="button" onClick={() => setActiveFilterTab('returned')} className={`text-left w-full bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 group ${activeFilterTab === 'returned' ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20' : 'border-line hover:border-emerald-300'}`}>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-on-surface-variant">รับคืนแล้ว</p>
              <PackageCheck className="w-3.5 h-3.5 text-emerald-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-2xl font-semibold text-ink font-display mt-0.5">{computedAdminStats.returned}</h3>
          </button>

          <button type="button" onClick={() => setActiveFilterTab('claims')} className={`text-left w-full bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 group relative ${activeFilterTab === 'claims' ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20' : 'border-line hover:border-brand-200'}`}>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-on-surface-variant">คำขอรับคืน / ส่งคืน</p>
              <BellRing className="w-3.5 h-3.5 text-brand-500 opacity-70 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex justify-between items-center mt-0.5">
              <h3 className="text-2xl font-semibold text-ink font-display">{computedAdminStats.pendingClaims}</h3>
              {computedAdminStats.pendingClaims > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse font-mono shadow-xs">
                  {computedAdminStats.pendingClaims} ใหม่
                </span>
              )}
            </div>
          </button>

        </div>

        {/* Main Content Area (ตารางหรือคำขอแบบไร้รอยต่อ) */}
        <div className="bg-white rounded-2xl border border-line overflow-hidden shadow-card">

          {/* Toolbar ด้านบนตาราง พร้อมปุ่มสลับแท็บย่อยมีลูกเล่น */}
          <div className="px-3 md:px-4 py-2.5 border-b border-line flex flex-col items-stretch gap-2 md:flex-row md:justify-between md:items-center md:gap-0 bg-surface/80 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex w-full md:w-auto bg-surface-variant/70 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveFilterTab('all')}
                  className={`flex-1 md:flex-none px-2 md:px-3 py-1 rounded-lg transition-all cursor-pointer ${activeFilterTab !== 'claims' && activeFilterTab !== 'stats' ? 'bg-white text-primary-container shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  รายการสิ่งของ
                </button>
                <button
                  onClick={() => setActiveFilterTab('claims')}
                  className={`flex-1 md:flex-none justify-center px-2 md:px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${activeFilterTab === 'claims' ? 'bg-white text-brand-600 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span>คำขอรับคืน / ส่งคืน</span>
                  {computedAdminStats.pendingClaims > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>
                <button
                  onClick={() => setActiveFilterTab('stats')}
                  className={`flex-1 md:flex-none justify-center px-2 md:px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${activeFilterTab === 'stats' ? 'bg-white text-primary-container shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>สถิติ & จุดเสี่ยง</span>
                </button>
              </div>
            </div>

            <div className={`relative w-full md:w-64 ${activeFilterTab === 'stats' ? 'hidden md:block md:invisible' : ''}`}>
              <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัส หรือสถานที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-line rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-container/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* ส่วนแสดงตารางเนื้อหา (ล็อกความสูงไม่ให้หน้าเว็บยืดเลื่อน) */}
          <div className="overflow-x-auto">
            {activeFilterTab === 'stats' ? (
              <AdminStats items={items} />
            ) : activeFilterTab === 'claims' ? (
              <div className="p-4 space-y-2.5">
                {claimRequests.length > 0 ? (
                  claimRequests.map((req) => {
                    const claimedItem = items.find(i => i.id === req.itemId)
                    const hasSecret = !!(claimedItem?.secretQuestion && claimedItem.secretAnswer)
                    const secretOk = hasSecret && isSecretAnswerMatch(req.secretAnswerGiven || '', claimedItem!.secretAnswer!)
                    const w = wordingForClaim(req, items)
                    const isReturnOffer = claimTypeOf(req, items) === 'lost'
                    return (
                    <div key={req.requestId} className="p-3.5 rounded-xl border border-line bg-surface-container-lowest flex flex-col items-stretch gap-3 md:flex-row md:justify-between md:items-center md:gap-4 text-xs hover:border-brand-200 transition-colors shadow-xs">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                          <span className="font-mono text-[10px] bg-brand-100 text-primary-container px-2 py-0.5 rounded-sm font-bold">{req.requestCode}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${isReturnOffer ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{w.typeBadge}</span>
                          <span className="font-bold text-on-surface">สิ่งของ: {req.itemName}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant">{w.personLabel}: <strong className="text-on-surface">{req.claimerName}</strong> {req.studentId ? ` (${req.studentId})` : ''} | {w.meet}: {req.claimDateTime}{req.claimLocation ? ` @ ${req.claimLocation}` : ''} | ติดต่อ: <span className="text-brand-600 font-medium">{req.contact}</span></p>
                        {req.note && <p className="text-[11px] text-on-surface-variant">{isReturnOffer ? 'รายละเอียดจากผู้พบ' : 'หมายเหตุ/จุดสังเกต'}: {req.note}</p>}
                        {hasSecret && (
                          <p className={`text-[11px] ${secretOk ? 'text-emerald-700' : 'text-red-600'}`}>
                            คำถามลับ: {claimedItem!.secretQuestion} | ตอบ: <strong>{req.secretAnswerGiven || '-'}</strong> | คำตอบจริง: <strong>{claimedItem!.secretAnswer}</strong> {secretOk ? 'ตรงกัน' : 'ไม่ตรง'}
                          </p>
                        )}
                        {(req.status === 'approved' || req.giverConfirmedAt || req.receiverConfirmedAt) && (() => {
                          const p = handoverParties(req, items)
                          const mark = (at?: string) => at
                            ? <span className="text-emerald-700 font-semibold">ยืนยันแล้ว {new Date(at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            : <span className="text-outline">รอยืนยัน</span>
                          return (
                            <p className="text-[11px] text-on-surface-variant flex flex-wrap gap-x-3">
                              <span>ผู้ส่ง ({p.giverName}): {mark(req.giverConfirmedAt)}</span>
                              <span>ผู้รับ ({p.receiverName}): {mark(req.receiverConfirmedAt)}</span>
                            </p>
                          )
                        })()}
                        {req.status === 'completed' && req.handedOverAt && (
                          <p className="text-[11px] text-on-surface-variant">ส่งมอบเมื่อ {new Date(req.handedOverAt).toLocaleString('th-TH')} โดย {req.handedOverBy}</p>
                        )}
                      </div>
                      {req.status === 'pending' ? (
                        <div className="flex justify-end gap-2 shrink-0">
                          <button onClick={() => handleRejectClaim(req.requestId, req.itemName)} className="px-3 py-1 bg-white text-red-600 border border-red-200 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-red-50 shadow-xs">ปฏิเสธ</button>
                          <button onClick={() => handleApproveClaim(req)} className="px-3.5 py-1 btn-gradient text-white rounded-lg text-[11px] font-semibold cursor-pointer shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>อนุมัติ</span>
                          </button>
                        </div>
                      ) : req.status === 'approved' || req.status === 'at_office' ? (
                        <span className="self-start md:self-auto shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {req.giverConfirmedAt || req.receiverConfirmedAt ? 'ยืนยันแล้ว 1 ฝ่าย' : 'รอทั้งสองฝ่ายยืนยัน'}
                        </span>
                      ) : (
                        <span className={`self-start md:self-auto shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${req.status === 'completed' ? 'bg-brand-100 text-primary-container' : 'bg-red-100 text-red-800'}`}>
                          {req.status === 'completed' ? w.status.completed : 'ปฏิเสธแล้ว'}
                        </span>
                      )}
                    </div>
                    )
                  })
                ) : (
                  <div className="py-12 text-center text-outline text-xs">ยังไม่มีคำขอรับคืนหรือแจ้งส่งคืนในระบบขณะนี้</div>
                )}
              </div>
            ) : (
              <>
              {/* มือถือ: แสดงเป็นการ์ดแทนตาราง (ตาราง 5 คอลัมน์กว้างเกินจอ) */}
              <ul className="md:hidden divide-y divide-line">
                {filteredItems.map((item) => (
                  <li key={item.id} className="p-3 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden shrink-0 border border-line shadow-xs">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-outline" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-on-surface truncate">{item.name}</p>
                        <span className="shrink-0">{getStatusBadge(item.status)}</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono font-bold text-primary-container">{item.code || '-'}</span>
                        <span>{getReportType(item) === 'found' ? 'แจ้งพบ' : 'แจ้งหาย'}</span>
                        {item.urgency === 'high' && (
                          <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold">
                            <AlertTriangle className="w-3 h-3" /> สำคัญมาก
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-outline truncate">{item.location || '-'}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-outline truncate">
                          {item.reporterName || 'ไม่ระบุ'} · {item.dateLost ? new Date(item.dateLost).toLocaleDateString('th-TH') : '-'}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setViewingItem(item)} className="p-2 text-on-surface-variant hover:text-primary-container hover:bg-brand-50 rounded-lg cursor-pointer transition-colors" title="ดู"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { setEditingItem(item); setNewStatus(item.status); }} className="p-2 text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors" title="แก้"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteItem(item.id, item.name)} className="p-2 text-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {filteredItems.length === 0 && (
                  <li className="p-10 text-center text-outline text-xs">ไม่พบรายการสิ่งของในระบบตามเงื่อนไข</li>
                )}
              </ul>
              <table className="hidden md:table w-full text-left border-collapse">
                <thead className="bg-surface/90 sticky top-0 border-b border-line text-[11px] font-semibold text-on-surface-variant backdrop-blur-xs">
                  <tr>
                    <th className="p-3">สิ่งของ</th>
                    <th className="p-3">รหัส / สถานที่</th>
                    <th className="p-3">ผู้แจ้ง</th>
                    <th className="p-3">สถานะ</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-brand-50/30 transition-colors group">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden shrink-0 border border-line shadow-xs group-hover:scale-105 transition-transform">
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-outline" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-on-surface truncate max-w-[150px] block">{item.name}</span>
                            <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                              {getReportType(item) === 'found' ? 'แจ้งพบ' : 'แจ้งหาย'}
                              {item.urgency === 'high' && (
                                <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> สำคัญมาก
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-mono font-bold text-primary-container">{item.code || '-'}</p>
                        <p className="text-[10px] text-outline truncate max-w-[140px]">{item.location || '-'}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-on-surface">{item.reporterName || 'ไม่ระบุ'}</p>
                        <p className="text-[10px] text-outline">{item.dateLost ? new Date(item.dateLost).toLocaleDateString('th-TH') : '-'}</p>
                      </td>
                      <td className="p-3">{getStatusBadge(item.status)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setViewingItem(item)} className="p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-brand-50 rounded-lg cursor-pointer transition-colors" title="ดู"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setEditingItem(item); setNewStatus(item.status); }} className="p-1.5 text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors" title="แก้"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteItem(item.id, item.name)} className="p-1.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors" title="ลบ"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={5} className="p-10 text-center text-outline text-xs">ไม่พบรายการสิ่งของในระบบตามเงื่อนไข</td></tr>
                  )}
                </tbody>
              </table>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Modals */}
      {showUserModal && (
        <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="จัดการผู้ใช้งานในระบบ">
          <div className="space-y-3 text-xs">
            <p className="text-on-surface-variant">สิทธิ์ของแต่ละคนมาจากบทบาทในบัญชี Core Hub (staff / admin = เจ้าหน้าที่) เปลี่ยนที่นี่ไม่ได้</p>
            {/* มือถือ: รายชื่อแบบเรียงลงมา / จอใหญ่: ตาราง */}
            <ul className="md:hidden divide-y divide-line">
              {users.map((u) => (
                <li key={u.id} className="py-2.5 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-on-surface truncate">{u.fullName}</p>
                    <span className="shrink-0 font-mono text-[10px] text-brand-600 font-bold">{u.role === 'admin' ? 'เจ้าหน้าที่' : 'ผู้ใช้'}</span>
                  </div>
                  <p className="break-all">{u.email}</p>
                  <p className="font-mono">{u.studentId || '-'}</p>
                </li>
              ))}
            </ul>
            <table className="hidden md:table w-full text-left">
              <thead className="bg-surface border-b">
                <tr><th className="p-2">ชื่อ</th><th className="p-2">อีเมล</th><th className="p-2">รหัสนักศึกษา</th><th className="p-2">สิทธิ์</th></tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface/50">
                    <td className="p-2 font-semibold">{u.fullName}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2 font-mono">{u.studentId || '-'}</td>
                    <td className="p-2 font-mono text-[10px] text-brand-600 font-bold">{u.role === 'admin' ? 'เจ้าหน้าที่' : 'ผู้ใช้'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {viewingItem && (
        <Modal isOpen={!!viewingItem} onClose={() => setViewingItem(null)} title={`รายละเอียด ${viewingItem.code || '-'}`}>
          <div className="space-y-3 text-xs">
            {viewingItem.imageUrl && <div className="w-full h-36 rounded-xl overflow-hidden bg-surface-container border shadow-inner"><img src={viewingItem.imageUrl} alt="" className="w-full h-full object-cover" /></div>}
            <p><strong>ชื่อ:</strong> {viewingItem.name}</p>
            <p><strong>สถานที่:</strong> {viewingItem.location}</p>
            <p><strong>ผู้แจ้ง:</strong> {viewingItem.reporterName || 'ไม่ระบุ'} ({viewingItem.reporterPhone || '-'})</p>
            <p><strong>ประเภท:</strong> {getReportType(viewingItem) === 'found' ? 'แจ้งพบของ' : 'แจ้งของหาย'} • <strong>ความสำคัญ:</strong> {viewingItem.urgency === 'high' ? 'สำคัญมาก' : 'ปกติ'}</p>
            {viewingItem.secretQuestion && (
              <p className="p-2 rounded-lg bg-emerald-50 border border-emerald-200"><strong>คำถามลับ:</strong> {viewingItem.secretQuestion} → <strong>{viewingItem.secretAnswer}</strong></p>
            )}
          </div>
        </Modal>
      )}

      {editingItem && (
        <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="เปลี่ยนสถานะรายการ">
          <div className="space-y-3 text-xs">
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as LostItem['status'])} className="w-full p-2 border rounded-xl bg-surface focus:ring-2 focus:ring-primary-container/30">
              <option value="searching">กำลังค้นหา</option>
              <option value="found">พบแล้ว</option>
              <option value="returned">รับคืนแล้ว</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 bg-surface-container hover:bg-surface-variant rounded-lg cursor-pointer transition-colors">ยกเลิก</button>
              <button onClick={() => handleStatusChange(editingItem.id, newStatus)} className="px-3 py-1.5 bg-primary-container hover:bg-primary text-white rounded-lg cursor-pointer transition-colors shadow-xs">บันทึก</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}