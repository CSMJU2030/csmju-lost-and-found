'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { color } from '@/csmju/tokens';
import { CAMPUS_CENTER, createMap, loadLeaflet } from './leaflet';

export interface HeatPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

// จุดโปร่งแสงซ้อนกัน: บริเวณที่มีของหายหนาแน่นจะมีสีเข้มขึ้นเอง (ไม่ต้องใช้ปลั๊กอิน heatmap เพิ่ม)
export default function HeatMap({ points }: { points: HeatPoint[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      map = createMap(L, el.current, CAMPUS_CENTER, 16, { scrollWheelZoom: false });
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], { radius: 18, stroke: false, fillColor: color.heat, fillOpacity: 0.28 })
          .bindTooltip(p.label)
          .addTo(map);
      }
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], { radius: 4, color: color.white, weight: 2, fillColor: color.heatCore, fillOpacity: 1 })
          .bindTooltip(p.label)
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
