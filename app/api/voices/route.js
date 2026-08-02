import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { cloneVoice } from '@/lib/video/voices';
import { mediaPathToFile } from '@/lib/media';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = getDb().prepare('SELECT * FROM voices WHERE user_id = ? ORDER BY id DESC').all(user.id);
  return NextResponse.json({ voices: rows });
}

// Body: { name, sample_media_path } — sample_media_path from /api/upload
export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, sample_media_path } = await req.json();
  if (!name || !sample_media_path) {
    return NextResponse.json({ error: 'A name and a voice sample recording are required.' }, { status: 400 });
  }
  const db = getDb();
  const info = db.prepare('INSERT INTO voices (user_id, name, status) VALUES (?, ?, ?)').run(user.id, name, 'cloning');
  try {
    const filePath = mediaPathToFile(sample_media_path);
    const voiceId = await cloneVoice({ name: `${user.email}_${name}`.slice(0, 60), sampleFilePath: filePath });
    db.prepare('UPDATE voices SET status = ?, provider_voice_id = ? WHERE id = ?').run('ready', voiceId, info.lastInsertRowid);
    return NextResponse.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    db.prepare('UPDATE voices SET status = ?, error = ? WHERE id = ?').run('failed', String(e.message || e).slice(0, 300), info.lastInsertRowid);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare('DELETE FROM voices WHERE id = ? AND user_id = ?').run(id, user.id);
  return NextResponse.json({ ok: true });
}
