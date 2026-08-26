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
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      photo_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS voices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      provider TEXT DEFAULT 'elevenlabs',
      provider_voice_id TEXT DEFAULT '',
      status TEXT DEFAULT 'ready',
      error TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS creator_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      character_id INTEGER,
      title TEXT DEFAULT '',
      script TEXT NOT NULL,
      scenario TEXT DEFAULT '',
      resolution TEXT DEFAULT '720p',
      duration INTEGER DEFAULT 8,
      status TEXT DEFAULT 'queued',
      error TEXT DEFAULT '',
      video_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      model TEXT DEFAULT 'nano-banana-pro',
      ref_image_path TEXT DEFAULT '',
      aspect_ratio TEXT DEFAULT '3:4',
      status TEXT DEFAULT 'queued',
      error TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pronunciations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word TEXT NOT NULL,
      replacement TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // more migrations
  try { db.exec(`ALTER TABLE ads ADD COLUMN resolution TEXT DEFAULT '720p'`); } catch {}
  try { db.exec(`ALTER TABLE ads ADD COLUMN duration INTEGER DEFAULT 8`); } catch {}
  try { db.exec(`ALTER TABLE ads ADD COLUMN character_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE ads ADD COLUMN mode TEXT DEFAULT 'ad'`); } catch {} // 'ad' | 'property_tour' | 'similar'
  try { db.exec(`ALTER TABLE ads ADD COLUMN model TEXT DEFAULT 'kling'`); } catch {}
  try { db.exec(`ALTER TABLE ads ADD COLUMN credits_charged INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE videos ADD COLUMN character_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE videos ADD COLUMN voice_id INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE videos ADD COLUMN download_only INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE creator_videos ADD COLUMN model TEXT DEFAULT 'kling'`); } catch {}
  try { db.exec(`ALTER TABLE creator_videos ADD COLUMN credits_charged INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE images ADD COLUMN credits_charged INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE posts ADD COLUMN ai_generated INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0`); } catch {}
  return db;
}
