'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  MapPin,
  Calendar,
  Package,
  Eye,
  CheckCircle2,
  Tag,
  User as UserIcon,
  ArrowUpRight,
  X
} from 'lucide-react'
import { categories } from '@/data/mockData'
import Badge from '@/components/ui/Badge'
import { LostItem } from '@/types'
import { getReportType } from '@/lib/storage'
import { api } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import ApiError from '@/components/ui/ApiError'
import { wordingForItem } from '@/lib/wording'
import PageHeader from '@/components/layout/PageHeader'

export default function ItemsPage() {
  const { data: items, loading, error, reload } = useApi<LostItem[]>(() => api.listItems(), [])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'searching' | 'found'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'lost' | 'found'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // ดึงข้อมูลจริงจาก localStorage เมื่อโหลดหน้าเว็บ และรับหมวดหมู่จากลิงก์หน้าแรก (?category=)
  useEffect(() => {
    // TopBar ค้นหาซ้ำขณะอยู่หน้านี้ (หน้าไม่ถูกโหลดใหม่) จะส่ง event มาแทน
    const onSearch = (e: Event) => setSearchQuery((e as CustomEvent<string>).detail)
    window.addEventListener('items-search', onSearch)

    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setSearchQuery(q)
    const categoryParam = params.get('category')
    if (categoryParam && categories.some(c => c.name === categoryParam)) {
      setSelectedCategory(categoryParam)
    }
    return () => window.removeEventListener('items-search', onSearch)
  }, [])

  // Filter items based on status, category, and search query
  const filteredItems = items.filter((item) => {
    if (item.status === 'returned') return false
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesType = selectedType === 'all' || getReportType(item) === selectedType
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesStatus && matchesCategory && matchesType && matchesSearch
  })

  const getStatusBadge = (status: LostItem['status']) => {
    switch (status) {
      case 'searching':
        return <Badge variant="searching">กำลังค้นหา</Badge>
      case 'found':
        return <Badge variant="found">พบแล้ว</Badge>
      case 'returned':
        return <Badge variant="returned">รับคืนแล้ว</Badge>
      default:
        return <Badge variant="pending">{status}</Badge>
    }
  }

  return (
    <div className="pb-8">
      <div className="space-y-8">

        <PageHeader
          eyebrow="ค้นหาของหาย"
          title="ค้นหาของหาย"
          description="รวมทุกรายการที่มีการแจ้งหายและแจ้งพบในมหาวิทยาลัย ค้นหา กรองตามสถานะหรือหมวดหมู่ แล้วกด &quot;ฉันเจอของชิ้นนี้&quot; หรือ &quot;นี่คือของฉัน&quot; ตามกรณี"
          icon={<Package className="w-5 h-5" />}
          actions={
            <Link href="/report" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs shadow-brand-600/20">
              <Plus className="w-4 h-4" /> แจ้งรายการใหม่
            </Link>
          }
        />

        <ApiError message={error} onRetry={reload} />

        {/* Filter Controls & Search Bar */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-xs border border-line space-y-4">

          {/* Top Row: Status Tabs & View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">

            {/* Status Tabs */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'ทั้งหมด', count: items.filter(i => i.status !== 'returned').length },
                { id: 'searching', label: 'กำลังค้นหา', count: items.filter(i => i.status === 'searching').length },
                { id: 'found', label: 'พบแล้ว', count: items.filter(i => i.status === 'found').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id as any)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    selectedStatus === tab.id
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    selectedStatus === tab.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-variant text-on-surface-variant'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl shrink-0 self-end sm:self-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-primary-container shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="มุมมองการ์ด (Grid View)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white text-primary-container shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="มุมมองรายการ (List View)"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Bottom Row: Search Box & Category Select */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสิ่งของ รหัสรายการ สถานที่ หรือคำอธิบาย..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-line rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-container focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-outline hover:text-on-surface-variant bg-surface-variant rounded-full w-4 h-4 flex items-center justify-center"
                >
                  <X className="w-3 h-3" aria-hidden />
                </button>
              )}
            </div>

            {/* Type Dropdown */}
            <div className="sm:col-span-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | 'lost' | 'found')}
                className="w-full px-3 py-2.5 bg-surface border border-line rounded-2xl text-xs sm:text-sm text-on-surface-variant focus:outline-hidden focus:ring-2 focus:ring-primary-container focus:bg-white transition-all"
              >
                <option value="all">ทุกประเภท</option>
                <option value="lost">แจ้งของหาย</option>
                <option value="found">มีคนเก็บได้</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="sm:col-span-4 relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-surface border border-line rounded-2xl text-xs sm:text-sm text-on-surface-variant focus:outline-hidden focus:ring-2 focus:ring-primary-container focus:bg-white transition-all appearance-none"
              >
                <option value="all">หมวดหมู่ทั้งหมด</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Tag className="w-4 h-4 text-outline absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Results Counter Bar */}
        <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
          <span>พบทั้งหมด <strong className="text-on-surface font-semibold">{filteredItems.length}</strong> รายการ</span>
          {(selectedStatus !== 'all' || selectedCategory !== 'all' || selectedType !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setSelectedStatus('all')
                setSelectedCategory('all')
                setSelectedType('all')
                setSearchQuery('')
              }}
              className="text-primary-container hover:underline font-medium"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        {/* Catalog Content - Grid View vs List View */}
        {loading ? (
          <div className="py-16 text-center text-sm text-outline">กำลังโหลดรายการ...</div>
        ) : filteredItems.length > 0 ? (
          viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-line overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
                >
                  {/* Image Header & Status */}
                  <div className="aspect-video bg-brand-50 relative overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-outline bg-brand-50">
                        <Package className="w-10 h-10 mb-1" />
                        <span className="text-xs">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 shadow-xs">
                      {getStatusBadge(item.status)}
                    </div>
                    {item.code && (
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-xl">
                        {item.code}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 text-xs text-primary-container font-medium">
                          <Tag className="w-3.5 h-3.5" />
                          <span>{item.category}</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant">
                          {getReportType(item) === 'found' ? 'มีคนเก็บได้ • รอเจ้าของ' : 'เจ้าของตามหาอยู่'}
                        </span>
                      </div>
                      <Link href={`/items/${item.id}`}>
                        <h3 className="text-base font-bold text-on-surface group-hover:text-primary-container transition-colors line-clamp-1 font-display">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 pt-3 border-t border-line text-xs text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary-container shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-outline shrink-0" />
                          <span>{item.dateLost ? new Date(item.dateLost).toLocaleDateString('th-TH') : '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>{item.reporterName || 'ไม่ระบุ'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <Link
                        href={`/items/${item.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold rounded-2xl transition-colors border border-line"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูรายละเอียด</span>
                      </Link>

                      {item.status === 'returned' ? (
                        <span className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-brand-50 text-primary-container text-xs font-semibold rounded-2xl border border-brand-100">
                          {wordingForItem(item).doneLabel}
                        </span>
                      ) : (
                        <Link
                          href={`/claim?item=${item.id}`}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-white text-xs font-semibold rounded-2xl shadow-md btn-gradient`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{wordingForItem(item).cta}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-3xl border border-line overflow-hidden shadow-xs divide-y divide-line">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-6 hover:bg-brand-50/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-2xl bg-surface-container shrink-0 overflow-hidden relative border border-line">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline bg-brand-50">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Main Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.code && <span className="font-mono text-xs text-on-surface-variant font-semibold">{item.code}</span>}
                        {item.code && <span className="text-outline-variant">•</span>}
                        <span className="text-xs text-primary-container font-medium">{item.category}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant">
                          {getReportType(item) === 'found' ? 'มีคนเก็บได้ • รอเจ้าของ' : 'เจ้าของตามหาอยู่'}
                        </span>
                      </div>
                      <Link href={`/items/${item.id}`}>
                        <h3 className="text-base font-bold text-on-surface group-hover:text-primary-container transition-colors truncate font-display">
                          {item.name}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary-container" />
                          {item.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-outline" />
                          {item.dateLost ? new Date(item.dateLost).toLocaleDateString('th-TH') : '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-outline" />
                          {item.reporterName || 'ไม่ระบุ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Badge + Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div>{getStatusBadge(item.status)}</div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/items/${item.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold rounded-xl transition-colors border border-line"
                      >
                        <span>รายละเอียด</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>

                      {item.status === 'returned' ? (
                        <span className="inline-flex items-center px-3 py-2 bg-brand-50 text-primary-container text-xs font-semibold rounded-xl border border-brand-100">
                          {wordingForItem(item).doneLabel}
                        </span>
                      ) : (
                        <Link
                          href={`/claim?item=${item.id}`}
                          className={`inline-flex items-center gap-1 px-3.5 py-2 text-white text-xs font-semibold rounded-xl shadow-md btn-gradient`}
                        >
                          <span>{wordingForItem(item).cta}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-line p-16 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-brand-50 text-primary-container rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface font-display">ไม่พบรายการสิ่งของที่ค้นหา</h3>
              <p className="text-sm text-on-surface-variant mt-1">ลองปรับเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่และสถานะใหม่อีกครั้ง</p>
            </div>
            <button
              onClick={() => {
                setSelectedStatus('all')
                setSelectedCategory('all')
                setSelectedType('all')
                setSearchQuery('')
              }}
              className="px-5 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              รีเซ็ตการค้นหา
            </button>
          </div>
        )}

      </div>
    </div>
  )
}