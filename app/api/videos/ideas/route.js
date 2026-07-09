import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { researchTrends } from '@/lib/video/trends';
import { generateIdeas } from '@/lib/video/script';

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { niche, brief } = await req.json();
    if (!niche) return NextResponse.json({ error: 'Niche is required.' }, { status: 400 });
    const trends = await researchTrends(niche);
    const ideas = await generateIdeas(niche, trends, brief || '');
    return NextResponse.json({
      ideas,
      trends: {
        google: (trends.google || []).slice(0, 8),
        youtube: (trends.youtube || []).slice(0, 5),
        live: (trends.google?.length || 0) + (trends.youtube?.length || 0) > 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
