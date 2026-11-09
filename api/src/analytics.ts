// Aggregate-only analytics for the admin dashboard.
// Every function returns counts, never rows about a single person.
// All timestamps are stored in UTC; periods are grouped in Thai time (UTC+7).
import { db } from './db.ts';
import { ASSESSMENTS, bandsFor, type Level } from '../../shared/assessments.ts';

export const LEVELS: Level[] = ['good', 'mild', 'moderate', 'severe'];
/** Levels that the interpretation bands mark as needing care (the two worst tiers). */
export const CARE_LEVELS: Level[] = ['moderate', 'severe'];
const TZ = '+7 hours';
const ABANDON_HOURS = 24;

export type Granularity = 'day' | 'month' | 'year';

export interface Range {
  from: string; // YYYY-MM-DD, Thai local date, inclusive
  to: string; // YYYY-MM-DD, Thai local date, inclusive
  fromUtc: string; // SQLite datetime, inclusive
  toUtc: string; // SQLite datetime, exclusive
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const sqlDate = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

/** Today's date in Thailand as YYYY-MM-DD. */
export function thaiToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Start of a Thai local day, as a UTC SQLite datetime. */
function thaiDayStartUtc(date: string): string {
  return sqlDate(new Date(Date.parse(date + 'T00:00:00Z') - 7 * 3600_000));
}

/** Parses ?from=&to= (Thai dates). Defaults to the last 30 days including today. Returns an error string when invalid. */
export function parseRange(q: Record<string, unknown>): Range | string {
  const today = thaiToday();
  const from = typeof q.from === 'string' && q.from ? q.from : addDays(today, -29);
  const to = typeof q.to === 'string' && q.to ? q.to : today;
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)';
  }
  if (from > to) return 'วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด';
  if (Date.parse(to) - Date.parse(from) > 5 * 366 * 86400_000) return 'ช่วงเวลาต้องไม่เกิน 5 ปี';
  return { from, to, fromUtc: thaiDayStartUtc(from), toUtc: thaiDayStartUtc(addDays(to, 1)) };
}

export function minGroupSize(): number {
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'min_group_size'`).get() as { value: string } | undefined;
  const n = Number(row?.value);
  return Number.isInteger(n) && n >= 5 ? n : 5;
}

export function trackingStartedAt(): string | null {
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'tracking_started_at'`).get() as { value: string } | undefined;
  return row ? row.value.replace(' ', 'T') + 'Z' : null;
}

/** Small-cell suppression: counts between 1 and (min-1) become null so a tiny group cannot be singled out. */
export function suppress(n: number, min = minGroupSize()): number | null {
  return n > 0 && n < min ? null : n;
}

/**
 * Suppresses small cells in a group whose total is shown. If only one cell were hidden, it could be recovered as
 * total − (shown cells), so the smallest other non-zero cell is hidden as well (secondary suppression).
 */
export function suppressGroup(counts: number[], min = minGroupSize()): (number | null)[] {
  const out = counts.map((c) => suppress(c, min));
  if (out.filter((v) => v === null).length === 1) {
    let pick = -1;
    out.forEach((v, i) => { if (v !== null && v > 0 && (pick < 0 || v < (out[pick] as number))) pick = i; });
    if (pick >= 0) out[pick] = null;
  }
  return out;
}

function periodExpr(g: Granularity, col: string): string {
  const fmt = g === 'day' ? '%Y-%m-%d' : g === 'month' ? '%Y-%m' : '%Y';
  return `strftime('${fmt}', ${col}, '${TZ}')`;
}

/** Every period key between from and to, so charts have no gaps. */
export function periodsBetween(r: Range, g: Granularity): string[] {
  const out: string[] = [];
  if (g === 'day') {
    for (let d = r.from; d <= r.to; d = addDays(d, 1)) out.push(d);
  } else if (g === 'month') {
    let [y, m] = r.from.slice(0, 7).split('-').map(Number);
    const end = r.to.slice(0, 7);
    for (;;) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      out.push(key);
      if (key >= end) break;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  } else {
    for (let y = Number(r.from.slice(0, 4)); y <= Number(r.to.slice(0, 4)); y++) out.push(String(y));
  }
  return out;
}

const count = (sql: string, ...params: (string | number)[]) =>
  (db.prepare(sql).get(...params) as { n: number }).n;

const abandonCutoff = () => sqlDate(new Date(Date.now() - ABANDON_HOURS * 3600_000));

