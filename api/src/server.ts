import express from 'express';
import cookieParser from 'cookie-parser';
import { db } from './db.ts';
import {
  SESSION_COOKIE, hashPassword, verifyPassword, createSession, destroySession, userIdForToken, tooManyAttempts
} from './auth.ts';
import { getAssessment, validateAnswers, scoreAssessment } from '../../shared/assessments.ts';

const app = express();
app.disable('x-powered-by');
app.disable('etag');
app.set('trust proxy', 1);
// Personal health data: never let the browser or a proxy serve a stale or cached copy.
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

const AVATAR_CHOICES = {
  skin: ['#FBE0C8', '#F5C9A6', '#D9A27A', '#A86E4C'],
  hair: ['short', 'bob', 'bun', 'curly'],
  hairColor: ['#2B2220', '#4A3228', '#B9774A', '#8C7AC8'],
  outfit: ['hoodie', 'sweater', 'scrubs']
} as const;
const DEFAULT_AVATAR = { skin: '#F5C9A6', hair: 'bob', hairColor: '#4A3228', outfit: 'sweater', glasses: false };

type UserRow = {
  id: number; email: string; display_name: string; sex: string | null; avatar: string;
  notify_mood: number; consent_at: string; created_at: string;
};
type ResultRow = {
  id: number; assessment_id: string; answers: string; sex: string | null; score: number; max_score: number;
  level: string; band_label: string; crisis: number; domains: string; created_at: string;
};

const toIso = (sqlDate: string) => sqlDate.replace(' ', 'T') + 'Z';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    sex: u.sex,
    avatar: JSON.parse(u.avatar),
    notifyMood: u.notify_mood === 1,
    consentAt: toIso(u.consent_at),
    createdAt: toIso(u.created_at)
  };
}

function publicResult(r: ResultRow) {
  return {
    id: r.id,
    assessmentId: r.assessment_id,
    answers: JSON.parse(r.answers),
    sex: r.sex,
    score: r.score,
    max: r.max_score,
    level: r.level,
    bandLabel: r.band_label,
    crisis: r.crisis === 1,
    domains: JSON.parse(r.domains),
    createdAt: toIso(r.created_at)
  };
}

function sanitizeAvatar(input: any) {
  const out: Record<string, unknown> = { ...DEFAULT_AVATAR };
  if (input && typeof input === 'object') {
    for (const key of Object.keys(AVATAR_CHOICES) as (keyof typeof AVATAR_CHOICES)[]) {
      if ((AVATAR_CHOICES[key] as readonly string[]).includes(input[key])) out[key] = input[key];
    }
    out.glasses = input.glasses === true;
  }
  return out;
}

function setSessionCookie(res: express.Response, userId: number) {
  const { token, maxAgeMs } = createSession(userId);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: maxAgeMs,
    path: '/'
  });
}

function requireUser(req: any, res: any, next: any) {
  const userId = userIdForToken(req.cookies?.[SESSION_COOKIE]);
  if (!userId) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  req.userId = userId;
  next();
}

