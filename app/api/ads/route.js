import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPlan } from '@/lib/plans';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb().prepare('SELECT * FROM ads WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(user.id);
  return NextResponse.json({ ads: rows });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const plan = getPlan(user);
  if (!plan.canGenerateVideos) {
    return NextResponse.json({ error: `Your ${plan.name} plan doesn't include video generation.` }, { status: 403 });
  }
  const { title, prompt, photos, format } = await req.json();
  if (!prompt || !photos?.length) {
    return NextResponse.json({ error: 'A scene prompt and at least one product photo are required.' }, { status: 400 });
  }
  const info = getDb()
    .prepare('INSERT INTO ads (user_id, title, prompt, photos, format) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, (title || '').slice(0, 120), prompt.slice(0, 2000), JSON.stringify(photos.slice(0, 5)), format === 'horizontal' ? 'horizontal' : 'vertical');
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM ads WHERE id = ? AND user_id = ? AND status != 'processing'").run(id, user.id);
  return NextResponse.json({ ok: true });
}
