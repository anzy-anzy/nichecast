import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { estimateImageCost, IMAGE_MODELS } from '@/lib/image/falImage';
import { creditsForCost, deductCredits } from '@/lib/credits';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const images = getDb().prepare('SELECT * FROM images WHERE user_id = ? ORDER BY id DESC').all(user.id);
  return NextResponse.json({ images });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { prompt, model, ref_image_path, aspect_ratio } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  const usedModel = IMAGE_MODELS[model] ? model : 'nano-banana-pro';

  const dollarCost = estimateImageCost({ model: usedModel });
  const credits = creditsForCost(dollarCost);
  try {
    deductCredits(user.id, credits, `Image Studio: ${usedModel}`);
  } catch (e) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 402 });
  }

  const info = getDb()
    .prepare(
      `INSERT INTO images (user_id, prompt, model, ref_image_path, aspect_ratio, credits_charged) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, prompt, usedModel, ref_image_path || '', aspect_ratio || '3:4', credits);

  return NextResponse.json({ ok: true, id: info.lastInsertRowid, creditsCharged: credits });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare('DELETE FROM images WHERE id = ? AND user_id = ?').run(id, user.id);
  return NextResponse.json({ ok: true });
}
