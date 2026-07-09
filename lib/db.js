import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db;

export function getDb() {
  if (db) return db;
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  db = new Database(path.join(dir, 'nichecast.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      niche TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      external_id TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      media_path TEXT DEFAULT '',
      account_ids TEXT DEFAULT '[]',
      scheduled_at TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      result TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      niche TEXT NOT NULL,
      idea TEXT DEFAULT '',
      format TEXT DEFAULT 'vertical',
      voice TEXT DEFAULT 'onyx',
      duration_target INTEGER DEFAULT 45,
      script TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      next_suggestion TEXT DEFAULT '',
      status TEXT DEFAULT 'queued',
      step TEXT DEFAULT '',
      error TEXT DEFAULT '',
      video_path TEXT DEFAULT '',
      thumb_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // migrations for existing databases
  try { db.exec(`ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'trial'`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN autopilot_enabled INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN autopilot_niche TEXT DEFAULT ''`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN autopilot_per_day INTEGER DEFAULT 3`); } catch {}
  try { db.exec(`ALTER TABLE videos ADD COLUMN autopost INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE videos ADD COLUMN brief TEXT DEFAULT ''`); } catch {}
  try { db.exec(`ALTER TABLE videos ADD COLUMN visual_style TEXT DEFAULT ''`); } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT DEFAULT '',
      prompt TEXT NOT NULL,
      photos TEXT DEFAULT '[]',
      format TEXT DEFAULT 'vertical',
      status TEXT DEFAULT 'queued',
      error TEXT DEFAULT '',
      video_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}
