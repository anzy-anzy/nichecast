import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MEDIA_DIR } from '@/lib/media';

const MIME = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
};

// Streams uploaded/generated media from the data volume (with Range support
// so <video> players can seek). Next.js only serves public/ files present at
// build time, so runtime-generated media must go through this route.
export async function GET(req, { params }) {
  const rel = (params.file || []).join('/');
  if (rel.includes('..')) return new NextResponse('Bad path', { status: 400 });
  const file = path.join(MEDIA_DIR(), rel);
  if (!fs.existsSync(file)) return new NextResponse('Not found', { status: 404 });

  const stat = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const buf = fs.readFileSync(file);

  const range = req.headers.get('range');
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? Math.min(parseInt(m[2], 10), stat.size - 1) : stat.size - 1;
      return new NextResponse(buf.subarray(start, end + 1), {
        status: 206,
        headers: {
          'content-range': `bytes ${start}-${end}/${stat.size}`,
          'accept-ranges': 'bytes',
          'content-length': String(end - start + 1),
          'content-type': type,
        },
      });
    }
  }
  return new NextResponse(buf, {
    headers: { 'content-type': type, 'content-length': String(stat.size), 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=3600' },
  });
}
