import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { db } from './db.ts';

export const SESSION_COOKIE = 'me_session';
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createSession(userId: number): { token: string; maxAgeMs: number } {
  const token = randomBytes(32).toString('base64url');
  db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`)
    .run(sha256(token), userId, `+${SESSION_DAYS} days`);
  return { token, maxAgeMs: SESSION_DAYS * 24 * 60 * 60 * 1000 };
}

export function destroySession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function userIdForToken(token: string | undefined): number | null {
  if (!token) return null;
  const row = db.prepare(`SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > datetime('now')`)
    .get(sha256(token)) as { user_id: number } | undefined;
  return row ? row.user_id : null;
}

// Small in-memory limiter for login/register attempts per IP.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string, limit = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
