import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPlan } from '@/lib/plans';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    enabled: !!user.autopilot_enabled,
    niche: user.autopilot_niche || '',
    per_day: user.autopilot_per_day || 3,
  });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const plan = getPlan(user);
  const { enabled, niche, per_day } = await req.json();
  if (enabled && !plan.canGenerateVideos) {
    return NextResponse.json({ error: `Autopilot needs a plan with video generation (Autopilot or Studio).` }, { status: 403 });
  }
  if (enabled && !niche) {
    return NextResponse.json({ error: 'Set a niche for Autopilot.' }, { status: 400 });
  }
  getDb()
    .prepare('UPDATE users SET autopilot_enabled = ?, autopilot_niche = ?, autopilot_per_day = ? WHERE id = ?')
    .run(enabled ? 1 : 0, niche || '', Math.min(Math.max(Number(per_day) || 3, 1), 5), user.id);
  return NextResponse.json({ ok: true });
}
