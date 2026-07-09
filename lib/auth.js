import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from './db';

const COOKIE = 'nc_session';
const DAYS = 30;

export function createUser(email, password, niche = '') {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, niche) VALUES (?, ?, ?)')
    .run(email.toLowerCase().trim(), hash, niche);
  return info.lastInsertRowid;
}

export function verifyUser(email, password) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return null;
  return bcrypt.compareSync(password, user.password_hash) ? user : null;
}

export function createSession(userId) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + DAYS * 864e5).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

export function sessionCookie(token) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: DAYS * 86400,
  };
}

export function getCurrentUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token);
  return row || null;
}

export function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export { COOKIE };
