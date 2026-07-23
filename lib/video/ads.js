// Product ad videos: turns product photos + a scene prompt into an AI video.
// Real generation via fal.ai (FAL_KEY, pay-per-use ~$0.30-1/video).
// Without a key: mock mode builds a Ken Burns product slideshow so the whole
// flow works free.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { getDb } from '../db';
import { kenBurnsClip } from './images';
import { mediaPathToFile } from '../media';

const FAL_MODEL = () => process.env.FAL_MODEL || 'fal-ai/kling-video/v2.1/standard/image-to-video';

function dataUri(mediaPath) {
  const file = mediaPathToFile(mediaPath);
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

async function falGenerate({ prompt, photoPath, vertical }) {
  const key = process.env.FAL_KEY;
  if (!key) return null;
  const headers = { 'content-type': 'application/json', authorization: `Key ${key}` };
  const submit = await fetch(`https://queue.fal.run/${FAL_MODEL()}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      image_url: dataUri(photoPath),
      duration: '5',
      aspect_ratio: vertical ? '9:16' : '16:9',
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!submit.ok) throw new Error(`fal.ai submit ${submit.status}: ${(await submit.text()).slice(0, 200)}`);
  const { status_url, response_url } = await submit.json();

  // poll up to ~4 minutes
  for (let i = 0; i < 48; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await fetch(status_url, { headers, signal: AbortSignal.timeout(15000) });
    const s = await st.json();
    if (s.status === 'COMPLETED') break;
    if (s.status === 'FAILED' || s.status === 'ERROR') throw new Error('fal.ai generation failed');
  }
  const res = await fetch(response_url, { headers, signal: AbortSignal.timeout(30000) });
  const data = await res.json();
  const url = data.video?.url || data.output?.video?.url;
  if (!url) throw new Error('fal.ai returned no video URL');
  const dl = await fetch(url, { signal: AbortSignal.timeout(120000) });
  return Buffer.from(await dl.arrayBuffer());
}

function mockAdVideo({ photos, workDir, outPath, vertical }) {
  const clips = photos.slice(0, 5).map((p, i) => {
    const abs = mediaPathToFile(p);
    return kenBurnsClip(abs, path.join(workDir, `adclip_${i}.mp4`), { vertical, seconds: 3 });
  });
  const listFile = path.join(workDir, 'adconcat.txt');
  fs.writeFileSync(listFile, clips.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath], { stdio: 'pipe' });
}

export async function processAdJobs({ maxJobs = 1 } = {}) {
  const db = getDb();
  const jobs = db.prepare(`SELECT * FROM ads WHERE status = 'queued' ORDER BY id LIMIT ?`).all(maxJobs);
  const results = [];
  for (const job of jobs) {
    const vertical = job.format !== 'horizontal';
    const publicDir = path.join(process.cwd(), 'data', 'uploads', 'videos');
    const workDir = path.join(process.cwd(), 'data', 'adwork', String(job.id));
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(workDir, { recursive: true });
    db.prepare(`UPDATE ads SET status = 'processing' WHERE id = ?`).run(job.id);
    try {
      const photos = JSON.parse(job.photos || '[]');
      if (!photos.length) throw new Error('No product photos');
      const videoName = `ad_${job.user_id}_${job.id}.mp4`;
      const outPath = path.join(publicDir, videoName);

      const buf = await falGenerate({ prompt: job.prompt, photoPath: photos[0], vertical });
      if (buf) {
        fs.writeFileSync(outPath, buf);
      } else {
        mockAdVideo({ photos, workDir, outPath, vertical });
      }
      db.prepare(`UPDATE ads SET status = 'ready', video_path = ? WHERE id = ?`).run(`/api/media/videos/${videoName}`, job.id);
      results.push({ id: job.id, ok: true, mode: buf ? 'fal.ai' : 'mock' });
    } catch (e) {
      db.prepare(`UPDATE ads SET status = 'failed', error = ? WHERE id = ?`).run(String(e.message || e).slice(0, 400), job.id);
      results.push({ id: job.id, ok: false, error: String(e.message || e) });
    } finally {
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
    }
  }
  return results;
}
