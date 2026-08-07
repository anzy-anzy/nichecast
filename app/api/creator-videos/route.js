import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPlan } from '@/lib/plans';
import { estimateCost, VIDEO_MODELS } from '@/lib/video/falEngine';
import { creditsForCost, deductCredits } from '@/lib/credits';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb().prepare('SELECT * FROM creator_videos WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(user.id);
  return NextResponse.json({ videos: rows });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const plan = getPlan(user);
  if (!plan.canGenerateVideos) {
    return NextResponse.json({ error: `Your ${plan.name} plan doesn't include video generation.` }, { status: 403 });
  }
  const { character_id, title, script, scenario, resolution, duration, model } = await req.json();
  if (!script) return NextResponse.json({ error: 'A script (what they should say/do) is required.' }, { status: 400 });

  const useModel = VIDEO_MODELS[model] ? model : 'kling';
  const useResolution = ['480p', '720p', '1080p'].includes(resolution) ? resolution : '720p';
  const useDuration = Math.min(Math.max(Number(duration) || 8, 3), 30);

  const credits = creditsForCost(estimateCost({ model: useModel, resolution: useResolution, duration: useDuration }));
  try {
    deductCredits(user.id, credits, `Creator Studio: ${useModel}`);
  } catch (e) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 402 });
  }

  const info = getDb()
    .prepare(
      'INSERT INTO creator_videos (user_id, character_id, title, script, scenario, resolution, duration, model, credits_charged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      user.id,
      character_id || null,
      (title || '').slice(0, 120),
      script.slice(0, 2000),
      (scenario || '').slice(0, 500),
      useResolution,
      useDuration,
      useModel,
      credits
    );
  return NextResponse.json({ ok: true, id: info.lastInsertRowid, creditsCharged: credits });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM creator_videos WHERE id = ? AND user_id = ? AND status != 'processing'").run(id, user.id);
  return NextResponse.json({ ok: true });
}
