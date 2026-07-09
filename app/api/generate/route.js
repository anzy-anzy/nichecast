import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generatePosts } from '@/lib/ai';

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { niche, topic, count, tone, platform } = await req.json();
    const posts = await generatePosts({
      niche: niche || user.niche || 'small business',
      topic: topic || '',
      count: Math.min(Number(count) || 5, 10),
      tone: tone || 'engaging',
      platform: platform || 'general',
    });
    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
