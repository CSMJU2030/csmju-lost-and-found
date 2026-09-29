'use client';

import { AlertTriangle } from 'lucide-react';
import { MissingField, focusFirstInvalid } from '@/lib/validation';

interface FormAlertProps {
  title: string;
  fields: MissingField[];
}

// กล่องเตือนเมื่อกดบันทึกแต่ข้อมูลยังไม่ครบ: บอกว่าขาดช่องไหน และกดชื่อช่องเพื่อไปแก้ได้
export default function FormAlert({ title, fields }: FormAlertProps) {
  if (fields.length === 0) return null;
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-fade-in">
      <p className="font-semibold flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {title}
      </p>
      <ul className="mt-2 space-y-1 pl-6 list-disc text-xs">
        {fields.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => focusFirstInvalid([f])}
              className="font-semibold underline underline-offset-2 hover:text-red-900 cursor-pointer"
            >
              {f.label}
            </button>
            {' '}— {f.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
