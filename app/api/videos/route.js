import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPlan, videosUsedThisMonth } from '@/lib/plans';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb().prepare('SELECT * FROM videos WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(user.id);
  return NextResponse.json({ videos: rows });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const plan = getPlan(user);
  if (!plan.canGenerateVideos) {
    return NextResponse.json({ error: `Your ${plan.name} plan doesn't include video generation. Upgrade to Creator or Studio.` }, { status: 403 });
  }
  const used = videosUsedThisMonth(db, user.id);
  if (used >= plan.videoLimitPerMonth) {
    return NextResponse.json({ error: `Monthly video limit reached (${plan.videoLimitPerMonth} on ${plan.name}).` }, { status: 403 });
  }
  const { niche, idea, format, voice, duration_target, brief, visual_style } = await req.json();
  if (!niche || !idea) return NextResponse.json({ error: 'Niche and idea are required.' }, { status: 400 });
  const info = db
    .prepare('INSERT INTO videos (user_id, niche, idea, format, voice, duration_target, brief, visual_style) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(user.id, niche, idea, format === 'horizontal' ? 'horizontal' : 'vertical', voice || 'onyx', Math.min(Number(duration_target) || 45, 120), brief || '', (visual_style || '').slice(0, 60));
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM videos WHERE id = ? AND user_id = ? AND status != 'processing'").run(id, user.id);
  return NextResponse.json({ ok: true });
}
