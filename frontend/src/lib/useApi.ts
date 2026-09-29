'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DATA_CHANGED, errorMessage } from './api';

// โหลดข้อมูลจาก API พร้อมสถานะ loading/error และโหลดใหม่อัตโนมัติเมื่อมีการเปลี่ยนข้อมูล (notifyDataChanged)
// หรือเมื่อเปลี่ยนรหัสนักศึกษา/role ในเบราว์เซอร์ (event 'storage')
export function useApi<T>(fetcher: () => Promise<T>, initial: T, deps: unknown[] = []) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
    window.addEventListener(DATA_CHANGED, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(DATA_CHANGED, reload);
      window.removeEventListener('storage', reload);
    };
  }, deps);

  return { data, setData, loading, error, reload };
}
