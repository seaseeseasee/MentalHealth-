// End-to-end checks for the analytics API against a throwaway database:
// counts match what was created, staff-only access, small-cell suppression, attempt de-duplication.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'mindease-test-'));
const port = 38000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}/api`;
let server: ChildProcess;

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148';

class Client {
  cookie = '';
  ua: string;
  constructor(ua = 'Mozilla/5.0 (X11; Linux x86_64)') { this.ua = ua; }
  async call(method: string, path: string, body?: unknown) {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', cookie: this.cookie, 'user-agent': this.ua },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const text = await res.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch { /* csv */ }
    return { status: res.status, data, headers: res.headers };
  }
  register(email: string) {
    return this.call('POST', '/auth/register', { email, password: 'password123', displayName: email.split('@')[0], consent: true });
  }
}

before(async () => {
  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', fileURLToPath(new URL('../src/server.ts', import.meta.url))], {
    env: { ...process.env, PORT: String(port), DB_PATH: join(dir, 'test.db'), ADMIN_EMAILS: 'boss@example.com' },
    stdio: 'pipe'
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/health')).ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
});

after(() => {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
});

const PHQ_SEVERE = [3, 3, 3, 3, 3, 3, 3, 3, 0]; // 24 → ระดับรุนแรง, no crisis item
const PHQ_GOOD = [0, 0, 0, 0, 0, 0, 0, 0, 0];

test('analytics end to end', async () => {
  const admin = new Client();
  assert.equal((await admin.register('boss@example.com')).data.user.role, 'admin');

  // A normal user cannot reach any admin route.
  const user = new Client(MOBILE_UA);
  const reg = await user.register('u1@example.com');
  assert.equal(reg.data.user.role, 'user');
  for (const path of ['/admin/overview', '/admin/risk', '/admin/users', '/admin/reports/risk', '/admin/roles']) {
    assert.equal((await user.call('GET', path)).status, 403, path);
  }
  assert.equal((await new Client().call('GET', '/admin/overview')).status, 401);
  // Role cannot be self-assigned through the profile endpoint.
  await user.call('PUT', '/profile', { role: 'admin', displayName: 'x' });
  assert.equal((await user.call('GET', '/auth/me')).data.user.role, 'user');

  // Attempts: opening the same questionnaire twice in a day is one attempt.
  const a1 = await user.call('POST', '/attempts', { assessmentId: 'phq9' });
  const a2 = await user.call('POST', '/attempts', { assessmentId: 'phq9' });
  assert.equal(a1.data.attemptId, a2.data.attemptId);
  await user.call('POST', '/results', { assessmentId: 'phq9', answers: PHQ_SEVERE, attemptId: a1.data.attemptId });
  // An unfinished attempt on another assessment.
  await user.call('POST', '/attempts', { assessmentId: 'st5' });

  // 6 more users each complete PHQ-9 (good) without an attemptId (older client path).
  for (let i = 2; i <= 7; i++) {
    const c = new Client();
    await c.register(`u${i}@example.com`);
    await c.call('POST', '/results', { assessmentId: 'phq9', answers: PHQ_GOOD });
  }

  const o = (await admin.call('GET', '/admin/overview')).data;
  assert.equal(o.users.total, 8);
  assert.equal(o.users.newInRange, 8);
  assert.equal(o.users.assessorsInRange, 7);
  assert.equal(o.assessments.completed, 7);
  assert.equal(o.assessments.started, 8); // 1 phq9 (closed) + 1 st5 (open) + 6 implicit
  assert.equal(o.assessments.completedOfStarted, 7);
  assert.equal(o.assessments.inProgress, 1);
  assert.equal(o.assessments.incomplete, 0);
  assert.equal(o.assessments.enabled, 9);
  assert.ok(o.visits.today >= 8);

  // Risk: PHQ-9 n=7 → visible. The single severe result is a small cell (<5). Because n is shown, the 6 good
  // results must be hidden too, otherwise 7 − 6 = 1 would reveal it (secondary suppression).
  const risk = (await admin.call('GET', '/admin/risk')).data;
  const phq = risk.perAssessment.find((x: any) => x.id === 'phq9');
  assert.equal(phq.n, 7);
  const good = phq.bands.find((b: any) => b.label === 'ไม่มีหรือมีน้อยมาก');
  const severe = phq.bands.find((b: any) => b.label === 'ระดับรุนแรง');
  assert.equal(severe.count, null);
  assert.equal(good.count, null);
  assert.equal(phq.careRate, null);
  assert.equal(risk.levels.find((l: any) => l.level === 'severe').count, null);
  assert.equal(risk.levels.find((l: any) => l.level === 'good').count, null);
  // ST-5 has no completed results, so it is zero rather than hidden.
  assert.equal(risk.perAssessment.find((x: any) => x.id === 'st5').n, 0);
  // Admin responses never carry per-person fields.
  const raw = JSON.stringify(risk) + JSON.stringify(o);
  for (const leak of ['@example.com', 'answers', 'password']) assert.ok(!raw.includes(leak), leak);

  // Users: device classification and active counts.
  const u = (await admin.call('GET', '/admin/users')).data;
  assert.equal(u.totals.active, 8);
  assert.ok(u.devices.mobile >= 1);
  assert.equal(u.series.length, 30);

  // Assessment stats line up with the overview.
  const s = (await admin.call('GET', '/admin/assessments')).data;
  const phqRow = s.rows.find((x: any) => x.id === 'phq9');
  assert.equal(phqRow.completed, 7);
  assert.equal(phqRow.completedUsers, 7);
  assert.equal(phqRow.completionRate, 1);
  assert.equal(s.mostUsed, 'phq9');

  // CSV export is audited and starts with a BOM so Excel reads Thai.
  const csvRes = await fetch(base + '/admin/reports/risk', { headers: { cookie: admin.cookie } });
  assert.equal(csvRes.status, 200);
  const bytes = new Uint8Array(await csvRes.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
  const csvText = new TextDecoder().decode(bytes);
  assert.ok(csvText.includes('<5'));
  assert.ok(csvText.includes('ระดับรุนแรง'));
  const act = (await admin.call('GET', '/admin/activity')).data;
  assert.equal(act.adminEvents[0].action, 'export_csv');

  // Disabling an assessment blocks new attempts and submissions.
  assert.equal((await admin.call('PUT', '/admin/assessment-settings/st5', { enabled: false })).status, 200);
  assert.deepEqual((await user.call('GET', '/assessments/availability')).data.disabled, ['st5']);
  assert.equal((await user.call('POST', '/attempts', { assessmentId: 'st5' })).status, 403);
  assert.equal((await user.call('POST', '/results', { assessmentId: 'st5', answers: [0, 0, 0, 0, 0] })).status, 403);

  // Analyst can read but not change anything; admin cannot demote themselves.
  assert.equal((await admin.call('PUT', '/admin/roles', { email: 'u2@example.com', role: 'analyst' })).status, 200);
  const analyst = new Client();
  await analyst.call('POST', '/auth/login', { email: 'u2@example.com', password: 'password123' });
  assert.equal((await analyst.call('GET', '/admin/overview')).status, 200);
  assert.equal((await analyst.call('PUT', '/admin/assessment-settings/st5', { enabled: true })).status, 403);
  assert.equal((await analyst.call('GET', '/admin/roles')).status, 403);
  assert.equal((await admin.call('PUT', '/admin/roles', { email: 'boss@example.com', role: 'user' })).status, 400);

  // Bad date input is rejected.
  assert.equal((await admin.call('GET', '/admin/overview?from=2026-13-01')).status, 400);
  assert.equal((await admin.call('GET', '/admin/overview?from=2026-02-01&to=2026-01-01')).status, 400);
});
