// Creator Studio pipeline: takes a Character (reference photo) + a script/
// scenario prompt and produces a video of "them" in that scenario.
// Uses fal.ai image-to-video, passing the character's photo as the driving
// image so the subject's likeness carries into the generation. This is
// photo-guided likeness, not a perfect multi-shot identity lock — being
// upfront about that in the UI copy.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { getDb } from '../db';
import { falGenerateVideo, hasFalKey } from './falEngine';
import { mediaPathToFile } from '../media';
import { kenBurnsClip } from './images';

function toDataUri(mediaPath) {
  const file = mediaPathToFile(mediaPath);
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function mockCreatorVideo({ photoFile, workDir, outPath, vertical }) {
  // free fallback: animated zoom on the reference photo
  kenBurnsClip(photoFile, outPath, { vertical, seconds: 6 });
}

export async function processCreatorJobs({ maxJobs = 1 } = {}) {
  const db = getDb();
  const jobs = db.prepare(`SELECT * FROM creator_videos WHERE status = 'queued' ORDER BY id LIMIT ?`).all(maxJobs);
  const results = [];
  for (const job of jobs) {
    const vertical = true;
    const publicDir = path.join(process.cwd(), 'data', 'uploads', 'videos');
    const workDir = path.join(process.cwd(), 'data', 'creatorwork', String(job.id));
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(workDir, { recursive: true });
    db.prepare(`UPDATE creator_videos SET status = 'processing' WHERE id = ?`).run(job.id);

    try {
      const character = job.character_id ? db.prepare('SELECT * FROM characters WHERE id = ?').get(job.character_id) : null;
      const videoName = `creator_${job.user_id}_${job.id}.mp4`;
      const outPath = path.join(publicDir, videoName);

      const prompt = `${job.scenario ? job.scenario + '. ' : ''}${job.script}`.slice(0, 2000);

      let buf = null;
      if (hasFalKey()) {
        const imageUrl = character ? toDataUri(character.photo_path) : undefined;
        buf = await falGenerateVideo({ prompt, resolution: job.resolution, duration: job.duration, imageUrl });
      }

      if (buf) {
        fs.writeFileSync(outPath, buf);
      } else if (character) {
        mockCreatorVideo({ photoFile: mediaPathToFile(character.photo_path), workDir, outPath, vertical });
      } else {
        throw new Error('No character photo and no FAL_KEY — nothing to generate from. Add a character or set FAL_KEY.');
      }

      db.prepare(`UPDATE creator_videos SET status = 'ready', video_path = ? WHERE id = ?`).run(`/api/media/videos/${videoName}`, job.id);
      results.push({ id: job.id, ok: true, mode: buf ? 'fal.ai' : 'mock' });
    } catch (e) {
      db.prepare(`UPDATE creator_videos SET status = 'failed', error = ? WHERE id = ?`).run(String(e.message || e).slice(0, 400), job.id);
      results.push({ id: job.id, ok: false, error: String(e.message || e) });
    } finally {
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
    }
  }
  return results;
}
