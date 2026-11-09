import { useEffect } from 'react';
import type { Level, Sex, DomainScore } from '../../shared/assessments.ts';
import type { AvatarConfig } from './components/Avatar.tsx';

export interface User {
  id: number;
  email: string;
  displayName: string;
  sex: Sex | null;
  avatar: AvatarConfig;
  notifyMood: boolean;
  consentAt: string;
  createdAt: string;
  role: 'user' | 'analyst' | 'admin';
}

export interface Result {
  id: number;
  assessmentId: string;
  answers: number[];
  sex: Sex | null;
  score: number;
  max: number;
  level: Level;
  bandLabel: string;
  crisis: boolean;
  domains: DomainScore[];
  createdAt: string;
}

export interface Stats {
  totalResults: number;
  streak: number;
  todayMood: number | null;
  latest: Result | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
  return data as T;
}

export const api = {
  me: () => request<{ user: User }>('GET', '/auth/me'),
  register: (body: { email: string; password: string; displayName: string; consent: boolean }) =>
    request<{ user: User }>('POST', '/auth/register', body),
  login: (body: { email: string; password: string }) => request<{ user: User }>('POST', '/auth/login', body),
  logout: () => request<{ ok: true }>('POST', '/auth/logout'),
  updateProfile: (body: Partial<{ displayName: string; avatar: AvatarConfig; notifyMood: boolean; sex: Sex | null }>) =>
    request<{ user: User }>('PUT', '/profile', body),
  deleteAccount: () => request<{ ok: true }>('DELETE', '/me'),
  submitResult: (body: { assessmentId: string; answers: number[]; sex?: Sex | null; attemptId?: number }) =>
    request<{ result: Result }>('POST', '/results', body),
  results: (assessmentId?: string) =>
    request<{ results: Result[] }>('GET', `/results${assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : ''}`),
  result: (id: string | number) => request<{ result: Result }>('GET', `/results/${id}`),
  setMood: (mood: number) => request<{ day: string; mood: number }>('PUT', '/moods/today', { mood }),
  stats: () => request<Stats>('GET', '/stats'),
  startAttempt: (assessmentId: string) => request<{ attemptId: number }>('POST', '/attempts', { assessmentId }),
  availability: () => request<{ disabled: string[] }>('GET', '/assessments/availability')
};

export const isStaff = (u: User | null | undefined) => u?.role === 'admin' || u?.role === 'analyst';

/** Runs `load` now, and again whenever the user comes back to this tab or window. */
export function useLiveData(load: () => void, deps: unknown[] = []) {
  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function thaiDate(iso: string, withYear = true): string {
  const d = new Date(iso);
  const base = `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear() + 543}` : base;
}

export function thaiMonth(iso: string): string {
  return THAI_MONTHS[new Date(iso).getMonth()];
}
