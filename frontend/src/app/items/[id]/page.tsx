'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Calendar, MapPin, Package, Tag, Image as ImageIcon, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { LostItem } from '@/types'
import PosterGenerator from '@/components/items/PosterGenerator'
import SuggestedMatches from '@/components/items/SuggestedMatches'
import { getReportType } from '@/lib/storage'
import { MatchResult } from '@/lib/matching'
import { api, ApiError, errorMessage } from '@/lib/api'
import ApiErrorBanner from '@/components/ui/ApiError'
import { wordingForItem } from '@/lib/wording'

// โหลดคอมโพเนนต์แผนที่แบบปิด SSR เพื่อป้องกัน Error window is not defined
const ViewMap = dynamic(() => import('@/components/map/ViewMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-surface flex items-center justify-center rounded-lg border border-line text-on-surface-variant text-sm">
      กำลังโหลดแผนที่...
    </div>
  )
})

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>()
  const [item, setItem] = useState<LostItem | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [activeImage, setActiveImage] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getItem(params.id), api.getMatches(params.id)])
      .then(([found, foundMatches]) => {
        if (cancelled) return
        setItem(found)
        setActiveImage(found.imageUrl || '')
        setMatches(foundMatches)
      })
      .catch((err) => {
        // 404 = ไม่มีรายการนี้ -> แสดงหน้า "ไม่พบรายการ", error อื่นแสดงข้อความ
        if (!cancelled && !(err instanceof ApiError && err.status === 404)) setLoadError(errorMessage(err))
      })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [params.id])

  if (!loaded) return <div className="p-8 text-sm text-on-surface-variant">กำลังโหลดข้อมูล...</div>

  if (loadError) return <div className="max-w-3xl mx-auto"><ApiErrorBanner message={loadError} /></div>

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-10 text-center">
        <Package className="w-10 h-10 mx-auto mb-4 text-outline" />
        <h1 className="text-xl font-bold text-on-surface">ไม่พบรายการสิ่งของ</h1>
        <p className="mt-2 text-sm text-on-surface-variant">รายการนี้อาจถูกลบไปแล้ว</p>
        <Link href="/items" className="inline-flex mt-6 items-center gap-2 rounded-xl bg-primary-container px-4 py-2 text-sm font-semibold text-white">
          <ArrowLeft className="w-4 h-4" /> กลับไปหน้ารายการ
        </Link>
      </div>
    )
  }

  const statusVariant = item.status === 'searching' ? 'searching' : item.status === 'found' ? 'found' : 'returned'
  const isFound = getReportType(item) === 'found'
  const gallery = item.thumbnails?.length ? item.thumbnails : item.imageUrl ? [item.imageUrl] : []

  return (
    <div className="pb-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/items" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container hover:underline">
          <ArrowLeft className="w-4 h-4" /> กลับไปหน้ารายการ
        </Link>
        <article className="mt-5 overflow-hidden rounded-3xl border border-line bg-white shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* ฝั่งซ้าย: รูปภาพ และ แผนที่ */}
            <div className="flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-line">
              <div className="min-h-72 bg-surface-container relative">
                {activeImage ? (
                  <img src={activeImage} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-outline">
                    <Package className="w-14 h-14" />
                  </div>
                )}
                {gallery.length > 1 && (
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    {gallery.map((src) => (
                      <button
                        key={src}
                        onClick={() => setActiveImage(src)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer ${activeImage === src ? 'border-white shadow-md' : 'border-white/50 opacity-80'}`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-surface border-t border-line flex-1">
                <p className="text-xs font-semibold text-on-surface-variant mb-2 flex items-center gap-1.5 font-display">
                  <MapPin className="w-3.5 h-3.5" /> ตำแหน่งที่ปักหมุดบนแผนที่
                </p>
                {/* ตรวจสอบว่าของชิ้นนี้มีการปักหมุดพิกัด (pinX, pinY) ไว้หรือไม่ */}
                {item.pinX != null && item.pinY != null ? (
                  <ViewMap
                    lat={item.pinX}
                    lng={item.pinY}
                    item={{ id: item.id, name: item.name, imageUrl: item.imageUrl, status: item.status, reportType: item.reportType }}
                  />
                ) : (
                  <div className="flex h-[300px] w-full items-center justify-center rounded-lg border border-dashed border-outline-variant bg-white text-sm text-outline">
                    ไม่มีการระบุพิกัดบนแผนที่สำหรับรายการนี้
                  </div>
                )}
              </div>
            </div>

            {/* ฝั่งขวา: รายละเอียดสิ่งของ */}
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-on-surface-variant">{item.code} • {isFound ? 'แจ้งพบสิ่งของ' : 'แจ้งของหาย'}</p>
                  <h1 className="mt-1 text-2xl font-extrabold text-on-surface">{item.name}</h1>
                </div>
                <Badge variant={statusVariant}>
                  {item.status === 'searching' ? 'กำลังค้นหา' : item.status === 'found' ? 'พบแล้ว' : 'รับคืนแล้ว'}
                </Badge>
              </div>

              {item.urgency === 'high' && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> สำคัญมาก (เอกสารสำคัญ / ของมีค่าสูง)
                </p>
              )}
              <p className="mt-5 text-sm leading-6 text-on-surface-variant whitespace-pre-line">{item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>

              <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
                <div className="flex gap-3">
                  <Tag className="w-5 h-5 shrink-0 text-primary-container" />
                  <div>
                    <dt className="text-on-surface-variant">หมวดหมู่</dt>
                    <dd className="font-semibold text-on-surface">{item.category}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="w-5 h-5 shrink-0 text-primary-container" />
                  <div>
                    <dt className="text-on-surface-variant">สถานที่</dt>
                    <dd className="font-semibold text-on-surface">
                      {item.location}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="w-5 h-5 shrink-0 text-primary-container" />
                  <div>
                    <dt className="text-on-surface-variant">{isFound ? 'วันที่พบ' : 'วันที่ทำหาย'}</dt>
                    <dd className="font-semibold text-on-surface">{item.dateLost || item.createdAt}{item.timeLost ? ` เวลา ${item.timeLost} น.` : ''}</dd>
                  </div>
                </div>
              </dl>

              <div className="mt-7 flex flex-wrap gap-3">
                {item.status !== 'returned' && (
                  <Link
                    href={`/claim?item=${item.id}`}
                    className={`inline-flex rounded-xl px-5 py-3 text-sm font-bold text-white btn-gradient shadow-md`}
                  >
                    {wordingForItem(item).ctaLong}
                  </Link>
                )}
                <button
                  onClick={() => setShowPoster(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-variant/50 px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  {isFound ? 'สร้างใบประกาศตามหาเจ้าของ' : 'สร้างใบประกาศตามหา'}
                </button>
              </div>

              {item.status !== 'returned' && (
                <p className="mt-3 text-xs text-on-surface-variant">{wordingForItem(item).hint}</p>
              )}

              {item.secretQuestion && item.status !== 'returned' && (
                <p className="mt-4 text-xs text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> ผู้เก็บได้ตั้งคำถามยืนยันความเป็นเจ้าของไว้ เจ้าของต้องตอบให้ถูกตอนขอรับคืน
                </p>
              )}

              {item.status !== 'returned' && (
                <div className="mt-7 pt-5 border-t border-line space-y-3">
                  <p className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {isFound ? 'รายการแจ้งหายที่อาจเป็นของชิ้นนี้' : 'ของที่มีคนแจ้งพบที่อาจตรงกัน'}
                  </p>
                  <SuggestedMatches source={item} matches={matches} emptyText="ยังไม่พบรายการที่ตรงกันในระบบ" />
                </div>
              )}
            </div>

          </div>
        </article>
      </div>

      {/* Poster Generator Modal */}
      <PosterGenerator item={item} isOpen={showPoster} onClose={() => setShowPoster(false)} />
    </div>
  )
}