// ตัวช่วยสร้างแผนที่ด้วย leaflet ตรง ๆ (tech-stack.md ข้อ 1.4.2 — ไม่ใช้ react-leaflet เพราะ license ไม่ผ่าน OSI)
// leaflet ใช้ window จึงโหลดแบบ dynamic import เฉพาะฝั่งเบราว์เซอร์
import type * as Leaflet from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import type { LostItem } from '@/types';

export type LeafletModule = typeof Leaflet;
export type LatLng = [number, number];

/** มหาวิทยาลัยแม่โจ้ */
export const CAMPUS_CENTER: LatLng = [18.8986, 99.0135];

/**
 * ขอบเขตพื้นที่ ม.แม่โจ้ (มุมตะวันตกเฉียงใต้ → ตะวันออกเฉียงเหนือ) — แผนที่ทุกตัวเลื่อน/ซูมออกนอกกรอบนี้ไม่ได้
 * ครอบตั้งแต่ประตูหน้ามหาวิทยาลัยถึงแปลงเกษตรและหอพักด้านหลัง
 */
export const CAMPUS_BOUNDS: [LatLng, LatLng] = [
  [18.888, 99.002],
  [18.908, 99.025],
];
const CAMPUS_MIN_ZOOM = 15;
const CAMPUS_MAX_ZOOM = 19;

export const loadLeaflet = (): Promise<LeafletModule> => import('leaflet').then((m) => (m.default ?? m) as LeafletModule);

/** อยู่ในเขตมหาวิทยาลัยหรือไม่ */
export const isInsideCampus = (L: LeafletModule, latlng: Leaflet.LatLngExpression) =>
  L.latLngBounds(CAMPUS_BOUNDS).contains(latlng);

/**
 * แผนที่ OpenStreetMap พร้อมเครดิตผู้ให้ข้อมูล (บังคับตามเงื่อนไขการใช้ tile)
 * ล็อกไว้ในเขต ม.แม่โจ้: ลากออกนอกกรอบแล้วเด้งกลับ (maxBoundsViscosity = 1) และซูมออกได้ไม่เกิน minZoom
 */
export function createMap(L: LeafletModule, el: HTMLElement, center: LatLng, zoom: number, options: Leaflet.MapOptions = {}) {
  const bounds = L.latLngBounds(CAMPUS_BOUNDS);
  const start = bounds.contains(center) ? center : CAMPUS_CENTER;
  const map = L.map(el, {
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: CAMPUS_MIN_ZOOM,
    maxZoom: CAMPUS_MAX_ZOOM,
    ...options,
  }).setView(start, Math.max(zoom, CAMPUS_MIN_ZOOM));
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: CAMPUS_MIN_ZOOM,
    maxZoom: CAMPUS_MAX_ZOOM,
    bounds,
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
    popupAnchor: [0, -36],
    tooltipAnchor: [0, -36],
  });

// ---------- popup รายละเอียดสิ่งของ ----------

/** ข้อมูลที่ popup ใช้ (ชื่อ · รูปหลัก · สถานะ) */
export type ItemPopupData = Pick<LostItem, 'id' | 'name' | 'imageUrl' | 'status'> & { reportType?: LostItem['reportType'] };

const STATUS_STYLE: Record<LostItem['status'], { label: string; className: string }> = {
  searching: { label: 'กำลังค้นหา', className: 'bg-amber-100 text-amber-800' },
  found: { label: 'พบแล้ว รอเจ้าของ', className: 'bg-emerald-100 text-emerald-800' },
  returned: { label: 'คืนเจ้าของแล้ว', className: 'bg-brand-100 text-primary' },
};

// ข้อความจากผู้ใช้ต้อง escape ก่อนใส่ใน HTML ของ popup (กัน XSS)
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

// รูปต้องเป็น path ที่ระบบอัปโหลดไว้ (/uploads/...) หรือ data URL ที่ผู้ใช้เพิ่งเลือก — ไม่รับ URL อื่น
const safeImageSrc = (src: string) => (/^\/uploads\/[\w.-]+$/.test(src) || src.startsWith('data:image/') ? src : '');

const PIN_SIZE = 48; // w-12 h-12
const PIN_HEIGHT = PIN_SIZE + 8; // รวมปลายหมุดด้านล่าง

/**
 * หมุดเป็นรูปสิ่งของ (วงกลม ขอบขาว มีเงา และปลายแหลมชี้ตำแหน่ง) — คลิกแล้วค่อยเปิด popup
 * ถ้าสิ่งของไม่มีรูป ใช้หมุดมาตรฐานของ leaflet แทน
 * @param accent ขอบสีเหลืองอำพัน ใช้แยกรายการที่นำมาเทียบออกจากรายการหลัก
 */
export function itemPinIcon(L: LeafletModule, item: ItemPopupData, options: { accent?: boolean } = {}): Leaflet.Icon | Leaflet.DivIcon {
  const src = safeImageSrc(item.imageUrl || '');
  if (!src) return markerIcon(L);
  const border = options.accent ? 'border-brand-amber' : 'border-white';
  const tip = options.accent ? 'bg-brand-amber' : 'bg-white';
  return L.divIcon({
    className: '', // ไม่ใช้กรอบสี่เหลี่ยมขาวของ leaflet-div-icon
    html: `<div class="relative w-12 h-12 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5">
      <div class="absolute left-1/2 top-10 w-3 h-3 -translate-x-1/2 rotate-45 ${tip} shadow-md"></div>
      <img src="${escapeHtml(src)}" alt="${escapeHtml(item.name)}" decoding="async"
        class="relative w-12 h-12 rounded-full object-cover object-center border-2 ${border} shadow-md bg-white" />
    </div>`,
    iconSize: [PIN_SIZE, PIN_HEIGHT],
    iconAnchor: [PIN_SIZE / 2, PIN_HEIGHT],
    popupAnchor: [0, -PIN_HEIGHT + 4],
    tooltipAnchor: [0, -PIN_HEIGHT + 4],
  });
}

/** HTML ของ popup: รูปสิ่งของ ชื่อ และสถานะ (ใช้ class ของ design token) */
export function itemPopupHtml(item: ItemPopupData, options: { link?: boolean } = {}) {
  const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.searching;
  const src = safeImageSrc(item.imageUrl || '');
  const image = src
    ? `<img src="${escapeHtml(src)}" alt="" class="w-full h-28 object-cover rounded-xl bg-surface-container" />`
    : `<div class="w-full h-28 rounded-xl bg-surface-container flex items-center justify-center text-[11px] text-outline">ไม่มีรูปภาพ</div>`;
  const kind = item.reportType ? `<span class="text-[10px] text-on-surface-variant">${item.reportType === 'found' ? 'แจ้งพบของ' : 'แจ้งของหาย'}</span>` : '';
  const link = options.link
    ? `<a href="/items/${encodeURIComponent(item.id)}" class="mt-2 block text-center text-[11px] font-semibold text-primary-container">ดูรายละเอียด</a>`
    : '';
  return `<div class="w-48 space-y-2 font-sans">
    ${image}
    <div class="space-y-1">
      <div class="text-sm font-bold text-on-surface leading-snug">${escapeHtml(item.name)}</div>
      <div class="flex items-center justify-between gap-2">
        <span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}">${status.label}</span>
        ${kind}
      </div>
    </div>
    ${link}
  </div>`;
}
