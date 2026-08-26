// In-app API key storage. Lets the app owner paste/update provider API keys
// from Settings > API Keys instead of editing .env.local and redeploying.
// A DB value always wins over the .env.local/Railway env var when present;
// otherwise the env var is used as-is, so nothing breaks for keys you'd
// rather keep managed only via the environment.

import { getDb } from './db';

export function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? '';
}

export function setSetting(key, value) {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .run(key, value ?? '');
}

// Use this everywhere a provider key/config was previously read via
// process.env.X directly.
export function envOrSetting(key) {
  const dbVal = getSetting(key);
  if (dbVal) return dbVal;
  return process.env[key] || '';
}

// Every key manageable from the Settings > API Keys page, grouped for the UI.
export const MANAGED_KEYS = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic (Claude)', group: 'Content & AI', help: 'Scripts, ideas, SEO, captions, in-app assistant. console.anthropic.com' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI', group: 'Content & AI', help: 'Voice-over fallback (Faceless Studio). platform.openai.com' },
  { key: 'PEXELS_API_KEY', label: 'Pexels', group: 'Content & AI', help: 'Stock footage for Faceless Studio. pexels.com/api' },
  { key: 'YOUTUBE_API_KEY', label: 'YouTube Data API', group: 'Content & AI', help: 'Trend research. console.cloud.google.com' },
  { key: 'FAL_KEY', label: 'fal.ai', group: 'Generation', help: 'Kling/Seedance/Veo video + Nano Banana Pro/Seedream/Flux images. fal.ai/dashboard/keys' },
  { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs', group: 'Generation', help: 'Voice cloning for accurate African-name pronunciation. elevenlabs.io' },
  { key: 'OUTSTAND_API_KEY', label: 'Outstand API key', group: 'Posting', help: 'Recommended posting provider. outstand.so' },
  { key: 'OUTSTAND_ORG_ID', label: 'Outstand Org ID', group: 'Posting', help: 'Powers the embedded Connect-account flow.' },
  { key: 'POSTFORME_API_KEY', label: 'Post for Me', group: 'Posting', help: 'Posting alternative. postforme.dev' },
  { key: 'BLOTATO_API_KEY', label: 'Blotato', group: 'Posting', help: 'Posting alternative. blotato.com' },
  { key: 'AYRSHARE_API_KEY', label: 'Ayrshare', group: 'Posting', help: 'Posting alternative (video needs their Premium plan). app.ayrshare.com' },
];

export function maskKey(value) {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

// Is this user allowed to manage platform-wide API keys? Single-owner app
// for now: the lowest user id (the founder's account) or a matching
// ADMIN_EMAIL env var. Tighten this once there are real paying customers.
export function isAdmin(user) {
  if (!user) return false;
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (adminEmail && user.email?.toLowerCase() === adminEmail) return true;
  const first = getDb().prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  return !!first && first.id === user.id;
}
