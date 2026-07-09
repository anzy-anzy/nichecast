import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateCaption } from '@/lib/video/script';

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { niche, hint } = await req.json();
    const caption = await generateCaption({ niche: niche || user.niche || 'content', hint: hint || '' });
    return NextResponse.json({ caption });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
