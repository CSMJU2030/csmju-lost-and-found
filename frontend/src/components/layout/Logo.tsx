import { color } from '@/csmju/tokens';

interface LogoProps {
  showText?: boolean;
  size?: number;
  className?: string;
}

// โลโก้: แว่นขยาย (ค้นหา) ที่มีหมุดตำแหน่งอยู่ในเลนส์ บนพื้นไล่สีแบรนด์
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor={color.brandNavy} />
          <stop offset="1" stopColor={color.brandBlue} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#logo-bg)" />
      <circle cx="18" cy="18" r="8.5" stroke="white" strokeWidth="2.6" />
      <path d="M24.3 24.3 30 30" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
      <path
        d="M18 13.2c-2 0-3.5 1.5-3.5 3.4 0 2.5 3.5 5.6 3.5 5.6s3.5-3.1 3.5-5.6c0-1.9-1.5-3.4-3.5-3.4Z"
        fill={color.highlight}
      />
      <circle cx="18" cy="16.6" r="1.2" fill={color.brandNavy} />
    </svg>
  );
}

export default function Logo({ showText = true, size = 40, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-display font-semibold text-[17px] text-ink tracking-tight">
            Missing<span className="text-brand-600">Items</span>
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1">ระบบแจ้งของหาย ม.แม่โจ้</span>
        </span>
      )}
    </span>
  );
}
