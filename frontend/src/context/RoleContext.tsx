'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiUser } from '@/types';
import { api, ApiError } from '@/lib/api';

// สิทธิ์มาจาก Core Hub เท่านั้น (core role ใน token -> role ของระบบนี้ที่ backend แมปให้)
// admin = เจ้าหน้าที่ (core role staff/admin) · user = ผู้ใช้ทั่วไป (student/alumni)
// หน้าเว็บสลับสิทธิ์เองไม่ได้ และไม่เก็บสิทธิ์ไว้ในเบราว์เซอร์
export type UserRole = 'user' | 'admin';

interface RoleContextType {
  currentRole: UserRole;
  isAdmin: boolean;
  /** แถวใน members ของผู้ใช้ปัจจุบัน — id ใช้เทียบกับ reporterId / claimantId */
  member: ApiUser | null;
  memberId: string;
  email: string;
  loading: boolean;
}

const EMPTY: RoleContextType = { currentRole: 'user', isAdmin: false, member: null, memberId: '', email: '', loading: true };

const RoleContext = createContext<RoleContextType>(EMPTY);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<RoleContextType>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    api
      .myMember()
      .then((member) => {
        if (cancelled) return;
        setSession({
          currentRole: member.role,
          isAdmin: member.role === 'admin',
          member,
          memberId: member.id,
          email: member.email,
          loading: false,
        });
      })
      .catch((err) => {
        // 401 -> api.ts พาไปเข้าสู่ระบบแล้ว · อย่างอื่นให้หน้าแสดงเป็นผู้ใช้ทั่วไปไปก่อน
        if (!cancelled && !(err instanceof ApiError && err.status === 401)) setSession({ ...EMPTY, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <RoleContext.Provider value={session}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
