import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSetting, setSetting, maskKey, isAdmin, MANAGED_KEYS } from '@/lib/settings';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const keys = MANAGED_KEYS.map(({ key, label, group, help }) => {
    const dbVal = getSetting(key);
    const envVal = process.env[key] || '';
    return {
      key,
      label,
      group,
      help,
      masked: maskKey(dbVal || envVal),
      source: dbVal ? 'app' : envVal ? 'env' : 'none',
    };
  });
  const postingProvider = getSetting('POSTING_PROVIDER') || process.env.POSTING_PROVIDER || 'mock';
  return NextResponse.json({ keys, postingProvider });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json();
  const allowed = new Set([...MANAGED_KEYS.map((k) => k.key), 'POSTING_PROVIDER']);
  let saved = 0;
  for (const [key, value] of Object.entries(body || {})) {
    if (!allowed.has(key)) continue;
    setSetting(key, String(value || '').trim());
    saved++;
  }
  return NextResponse.json({ ok: true, saved });
}
