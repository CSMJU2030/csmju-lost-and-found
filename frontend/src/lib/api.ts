// ตัวเรียก Backend API (backend/) — ทุกหน้าเรียกข้อมูลผ่านไฟล์นี้
//
// - เรียกแบบ same-origin (/api/v1/...) — next.config.js ส่งต่อ /api /auth /uploads ไปที่ backend
//   เบราว์เซอร์จึงแนบคุกกี้ session (core_hub_access_token, HttpOnly) ให้เอง
//   หน้าเว็บไม่เคยเห็นหรือเก็บ token (มาตรฐาน SEC-03)
// - ทุกคำตอบห่อด้วย { success, data, meta? } หรือ { success: false, error: { code, message, details? } }
// - 401 = session หมดอายุ -> พาทั้งหน้าไป /auth/login (silent re-SSO ที่ Core Hub) แล้วกลับมาหน้าเดิม
import type { ApiUser, ClaimRequest, LostItem, NewClaimInput, NewItemInput } from '@/types';
import { MatchResult } from './matching';

// เมื่อข้อมูลบนเซิร์ฟเวอร์เปลี่ยน (เช่น ส่งคำขอ อนุมัติ) ให้ส่วนอื่นของหน้าโหลดใหม่ เช่นกระดิ่งแจ้งเตือน
export const DATA_CHANGED = 'lf-data-changed';
export const notifyDataChanged = () => window.dispatchEvent(new Event(DATA_CHANGED));

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details: string[] = [],
  ) {
    super(message);
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number; totalPages: number };
  error?: { code: string; message: string; details?: unknown };
}

// ---------- 401 -> silent re-SSO (auth-contract ข้อ 7) ----------
const RESSO_AT_KEY = 'lf_resso_at';
const RESSO_LOOP_MS = 30_000;

/** พาทั้งหน้าไปเข้าสู่ระบบที่ Core Hub แล้วกลับมาหน้าเดิม (top-level navigation ไม่ใช่ fetch) */
export function signIn() {
  try {
    sessionStorage.setItem(RESSO_AT_KEY, String(Date.now()));
  } catch {}
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
}

/** ออกจากระบบทั้งระบบ (ลบคุกกี้ของระบบนี้ แล้วไปหน้า /logout ของ Core Hub) */
export function signOut() {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/auth/logout';
  document.body.appendChild(form);
  form.submit();
}

function handleUnauthorized(method: string): Promise<never> {
  let recentlyRedirected = false;
  try {
    recentlyRedirected = Date.now() - Number(sessionStorage.getItem(RESSO_AT_KEY) || 0) < RESSO_LOOP_MS;
  } catch {}
  // กันวน: เพิ่งกลับจาก re-SSO ไม่ถึง 30 วินาทีแล้วยังได้ 401 -> ให้ผู้ใช้กดเข้าสู่ระบบเอง
  // ส่งฟอร์มอยู่ (ไม่ใช่ GET) -> ถามก่อน ไม่ redirect ทับข้อมูลที่กรอกไว้
  const shouldRedirect =
    !recentlyRedirected &&
    (method === 'GET' || window.confirm('เซสชันหมดอายุ ต้องเข้าสู่ระบบใหม่ (ข้อมูลที่กรอกไว้อาจหาย) ไปหน้าเข้าสู่ระบบเลยไหม?'));
  if (shouldRedirect) {
    signIn();
    // กำลังออกจากหน้าไป login — รอไว้เฉย ๆ ไม่ให้หน้าแสดงข้อความ error แวบก่อนเปลี่ยนหน้า
    return new Promise<never>(() => {});
  }
  throw new ApiError(401, 'กรุณาเข้าสู่ระบบอีกครั้ง', 'UNAUTHORIZED');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<Envelope<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า backend รันอยู่ (pnpm --filter backend start:dev)');
  }
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (res.status === 401) return handleUnauthorized(method);
  if (!res.ok || !json?.success) {
    const error = json?.error;
    const details = Array.isArray(error?.details) ? error.details.map(String) : [];
    throw new ApiError(res.status, error?.message || `เกิดข้อผิดพลาด (${res.status})`, error?.code, details);
  }
  return json;
}

const get = async <T>(path: string) => (await request<T>('GET', path)).data;
const send = async <T>(method: string, path: string, body?: unknown) => {
  const data = (await request<T>(method, path, body ?? {})).data;
  notifyDataChanged();
  return data;
};

// รายการแบบแบ่งหน้า (?page=&limit= สูงสุด 100) -> ดึงทุกหน้ามารวมกัน
async function getAll<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({
      ...Object.fromEntries(Object.entries(query).filter(([, v]) => v) as [string, string][]),
      page: String(page),
      limit: '100',
    });
    const res = await request<T[]>('GET', `${path}?${qs}`);
    all.push(...res.data);
    if (!res.meta || page >= res.meta.totalPages) return all;
  }
}

const id = (value: string) => encodeURIComponent(value);

export type { NewItemInput, NewClaimInput } from '@/types';

// ช่องว่าง = ไม่ส่ง (backend ตรวจรูปแบบเฉพาะค่าที่ส่งมา)
const withoutEmpty = <T extends object>(input: T): T =>
  Object.fromEntries(Object.entries(input).filter(([, v]) => v !== '' && v !== undefined)) as T;

export const api = {
  // ---------- ผู้ใช้ ----------
  myMember: () => get<ApiUser>('/members/me'),

  // ---------- รายการ ----------
  listItems: (query: { q?: string; status?: string; type?: string; category?: string; mine?: 'true' } = {}) =>
    getAll<LostItem>('/items', query),
  getItem: (itemId: string) => get<LostItem>(`/items/${id(itemId)}`),
  getMatches: (itemId: string) => get<MatchResult[]>(`/items/${id(itemId)}/matches`),
  createItem: async (input: NewItemInput) => {
    const item = await send<LostItem>('POST', '/items', withoutEmpty(input));
    return { item, matches: await api.getMatches(item.id) };
  },
  setItemStatus: (itemId: string, status: LostItem['status']) => send<LostItem>('PATCH', `/items/${id(itemId)}`, { status }),
  deleteItem: (itemId: string) => send<{ id: string; deleted: true }>('DELETE', `/items/${id(itemId)}`),

  // ---------- คำขอ ----------
  myClaims: () => getAll<ClaimRequest>('/claims', { scope: 'mine' }),
  allClaims: () => getAll<ClaimRequest>('/claims', { scope: 'all' }),
  createClaim: (input: NewClaimInput) => send<ClaimRequest>('POST', '/claims', withoutEmpty(input)),
  claimAction: (claimId: string, action: 'approve' | 'reject' | 'confirm') =>
    send<ClaimRequest>('POST', `/claims/${id(claimId)}/${action}`),
  verifyClaim: (claimId: string, code: string) => send<ClaimRequest>('POST', `/claims/${id(claimId)}/verify`, { code }),

  // ---------- เจ้าหน้าที่ ----------
  listUsers: () => getAll<ApiUser>('/members'),
};

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
