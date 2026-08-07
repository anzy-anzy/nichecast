// Marketing Studio engine: three modes.
//  - 'ad': product photos + scene prompt -> one AI ad video
//  - 'property_tour': multiple room/area photos -> one flowing walkthrough
//    (each photo becomes its own AI-animated clip, then stitched together)
//  - 'similar': a reference video's title/style -> a fresh AI video inspired
//    by it (not a copy)
// Real generation via fal.ai (pay-as-you-go, resolution/duration selectable).
// Without FAL_KEY: mock mode builds a free Ken Burns slideshow so the whole
// flow still works.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { getDb } from '../db';
import { kenBurnsClip } from './images';
import { mediaPathToFile } from '../media';
import { falGenerateVideo, hasFalKey } from './falEngine';
import { refundCredits } from '../credits';

function dataUri(mediaPath) {
  const file = mediaPathToFile(mediaPath);
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function mockSlideshow({ photos, workDir, outPath, vertical, secondsEach = 3 }) {
  const clips = photos.slice(0, 8).map((p, i) => {
    const abs = mediaPathToFile(p);
    return kenBurnsClip(abs, path.join(workDir, `clip_${i}.mp4`), { vertical, seconds: secondsEach });
  });
  const listFile = path.join(workDir, 'concat.txt');
  fs.writeFileSync(listFile, clips.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath], { stdio: 'pipe' });
}

async function generateSingleAd({ job, workDir, outPath, vertical }) {
  const photos = JSON.parse(job.photos || '[]');
  if (!photos.length) throw new Error('No product photos');
  const buf = hasFalKey()
    ? await falGenerateVideo({ prompt: job.prompt, model: job.model, resolution: job.resolution, duration: job.duration, imageUrl: dataUri(photos[0]) })
    : null;
  if (buf) {
    fs.writeFileSync(outPath, buf);
    return 'fal.ai';
  }
  mockSlideshow({ photos, workDir, outPath, vertical, secondsEach: 3 });
  return 'mock';
}

async function generatePropertyTour({ job, workDir, outPath, vertical }) {
  const photos = JSON.parse(job.photos || '[]');
  if (photos.length < 2) throw new Error('Property tours need at least 2 room/area photos');

  if (hasFalKey()) {
    // Animate each room photo individually, then stitch into one flowing tour.
    const perRoomSeconds = Math.max(3, Math.floor((job.duration || 20) / photos.length));
    const clipFiles = [];
    for (let i = 0; i < Math.min(photos.length, 8); i++) {
      const buf = await falGenerateVideo({
        prompt: `${job.prompt} — smooth cinematic real-estate walkthrough camera movement through this room`,
        model: job.model,
        resolution: job.resolution,
        duration: perRoomSeconds,
        imageUrl: dataUri(photos[i]),
      });
      if (buf) {
        const clipPath = path.join(workDir, `room_${i}.mp4`);
        fs.writeFileSync(clipPath, buf);
        clipFiles.push(clipPath);
      }
    }
    if (clipFiles.length >= 2) {
      const listFile = path.join(workDir, 'tour_concat.txt');
      fs.writeFileSync(listFile, clipFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
      execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath], { stdio: 'pipe' });
      return 'fal.ai';
    }
  }
  // mock fallback: zoom slideshow across all room photos
  mockSlideshow({ photos, workDir, outPath, vertical, secondsEach: 3.5 });
  return 'mock';
}

async function generateSimilar({ job, workDir, outPath, vertical }) {
  // 'similar' mode has no product photos — pure text-to-video from a prompt
  // that already describes the reference video's style (built by the caller).
  const buf = hasFalKey() ? await falGenerateVideo({ prompt: job.prompt, model: job.model, resolution: job.resolution, duration: job.duration }) : null;
  if (buf) {
    fs.writeFileSync(outPath, buf);
    return 'fal.ai';
  }
  // no photos to fall back on for a pure "similar" generation without fal —
  // produce a simple text-card video instead of failing outright
  const size = vertical ? '720x1280' : '1280x720';
  execFileSync(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', `gradients=size=${size}:c0=0x1a1a40:c1=0x0b0f1a:speed=0.02:duration=${job.duration || 8}:rate=24`, '-pix_fmt', 'yuv420p', outPath],
    { stdio: 'pipe' }
  );
  return 'mock';
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
      const videoName = `ad_${job.user_id}_${job.id}.mp4`;
      const outPath = path.join(publicDir, videoName);

      let mode;
      if (job.mode === 'property_tour') mode = await generatePropertyTour({ job, workDir, outPath, vertical });
      else if (job.mode === 'similar') mode = await generateSimilar({ job, workDir, outPath, vertical });
      else mode = await generateSingleAd({ job, workDir, outPath, vertical });

      db.prepare(`UPDATE ads SET status = 'ready', video_path = ? WHERE id = ?`).run(`/api/media/videos/${videoName}`, job.id);
      results.push({ id: job.id, ok: true, mode });
    } catch (e) {
      db.prepare(`UPDATE ads SET status = 'failed', error = ? WHERE id = ?`).run(String(e.message || e).slice(0, 400), job.id);
      if (job.credits_charged > 0) refundCredits(job.user_id, job.credits_charged, `refund: ad #${job.id} failed`);
      results.push({ id: job.id, ok: false, error: String(e.message || e) });
    } finally {
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
    }
  }
  return results;
}
