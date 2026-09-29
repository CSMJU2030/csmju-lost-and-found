// ค่าสีของ design token (ui-design-system.md ข้อ 3) สำหรับที่ใช้ class ของ Tailwind ไม่ได้
// เช่น วาดบน <canvas> (โปสเตอร์) หรือ attribute ของ SVG — หน้าจอทั่วไปให้ใช้ class จาก @theme (src/app/globals.css)
// ค่าในไฟล์นี้ต้องตรงกับ @theme ใน src/app/globals.css เสมอ

export const color = {
  // แบรนด์
  primaryContainer: '#2154D9',
  primary: '#003CB4',
  accent: '#3B80F2',
  brandNavy: '#16264D',
  brandBlue: '#0D4FA8',
  brand50: '#E9EEFB',
  brand100: '#D3DDF7',
  brand200: '#BCCCF4',
  highlight: '#FCD34D', // หมุดตำแหน่งในโลโก้ / ป้ายหัวโปสเตอร์
  secondaryPurple: '#6D3EE8', // ปลายไล่สีหัวโปสเตอร์

  // พื้นผิว / ตัวอักษร / เส้นขอบ
  white: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceContainerLow: '#F3F4F5',
  surfaceVariant: '#E1E3E4',
  onSurface: '#191C1D',
  onSurfaceVariant: '#434654',
  outline: '#747686',
  outlineVariant: '#C4C5D7',
  black: '#000000',

  // สถานะรายการ (พื้น / ตัวอักษร)
  statusSearchingBg: '#FEF3C7',
  statusSearchingFg: '#92400E',
  statusFoundBg: '#D1FAE5',
  statusFoundFg: '#065F46',
  statusReturnedBg: '#DBEAFE',
  statusReturnedFg: '#1E40AF',

  // แผนที่ความหนาแน่นของของหาย
  heat: '#DC2626',
  heatCore: '#B91C1C',
} as const;
