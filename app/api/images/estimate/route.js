import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { estimateImageCost, hasFalKey, IMAGE_MODELS } from '@/lib/image/falImage';
import { creditsForCost, getBalance } from '@/lib/credits';

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { model } = await req.json();
  const usedModel = IMAGE_MODELS[model] ? model : 'nano-banana-pro';
  const cost = estimateImageCost({ model: usedModel });
  return NextResponse.json({
    cost,
    credits: creditsForCost(cost),
    balance: getBalance(user.id),
    liveGeneration: hasFalKey(),
  });
}
