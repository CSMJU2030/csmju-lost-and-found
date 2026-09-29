'use client';

import React from 'react';

export type BadgeVariant = 'searching' | 'found' | 'returned' | 'pending';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulseDot?: boolean;
  children?: React.ReactNode;
}

const defaultVariantLabels: Record<BadgeVariant, string> = {
  searching: 'กำลังค้นหา',
  found: 'พบสิ่งของแล้ว',
  returned: 'ส่งคืนเจ้าของแล้ว',
  pending: 'รอดำเนินการ',
};

const variantStyles: Record<
  BadgeVariant,
  {
    container: string;
    dot: string;
    pulse: string;
  }
> = {
  searching: {
    container: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500',
    pulse: 'bg-amber-400',
  },
  found: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
    pulse: 'bg-emerald-400',
  },
  returned: {
    container: 'bg-brand-50 text-brand-700 border-brand-100',
    dot: 'bg-brand-600',
    pulse: 'bg-brand-500',
  },
  pending: {
    container: 'bg-surface-container text-on-surface-variant border-line',
    dot: 'bg-gray-400',
    pulse: 'bg-outline-variant',
  },
};

const sizeStyles: Record<
  BadgeSize,
  {
    container: string;
    dot: string;
  }
> = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1.5',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    container: 'px-2.5 py-1 text-xs font-medium gap-1.5',
    dot: 'w-2 h-2',
  },
  lg: {
    container: 'px-3 py-1.5 text-sm font-medium gap-2',
    dot: 'w-2 h-2',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'pending',
  size = 'md',
  dot = true,
  pulseDot = false,
  children,
  className = '',
  ...props
}) => {
  const currentVariant = variantStyles[variant] || variantStyles.pending;
  const currentSize = sizeStyles[size] || sizeStyles.md;
  const label = children !== undefined ? children : defaultVariantLabels[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium select-none ${
        currentVariant.container
      } ${currentSize.container} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex items-center justify-center">
          {pulseDot && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${currentVariant.pulse}`}
            />
          )}
          <span className={`rounded-full shrink-0 ${currentSize.dot} ${currentVariant.dot}`} />
        </span>
      )}
      <span>{label}</span>
    </span>
  );
};

Badge.displayName = 'Badge';

export default Badge;
