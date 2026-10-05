'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { color } from '@/csmju/tokens';
import { CAMPUS_CENTER, ItemPopupData, createMap, itemPinIcon, itemPopupHtml, loadLeaflet } from './leaflet';

export interface HeatPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** ข้อมูลสำหรับ popup เมื่อคลิกจุด */
  item: ItemPopupData;
}

// จุดโปร่งแสงซ้อนกัน: บริเวณที่มีของหายหนาแน่นจะมีสีเข้มขึ้นเอง (ไม่ต้องใช้ปลั๊กอิน heatmap เพิ่ม)
// แต่ละจุดมีหมุดเป็นรูปสิ่งของ (ไม่มีรูป -> จุดสีแดง) คลิกเพื่อดูชื่อและสถานะ — แผนที่ล็อกอยู่ในเขต ม.แม่โจ้
export default function HeatMap({ points }: { points: HeatPoint[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      map = createMap(L, el.current, CAMPUS_CENTER, 16, { scrollWheelZoom: false });
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], { radius: 18, stroke: false, fillColor: color.heat, fillOpacity: 0.28, interactive: false })
          .addTo(map);
      }
      for (const p of points) {
        const pin = p.item.imageUrl
          ? L.marker([p.lat, p.lng], { icon: itemPinIcon(L, p.item), alt: p.item.name })
          : L.circleMarker([p.lat, p.lng], { radius: 6, color: color.white, weight: 2, fillColor: color.heatCore, fillOpacity: 1 });
        pin
          .bindTooltip(p.label)
          .bindPopup(itemPopupHtml(p.item, { link: true }), { maxWidth: 220 })
          .addTo(map);
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={el} className="relative z-0 h-[340px] w-full rounded-xl overflow-hidden border border-line" />;
}
