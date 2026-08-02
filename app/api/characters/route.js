import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb().prepare('SELECT * FROM characters WHERE user_id = ? ORDER BY id DESC').all(user.id);
  return NextResponse.json({ characters: rows });
}

// Body: { name, photo_path } — photo_path from /api/upload
export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, photo_path } = await req.json();
  if (!name || !photo_path) {
    return NextResponse.json({ error: 'A name and a reference photo are required.' }, { status: 400 });
  }
  const info = getDb()
    .prepare('INSERT INTO characters (user_id, name, photo_path) VALUES (?, ?, ?)')
    .run(user.id, name.slice(0, 60), photo_path);
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare('DELETE FROM characters WHERE id = ? AND user_id = ?').run(id, user.id);
  return NextResponse.json({ ok: true });
}
