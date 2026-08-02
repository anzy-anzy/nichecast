import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPlan } from '@/lib/plans';
import { generateSimilarVideoPrompt } from '@/lib/video/script';

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

// Paste a video link -> looks it up -> builds a style-inspired prompt ->
// queues a real 'similar' mode video generation job directly.
export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const plan = getPlan(user);
  if (!plan.canGenerateVideos) {
    return NextResponse.json({ error: `Your ${plan.name} plan doesn't include video generation.` }, { status: 403 });
  }
  try {
    const { url, notes, resolution, duration, format } = await req.json();
    if (!url) return NextResponse.json({ error: 'Paste a video link.' }, { status: 400 });
    const ref = await lookupVideo(url);
    if (!ref) {
      return NextResponse.json(
        { error: 'Could not read that link. YouTube, TikTok and Vimeo links work best (make sure the video is public).' },
        { status: 400 }
      );
    }
    const prompt = await generateSimilarVideoPrompt({ refTitle: ref.title, refAuthor: ref.author, notes });
    const info = getDb()
      .prepare('INSERT INTO ads (user_id, title, prompt, photos, format, resolution, duration, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        user.id,
        `Inspired by: ${ref.title}`.slice(0, 120),
        prompt,
        '[]',
        format === 'horizontal' ? 'horizontal' : 'vertical',
        ['480p', '720p', '1080p'].includes(resolution) ? resolution : '720p',
        Math.min(Math.max(Number(duration) || 8, 3), 30),
        'similar'
      );
    return NextResponse.json({ ok: true, id: info.lastInsertRowid, refTitle: ref.title, prompt });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
