import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAX_BYTES = 200 * 1024 * 1024; // 200MB
const ALLOWED = ['.mp4', '.mov', '.webm', '.jpg', '.jpeg', '.png', '.gif'];

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  const ext = path.extname(file.name || '').toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: `File type ${ext || '(none)'} not allowed.` }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 200MB).' }, { status: 400 });
  }
  const dir = path.join(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${user.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return NextResponse.json({ ok: true, media_path: `/uploads/${name}` });
}
