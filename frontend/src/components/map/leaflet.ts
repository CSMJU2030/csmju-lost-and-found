// ตัวช่วยสร้างแผนที่ด้วย leaflet ตรง ๆ (tech-stack.md ข้อ 1.4.2 — ไม่ใช้ react-leaflet เพราะ license ไม่ผ่าน OSI)
// leaflet ใช้ window จึงโหลดแบบ dynamic import เฉพาะฝั่งเบราว์เซอร์
import type * as Leaflet from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

export type LeafletModule = typeof Leaflet;
export type LatLng = [number, number];

/** มหาวิทยาลัยแม่โจ้ */
export const CAMPUS_CENTER: LatLng = [18.8986, 99.0135];

export const loadLeaflet = (): Promise<LeafletModule> => import('leaflet').then((m) => (m.default ?? m) as LeafletModule);

/** แผนที่ OpenStreetMap พร้อมเครดิตผู้ให้ข้อมูล (บังคับตามเงื่อนไขการใช้ tile) */
export function createMap(L: LeafletModule, el: HTMLElement, center: LatLng, zoom: number, options: Leaflet.MapOptions = {}) {
  const map = L.map(el, options).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  return map;
}

/** หมุดมาตรฐานของ leaflet (ไฟล์รูปจากแพ็กเกจเอง ไม่ต้องโหลดจาก CDN) */
export const markerIcon = (L: LeafletModule) =>
  L.icon({
    iconUrl: iconUrl.src,
    iconRetinaUrl: iconRetinaUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