function enabledMap(): Record<string, boolean> {
  const rows = db.prepare('SELECT assessment_id, enabled FROM assessment_settings').all() as { assessment_id: string; enabled: number }[];
  const map: Record<string, boolean> = {};
  for (const a of ASSESSMENTS) map[a.id] = true;
  for (const r of rows) map[r.assessment_id] = r.enabled === 1;
  return map;
}

export function isAssessmentEnabled(id: string): boolean {
  return enabledMap()[id] ?? false;
}

// ---------------------------------------------------------------------------
// Overview

export function overview(r: Range) {
  const today = thaiToday();
  const todayRange = { fromUtc: thaiDayStartUtc(today), toUtc: thaiDayStartUtc(addDays(today, 1)) };
  const monthStart = today.slice(0, 8) + '01';
  const monthRange = { fromUtc: thaiDayStartUtc(monthStart), toUtc: todayRange.toUtc };
  const cutoff = abandonCutoff();
  const enabled = enabledMap();

  const started = count(`SELECT COUNT(*) AS n FROM assessment_attempts WHERE started_at >= ? AND started_at < ?`, r.fromUtc, r.toUtc);
  const completedAttempts = count(`SELECT COUNT(*) AS n FROM assessment_attempts WHERE started_at >= ? AND started_at < ? AND completed_at IS NOT NULL`, r.fromUtc, r.toUtc);
  const incomplete = count(`SELECT COUNT(*) AS n FROM assessment_attempts WHERE started_at >= ? AND started_at < ? AND completed_at IS NULL AND started_at < ?`, r.fromUtc, r.toUtc, cutoff);

  return {
    range: { from: r.from, to: r.to },
    trackingStartedAt: trackingStartedAt(),
    users: {
      total: count(`SELECT COUNT(*) AS n FROM users WHERE created_at < ?`, r.toUtc),
      newInRange: count(`SELECT COUNT(*) AS n FROM users WHERE created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc),
      activeInRange: count(`SELECT COUNT(DISTINCT user_id) AS n FROM usage_events WHERE created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc),
      assessorsInRange: count(`SELECT COUNT(DISTINCT user_id) AS n FROM results WHERE created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc)
    },
    visits: {
      inRange: count(`SELECT COUNT(*) AS n FROM usage_events WHERE created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc),
      today: count(`SELECT COUNT(*) AS n FROM usage_events WHERE created_at >= ? AND created_at < ?`, todayRange.fromUtc, todayRange.toUtc),
      visitorsToday: count(`SELECT COUNT(DISTINCT user_id) AS n FROM usage_events WHERE created_at >= ? AND created_at < ?`, todayRange.fromUtc, todayRange.toUtc),
      thisMonth: count(`SELECT COUNT(*) AS n FROM usage_events WHERE created_at >= ? AND created_at < ?`, monthRange.fromUtc, monthRange.toUtc),
      visitorsThisMonth: count(`SELECT COUNT(DISTINCT user_id) AS n FROM usage_events WHERE created_at >= ? AND created_at < ?`, monthRange.fromUtc, monthRange.toUtc)
    },
    assessments: {
      started,
      completed: count(`SELECT COUNT(*) AS n FROM results WHERE created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc),
      completedOfStarted: completedAttempts,
      incomplete,
      inProgress: started - completedAttempts - incomplete,
      completionRate: started > 0 ? completedAttempts / started : null,
      enabled: Object.values(enabled).filter(Boolean).length,
      total: ASSESSMENTS.length,
      standard: ASSESSMENTS.filter((a) => a.status === 'standard').length,
      draft: ASSESSMENTS.filter((a) => a.status === 'draft').length
    }
  };
}

// ---------------------------------------------------------------------------
// Users & usage

export function userStats(r: Range, g: Granularity) {
  const p = periodExpr(g, 'created_at');
  const keyed = (sql: string) => {
    const map = new Map<string, number>();
    for (const row of db.prepare(sql).all(r.fromUtc, r.toUtc) as { k: string; n: number }[]) map.set(row.k, row.n);
    return map;
  };
  const visits = keyed(`SELECT ${p} AS k, COUNT(*) AS n FROM usage_events WHERE created_at >= ? AND created_at < ? GROUP BY k`);
  const visitors = keyed(`SELECT ${p} AS k, COUNT(DISTINCT user_id) AS n FROM usage_events WHERE created_at >= ? AND created_at < ? GROUP BY k`);
  const assessors = keyed(`SELECT ${p} AS k, COUNT(DISTINCT user_id) AS n FROM results WHERE created_at >= ? AND created_at < ? GROUP BY k`);
  const newUsers = keyed(`SELECT ${p} AS k, COUNT(*) AS n FROM users WHERE created_at >= ? AND created_at < ? GROUP BY k`);

  const series = periodsBetween(r, g).map((k) => ({
    period: k,
    visits: visits.get(k) ?? 0,
    visitors: visitors.get(k) ?? 0,
    assessors: assessors.get(k) ?? 0,
    newUsers: newUsers.get(k) ?? 0
  }));

  const hours = Array.from({ length: 24 }, () => 0);
  for (const row of db.prepare(`SELECT CAST(strftime('%H', created_at, '${TZ}') AS INTEGER) AS h, COUNT(*) AS n
      FROM usage_events WHERE created_at >= ? AND created_at < ? GROUP BY h`).all(r.fromUtc, r.toUtc) as { h: number; n: number }[]) {
    hours[row.h] = row.n;
  }

  const devices: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
  for (const row of db.prepare(`SELECT COALESCE(device, 'unknown') AS d, COUNT(*) AS n FROM usage_events
      WHERE created_at >= ? AND created_at < ? GROUP BY d`).all(r.fromUtc, r.toUtc) as { d: string; n: number }[]) {
    devices[row.d in devices ? row.d : 'unknown'] += row.n;
  }

  // Active = at least one visit in range. Returning = visits on 2+ different Thai days in range.
  const active = count(`SELECT COUNT(DISTINCT user_id) AS n FROM usage_events WHERE created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc);
  const returning = count(`SELECT COUNT(*) AS n FROM (
      SELECT user_id FROM usage_events WHERE created_at >= ? AND created_at < ?
      GROUP BY user_id HAVING COUNT(DISTINCT strftime('%Y-%m-%d', created_at, '${TZ}')) >= 2)`, r.fromUtc, r.toUtc);
  const newInRange = count(`SELECT COUNT(*) AS n FROM users WHERE created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc);

  const peakHour = hours.some((n) => n > 0) ? hours.indexOf(Math.max(...hours)) : null;

  return {
    range: { from: r.from, to: r.to },
    granularity: g,
    trackingStartedAt: trackingStartedAt(),
    totals: {
      registered: count(`SELECT COUNT(*) AS n FROM users WHERE created_at < ?`, r.toUtc),
      newInRange,
      active,
      returning,
      returnRate: active > 0 ? returning / active : null
    },
    series,
    hours,
    peakHour,
    devices
  };
}

// ---------------------------------------------------------------------------
// Assessment usage

export function assessmentStats(r: Range, g: Granularity) {
  const enabled = enabledMap();
  const cutoff = abandonCutoff();
  const rows = ASSESSMENTS.map((a) => {
    const started = count(`SELECT COUNT(*) AS n FROM assessment_attempts WHERE assessment_id = ? AND started_at >= ? AND started_at < ?`, a.id, r.fromUtc, r.toUtc);
    const completedOfStarted = count(`SELECT COUNT(*) AS n FROM assessment_attempts WHERE assessment_id = ? AND started_at >= ? AND started_at < ? AND completed_at IS NOT NULL`, a.id, r.fromUtc, r.toUtc);
    const incomplete = count(`SELECT COUNT(*) AS n FROM assessment_attempts WHERE assessment_id = ? AND started_at >= ? AND started_at < ? AND completed_at IS NULL AND started_at < ?`, a.id, r.fromUtc, r.toUtc, cutoff);
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      status: a.status,
      enabled: enabled[a.id],
      items: a.items.length,
      minutes: a.minutes,
      started,
      completed: count(`SELECT COUNT(*) AS n FROM results WHERE assessment_id = ? AND created_at >= ? AND created_at < ?`, a.id, r.fromUtc, r.toUtc),
      completedUsers: count(`SELECT COUNT(DISTINCT user_id) AS n FROM results WHERE assessment_id = ? AND created_at >= ? AND created_at < ?`, a.id, r.fromUtc, r.toUtc),
      completedOfStarted,
      incomplete,
      inProgress: started - completedOfStarted - incomplete,
      completionRate: started > 0 ? completedOfStarted / started : null
    };
  });

  const p = periodExpr(g, 'created_at');
  const trendMap = new Map<string, Record<string, number>>();
  for (const row of db.prepare(`SELECT ${p} AS k, assessment_id AS id, COUNT(*) AS n FROM results
      WHERE created_at >= ? AND created_at < ? GROUP BY k, id`).all(r.fromUtc, r.toUtc) as { k: string; id: string; n: number }[]) {
    const m = trendMap.get(row.k) ?? {};
    m[row.id] = row.n;
    trendMap.set(row.k, m);
  }
  const trend = periodsBetween(r, g).map((k) => ({ period: k, counts: trendMap.get(k) ?? {} }));

  const used = rows.filter((x) => x.enabled);
  const byCompleted = [...used].sort((a, b) => b.completed - a.completed);
  return {
    range: { from: r.from, to: r.to },
    granularity: g,
    trackingStartedAt: trackingStartedAt(),
    rows,
    trend,
    mostUsed: byCompleted[0]?.completed ? byCompleted[0].id : null,
    leastUsed: byCompleted.length ? byCompleted[byCompleted.length - 1].id : null
  };
}

// ---------------------------------------------------------------------------
// Risk (screening level) distribution — completed results only

interface BandSummary { label: string; level: Level; range: string; count: number | null; pct: number | null }

function bandRanges(id: string): { label: string; level: Level; range: string }[] {
  const a = ASSESSMENTS.find((x) => x.id === id)!;
  const male = bandsFor(a, 'male');
  if (!a.bandsBySex) return male.map((b) => ({ label: b.label, level: b.level, range: `${b.min}–${b.max}` }));
  const female = bandsFor(a, 'female');
  return male.map((b, i) => ({ label: b.label, level: b.level, range: `ชาย ${b.min}–${b.max} / หญิง ${female[i].min}–${female[i].max}` }));
}

export function riskStats(r: Range, g: Granularity, assessmentId?: string) {
  const min = minGroupSize();
  const ids = assessmentId ? [assessmentId] : ASSESSMENTS.map((a) => a.id);
  const placeholders = ids.map(() => '?').join(',');

  const perAssessment = ids.map((id) => {
    const a = ASSESSMENTS.find((x) => x.id === id)!;
    const counts = new Map<string, number>();
    for (const row of db.prepare(`SELECT band_label AS label, COUNT(*) AS n FROM results
        WHERE assessment_id = ? AND created_at >= ? AND created_at < ? GROUP BY band_label`).all(id, r.fromUtc, r.toUtc) as { label: string; n: number }[]) {
      counts.set(row.label, row.n);
    }
    const n = [...counts.values()].reduce((s, v) => s + v, 0);
    const hidden = n > 0 && n < min;
    const ranges = bandRanges(id);
    const raw = ranges.map((b) => counts.get(b.label) ?? 0);
    const shown = hidden ? raw.map(() => null) : suppressGroup(raw, min);
    const bands: BandSummary[] = ranges.map((b, i) => ({ ...b, count: shown[i], pct: shown[i] === null || n === 0 ? null : raw[i] / n }));
    const care = ranges.reduce((s, b, i) => s + (CARE_LEVELS.includes(b.level) ? raw[i] : 0), 0);
    // The care share would let a hidden band be recomputed, so it is withheld whenever any band is hidden.
    const anyHidden = shown.some((v) => v === null);
    return {
      id, code: a.code, name: a.name, status: a.status, direction: a.direction,
      n: hidden ? null : n,
      bands,
      careCount: anyHidden ? null : care,
      careRate: anyHidden || n === 0 ? null : care / n
    };
  });

  const levelCounts: Record<Level, number> = { good: 0, mild: 0, moderate: 0, severe: 0 };
  for (const row of db.prepare(`SELECT level, COUNT(*) AS n FROM results WHERE assessment_id IN (${placeholders})
      AND created_at >= ? AND created_at < ? GROUP BY level`).all(...ids, r.fromUtc, r.toUtc) as { level: Level; n: number }[]) {
    levelCounts[row.level] = row.n;
  }
  const total = LEVELS.reduce((s, l) => s + levelCounts[l], 0);
  const levelShown = total > 0 && total < min ? LEVELS.map(() => null) : suppressGroup(LEVELS.map((l) => levelCounts[l]), min);
  const levels = LEVELS.map((l, i) => {
    const c = levelShown[i];
    return { level: l, count: c, pct: c === null || total === 0 ? null : levelCounts[l] / total };
  });

  // Trend: share of results in the care levels, per period and per assessment.
  const p = periodExpr(g, 'created_at');
  const trendRows = db.prepare(`SELECT ${p} AS k, assessment_id AS id, COUNT(*) AS n,
      SUM(CASE WHEN level IN ('moderate','severe') THEN 1 ELSE 0 END) AS care
      FROM results WHERE assessment_id IN (${placeholders}) AND created_at >= ? AND created_at < ?
      GROUP BY k, id`).all(...ids, r.fromUtc, r.toUtc) as { k: string; id: string; n: number; care: number }[];
  const trendMap = new Map<string, Record<string, { n: number | null; careRate: number | null }>>();
  for (const row of trendRows) {
    const m = trendMap.get(row.k) ?? {};
    // Hide the period if it has too few results, or if the care group itself is a small cell.
    const ok = row.n >= min && suppress(row.care, min) !== null;
    m[row.id] = { n: row.n >= min ? row.n : null, careRate: ok ? row.care / row.n : null };
    trendMap.set(row.k, m);
  }
  const trend = periodsBetween(r, g).map((k) => ({ period: k, byAssessment: trendMap.get(k) ?? {} }));

  // Ranking needs enough results to be meaningful.
  const RANK_MIN = 30;
  const ranking = perAssessment
    .filter((x) => x.n !== null && x.n >= RANK_MIN && x.careRate !== null)
    .sort((a, b) => (b.careRate ?? 0) - (a.careRate ?? 0))
    .map((x) => ({ id: x.id, code: x.code, careRate: x.careRate, n: x.n }));

  const crisis = count(`SELECT COUNT(*) AS n FROM results WHERE crisis = 1 AND created_at >= ? AND created_at < ?`, r.fromUtc, r.toUtc);

  return {
    range: { from: r.from, to: r.to },
    granularity: g,
    minGroupSize: min,
    rankMin: RANK_MIN,
    total: suppress(total, min),
    levels,
    perAssessment,
    trend,
    ranking,
    crisis: suppress(crisis, min)
  };
}

// ---------------------------------------------------------------------------
// Recent activity (aggregate)

export function activity() {
  const min = minGroupSize();
  const since = (h: number) => sqlDate(new Date(Date.now() - h * 3600_000));
  const events = db.prepare(`SELECT a.action, a.detail, a.created_at, u.display_name AS admin
      FROM admin_audit a LEFT JOIN users u ON u.id = a.admin_id ORDER BY a.created_at DESC, a.id DESC LIMIT 10`).all() as
    { action: string; detail: string | null; created_at: string; admin: string | null }[];
  return {
    completed24h: count(`SELECT COUNT(*) AS n FROM results WHERE created_at >= ?`, since(24)),
    started24h: count(`SELECT COUNT(*) AS n FROM assessment_attempts WHERE started_at >= ?`, since(24)),
    newUsers24h: count(`SELECT COUNT(*) AS n FROM users WHERE created_at >= ?`, since(24)),
    visits24h: count(`SELECT COUNT(*) AS n FROM usage_events WHERE created_at >= ?`, since(24)),
    crisis7d: suppress(count(`SELECT COUNT(*) AS n FROM results WHERE crisis = 1 AND created_at >= ?`, since(24 * 7)), min),
    adminEvents: events.map((e) => ({ action: e.action, detail: e.detail, admin: e.admin, at: e.created_at.replace(' ', 'T') + 'Z' }))
  };
}

// ---------------------------------------------------------------------------
// Event recording

export function deviceClass(userAgent: string | undefined): 'mobile' | 'tablet' | 'desktop' | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return 'mobile';
  return 'desktop';
}

/** Records a visit at most once per 30 minutes per user, so page focus/refresh does not inflate counts. */
export function recordVisit(userId: number, userAgent: string | undefined, type: 'login' | 'visit') {
  if (type === 'visit') {
    const recent = db.prepare(`SELECT 1 FROM usage_events WHERE user_id = ? AND created_at >= datetime('now', '-30 minutes') LIMIT 1`).get(userId);
    if (recent) return;
  }
  db.prepare(`INSERT INTO usage_events (user_id, type, device) VALUES (?, ?, ?)`).run(userId, type, deviceClass(userAgent));
}

export function audit(adminId: number, action: string, detail?: string) {
  db.prepare(`INSERT INTO admin_audit (admin_id, action, detail) VALUES (?, ?, ?)`).run(adminId, action, detail ?? null);
}
