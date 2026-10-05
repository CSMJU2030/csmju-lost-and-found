'use client'

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Image as ImageIcon,
  Upload,
  X,
  CheckCircle2,
  Tag,
  Phone,
  ArrowRight,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  FilePlus2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { categories, locations } from '@/data/mockData';
import { useRole } from '@/context/RoleContext';
import Modal from '@/components/ui/Modal';
import MatchList from '@/components/items/MatchList';
import { LostItem } from '@/types';
import { fileToCompressedDataUrl } from '@/lib/storage';
import { api, ApiError, errorMessage } from '@/lib/api';
import { MatchResult } from '@/lib/matching';
import PageHeader from '@/components/layout/PageHeader';
import FormAlert from '@/components/ui/FormAlert';
import {
  MissingField,
  requireText,
  validateFullName,
  validateStudentId,
  validatePhone,
  focusFirstInvalid
} from '@/lib/validation';

// ปิด SSR ให้กับ FreeMap ป้องกัน Error window is not defined
const FreeMap = dynamic(() => import('@/components/map/FreeMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-surface flex items-center justify-center rounded-2xl border border-line text-on-surface-variant text-sm">
      กำลังโหลดแผนที่...
    </div>
  )
});

interface UploadedPhoto {
  id: string;
  name: string;
  size: string;
  url: string;
}

const createInitialForm = () => ({
  reportType: 'lost' as 'lost' | 'found',
  name: '',
  description: '',
  categoryId: 'electronics',
  urgency: 'normal' as 'normal' | 'high',
  date: new Date().toISOString().split('T')[0],
  time: '12:00',
  faculty: locations[0].id,
  facultyOther: '',
  building: '', // ชื่ออาคารที่ผู้ใช้พิมพ์เอง (มีรายชื่ออาคารเดิมเป็นคำแนะนำ)
  room: '',
  locationDetail: '',
  locationNotes: '',
  contactName: '',
  studentId: '',
  contactPhone: '',
  contactOther: '',
  secretQuestion: '',
  secretAnswer: '',
  pinX: null as number | null,
  pinY: null as number | null
});

// ไม่มีคอลัมน์แยกสำหรับจุดสังเกต จึงต่อท้ายไว้ใน description (backend รับได้ไม่เกิน 500 ตัวอักษรรวมกัน)
const LOCATION_NOTES_HEADING = 'พิกัดและจุดสังเกตเพิ่มเติม:';
const composeDescription = (description: string, notes: string) => {
  const desc = description.trim();
  const extra = notes.trim();
  return extra ? `${desc}\n\n${LOCATION_NOTES_HEADING} ${extra}` : desc;
};

