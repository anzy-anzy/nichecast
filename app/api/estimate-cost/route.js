import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { estimateCost, hasFalKey } from '@/lib/video/falEngine';

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { resolution, duration } = await req.json();
  return NextResponse.json({
    cost: estimateCost({ resolution, duration }),
    liveGeneration: hasFalKey(),
  });
}
