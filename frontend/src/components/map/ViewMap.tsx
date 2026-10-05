'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { color } from '@/csmju/tokens';
import { CAMPUS_CENTER, ItemPopupData, createMap, itemPinIcon, itemPopupHtml, loadLeaflet, markerIcon } from './leaflet';

export interface ComparePin {
  lat: number;
  lng: number;
  item: ItemPopupData;
}

interface ViewMapProps {
  lat?: number;
  lng?: number;
  /** ถ้าส่งมา คลิกหมุดแล้วแสดง popup รูป ชื่อ และสถานะของสิ่งของ */
  item?: ItemPopupData;
  /** จุดของรายการที่นำมาเทียบ (เช่น รายการที่อาจตรงกัน) — แสดงเป็นวงกลมพร้อมเส้นประเชื่อมกับหมุดหลัก */
  compare?: ComparePin;
  /** class ความสูงของแผนที่ (ค่าเริ่มต้น h-[300px]) */
  heightClass?: string;
}

// แสดงตำแหน่งที่ผู้แจ้งปักหมุดไว้ (ถ้าไม่มีพิกัดแสดงมหาวิทยาลัยแม่โจ้) — ล็อกอยู่ในเขต ม.แม่โจ้
export default function ViewMap({ lat, lng, item, compare, heightClass = 'h-[300px]' }: ViewMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const keyOf = (p?: ItemPopupData) => (p ? `${p.id}|${p.name}|${p.imageUrl}|${p.status}` : '');
  const popupKey = keyOf(item);
  const compareKey = compare ? `${compare.lat}|${compare.lng}|${keyOf(compare.item)}` : '';

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    const hasPin = lat != null && lng != null;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      // ปิดการซูมด้วยลูกกลิ้ง ไม่ให้รบกวนตอนเลื่อนอ่านหน้า (ยังลากดูรอบ ๆ ได้)
      map = createMap(L, el.current, hasPin ? [lat, lng] : CAMPUS_CENTER, 17, { scrollWheelZoom: false });
      if (hasPin) {
        // หมุดเป็นรูปสิ่งของ (ไม่มีรูป -> หมุดมาตรฐาน) คลิกแล้วเปิด popup ชื่อและสถานะ
        const marker = L.marker([lat, lng], { icon: item ? itemPinIcon(L, item) : markerIcon(L), alt: item?.name }).addTo(map);
        if (item) marker.bindPopup(itemPopupHtml(item), { maxWidth: 220 });
      }
      if (compare) {
        // รายการที่นำมาเทียบ: รูปขอบสีเหลืองอำพัน / ไม่มีรูปใช้วงกลมสีเหลืองแทน (ไม่ให้ซ้ำกับหมุดหลัก)
        const comparePin = compare.item.imageUrl
          ? L.marker([compare.lat, compare.lng], { icon: itemPinIcon(L, compare.item, { accent: true }), alt: compare.item.name })
          : L.circleMarker([compare.lat, compare.lng], { radius: 8, color: color.brandNavy, weight: 2, fillColor: color.highlight, fillOpacity: 1 });
        comparePin.bindPopup(itemPopupHtml(compare.item, { link: true }), { maxWidth: 220 }).addTo(map);
        if (hasPin) {
          L.polyline([[lat, lng], [compare.lat, compare.lng]], { color: color.brandNavy, weight: 2, dashArray: '6 6', interactive: false })
            .addTo(map);
          map.fitBounds(L.latLngBounds([[lat, lng], [compare.lat, compare.lng]]), { padding: [32, 32], maxZoom: 18 });
        }
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
    // ใช้ key แทน object ทั้งก้อน — สร้างแผนที่ใหม่เฉพาะเมื่อข้อมูลที่แสดงเปลี่ยน
  }, [lat, lng, popupKey, compareKey]);

  return <div ref={el} className={`relative z-0 ${heightClass} w-full rounded-lg overflow-hidden border border-line shadow-xs`} />;
}
