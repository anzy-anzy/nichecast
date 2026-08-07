import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPlan } from '@/lib/plans';
import { estimateCost, VIDEO_MODELS } from '@/lib/video/falEngine';
import { creditsForCost, deductCredits } from '@/lib/credits';

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
  const { title, prompt, photos, format, resolution, duration, mode, model } = await req.json();
  const useMode = ['ad', 'property_tour', 'similar'].includes(mode) ? mode : 'ad';
  const useModel = VIDEO_MODELS[model] ? model : 'kling';
  const useResolution = ['480p', '720p', '1080p'].includes(resolution) ? resolution : '720p';
  const useDuration = Math.min(Math.max(Number(duration) || 8, 3), 30);

  if (!prompt) {
    return NextResponse.json({ error: 'A scene prompt is required.' }, { status: 400 });
  }
  if (useMode === 'ad' && !photos?.length) {
    return NextResponse.json({ error: 'At least one product photo is required.' }, { status: 400 });
  }
  if (useMode === 'property_tour' && (!photos || photos.length < 2)) {
    return NextResponse.json({ error: 'Property tours need at least 2 room/area photos.' }, { status: 400 });
  }

  const dollarCost = estimateCost({ model: useModel, resolution: useResolution, duration: useDuration });
  const credits = creditsForCost(dollarCost);
  try {
    deductCredits(user.id, credits, `Marketing Studio: ${useMode}/${useModel}`);
  } catch (e) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 402 });
  }

  const info = getDb()
    .prepare('INSERT INTO ads (user_id, title, prompt, photos, format, resolution, duration, mode, model, credits_charged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(
      user.id,
      (title || '').slice(0, 120),
      prompt.slice(0, 2000),
      JSON.stringify((photos || []).slice(0, 8)),
      format === 'horizontal' ? 'horizontal' : 'vertical',
      useResolution,
      useDuration,
      useMode,
      useModel,
      credits
    );
  return NextResponse.json({ ok: true, id: info.lastInsertRowid, creditsCharged: credits });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM ads WHERE id = ? AND user_id = ? AND status != 'processing'").run(id, user.id);
  return NextResponse.json({ ok: true });
}
