import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateSimilarIdea } from '@/lib/video/script';

// Free oEmbed lookups — no API keys needed
async function lookupVideo(url) {
  const endpoints = [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.title) return { title: data.title, author: data.author_name || '' };
    } catch {}
  }
  return null;
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { url, niche } = await req.json();
    if (!url) return NextResponse.json({ error: 'Paste a video link.' }, { status: 400 });
    const ref = await lookupVideo(url);
    if (!ref) {
      return NextResponse.json(
        { error: 'Could not read that link. YouTube, TikTok and Vimeo links work best (make sure the video is public).' },
        { status: 400 }
      );
    }
    const idea = await generateSimilarIdea({ niche: niche || user.niche || 'general', refTitle: ref.title, refAuthor: ref.author });
    return NextResponse.json({ idea: { ...idea, why: `${idea.why} — inspired by "${ref.title}"` } });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
