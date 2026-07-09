import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb()
    .prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY scheduled_at DESC LIMIT 200')
    .all(user.id);
  return NextResponse.json({ posts: rows });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { content, media_path, account_ids, scheduled_at } = await req.json();
  if (!content && !media_path) {
    return NextResponse.json({ error: 'Post needs text or media.' }, { status: 400 });
  }
  // scheduled_at arrives as local datetime string from the browser; store as UTC ISO
  const when = scheduled_at ? new Date(scheduled_at) : new Date();
  if (isNaN(when.getTime())) {
    return NextResponse.json({ error: 'Invalid schedule time.' }, { status: 400 });
  }
  const info = getDb()
    .prepare(
      'INSERT INTO posts (user_id, content, media_path, account_ids, scheduled_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      user.id,
      content || '',
      media_path || '',
      JSON.stringify(account_ids || []),
      when.toISOString().replace('T', ' ').slice(0, 19)
    );
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM posts WHERE id = ? AND user_id = ? AND status != 'publishing'").run(id, user.id);
  return NextResponse.json({ ok: true });
}