const getUser = (id: number) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---- Auth ----
app.post('/api/auth/register', (req, res) => {
  if (tooManyAttempts(`reg:${req.ip}`)) return res.status(429).json({ error: 'ลองใหม่อีกครั้งในภายหลัง' });
  const { email, password, displayName, consent } = req.body ?? {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const name = typeof displayName === 'string' ? displayName.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ error: 'อีเมลไม่ถูกต้อง' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  if (!name || name.length > 40) return res.status(400).json({ error: 'กรุณาตั้งชื่อที่ใช้แสดง (ไม่เกิน 40 ตัวอักษร)' });
  if (consent !== true) return res.status(400).json({ error: 'กรุณายอมรับนโยบายความเป็นส่วนตัว' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) {
    return res.status(409).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
  }
  const info = db.prepare(
    `INSERT INTO users (email, password_hash, display_name, avatar, consent_at) VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(cleanEmail, hashPassword(password), name, JSON.stringify(DEFAULT_AVATAR));
  const userId = Number(info.lastInsertRowid);
  setSessionCookie(res, userId);
  res.status(201).json({ user: publicUser(getUser(userId)!) });
});

app.post('/api/auth/login', (req, res) => {
  if (tooManyAttempts(`login:${req.ip}`)) return res.status(429).json({ error: 'ลองใหม่อีกครั้งในภายหลัง' });
  const { email, password } = req.body ?? {};
  const row = db.prepare('SELECT * FROM users WHERE email = ?')
    .get(typeof email === 'string' ? email.trim().toLowerCase() : '') as (UserRow & { password_hash: string }) | undefined;
  if (!row || typeof password !== 'string' || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  }
  setSessionCookie(res, row.id);
  res.json({ user: publicUser(row) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) destroySession(token);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireUser, (req: any, res) => {
  const user = getUser(req.userId);
  if (!user) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  res.json({ user: publicUser(user) });
});

// ---- Profile ----
app.put('/api/profile', requireUser, (req: any, res) => {
  const { displayName, avatar, notifyMood, sex } = req.body ?? {};
  const user = getUser(req.userId)!;
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 40) : user.display_name;
  const nextAvatar = avatar !== undefined ? JSON.stringify(sanitizeAvatar(avatar)) : user.avatar;
  const nextNotify = typeof notifyMood === 'boolean' ? (notifyMood ? 1 : 0) : user.notify_mood;
  const nextSex = sex === 'male' || sex === 'female' ? sex : sex === null ? null : user.sex;
  db.prepare('UPDATE users SET display_name = ?, avatar = ?, notify_mood = ?, sex = ? WHERE id = ?')
    .run(name, nextAvatar, nextNotify, nextSex, req.userId);
  res.json({ user: publicUser(getUser(req.userId)!) });
});

app.get('/api/me/export', requireUser, (req: any, res) => {
  const user = publicUser(getUser(req.userId)!);
  const results = (db.prepare('SELECT * FROM results WHERE user_id = ? ORDER BY created_at').all(req.userId) as ResultRow[]).map(publicResult);
  const moods = db.prepare('SELECT day, mood FROM moods WHERE user_id = ? ORDER BY day').all(req.userId);
  res.setHeader('Content-Disposition', 'attachment; filename="mindease-data.json"');
  res.json({ exportedAt: new Date().toISOString(), user, results, moods });
});

app.delete('/api/me', requireUser, (req: any, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

// ---- Results ----
app.post('/api/results', requireUser, (req: any, res) => {
  const { assessmentId, answers, sex } = req.body ?? {};
  const assessment = typeof assessmentId === 'string' ? getAssessment(assessmentId) : undefined;
  if (!assessment) return res.status(404).json({ error: 'ไม่พบแบบประเมิน' });
  const error = validateAnswers(assessment, answers, sex);
  if (error) return res.status(400).json({ error });
  const usedSex = assessment.askSex ? sex : null;
  const r = scoreAssessment(assessment, answers, usedSex);
  const info = db.prepare(
    `INSERT INTO results (user_id, assessment_id, answers, sex, score, max_score, level, band_label, crisis, domains)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.userId, assessment.id, JSON.stringify(answers), usedSex, r.score, r.max, r.band.level, r.band.label,
    r.crisis ? 1 : 0, JSON.stringify(r.domains));
  if (usedSex) db.prepare('UPDATE users SET sex = ? WHERE id = ? AND sex IS NULL').run(usedSex, req.userId);
  const row = db.prepare('SELECT * FROM results WHERE id = ?').get(Number(info.lastInsertRowid)) as ResultRow;
  res.status(201).json({ result: publicResult(row) });
});

app.get('/api/results', requireUser, (req: any, res) => {
  const { assessmentId } = req.query;
  const rows = (typeof assessmentId === 'string'
    ? db.prepare('SELECT * FROM results WHERE user_id = ? AND assessment_id = ? ORDER BY created_at DESC, id DESC').all(req.userId, assessmentId)
    : db.prepare('SELECT * FROM results WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.userId)) as ResultRow[];
  res.json({ results: rows.map(publicResult) });
});

app.get('/api/results/:id', requireUser, (req: any, res) => {
  const row = db.prepare('SELECT * FROM results WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.userId) as ResultRow | undefined;
  if (!row) return res.status(404).json({ error: 'ไม่พบผลการประเมิน' });
  res.json({ result: publicResult(row) });
});

app.delete('/api/results/:id', requireUser, (req: any, res) => {
  db.prepare('DELETE FROM results WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.userId);
  res.json({ ok: true });
});

// ---- Mood & stats ----
app.put('/api/moods/today', requireUser, (req: any, res) => {
  const mood = req.body?.mood;
  if (!Number.isInteger(mood) || mood < 0 || mood > 4) return res.status(400).json({ error: 'ค่าอารมณ์ไม่ถูกต้อง' });
  db.prepare(`INSERT INTO moods (user_id, day, mood) VALUES (?, ?, ?)
              ON CONFLICT(user_id, day) DO UPDATE SET mood = excluded.mood`).run(req.userId, today(), mood);
  res.json({ day: today(), mood });
});

app.get('/api/moods', requireUser, (req: any, res) => {
  const rows = db.prepare('SELECT day, mood FROM moods WHERE user_id = ? ORDER BY day DESC LIMIT 60').all(req.userId);
  res.json({ moods: rows });
});

function streakFor(userId: number): number {
  const days = new Set((db.prepare('SELECT day FROM moods WHERE user_id = ? ORDER BY day DESC LIMIT 400').all(userId) as { day: string }[]).map((r) => r.day));
  const cursor = new Date(today() + 'T00:00:00Z');
  if (!days.has(today())) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

app.get('/api/stats', requireUser, (req: any, res) => {
  const total = (db.prepare('SELECT COUNT(*) AS n FROM results WHERE user_id = ?').get(req.userId) as { n: number }).n;
  const latest = db.prepare('SELECT * FROM results WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(req.userId) as ResultRow | undefined;
  const mood = db.prepare('SELECT mood FROM moods WHERE user_id = ? AND day = ?').get(req.userId, today()) as { mood: number } | undefined;
  res.json({
    totalResults: total,
    streak: streakFor(req.userId),
    todayMood: mood ? mood.mood : null,
    latest: latest ? publicResult(latest) : null
  });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'ไม่พบ' }));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(err?.status ?? 500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`MindEase API listening on :${port}`));
