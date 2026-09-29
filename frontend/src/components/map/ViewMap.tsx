'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { CAMPUS_CENTER, createMap, loadLeaflet, markerIcon } from './leaflet';

// แสดงตำแหน่งที่ผู้แจ้งปักหมุดไว้ (ถ้าไม่มีพิกัดแสดงมหาวิทยาลัยแม่โจ้)
export default function ViewMap({ lat, lng }: { lat?: number; lng?: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    const hasPin = lat != null && lng != null;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      // ปิดการซูมด้วยลูกกลิ้ง ไม่ให้รบกวนตอนเลื่อนอ่านหน้า (ยังลากดูรอบ ๆ ได้)
      map = createMap(L, el.current, hasPin ? [lat, lng] : CAMPUS_CENTER, 17, { scrollWheelZoom: false });
      if (hasPin) L.marker([lat, lng], { icon: markerIcon(L) }).addTo(map);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng]);

  return <div ref={el} className="relative z-0 h-[300px] w-full rounded-lg overflow-hidden border border-line shadow-xs" />;
}
