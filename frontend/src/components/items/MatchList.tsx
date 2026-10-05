'use client';

import Link from 'next/link';
import { Package, Sparkles } from 'lucide-react';
import { MatchResult } from '@/lib/matching';
import { getReportType } from '@/lib/storage';

interface MatchListProps {
  matches: MatchResult[];
  emptyText?: string;
  compact?: boolean;
}

export default function MatchList({ matches, emptyText, compact = false }: MatchListProps) {
  if (matches.length === 0) {
    return emptyText ? <p className="text-xs text-outline">{emptyText}</p> : null;
  }

  return (
    <div className="space-y-2">
      {matches.map(({ item, score, reasons }) => (
        <Link
          key={item.id}
          href={`/items/${item.id}`}
          className="flex items-center gap-3 p-2.5 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-white border border-line overflow-hidden shrink-0 flex items-center justify-center">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-5 h-5 text-outline" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-white border border-line text-on-surface-variant">
                {getReportType(item) === 'found' ? 'มีคนพบ' : 'มีคนทำหาย'}
              </span>
              <p className="text-xs font-bold text-on-surface truncate">{item.name}</p>
            </div>
            {!compact && (
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{reasons.join(' • ')}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-black text-amber-700 font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {score}%
            </p>
            <p className="text-[10px] text-amber-700/80">ความตรงกัน</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
