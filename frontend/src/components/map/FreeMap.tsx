'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { CAMPUS_CENTER, createMap, loadLeaflet, markerIcon } from './leaflet';

// แผนที่ให้ผู้แจ้งคลิกปักหมุดตำแหน่งที่ของหาย/พบของ
export default function FreeMap({ onLocationSelect }: { onLocationSelect?: (latlng: { lat: number; lng: number }) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const onSelect = useRef(onLocationSelect);
  onSelect.current = onLocationSelect;

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      map = createMap(L, el.current, CAMPUS_CENTER, 16);
      let marker: Marker | undefined;
      map.on('click', (e) => {
        if (marker) marker.setLatLng(e.latlng);
        else marker = L.marker(e.latlng, { icon: markerIcon(L) }).addTo(map!);
        onSelect.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return <div ref={el} className="relative z-0 h-[400px] w-full rounded-lg overflow-hidden border border-line shadow-xs" />;
}
