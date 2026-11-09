// Admin / analyst API. Every route requires a signed-in staff account;
// routes that change anything require the 'admin' role.
import express from 'express';
import { db } from './db.ts';
import { SESSION_COOKIE, userIdForToken } from './auth.ts';
import {
  activity, assessmentStats, audit, minGroupSize, overview, parseRange, riskStats, userStats, type Granularity, type Range
} from './analytics.ts';
import { ASSESSMENTS } from '../../shared/assessments.ts';

export type Role = 'user' | 'analyst' | 'admin';
export const ROLES: Role[] = ['user', 'analyst', 'admin'];

export function roleOf(userId: number): Role {
  const row = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: Role } | undefined;
  return row?.role ?? 'user';
}

function requireStaff(req: any, res: any, next: any) {
  const userId = userIdForToken(req.cookies?.[SESSION_COOKIE]);
  if (!userId) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  const role = roleOf(userId);
  if (role !== 'admin' && role !== 'analyst') return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
  req.userId = userId;
  req.role = role;
  next();
}

function requireAdminRole(req: any, res: any, next: any) {
  if (req.role !== 'admin') return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ' });
  next();
}

function granularity(q: any, fallback: Granularity): Granularity {
  return q.granularity === 'day' || q.granularity === 'month' || q.granularity === 'year' ? q.granularity : fallback;
}

/** Picks a sensible default: daily for ranges up to ~3 months, monthly up to ~3 years, yearly beyond. */
function autoGranularity(r: Range): Granularity {
  const days = (Date.parse(r.to) - Date.parse(r.from)) / 86400_000 + 1;
  return days <= 93 ? 'day' : days <= 1100 ? 'month' : 'year';
}

function withRange(handler: (r: Range, req: any, res: any) => void) {
  return (req: any, res: any) => {
    const r = parseRange(req.query);
    if (typeof r === 'string') return res.status(400).json({ error: r });
    handler(r, req, res);
  };
}

// ---- CSV ----
const LEVEL_TH: Record<string, string> = { good: 'ปกติ/ดี', mild: 'ควรเฝ้าระวัง', moderate: 'ควรดูแล', severe: 'เสี่ยงสูง' };

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '<' + minGroupSize();
  const s = String(v);
  // Guard against spreadsheet formula injection.
  const safe = s.length > 1 && /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const pct = (x: number | null) => (x === null ? '-' : (x * 100).toFixed(1) + '%');

