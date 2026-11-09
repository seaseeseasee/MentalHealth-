import { useEffect, useState } from 'react';
import type { Level } from '../../../shared/assessments.ts';
import { request } from '../api.ts';

export interface RangeQuery { from: string; to: string }
export type Granularity = 'day' | 'month' | 'year';

export interface Overview {
  range: RangeQuery;
  trackingStartedAt: string | null;
  users: { total: number; newInRange: number; activeInRange: number; assessorsInRange: number };
  visits: { inRange: number; today: number; visitorsToday: number; thisMonth: number; visitorsThisMonth: number };
  assessments: {
    started: number; completed: number; completedOfStarted: number; incomplete: number; inProgress: number;
    completionRate: number | null; enabled: number; total: number; standard: number; draft: number;
  };
}

export interface UserStats {
  range: RangeQuery; granularity: Granularity; trackingStartedAt: string | null;
  totals: { registered: number; newInRange: number; active: number; returning: number; returnRate: number | null };
  series: { period: string; visits: number; visitors: number; assessors: number; newUsers: number }[];
  hours: number[]; peakHour: number | null;
  devices: Record<'mobile' | 'tablet' | 'desktop' | 'unknown', number>;
}

export interface AssessmentRow {
  id: string; code: string; name: string; status: 'standard' | 'draft'; enabled: boolean; items: number; minutes: number;
  started: number; completed: number; completedUsers: number; completedOfStarted: number; incomplete: number; inProgress: number;
  completionRate: number | null;
}
export interface AssessmentStats {
  range: RangeQuery; granularity: Granularity; trackingStartedAt: string | null;
  rows: AssessmentRow[]; trend: { period: string; counts: Record<string, number> }[];
  mostUsed: string | null; leastUsed: string | null;
}

export interface RiskBand { label: string; level: Level; range: string; count: number | null; pct: number | null }
export interface RiskStats {
  range: RangeQuery; granularity: Granularity; minGroupSize: number; rankMin: number;
  total: number | null;
  levels: { level: Level; count: number | null; pct: number | null }[];
  perAssessment: {
    id: string; code: string; name: string; status: 'standard' | 'draft'; direction: string;
    n: number | null; bands: RiskBand[]; careCount: number | null; careRate: number | null;
  }[];
  trend: { period: string; byAssessment: Record<string, { n: number | null; careRate: number | null }> }[];
  ranking: { id: string; code: string; careRate: number; n: number }[];
  crisis: number | null;
}

export interface Activity {
  completed24h: number; started24h: number; newUsers24h: number; visits24h: number; crisis7d: number | null;
  adminEvents: { action: string; detail: string | null; admin: string | null; at: string }[];
}

const qs = (r: RangeQuery, extra: Record<string, string | undefined> = {}) => {
  const p = new URLSearchParams({ from: r.from, to: r.to });
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
};

export const adminApi = {
  overview: (r: RangeQuery) => request<Overview>('GET', `/admin/overview?${qs(r)}`),
  users: (r: RangeQuery, g?: Granularity) => request<UserStats>('GET', `/admin/users?${qs(r, { granularity: g })}`),
  assessments: (r: RangeQuery, g?: Granularity) => request<AssessmentStats>('GET', `/admin/assessments?${qs(r, { granularity: g })}`),
  risk: (r: RangeQuery, g?: Granularity, assessmentId?: string) => request<RiskStats>('GET', `/admin/risk?${qs(r, { granularity: g, assessmentId })}`),
  activity: () => request<Activity>('GET', '/admin/activity'),
  csvUrl: (type: 'usage' | 'assessments' | 'risk', r: RangeQuery) => `/api/admin/reports/${type}.csv?${qs(r)}`,
  printed: (type: string) => request<{ ok: true }>('POST', '/admin/reports/printed', { type }),
  assessmentSettings: () => request<{ assessments: { id: string; code: string; name: string; status: 'standard' | 'draft'; source: string; items: number; minutes: number; enabled: boolean }[] }>('GET', '/admin/assessment-settings'),
  setAssessmentEnabled: (id: string, enabled: boolean) => request<{ ok: true }>('PUT', `/admin/assessment-settings/${id}`, { enabled }),
  roles: () => request<{ staff: { email: string; displayName: string; role: 'admin' | 'analyst' }[] }>('GET', '/admin/roles'),
  setRole: (email: string, role: 'user' | 'analyst' | 'admin') => request<{ ok: true }>('PUT', '/admin/roles', { email, role }),
  settings: () => request<{ minGroupSize: number }>('GET', '/admin/settings'),
  setSettings: (minGroupSize: number) => request<{ ok: true }>('PUT', '/admin/settings', { minGroupSize })
};

/** Loads data whenever `key` changes; keeps the previous data visible while reloading. */
export function useAdminData<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, error, loading };
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** '2026-11-09' → '9 พ.ย.', '2026-11' → 'พ.ย. 69', '2026' → '2569' */
export function periodLabel(p: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return `${Number(p.slice(8))} ${TH_MONTHS[Number(p.slice(5, 7)) - 1]}`;
  if (/^\d{4}-\d{2}$/.test(p)) return `${TH_MONTHS[Number(p.slice(5, 7)) - 1]} ${String(Number(p.slice(0, 4)) + 543).slice(2)}`;
  return String(Number(p) + 543);
}

/** '2026-11-09' → '9 พ.ย. 2569' */
export function thaiDay(d: string): string {
  return `${Number(d.slice(8))} ${TH_MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(0, 4)) + 543}`;
}
