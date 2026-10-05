'use client';

import { useEffect, useRef } from 'react';
import type { LatLng as LeafletLatLng, Map as LeafletMap, Marker } from 'leaflet';
import { CAMPUS_CENTER, createMap, isInsideCampus, loadLeaflet, markerIcon } from './leaflet';

interface FreeMapProps {
  onLocationSelect?: (latlng: { lat: number; lng: number }) => void;
}

// แผนที่ให้ผู้แจ้งปักหมุดตำแหน่งที่ของหาย/พบของ — อยู่ในเขต ม.แม่โจ้เท่านั้น
// คลิกบนแผนที่เพื่อวางหมุด แล้วลากหมุดเพื่อขยับให้ตรงจุด (เช่น ตำแหน่งที่แอป Find My บอก)
export default function FreeMap({ onLocationSelect }: FreeMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const onSelect = useRef(onLocationSelect);
  onSelect.current = onLocationSelect;

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      const m = createMap(L, el.current, CAMPUS_CENTER, 16);
      map = m;
      let marker: Marker | undefined;
      let lastValid: LeafletLatLng | undefined;

      const select = (latlng: LeafletLatLng) => {
        lastValid = latlng;
        onSelect.current?.({ lat: latlng.lat, lng: latlng.lng });
      };

      m.on('click', (e) => {
        if (!isInsideCampus(L, e.latlng)) return;
        if (marker) {
          marker.setLatLng(e.latlng);
        } else {
          marker = L.marker(e.latlng, { icon: markerIcon(L), draggable: true, autoPan: true })
            .bindTooltip('ลากหมุดเพื่อขยับตำแหน่ง', { direction: 'top', offset: [0, -36] })
            .addTo(m);
          // ลากหลุดออกนอกเขตมหาวิทยาลัย -> เด้งกลับตำแหน่งล่าสุดที่ใช้ได้
          marker.on('dragend', () => {
            const pos = marker!.getLatLng();
            if (isInsideCampus(L, pos)) select(pos);
            else if (lastValid) marker!.setLatLng(lastValid);
          });
        }
        select(e.latlng);
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return <div ref={el} className="relative z-0 h-[400px] w-full rounded-lg overflow-hidden border border-line shadow-xs" />;
}
