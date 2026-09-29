'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  HandHeart,
  Package,
  Tag,
  X,
  Eye,
  ShieldCheck,
  Filter,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { categories, locations } from '@/data/mockData';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { LostItem } from '@/types';
import PageHeader from '@/components/layout/PageHeader';
import FormAlert from '@/components/ui/FormAlert';
import { claimWording, wordingForItem, ClaimType } from '@/lib/wording';
import {
  MissingField,
  requireText,
  validateStudentId,
  validateContact,
  focusFirstInvalid
} from '@/lib/validation';
import { getReportType } from '@/lib/storage';
import { useRole } from '@/context/RoleContext';
import { findMatches, MATCH_THRESHOLD } from '@/lib/matching';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import ApiErrorBanner from '@/components/ui/ApiError';

export default function ClaimPage() {
  const { data: items, loading, error: loadError, reload } = useApi<LostItem[]>(() => api.listItems(), []);
  const [secretAnswer, setSecretAnswer] = useState('');
  const [secretError, setSecretError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด');

  const [claimingItem, setClaimingItem] = useState<LostItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [lastClaimType, setLastClaimType] = useState<ClaimType>('found');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    department: '',
    claimDate: new Date().toISOString().split('T')[0],
    claimTime: '',
    claimLocation: locations[0].id,
    claimLocationOther: '',
    locationDetail: '',
    contact: '',
    note: ''
  });

  // Validation Limits
  const CLAIM_LIMITS = {
    firstName: 50,
    lastName: 50,
    studentId: 10,
    department: 80,
    claimLocationOther: 100,
    contact: 50,
    note: 300
  };

  // Validation Error Checks
  const claimErrors = {
    firstName: formData.firstName.length > CLAIM_LIMITS.firstName ? `ข้อความยาวเกินกำหนด (สูงสุด ${CLAIM_LIMITS.firstName} ตัวอักษร)` : '',
    lastName: formData.lastName.length > CLAIM_LIMITS.lastName ? `ข้อความยาวเกินกำหนด (สูงสุด ${CLAIM_LIMITS.lastName} ตัวอักษร)` : '',
    studentId: formData.studentId.length > CLAIM_LIMITS.studentId ? `รหัสนักศึกษาต้องไม่เกิน ${CLAIM_LIMITS.studentId} หลัก` : '',
    department: formData.department.length > CLAIM_LIMITS.department ? `ข้อความยาวเกินกำหนด (สูงสุด ${CLAIM_LIMITS.department} ตัวอักษร)` : '',
    claimLocationOther: (formData.claimLocation === 'other' && formData.claimLocationOther.length > CLAIM_LIMITS.claimLocationOther) ? `ข้อความยาวเกินกำหนด (สูงสุด ${CLAIM_LIMITS.claimLocationOther} ตัวอักษร)` : '',
    contact: formData.contact.length > CLAIM_LIMITS.contact ? `ข้อความยาวเกินกำหนด (สูงสุด ${CLAIM_LIMITS.contact} ตัวอักษร)` : '',
    note: formData.note.length > CLAIM_LIMITS.note ? `ข้อความยาวเกินกำหนด (สูงสุด ${CLAIM_LIMITS.note} ตัวอักษร)` : ''
  };

  const hasClaimErrors = Object.values(claimErrors).some(err => Boolean(err));

  // คำในฟอร์มขึ้นกับว่ารายการนี้เจ้าของโพสต์ตามหา (ผู้พบนัดส่งคืน) หรือมีคนเก็บได้ (เจ้าของขอรับคืน)
  const cw = claimingItem ? wordingForItem(claimingItem) : claimWording.found;

  // ข้อมูลส่วนตัวและการนัดรับที่ต้องกรอกให้ครบ ถ้ายังไม่ครบจะส่งคำขอไม่ได้
  const missingFields: MissingField[] = [
    { id: 'claim-first-name', label: 'ชื่อจริง', message: requireText(formData.firstName, 'กรุณากรอกชื่อจริง') },
    { id: 'claim-last-name', label: 'นามสกุล', message: requireText(formData.lastName, 'กรุณากรอกนามสกุล') },
    { id: 'claim-student-id', label: 'รหัสนักศึกษา', message: validateStudentId(formData.studentId) },
    { id: 'claim-department', label: 'สังกัด / คณะ', message: requireText(formData.department, 'กรุณากรอกสังกัดหรือคณะ') },
    { id: 'claim-date', label: `วันที่${cw.meet}`, message: requireText(formData.claimDate, `กรุณาเลือกวันที่${cw.meet}`) },
    { id: 'claim-time', label: `เวลา${cw.meet}`, message: requireText(formData.claimTime, `กรุณาเลือกเวลา${cw.meet}`) },
    ...(formData.claimLocation === 'other'
      ? [{ id: 'claim-location-other', label: `สถานที่${cw.meet}`, message: requireText(formData.claimLocationOther, `กรุณาระบุสถานที่${cw.meet}`) }]
      : []),
    { id: 'claim-contact', label: 'ช่องทางติดต่อ', message: validateContact(formData.contact) },
    ...(claimingItem?.secretQuestion
      ? [{ id: 'claim-secret-answer', label: 'คำตอบคำถามยืนยันเจ้าของ', message: requireText(secretAnswer, 'กรุณาตอบคำถามยืนยันความเป็นเจ้าของ') }]
      : []),
  ].filter((f) => f.message);

  // ข้อความเตือนของช่องนั้น (แสดงหลังจากกดส่งครั้งแรกแล้ว)
  const missingMsg = (id: string) => (showMissing && missingFields.find((f) => f.id === id)?.message) || '';

  // เปิดฟอร์มของรายการที่ส่งมาจากหน้ารายละเอียด (/claim?item=<id>) เมื่อโหลดรายการเสร็จ
  const [openedFromLink, setOpenedFromLink] = useState(false);
  useEffect(() => {
    if (loading || openedFromLink) return;
    setOpenedFromLink(true);
    const itemId = new URLSearchParams(window.location.search).get('item');
    const target = itemId ? items.find(i => i.id === itemId) : undefined;
    if (target && target.status !== 'returned') openClaimModal(target);
  }, [loading, items]);

  // รายการของฉันเองที่เป็นเรื่องเดียวกัน (ประเภทตรงข้ามและยังไม่ปิด) เรียงตามความตรงกัน -> ปิดพร้อมกันเมื่อคืนของสำเร็จ
  const [linkedItemId, setLinkedItemId] = useState('');
  // รายการของฉัน = ที่บัญชีนี้ (Core Hub) แจ้งไว้
  const { memberId } = useRole();
  const linkCandidates = claimingItem
    ? items
        .filter(i => i.reporterId === memberId && i.status !== 'returned' && getReportType(i) !== getReportType(claimingItem))
        .map(i => ({ item: i, score: findMatches(claimingItem, [i], 1)[0]?.score ?? 0 }))
        .sort((a, b) => b.score - a.score)
    : [];
  useEffect(() => {
    // เลือกรายการที่ตรงที่สุดให้อัตโนมัติ (ผู้ใช้เปลี่ยนเป็น "ไม่มี" ได้)
    setLinkedItemId(linkCandidates[0] && linkCandidates[0].score >= MATCH_THRESHOLD ? linkCandidates[0].item.id : '');
  }, [claimingItem?.id, memberId, items.length]);

  const openClaimModal = (item: LostItem) => {
    setSecretAnswer('');
    setSecretError('');
    setShowMissing(false);
    setClaimingItem(item);
  };

  const activeClaimCount = (itemId: string) => items.find(i => i.id === itemId)?.activeClaims ?? 0;

  const lastWording = claimWording[lastClaimType];

  const filteredItems = items.filter((item) => {
    if (item.status === 'returned') return false;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ทั้งหมด' || item.status === selectedStatus;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingItem) return;
    if (hasClaimErrors) {
      alert('กรุณาตรวจสอบข้อมูลที่กรอกเกินขีดจำกัดก่อนส่งคำขอ');
      return;
    }
    if (missingFields.length > 0) {
      setShowMissing(true);
      focusFirstInvalid(missingFields);
      return;
    }

    const locationName = formData.claimLocation === 'other'
      ? formData.claimLocationOther.trim()
      : (locations.find(l => l.id === formData.claimLocation)?.name || '');

    // คำตอบลับและจำนวนครั้งที่ตอบผิด ตรวจที่เซิร์ฟเวอร์ (หน้าเว็บไม่มีคำตอบจริง)
    setIsSubmitting(true);
    try {
      await api.createClaim({
        itemId: claimingItem.id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        studentId: formData.studentId.trim(),
        department: formData.department.trim(),
        meetDate: formData.claimDate,
        meetTime: formData.claimTime,
        meetLocation: locationName,
        contact: formData.contact.trim(),
        note: formData.note.trim(),
        ...(linkedItemId ? { linkedItemId } : {}),
        ...(claimingItem.secretQuestion ? { secretAnswer: secretAnswer.trim() } : {})
      });
      setLastClaimType(getReportType(claimingItem));
      setClaimingItem(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && claimingItem.secretQuestion) {
        setSecretError(err.message); // ตอบคำถามยืนยันผิด หรือถูกล็อกเพราะตอบผิดครบ 3 ครั้ง
      } else {
        const details = err instanceof ApiError ? err.details : [];
        alert(`ส่งไม่สำเร็จ: ${errorMessage(err)}${details.length ? '\n- ' + details.join('\n- ') : ''}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: LostItem['status']) => {
    switch (status) {
      case 'searching':
        return <Badge variant="searching">กำลังค้นหา</Badge>;
      case 'found':
        return <Badge variant="found">พบแล้ว</Badge>;
      case 'returned':
        return <Badge variant="returned">รับคืนแล้ว</Badge>;
      default:
        return <Badge variant="pending">{status}</Badge>;
    }
  };

  return (
    <div className="pb-8">
      <div className="space-y-8">

        <PageHeader
          eyebrow="รับของคืน / ส่งคืนเจ้าของ"
          title="รับของคืน / ส่งคืนเจ้าของ"
          description="ถ้าเจอของที่มีคนตามหา กด &quot;ฉันเจอของชิ้นนี้&quot; เพื่อนัดส่งคืน ถ้าเห็นของของคุณที่มีคนเก็บได้ กด &quot;นี่คือของฉัน&quot; เพื่อขอรับคืน ทุกคำขอต้องผ่านการตรวจสอบโดยเจ้าหน้าที่"
          icon={<ShieldCheck className="w-5 h-5" />}
          actions={
            <Link href="/my-items" className="inline-flex items-center gap-2 rounded-xl bg-white border border-line px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface">
              ติดตามคำขอของฉัน
            </Link>
          }
        />

        <ApiErrorBanner message={loadError} onRetry={reload} />

        {/* Success Alert Banner */}
        {showSuccess && (
          <div role="status" className="bg-emerald-700 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-100" />
              </div>
              <div>
                <p className="font-bold text-sm">{lastWording.success}</p>
                <p className="text-xs text-emerald-100 mt-0.5">
                  {lastWording.successHint}{' '}
                  <Link href="/my-items" className="underline font-semibold text-white">รายการของฉัน</Link>
                </p>
              </div>
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-white hover:text-emerald-200 p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Filter Controls Box */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xs border border-line space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-line text-xs font-bold text-on-surface-variant">
            <Filter className="w-4 h-4 text-primary-container" />
            <span>เครื่องมือค้นหาและกรองข้อมูล</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสิ่งของ, รหัสรายการ หรือสถานที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-line rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-container/30 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-2xl text-xs sm:text-sm text-on-surface-variant focus:outline-hidden focus:ring-2 focus:ring-primary-container/30 transition-all cursor-pointer"
              >
                <option value="ทั้งหมด">หมวดหมู่ทั้งหมด</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-2xl text-xs sm:text-sm text-on-surface-variant focus:outline-hidden focus:ring-2 focus:ring-primary-container/30 transition-all cursor-pointer"
              >
                <option value="ทั้งหมด">สถานะทั้งหมด</option>
                <option value="searching">กำลังค้นหา</option>
                <option value="found">พบแล้ว</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-on-surface font-display flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-container" />
              <span>รายการทรัพย์สินทั้งหมด ({filteredItems.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white/95 backdrop-blur-xs rounded-3xl border border-line overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="aspect-video bg-brand-50 relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline bg-brand-50">
                        <Package className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 shadow-xs">
                      {getStatusBadge(item.status)}
                    </div>
                    {item.code && (
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-xl shadow-xs">
                        {item.code}
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-primary-container font-medium">
                        <Tag className="w-3.5 h-3.5" />
                        <span>{item.category}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${getReportType(item) === 'found' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {getReportType(item) === 'found' ? 'มีคนเก็บได้ • รอเจ้าของ' : 'เจ้าของตามหาอยู่'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-on-surface font-display truncate group-hover:text-primary-container transition-colors">{item.name}</h4>
                    <p className="text-xs text-on-surface-variant line-clamp-2">{item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>

                    <div className="pt-3 border-t border-line space-y-2 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary-container shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-outline shrink-0" />
                        <span>{item.dateLost ? new Date(item.dateLost).toLocaleDateString('th-TH') : '-'}</span>
                      </div>
                      {activeClaimCount(item.id) > 0 && item.status !== 'returned' && (
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{wordingForItem(item).activeCount(activeClaimCount(item.id))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center gap-2">
                  <Link
                    href={`/items/${item.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold rounded-2xl border border-line transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูรายละเอียด</span>
                  </Link>

                  {item.status === 'returned' ? (
                    <span className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-brand-50 text-primary-container text-xs font-semibold rounded-2xl border border-brand-100">
                      {wordingForItem(item).doneLabel}
                    </span>
                  ) : getReportType(item) === 'found' ? (
                    <button
                      onClick={() => openClaimModal(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 btn-gradient text-white text-xs font-semibold rounded-2xl shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{claimWording.found.cta}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openClaimModal(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 btn-gradient text-white text-xs font-semibold rounded-2xl shadow-md cursor-pointer"
                    >
                      <HandHeart className="w-3.5 h-3.5" />
                      <span>{claimWording.lost.cta}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="bg-white rounded-3xl border border-line p-16 text-center space-y-3 shadow-xs">
              <Package className="w-12 h-12 text-outline-variant mx-auto" />
              <h3 className="text-base font-bold text-on-surface font-display">ไม่พบรายการสิ่งของ</h3>
              <p className="text-xs text-on-surface-variant">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูครับ</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal ฟอร์มยืนยันตัวตนรับของคืน */}
      <Modal
        isOpen={!!claimingItem}
        onClose={() => setClaimingItem(null)}
        title={cw.formTitle}
      >
        {claimingItem && (
          <form onSubmit={handleClaimSubmit} noValidate className="space-y-4 text-xs">
            <div className="p-3.5 bg-brand-50 rounded-2xl border border-brand-100 mb-3 shadow-xs">
              <p className="text-on-surface-variant text-[11px]">{cw.formIntro}</p>
              <p className="font-bold text-primary-container text-sm mt-0.5 font-display">{claimingItem.name} <span className="font-mono text-xs text-on-surface-variant font-normal">({claimingItem.code || 'ไม่มีรหัส'})</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">ชื่อจริง <span className="text-red-500">*</span></label>
                <Input
                  id="claim-first-name"
                  required
                  error={claimErrors.firstName || missingMsg('claim-first-name')}
                  value={formData.firstName}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[0-9]/g, '');
                    setFormData({ ...formData, firstName: val });
                  }}
                  placeholder="กรอกชื่อจริง"
                />
              </div>
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">นามสกุล <span className="text-red-500">*</span></label>
                <Input
                  id="claim-last-name"
                  required
                  error={claimErrors.lastName || missingMsg('claim-last-name')}
                  value={formData.lastName}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[0-9]/g, '');
                    setFormData({ ...formData, lastName: val });
                  }}
                  placeholder="กรอกนามสกุล"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">รหัสนักศึกษา <span className="text-red-500">*</span></label>
                <Input
                  id="claim-student-id"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  error={claimErrors.studentId || missingMsg('claim-student-id')}
                  value={formData.studentId}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, studentId: val });
                  }}
                  placeholder="เช่น 670410XXXX"
                />
              </div>
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">สังกัด / คณะ <span className="text-red-500">*</span></label>
                <Input
                  id="claim-department"
                  required
                  error={claimErrors.department || missingMsg('claim-department')}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="เช่น คณะวิทยาศาสตร์"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">วันที่{cw.meet} <span className="text-red-500">*</span></label>
                <Input
                  id="claim-date"
                  type="date"
                  required
                  error={missingMsg('claim-date')}
                  value={formData.claimDate}
                  onChange={(e) => setFormData({ ...formData, claimDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">เวลา{cw.meet} <span className="text-red-500">*</span></label>
                <Input
                  id="claim-time"
                  type="time"
                  required
                  error={missingMsg('claim-time')}
                  value={formData.claimTime}
                  onChange={(e) => setFormData({ ...formData, claimTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">สถานที่{cw.meet} <span className="text-red-500">*</span></label>
              <Select
                options={locations.map(loc => ({ value: loc.id, label: loc.name }))}
                value={formData.claimLocation}
                onChange={(e) => setFormData({ ...formData, claimLocation: e.target.value })}
                placeholder="เลือกสถานที่"
              />
              {formData.claimLocation === 'other' && (
                <div className="mt-2">
                  <Input
                    id="claim-location-other"
                    required
                    error={claimErrors.claimLocationOther || missingMsg('claim-location-other')}
                    placeholder={`ระบุสถานที่${cw.meet}อื่นๆ`}
                    value={formData.claimLocationOther}
                    onChange={(e) => setFormData({ ...formData, claimLocationOther: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">ช่องทางติดต่อ (Line ID / เบอร์โทร) <span className="text-red-500">*</span></label>
              <Input
                id="claim-contact"
                required
                error={claimErrors.contact || missingMsg('claim-contact')}
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="เช่น 08xxxxxxx หรือ Line: xxxxxxx"
              />
            </div>

            {linkCandidates.length > 0 && (
              <div className="p-3.5 rounded-2xl border border-line bg-surface space-y-2">
                <label htmlFor="claim-linked-item" className="block font-semibold text-on-surface">
                  {getReportType(claimingItem) === 'found' ? 'นี่คือของที่คุณเคยแจ้งหายไว้หรือไม่?' : 'คุณเคยโพสต์แจ้งพบของชิ้นนี้ไว้หรือไม่?'}
                </label>
                <select
                  id="claim-linked-item"
                  value={linkedItemId}
                  onChange={(e) => setLinkedItemId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-base text-on-surface focus:outline-hidden focus:border-accent"
                >
                  <option value="">ไม่มี / ไม่ใช่รายการใด</option>
                  {linkCandidates.map(({ item: i, score }) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code}){score >= MATCH_THRESHOLD ? ` • ตรงกัน ${score}%` : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-on-surface-variant">เมื่อคืนของสำเร็จ โพสต์ที่เลือกจะปิดและหายจากหน้าค้นหาให้อัตโนมัติ</p>
              </div>
            )}

            {claimingItem.secretQuestion && (
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  คำถามยืนยันความเป็นเจ้าของจากผู้พบ
                </p>
                <p className="text-emerald-900">{claimingItem.secretQuestion}</p>
                <Input
                  id="claim-secret-answer"
                  required
                  error={missingMsg('claim-secret-answer')}
                  value={secretAnswer}
                  onChange={(e) => { setSecretAnswer(e.target.value); setSecretError(''); }}
                  placeholder="พิมพ์คำตอบของคุณ"
                />
                {secretError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{secretError}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">{cw.noteLabel}</label>
              <textarea
                rows={2}
                className={`w-full rounded-2xl border px-3.5 py-2 text-xs focus:outline-hidden transition-colors ${
                  claimErrors.note
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-line bg-surface/50 focus:ring-2 focus:ring-primary-container/30'
                }`}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder={cw.notePlaceholder}
              />
              {claimErrors.note && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{claimErrors.note}</span>
                </p>
              )}
            </div>

            {showMissing && (
              <FormAlert title="ส่งข้อมูลไม่ได้ — กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนก่อน" fields={missingFields} />
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setClaimingItem(null)}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || hasClaimErrors}
                className={`font-semibold shadow-xs cursor-pointer ${
                  hasClaimErrors
                    ? 'bg-outline cursor-not-allowed opacity-60'
                    : 'btn-gradient text-white shadow-md'
                }`}
              >
                {isSubmitting ? cw.submitting : cw.submit}
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}