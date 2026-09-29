import { WifiOff } from 'lucide-react';

// แถบแจ้งเมื่อโหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ
export default function ApiError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="flex items-start gap-2">
        <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{message}</span>
      </p>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-lg bg-white border border-red-200 px-3 py-1 text-xs font-semibold hover:bg-red-100 cursor-pointer">
          ลองใหม่
        </button>
      )}
    </div>
  );
}
