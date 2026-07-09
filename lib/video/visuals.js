// Visuals: downloads matching stock clips from Pexels (free API key from
// pexels.com/api). Without a key, generates animated gradient slides with
// FFmpeg so the pipeline still works.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

async function pexelsClips(keywords, dir, { vertical = true, needed = 5 }) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const files = [];
  for (const kw of keywords) {
    if (files.length >= needed) break;
    try {
      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(kw)}&per_page=3&orientation=${vertical ? 'portrait' : 'landscape'}`;
      const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const v of data.videos || []) {
        if (files.length >= needed) break;
        const file = (v.video_files || [])
          .filter((f) => f.width && f.height && (vertical ? f.height > f.width : f.width > f.height))
          .sort((a, b) => Math.abs((a.height || 0) - 1280) - Math.abs((b.height || 0) - 1280))[0];
        if (!file?.link) continue;
        const out = path.join(dir, `clip_${files.length}.mp4`);
        const dl = await fetch(file.link, { signal: AbortSignal.timeout(30000) });
        if (!dl.ok) continue;
        fs.writeFileSync(out, Buffer.from(await dl.arrayBuffer()));
        files.push(out);
      }
    } catch {
      // skip keyword on failure
    }
  }
  return files.length ? files : null;
}

function gradientSlides(keywords, dir, { vertical = true, needed = 5 }) {
  const size = vertical ? '720x1280' : '1280x720';
  const colors = ['0x1a1a40:0x6c5ce7', '0x0b3d2e:0x00cec9', '0x40151a:0xff7675', '0x2d2a12:0xfdcb6e', '0x101828:0x74b9ff'];
  const files = [];
  for (let i = 0; i < needed; i++) {
    const out = path.join(dir, `slide_${i}.mp4`);
    const [c1] = colors[i % colors.length].split(':');
    execFileSync(
      'ffmpeg',
      ['-y', '-f', 'lavfi', '-i', `gradients=size=${size}:c0=${c1}:c1=0x0b0f1a:speed=0.02:duration=6:rate=24`, '-pix_fmt', 'yuv420p', out],
      { stdio: 'pipe' }
    );
    files.push(out);
  }
  return files;
}

export async function gatherVisuals({ keywords, dir, vertical = true, needed = 5 }) {
  fs.mkdirSync(dir, { recursive: true });
  const stock = await pexelsClips(keywords, dir, { vertical, needed });
  if (stock) return { files: stock, source: 'pexels' };
  return { files: gradientSlides(keywords, dir, { vertical, needed }), source: 'generated' };
}
