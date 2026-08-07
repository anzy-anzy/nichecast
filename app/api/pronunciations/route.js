import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb().prepare('SELECT * FROM pronunciations WHERE user_id = ? ORDER BY id DESC').all(user.id);
  return NextResponse.json({ pronunciations: rows });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { word, replacement } = await req.json();
  if (!word || !replacement) return NextResponse.json({ error: 'Word and phonetic replacement are both required.' }, { status: 400 });
  const info = getDb()
    .prepare('INSERT INTO pronunciations (user_id, word, replacement) VALUES (?, ?, ?)')
    .run(user.id, word.trim(), replacement.trim());
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare('DELETE FROM pronunciations WHERE id = ? AND user_id = ?').run(id, user.id);
  return NextResponse.json({ ok: true });
}
