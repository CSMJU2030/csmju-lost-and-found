import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

// หัวหน้าเพจแบบเดียวกันทุกหน้า: breadcrumb, ชื่อหน้า, คำอธิบาย และปุ่มด้านขวา
export default function PageHeader({ title, description, eyebrow, icon, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2 min-w-0">
        <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Link href="/" className="hover:text-brand-600 transition-colors">หน้าแรก</Link>
          <ChevronRight className="w-3.5 h-3.5 text-outline" />
          <span className="text-on-surface-variant font-medium">{eyebrow || title}</span>
        </nav>
        <div className="flex items-center gap-3">
          {icon && (
            <span className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 ring-1 ring-brand-100">
              {icon}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink">{title}</h1>
        </div>
        {description && <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="shrink-0 flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