function csv(title: string, r: Range, header: string[], rows: unknown[][]): string {
  const now = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');
  const lines = [
    [title],
    ['วันที่จัดทำ', `${now} (เวลาประเทศไทย)`],
    ['ช่วงเวลาที่วิเคราะห์', `${r.from} ถึง ${r.to}`],
    ['หมายเหตุ', `ข้อมูลรวม ไม่ระบุตัวบุคคล · กลุ่มที่มีน้อยกว่า ${minGroupSize()} แสดงเป็น <${minGroupSize()} · ผลประเมินเป็นการคัดกรอง ไม่ใช่การวินิจฉัย`],
    [],
    header,
    ...rows
  ];
  return '﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export const adminRouter = express.Router();
adminRouter.use(requireStaff);

adminRouter.get('/me', (req: any, res) => res.json({ role: req.role }));

adminRouter.get('/overview', withRange((r, _req, res) => res.json(overview(r))));

adminRouter.get('/users', withRange((r, req, res) => res.json(userStats(r, granularity(req.query, autoGranularity(r))))));

adminRouter.get('/assessments', withRange((r, req, res) => res.json(assessmentStats(r, granularity(req.query, autoGranularity(r))))));

adminRouter.get('/risk', withRange((r, req, res) => {
  const id = typeof req.query.assessmentId === 'string' && req.query.assessmentId ? req.query.assessmentId : undefined;
  if (id && !ASSESSMENTS.some((a) => a.id === id)) return res.status(404).json({ error: 'ไม่พบแบบประเมิน' });
  res.json(riskStats(r, granularity(req.query, autoGranularity(r) === 'day' ? 'month' : autoGranularity(r)), id));
}));

adminRouter.get('/activity', (_req, res) => res.json(activity()));

adminRouter.get('/reports/:type', withRange((r, req, res) => {
  const type = String(req.params.type).replace(/\.csv$/, '');
  let body: string;
  if (type === 'usage') {
    const g = granularity(req.query, autoGranularity(r));
    const u = userStats(r, g);
    body = csv('รายงานการใช้งานระบบ', r, ['ช่วงเวลา', 'จำนวนการเข้าใช้', 'ผู้เข้าใช้ (ไม่ซ้ำ)', 'ผู้ทำแบบประเมิน (ไม่ซ้ำ)', 'สมาชิกใหม่'],
      u.series.map((s) => [s.period, s.visits, s.visitors, s.assessors, s.newUsers]));
  } else if (type === 'assessments') {
    const a = assessmentStats(r, 'month');
    body = csv('รายงานสถิติแบบประเมิน', r, ['รหัส', 'ชื่อแบบประเมิน', 'สถานะ', 'เริ่มทำ', 'สำเร็จ', 'ผู้ทำสำเร็จ (ไม่ซ้ำ)', 'ไม่สำเร็จ (เกิน 24 ชม.)', 'กำลังทำ', 'อัตราสำเร็จ'],
      a.rows.map((x) => [x.code, x.name, x.status === 'standard' ? 'มาตรฐาน' : 'ฉบับทดลอง', x.started, x.completed, x.completedUsers, x.incomplete, x.inProgress, pct(x.completionRate)]));
  } else if (type === 'risk') {
    const k = riskStats(r, 'month');
    const rows: unknown[][] = [];
    for (const a of k.perAssessment) {
      for (const b of a.bands) rows.push([a.code, a.status === 'standard' ? 'มาตรฐาน' : 'ฉบับทดลอง', b.label, b.range, LEVEL_TH[b.level], b.count, b.count === null ? null : pct(b.pct), a.n]);
    }
    body = csv('รายงานภาพรวมระดับผลการประเมิน (คัดกรอง)', r, ['แบบประเมิน', 'สถานะ', 'ระดับผล', 'ช่วงคะแนน', 'กลุ่มสี', 'จำนวน', 'ร้อยละ', 'จำนวนผลทั้งหมด'], rows);
  } else {
    return res.status(404).json({ error: 'ไม่พบรายงาน' });
  }
  audit(req.userId, 'export_csv', `${type} ${r.from}..${r.to}`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mindease-${type}-${r.from}-${r.to}.csv"`);
  res.send(body);
}));

/** The client calls this when an admin prints a report, so printing is audited like CSV export. */
adminRouter.post('/reports/printed', (req: any, res) => {
  const type = typeof req.body?.type === 'string' ? req.body.type.slice(0, 40) : 'unknown';
  audit(req.userId, 'print_report', type);
  res.json({ ok: true });
});

// ---- Assessment availability ----
adminRouter.get('/assessment-settings', (_req, res) => {
  const rows = db.prepare('SELECT assessment_id, enabled FROM assessment_settings').all() as { assessment_id: string; enabled: number }[];
  const map = new Map(rows.map((r) => [r.assessment_id, r.enabled === 1]));
  res.json({
    assessments: ASSESSMENTS.map((a) => ({
      id: a.id, code: a.code, name: a.name, status: a.status, source: a.source, items: a.items.length, minutes: a.minutes,
      enabled: map.get(a.id) ?? true
    }))
  });
});

adminRouter.put('/assessment-settings/:id', requireAdminRole, (req: any, res) => {
  const a = ASSESSMENTS.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'ไม่พบแบบประเมิน' });
  if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
  db.prepare(`INSERT INTO assessment_settings (assessment_id, enabled) VALUES (?, ?)
              ON CONFLICT(assessment_id) DO UPDATE SET enabled = excluded.enabled`).run(a.id, req.body.enabled ? 1 : 0);
  audit(req.userId, req.body.enabled ? 'enable_assessment' : 'disable_assessment', a.code);
  res.json({ ok: true });
});

// ---- Staff roles (only lists staff accounts; never lists ordinary users) ----
adminRouter.get('/roles', requireAdminRole, (_req, res) => {
  const staff = db.prepare(`SELECT email, display_name, role FROM users WHERE role IN ('admin','analyst') ORDER BY role, email`).all() as
    { email: string; display_name: string; role: Role }[];
  res.json({ staff: staff.map((s) => ({ email: s.email, displayName: s.display_name, role: s.role })) });
});

adminRouter.put('/roles', requireAdminRole, (req: any, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = req.body?.role as Role;
  if (!email || !ROLES.includes(role)) return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
  const target = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email) as { id: number; role: Role } | undefined;
  if (!target) return res.status(404).json({ error: 'ไม่พบบัญชีนี้ (ผู้ใช้ต้องสมัครสมาชิกก่อน)' });
  if (target.id === req.userId && role !== 'admin') return res.status(400).json({ error: 'ไม่สามารถลดสิทธิ์ของตัวเองได้' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, target.id);
  audit(req.userId, 'set_role', `${email} → ${role}`);
  res.json({ ok: true });
});

// ---- System settings ----
adminRouter.get('/settings', (_req, res) => {
  res.json({ minGroupSize: minGroupSize() });
});

adminRouter.put('/settings', requireAdminRole, (req: any, res) => {
  const n = req.body?.minGroupSize;
  if (!Number.isInteger(n) || n < 5 || n > 50) return res.status(400).json({ error: 'ค่าต้องเป็นจำนวนเต็ม 5–50' });
  db.prepare(`INSERT INTO app_settings (key, value) VALUES ('min_group_size', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(String(n));
  audit(req.userId, 'set_min_group_size', String(n));
  res.json({ ok: true, minGroupSize: n });
});

/** Promotes the e-mails listed in ADMIN_EMAILS (comma separated) to admin. Never demotes anyone. */
export function bootstrapAdmins() {
  const emails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return;
  const stmt = db.prepare(`UPDATE users SET role = 'admin' WHERE email = ? AND role != 'admin'`);
  for (const e of emails) stmt.run(e);
}
