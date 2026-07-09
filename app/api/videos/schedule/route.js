import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Schedules a finished generated video as a post (goes out via the same
// posting engine as uploads).
export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const { video_id, account_ids, scheduled_at, caption } = await req.json();
  const video = db.prepare("SELECT * FROM videos WHERE id = ? AND user_id = ? AND status = 'ready'").get(video_id, user.id);
  if (!video) return NextResponse.json({ error: 'Video not found or not ready.' }, { status: 404 });

  let tags = [];
  try { tags = JSON.parse(video.tags || '[]'); } catch {}
  const hashtags = tags.slice(0, 6).map((t) => '#' + String(t).replace(/[^a-z0-9]/gi, '')).join(' ');
  const content = caption || `${video.seo_title}\n\n${video.seo_description}${hashtags ? '\n\n' + hashtags : ''}`;
  const when = scheduled_at ? new Date(scheduled_at) : new Date();
  if (isNaN(when.getTime())) return NextResponse.json({ error: 'Invalid schedule time.' }, { status: 400 });

  const info = db
    .prepare('INSERT INTO posts (user_id, content, media_path, account_ids, scheduled_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, content, video.video_path, JSON.stringify(account_ids || []), when.toISOString().replace('T', ' ').slice(0, 19));
  return NextResponse.json({ ok: true, post_id: info.lastInsertRowid });
}