export default function ReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(createInitialForm);
  const { member, email } = useRole();

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdItem, setCreatedItem] = useState<LostItem | null>(null);
  const [createdMatches, setCreatedMatches] = useState<MatchResult[]>([]);
  const [mapKey, setMapKey] = useState(0);
  const [showMissing, setShowMissing] = useState(false);
  const isFound = formData.reportType === 'found';

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('type') === 'found') {
      setFormData(prev => ({ ...prev, reportType: 'found' }));
    }
  }, []);

  // Validation Limits
  const LIMITS = {
    name: 100,
    room: 50,
    locationDetail: 150,
    description: 500,
    contactName: 80,
    studentId: 10,
    contactPhone: 10,
    contactOther: 100,
    facultyOther: 100,
    building: 100,
    secretQuestion: 150,
    secretAnswer: 100
  };

  // Validation Error Checks
  const errors = {
    name: formData.name.length > LIMITS.name ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.name} ตัวอักษร)` : '',
    room: formData.room.length > LIMITS.room ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.room} ตัวอักษร)` : '',
    locationDetail: formData.locationDetail.length > LIMITS.locationDetail ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.locationDetail} ตัวอักษร)` : '',
    description: formData.description.length > LIMITS.description ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.description} ตัวอักษร)` : '',
    locationNotes: formData.description.length <= LIMITS.description
      && composeDescription(formData.description, formData.locationNotes).length > LIMITS.description
      ? `รายละเอียดสิ่งของรวมกับจุดสังเกตต้องไม่เกิน ${LIMITS.description} ตัวอักษร` : '',
    contactName: formData.contactName.length > LIMITS.contactName ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.contactName} ตัวอักษร)` : '',
    studentId: formData.studentId.length > LIMITS.studentId ? `รหัสนักศึกษาต้องไม่เกิน ${LIMITS.studentId} หลัก` : '',
    contactPhone: formData.contactPhone.length > LIMITS.contactPhone ? `เบอร์โทรศัพท์ต้องไม่เกิน ${LIMITS.contactPhone} หลัก` : '',
    contactOther: formData.contactOther.length > LIMITS.contactOther ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.contactOther} ตัวอักษร)` : '',
    facultyOther: (formData.faculty === 'other' && formData.facultyOther.length > LIMITS.facultyOther) ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.facultyOther} ตัวอักษร)` : '',
    building: formData.building.length > LIMITS.building ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.building} ตัวอักษร)` : '',
    secretQuestion: formData.secretQuestion.length > LIMITS.secretQuestion ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.secretQuestion} ตัวอักษร)` : '',
    secretAnswer: formData.secretQuestion.trim() && !formData.secretAnswer.trim()
      ? 'กรุณากรอกคำตอบของคำถามยืนยัน'
      : formData.secretAnswer.length > LIMITS.secretAnswer ? `ข้อความยาวเกินกำหนด (สูงสุด ${LIMITS.secretAnswer} ตัวอักษร)` : ''
  };

  const hasErrors = Object.values(errors).some(err => Boolean(err));

  // ช่องที่ต้องกรอกให้ครบ (เรียงตามลำดับบนหน้า) ถ้ายังไม่ครบจะบันทึกไม่ได้
  const missingFields: MissingField[] = [
    ...(formData.faculty === 'other'
      ? [{ id: 'report-faculty-other', label: 'คณะ / หน่วยงาน', message: requireText(formData.facultyOther, 'กรุณาระบุคณะ / หน่วยงาน') }]
      : [{ id: 'report-building', label: 'อาคาร / ตึก', message: requireText(formData.building, 'กรุณาระบุอาคาร / ตึก') }]),
    { id: 'report-room', label: 'ห้อง / ชั้น', message: requireText(formData.room, 'กรุณากรอกห้องหรือชั้น') },
    { id: 'report-location-detail', label: 'รายละเอียดสถานที่', message: requireText(formData.locationDetail, 'กรุณาอธิบายสถานที่เพิ่มเติม') },
    { id: 'report-name', label: 'ชื่อสิ่งของ', message: requireText(formData.name, 'กรุณากรอกชื่อสิ่งของ') },
    { id: 'report-description', label: 'รายละเอียดสิ่งของ', message: requireText(formData.description, 'กรุณาอธิบายลักษณะสิ่งของ') },
    { id: 'report-contact-name', label: 'ชื่อผู้ติดต่อ', message: validateFullName(formData.contactName) },
    { id: 'report-student-id', label: 'รหัสนักศึกษา', message: validateStudentId(formData.studentId) },
    { id: 'report-phone', label: 'เบอร์โทรศัพท์', message: validatePhone(formData.contactPhone) },
    { id: 'report-contact-other', label: 'ช่องทางอื่นๆ', message: requireText(formData.contactOther, 'กรุณากรอก Line ID หรืออีเมล') },
  ].filter((f) => f.message);

  // ข้อความเตือนของช่องนั้น (แสดงหลังจากกดบันทึกครั้งแรกแล้ว)
  const missingMsg = (id: string) => (showMissing && missingFields.find((f) => f.id === id)?.message) || '';

  const handleQuickFill = () => {
    setFormData(prev => ({
      ...prev,
      // กรอกจากบัญชีที่ login อยู่เท่าที่มี (Core Hub ยังไม่ส่งชื่อ-เบอร์โทร จึงใช้ค่าที่เคยบันทึกไว้ในระบบนี้)
      contactName: member?.fullName && member.fullName !== email ? member.fullName : prev.contactName,
      studentId: member?.studentId || prev.studentId,
      contactPhone: member?.phone || prev.contactPhone,
      contactOther: email ? `Email: ${email}` : prev.contactOther
    }));
  };

  const handleAddTag = (tagText: string) => {
    setFormData(prev => ({
      ...prev,
      description: prev.description ? `${prev.description}, ${tagText}` : tagText
    }));
  };

  // แปลงรูปเป็น data URL (ย่อขนาดแล้ว) เพื่อให้รูปยังอยู่หลังรีเฟรชหน้า
  const addPhotos = async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    const newPhotos = await Promise.all(images.map(async (file): Promise<UploadedPhoto | null> => {
      try {
        const url = await fileToCompressedDataUrl(file);
        return {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          size: ((url.length * 0.75) / (1024 * 1024)).toFixed(2) + ' MB',
          url
        };
      } catch {
        return null;
      }
    }));
    setPhotos((prev) => [...prev, ...newPhotos.filter((p): p is UploadedPhoto => p !== null)]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addPhotos(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addPhotos(Array.from(e.dataTransfer.files));
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const selectedFacultyObj = locations.find((l) => l.id === formData.faculty) || locations[0];
  // รายชื่ออาคารเดิมเป็นคำแนะนำ (<datalist>) ของคณะที่เลือก — เลือก "อื่นๆ" แนะนำอาคารของทุกคณะ
  const buildingSuggestions = Array.from(new Set(
    (formData.faculty === 'other' ? locations : [selectedFacultyObj])
      .flatMap((l) => l.buildings)
      .filter((b) => b.id !== 'other-bld')
      .map((b) => b.name)
  ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) {
      alert('กรุณาตรวจสอบข้อมูลที่กรอกเกินขีดจำกัดก่อนบันทึก');
      return;
    }
    if (missingFields.length > 0) {
      setShowMissing(true);
      focusFirstInvalid(missingFields);
      return;
    }

    setIsSubmitting(true);

    const selectedCat = categories.find(c => c.id === formData.categoryId)?.name || 'ทั่วไป';
    const selectedFac = formData.faculty === 'other'
      ? (formData.facultyOther.trim() || 'อื่นๆ')
      : (locations.find(l => l.id === formData.faculty)?.name || '');
    const selectedBld = formData.building.trim();
    const locationString = `${selectedFac}${selectedBld ? ` (${selectedBld}${formData.room ? ` ห้อง ${formData.room}` : ''})` : formData.room ? ` (${formData.room})` : ''} ${formData.locationDetail}`;

    try {
      const { item, matches } = await api.createItem({
        reportType: formData.reportType,
        urgency: formData.urgency,
        name: formData.name.trim(),
        description: composeDescription(formData.description, formData.locationNotes),
        category: selectedCat,
        location: locationString.trim(),
        faculty: selectedFac,
        building: selectedBld,
        room: formData.room.trim(),
        dateLost: formData.date,
        timeLost: formData.time,
        reporterName: formData.contactName.trim(),
        reporterStudentId: formData.studentId.trim(),
        reporterPhone: formData.contactPhone.trim(),
        reporterContact: formData.contactOther.trim(),
        images: photos.map(p => p.url),
        ...(formData.pinX != null && formData.pinY != null ? { pinX: formData.pinX, pinY: formData.pinY } : {}),
        ...(isFound && formData.secretQuestion.trim()
          ? { secretQuestion: formData.secretQuestion.trim(), secretAnswer: formData.secretAnswer.trim() }
          : {})
      });
      setCreatedMatches(matches);
      setCreatedItem(item);
    } catch (err) {
      const details = err instanceof ApiError ? err.details : [];
      alert(`บันทึกไม่สำเร็จ: ${errorMessage(err)}${details.length ? '\n- ' + details.join('\n- ') : ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-8">
      <div className="space-y-8">

        <PageHeader
          eyebrow="แจ้งของหาย / พบของ"
          title={isFound ? 'แจ้งพบสิ่งของ' : 'แจ้งของหาย'}
          description="กรอกรายละเอียด แนบรูปถ่ายจริง และปักหมุดตำแหน่ง ข้อมูลยิ่งครบ ระบบยิ่งจับคู่ได้แม่นยำ"
          icon={<FilePlus2 className="w-5 h-5" />}
          actions={
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-amber-50 text-amber-800 ring-1 ring-amber-200 px-3 py-2 text-xs max-w-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              แนบรูปชัดๆ และปักหมุดตำแหน่ง ช่วยให้ตามเจอเร็วขึ้นมาก
            </div>
          }
        />

        <form onSubmit={handleSubmit} noValidate>
          {/* เลือกประเภทการแจ้ง */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {([
              { id: 'lost', title: 'ฉันทำของหาย', desc: 'แจ้งตามหาสิ่งของของตัวเอง' },
              { id: 'found', title: 'ฉันเก็บของได้', desc: 'แจ้งพบสิ่งของเพื่อตามหาเจ้าของ' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData({ ...formData, reportType: opt.id })}
                className={`text-left p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  formData.reportType === opt.id
                    ? 'border-primary-container bg-brand-50 shadow-xs'
                    : 'border-line bg-white hover:border-primary-container/40'
                }`}
              >
                <p className={`text-sm sm:text-base font-bold font-display ${formData.reportType === opt.id ? 'text-primary-container' : 'text-on-surface'}`}>{opt.title}</p>
                <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ฝั่งซ้าย: รูปภาพและสถานที่ */}
            <div className="lg:col-span-5 space-y-6">

              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 font-display">
                    <ImageIcon className="w-4 h-4 text-primary-container" />
                    <span>รูปภาพสิ่งของ (ถ่ายจริง / อัปโหลด)</span>
                  </h3>
                  <span className="text-xs bg-brand-50 text-primary-container px-2.5 py-0.5 rounded-full font-semibold">
                    {photos.length} รูป
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  multiple
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-primary-container/30 hover:border-primary-container rounded-2xl p-6 flex flex-col items-center justify-center bg-brand-50/30 hover:bg-brand-50/60 cursor-pointer transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-primary-container font-display">คลิกเลือกรูปภาพจากเครื่อง</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">หรือลากไฟล์ภาพมาวางที่นี่ (รองรับ JPG, PNG, WEBP)</p>
                </div>

                {photos.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold text-on-surface-variant">รูปภาพที่แนบแล้ว:</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {photos.map((photo) => (
                        <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-line shadow-xs bg-surface-container">
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition-colors shadow-xs cursor-pointer"
                            title="ลบรูปนี้"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* สถานที่ */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-line space-y-4">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 font-display">
                  <MapPin className="w-4 h-4 text-primary-container" />
                  <span>{isFound ? 'สถานที่พบสิ่งของ' : 'สถานที่ทำหาย'}</span>
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">คณะ / หน่วยงาน <span className="text-red-500">*</span></label>
                    <Select
                      options={locations.map(loc => ({ value: loc.id, label: loc.name }))}
                      value={formData.faculty}
                      onChange={(e) => {
                        // ถ้าชื่ออาคารเป็นคำแนะนำของคณะเดิม ล้างออก / ถ้าพิมพ์เองไว้ เก็บไว้ตามเดิม
                        const wasSuggestion = selectedFacultyObj.buildings.some(b => b.name === formData.building);
                        setFormData({
                          ...formData,
                          faculty: e.target.value,
                          building: wasSuggestion ? '' : formData.building
                        });
                      }}
                      placeholder="เลือกคณะ"
                    />
                    {formData.faculty === 'other' && (
                      <div className="mt-2">
                        <Input
                          id="report-faculty-other"
                          required
                          error={errors.facultyOther || missingMsg('report-faculty-other')}
                          value={formData.facultyOther}
                          onChange={(e) => setFormData({ ...formData, facultyOther: e.target.value })}
                          placeholder="ระบุคณะ / หน่วยงานอื่นๆ"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="report-building" className="block font-semibold text-on-surface-variant mb-1">
                      อาคาร / ตึก {formData.faculty === 'other' ? <span className="font-normal text-outline">(ถ้ามี)</span> : <span className="text-red-500">*</span>}
                    </label>
                    {/* พิมพ์ชื่ออาคารเองได้ทั้งหมด มีรายชื่ออาคารเดิมเป็นคำแนะนำ */}
                    <Input
                      id="report-building"
                      type="text"
                      list="report-building-options"
                      autoComplete="off"
                      required={formData.faculty !== 'other'}
                      error={errors.building || missingMsg('report-building')}
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      placeholder={buildingSuggestions[0] ? `เช่น ${buildingSuggestions[0]} หรือพิมพ์ชื่ออาคารอื่น` : 'พิมพ์ชื่ออาคาร / ตึก'}
                    />
                    <datalist id="report-building-options">
                      {buildingSuggestions.map((name) => <option key={name} value={name} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">ห้อง / ชั้น <span className="text-red-500">*</span></label>
                    <Input
                      id="report-room"
                      required
                      error={errors.room || missingMsg('report-room')}
                      value={formData.room}
                      onChange={(e) => setFormData({...formData, room: e.target.value})}
                      placeholder="เช่น ชั้น 2 ห้อง 204 หรือ หน้าลิฟต์"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">รายละเอียดสถานที่เพิ่มเติม <span className="text-red-500">*</span></label>
                    <Input
                      id="report-location-detail"
                      required
                      error={errors.locationDetail || missingMsg('report-location-detail')}
                      value={formData.locationDetail}
                      onChange={(e) => setFormData({...formData, locationDetail: e.target.value})}
                      placeholder="เช่น วางลืมไว้บนโต๊ะแถวหลังสุด ใกล้ประตูทางออก"
                    />
                  </div>

                  {/* แผนที่แบบ OpenStreetMap (Leaflet) */}
                  <div className="pt-2">
                    <label className="block font-semibold text-on-surface-variant mb-1">
                      ระบุตำแหน่งบนแผนที่ (ไม่บังคับ)
                    </label>
                    <p className="text-[11px] text-outline mb-2">คลิกบนแผนที่เพื่อปักหมุด แล้วลากหมุดเพื่อขยับให้ตรงจุด (เลือกได้เฉพาะในเขตมหาวิทยาลัย)</p>
                    <FreeMap
                      key={mapKey}
                      onLocationSelect={(pos) => setFormData(prev => ({ ...prev, pinX: pos.lat, pinY: pos.lng }))}
                    />
                    {/* แสดงข้อความแจ้งเตือนเมื่อปักหมุดสำเร็จ */}
                    {(formData.pinX && formData.pinY) && (
                      <div className="mt-3 p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary-container shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-primary-container text-[11px]">บันทึกพิกัดแผนที่แล้ว</p>
                          <p className="text-on-surface-variant text-[10px] font-mono mt-0.5">
                            Lat: {formData.pinX.toFixed(5)}, Lng: {formData.pinY.toFixed(5)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* จุดสังเกตเพิ่มเติม — ต่อท้ายรายละเอียดสิ่งของตอนบันทึก */}
                  <div className="pt-2">
                    <label htmlFor="report-location-notes" className="block font-semibold text-on-surface-variant mb-1">
                      พิกัดและจุดสังเกตเพิ่มเติม (ไม่บังคับ)
                    </label>
                    <textarea
                      id="report-location-notes"
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-colors ${
                        errors.locationNotes
                          ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-line bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-50'
                      }`}
                      rows={3}
                      value={formData.locationNotes}
                      onChange={(e) => setFormData({ ...formData, locationNotes: e.target.value })}
                      placeholder={isFound
                        ? 'เช่น พบใต้ม้านั่งหน้าโรงอาหาร ฝากไว้ที่ป้อม รปภ. ประตูหน้า'
                        : 'เช่น แอป Find My / AirTag / Smart Tag ชี้ตำแหน่งล่าสุดแถวลานจอดรถหลังตึก เวลา 14:30 หรือพิกัดที่แอปแสดง'}
                    />
                    <div className="mt-1 flex items-start justify-between gap-2">
                      {errors.locationNotes ? (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.locationNotes}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-outline">ข้อความนี้จะต่อท้ายรายละเอียดสิ่งของ ให้ผู้ที่ตามหาเห็นด้วย</p>
                      )}
                      <span className="text-[11px] text-outline shrink-0">
                        {composeDescription(formData.description, formData.locationNotes).length}/{LIMITS.description}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ฝั่งขวา: ข้อมูลสิ่งของและช่องทางติดต่อ */}
            <div className="lg:col-span-7 space-y-6">

              <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-line space-y-5">
                <h3 className="text-base font-bold text-on-surface border-b border-line pb-3 flex items-center gap-2 font-display">
                  <Tag className="w-4 h-4 text-primary-container" />
                  <span>ข้อมูลสิ่งของ</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* ชื่อสิ่งของ */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      ชื่อสิ่งของ <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="report-name"
                      required
                      error={errors.name || missingMsg('report-name')}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="เช่น iPhone 15 Pro สีดำ, กระเป๋าสตางค์หนังสีน้ำตาล"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">หมวดหมู่ <span className="text-red-500">*</span></label>
                    <Select
                      options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                      placeholder="เลือกหมวดหมู่"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">ระดับความสำคัญ / ความเร่งด่วน</label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value as 'normal' | 'high'})}
                      className="w-full px-3.5 py-2.5 bg-white border border-line rounded-xl text-sm hover:border-outline-variant focus:outline-hidden focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                    >
                      <option value="normal">ปกติ (ทรัพย์สินทั่วไป)</option>
                      <option value="high">สำคัญมาก (เอกสารสำคัญ / ของมีค่าสูง)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">{isFound ? 'วันที่พบ' : 'วันที่ทำหาย'} <span className="text-red-500">*</span></label>
                    <Input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">เวลาโดยประมาณ <span className="text-red-500">*</span></label>
                    <Input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                  </div>

                  {/* รายละเอียดสิ่งของ */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-on-surface-variant">
                        รายละเอียดและลักษณะพิเศษ <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['มีพวงกุญแจ', 'มีรอยขีดข่วน', 'ติดสติ๊กเกอร์', 'เคสสีใส'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddTag(tag)}
                            className="text-[10px] bg-brand-50 hover:bg-brand-100 text-primary-container px-2 py-0.5 rounded-lg border border-brand-100 transition-colors cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      id="report-description"
                      required
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm focus:outline-hidden transition-colors ${
                        errors.description || missingMsg('report-description')
                          ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-line bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-50'
                      }`}
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="ระบุ สี ยี่ห้อ สัญลักษณ์ รอยตำหนิ หรือเคส เพื่อให้จำแนกได้ชัดเจน..."
                    />
                    {(errors.description || missingMsg('report-description')) && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.description || missingMsg('report-description')}</span>
                      </p>
                    )}
                  </div>

                  {isFound && (
                    <div className="sm:col-span-2 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-emerald-900">คำถามยืนยันความเป็นเจ้าของ (ไม่แสดงต่อสาธารณะ)</p>
                          <p className="text-[11px] text-emerald-800/80 mt-0.5">ตั้งคำถามจากรายละเอียดที่มีแต่เจ้าของตัวจริงรู้ เจ้าของที่มาขอรับคืนต้องตอบให้ถูกก่อนส่งคำขอได้ (ตอบผิดได้ไม่เกิน 3 ครั้ง)</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          error={errors.secretQuestion}
                          value={formData.secretQuestion}
                          onChange={(e) => setFormData({ ...formData, secretQuestion: e.target.value })}
                          placeholder="เช่น ภาพพื้นหลังหน้าจอเป็นรูปอะไร?"
                        />
                        <Input
                          error={errors.secretAnswer}
                          value={formData.secretAnswer}
                          onChange={(e) => setFormData({ ...formData, secretAnswer: e.target.value })}
                          placeholder="คำตอบ เช่น รูปแมวสีส้ม"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ช่องทางติดต่อผู้แจ้ง */}
                <div className="pt-4 border-t border-line">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2 font-display">
                      <Phone className="w-4 h-4 text-primary-container" />
                      <span>ช่องทางติดต่อผู้แจ้ง</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleQuickFill}
                      className="text-xs bg-brand-50 hover:bg-brand-100 text-primary-container px-3 py-1.5 rounded-xl font-semibold border border-brand-100 transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>เติมข้อมูลโปรไฟล์ของฉันด่วน</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* ชื่อผู้ติดต่อ */}
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                        ชื่อผู้ติดต่อ <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="report-contact-name"
                        required
                        error={errors.contactName || missingMsg('report-contact-name')}
                        value={formData.contactName}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[0-9]/g, '');
                          setFormData({...formData, contactName: val});
                        }}
                        placeholder="ชื่อ-นามสกุล"
                      />
                    </div>

                    {/* รหัสนักศึกษา */}
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                        รหัสนักศึกษา <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="report-student-id"
                        required
                        inputMode="numeric"
                        maxLength={10}
                        error={errors.studentId || missingMsg('report-student-id')}
                        value={formData.studentId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({...formData, studentId: val});
                        }}
                        placeholder="เช่น 670XXXXXXX"
                      />
                    </div>

                    {/* เบอร์โทรศัพท์ */}
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                        เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        id="report-phone"
                        required
                        maxLength={10}
                        error={errors.contactPhone || missingMsg('report-phone')}
                        value={formData.contactPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({...formData, contactPhone: val});
                        }}
                        placeholder="08XXXXXXXX"
                      />
                    </div>

                    {/* ช่องทางอื่นๆ */}
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                        ช่องทางอื่นๆ <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="report-contact-other"
                        required
                        error={errors.contactOther || missingMsg('report-contact-other')}
                        value={formData.contactOther}
                        onChange={(e) => setFormData({...formData, contactOther: e.target.value})}
                        placeholder="เช่น Line ID หรือ Email"
                      />
                    </div>

                  </div>
                </div>

                {showMissing && (
                  <div className="pt-6">
                    <FormAlert title="บันทึกไม่ได้ — กรุณากรอกข้อมูลให้ครบถ้วนก่อน" fields={missingFields} />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-line">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => router.back()}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || hasErrors}
                    className={`font-semibold px-6 shadow-xs cursor-pointer ${
                      hasErrors
                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-primary-container hover:bg-primary text-white'
                    }`}
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและโพสต์ข้อมูล'}
                  </Button>
                </div>

              </div>

            </div>

          </div>
        </form>

      </div>

      {createdItem && (
        <Modal
          isOpen={!!createdItem}
          onClose={() => setCreatedItem(null)}
          title={createdItem.reportType === 'found' ? 'บันทึกการแจ้งพบสิ่งของสำเร็จ!' : 'บันทึกข้อมูลสิ่งของสูญหายสำเร็จ!'}
        >
          <div className="space-y-4 text-xs text-on-surface-variant">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-emerald-900 font-display">โพสต์รายการเรียบร้อยแล้ว</p>
                <p className="text-emerald-700 mt-0.5">
                  รหัสรายการของคุณคือ <strong className="font-mono text-emerald-900 font-bold">{createdItem.code}</strong> ข้อมูลถูกบันทึกและพร้อมแสดงในคลังของหายทันที
                </p>
              </div>
            </div>

            <div className="border border-line rounded-2xl p-4 bg-surface flex gap-4 items-center">
              {createdItem.imageUrl ? (
                <img src={createdItem.imageUrl} alt="preview" className="w-16 h-16 rounded-xl object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface-variant flex items-center justify-center text-outline">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-on-surface truncate font-display">{createdItem.name}</p>
                <p className="text-on-surface-variant">{createdItem.category} • {createdItem.location}</p>
                <p className="text-outline text-[11px] mt-0.5">
                  ผู้แจ้ง: {createdItem.reporterName} {createdItem.reporterStudentId ? `(${createdItem.reporterStudentId})` : ''} • โทร: {createdItem.reporterPhone}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-on-surface flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {createdItem.reportType === 'found' ? 'รายการแจ้งหายที่อาจเป็นของชิ้นนี้' : 'ของที่มีคนแจ้งพบซึ่งอาจเป็นของคุณ'}
              </p>
              <MatchList
                matches={createdMatches}
                emptyText="ยังไม่พบรายการที่ตรงกัน ระบบจะแสดงรายการที่ตรงกันในหน้า &quot;รายการของฉัน&quot; เมื่อมีคนแจ้งเข้ามา"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
              <Link
                href="/my-items"
                className="px-4 py-2 bg-white border border-line hover:bg-surface text-on-surface-variant font-semibold rounded-xl"
              >
                รายการของฉัน
              </Link>
              <button
                onClick={() => {
                  setCreatedItem(null);
                  setCreatedMatches([]);
                  setFormData(createInitialForm());
                  setShowMissing(false);
                  setPhotos([]);
                  setMapKey(k => k + 1);
                }}
                className="px-4 py-2 bg-surface-container hover:bg-surface-variant text-on-surface-variant font-semibold rounded-xl cursor-pointer"
              >
                แจ้งรายการอื่นเพิ่ม
              </button>
              <Link
                href="/items"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-white font-semibold rounded-xl shadow-xs"
              >
                <span>ดูรายการของหายทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}