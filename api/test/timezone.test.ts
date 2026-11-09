// Dates are stored in UTC but every dashboard period is a Thai (UTC+7) calendar day.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'mindease-tz-')), 'tz.db');
const { parseRange, periodsBetween, thaiToday, userStats, overview, riskStats, suppressGroup } = await import('../src/analytics.ts');
const { db } = await import('../src/db.ts');

test('Thai day boundaries', () => {
  assert.equal(thaiToday(new Date('2026-11-09T16:59:00Z')), '2026-11-09');
  assert.equal(thaiToday(new Date('2026-11-09T17:00:00Z')), '2026-11-10');
  const r = parseRange({ from: '2026-11-09', to: '2026-11-09' });
  assert.ok(typeof r !== 'string');
  assert.equal(r.fromUtc, '2026-11-08 17:00:00');
  assert.equal(r.toUtc, '2026-11-09 17:00:00');
});

test('periods have no gaps and cross year ends', () => {
  const r = parseRange({ from: '2025-11-15', to: '2026-02-03' });
  assert.ok(typeof r !== 'string');
  assert.deepEqual(periodsBetween(r, 'month'), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.equal(periodsBetween(r, 'day').length, 81);
  assert.deepEqual(periodsBetween(r, 'year'), ['2025', '2026']);
});

test('an event at 01:00 Thai time counts on that Thai day, not the UTC day before', () => {
  db.prepare(`INSERT INTO users (email, password_hash, display_name, avatar, consent_at, created_at)
              VALUES ('tz@example.com', 'x', 'tz', '{}', datetime('now'), '2026-11-08 18:00:00')`).run();
  const uid = (db.prepare(`SELECT id FROM users WHERE email = 'tz@example.com'`).get() as { id: number }).id;
  db.prepare(`INSERT INTO usage_events (user_id, type, created_at) VALUES (?, 'visit', '2026-11-08 18:00:00')`).run(uid);
  for (let i = 0; i < 5; i++) {
    db.prepare(`INSERT INTO results (user_id, assessment_id, answers, score, max_score, level, band_label, created_at)
                VALUES (?, 'st5', '[]', 0, 15, 'good', 'เครียดน้อย', '2026-11-08 18:00:00')`).run(uid);
  }
  const r = parseRange({ from: '2026-11-08', to: '2026-11-09' });
  assert.ok(typeof r !== 'string');
  const u = userStats(r, 'day');
  assert.deepEqual(u.series.map((s) => [s.period, s.visits]), [['2026-11-08', 0], ['2026-11-09', 1]]);
  assert.equal(u.hours[1], 1);
  const only8 = parseRange({ from: '2026-11-08', to: '2026-11-08' });
  assert.ok(typeof only8 !== 'string');
  assert.equal(overview(only8).assessments.completed, 0);
  assert.equal(overview(only8).users.newInRange, 0);
  const st5 = riskStats(r, 'day').perAssessment.find((x) => x.id === 'st5')!;
  assert.equal(st5.n, 5);
  assert.equal(st5.bands[0].count, 5);
  assert.equal(st5.bands[0].pct, 1);
});

test('secondary suppression stops recovering a hidden cell from the total', () => {
  assert.deepEqual(suppressGroup([20, 3, 9, 0], 5), [20, null, null, 0]);
  assert.deepEqual(suppressGroup([20, 3, 2, 9], 5), [20, null, null, 9]);
  assert.deepEqual(suppressGroup([20, 7, 9], 5), [20, 7, 9]);
  assert.deepEqual(suppressGroup([0, 0, 4], 5), [0, 0, null]);
});
