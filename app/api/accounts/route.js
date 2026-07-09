import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb().prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY id DESC').all(user.id);
  return NextResponse.json({ accounts: rows });
}

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { platform, handle, external_id } = await req.json();
  if (!platform || !handle) {
    return NextResponse.json({ error: 'Platform and handle are required.' }, { status: 400 });
  }
  const info = getDb()
    .prepare('INSERT INTO accounts (user_id, platform, handle, external_id) VALUES (?, ?, ?, ?)')
    .run(user.id, platform, handle, external_id || '');
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(id, user.id);
  return NextResponse.json({ ok: true });
}
