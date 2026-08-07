// Image Studio engine — AI image generation via fal.ai (same FAL_KEY as
// video). Supports Nano Banana Pro (Google's high-fidelity model), Seedream,
// and Flux. Text-to-image, or image-to-image when a reference photo is given
// (product shots, room photos, etc.). Without FAL_KEY, falls back to a free
// generated placeholder card so the flow still works end-to-end.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { mediaPathToFile } from '../media';

export const IMAGE_MODELS = {
  'nano-banana-pro': {
    label: 'Nano Banana Pro (Google, highest fidelity)',
    costPerImage: 0.15,
    textModel: process.env.FAL_IMG_NANO_BANANA_PRO || 'fal-ai/nano-banana-pro',
    editModel: process.env.FAL_IMG_NANO_BANANA_PRO_EDIT || 'fal-ai/nano-banana-pro/edit',
  },
  seedream: {
    label: 'Seedream (ByteDance, fast + cheap)',
    costPerImage: 0.03,
    textModel: process.env.FAL_IMG_SEEDREAM || 'fal-ai/bytedance/seedream/v3/text-to-image',
    editModel: process.env.FAL_IMG_SEEDREAM_EDIT || 'fal-ai/bytedance/seedream/v3/edit',
  },
  flux: {
    label: 'Flux Pro (general purpose)',
    costPerImage: 0.05,
    textModel: process.env.FAL_IMG_FLUX || 'fal-ai/flux-pro/v1.1',
    editModel: process.env.FAL_IMG_FLUX_EDIT || 'fal-ai/flux-pro/v1.1/redux',
  },
};

export function estimateImageCost({ model = 'nano-banana-pro' } = {}) {
  return (IMAGE_MODELS[model] || IMAGE_MODELS['nano-banana-pro']).costPerImage;
}

export function hasFalKey() {
  return !!process.env.FAL_KEY;
}

function dataUri(mediaPath) {
  const file = mediaPathToFile(mediaPath);
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

export async function falGenerateImage({ prompt, model = 'nano-banana-pro', aspectRatio = '3:4', imageUrl }) {
  const key = process.env.FAL_KEY;
  if (!key) return null;

  const catalog = IMAGE_MODELS[model] || IMAGE_MODELS['nano-banana-pro'];
  const modelSlug = imageUrl ? catalog.editModel : catalog.textModel;
  const headers = { 'content-type': 'application/json', authorization: `Key ${key}` };
  const body = { prompt, aspect_ratio: aspectRatio };
  if (imageUrl) body.image_urls = [imageUrl];

  const submit = await fetch(`https://queue.fal.run/${modelSlug}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!submit.ok) throw new Error(`fal.ai submit ${submit.status}: ${(await submit.text()).slice(0, 300)}`);
  const { status_url, response_url } = await submit.json();

  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = await fetch(status_url, { headers, signal: AbortSignal.timeout(15000) });
    const s = await st.json();
    if (s.status === 'COMPLETED') break;
    if (s.status === 'FAILED' || s.status === 'ERROR') throw new Error('fal.ai image generation failed');
  }
  const res = await fetch(response_url, { headers, signal: AbortSignal.timeout(30000) });
  const data = await res.json();
  const url = data.images?.[0]?.url || data.image?.url;
  if (!url) throw new Error('fal.ai returned no image URL');
  const dl = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!dl.ok) throw new Error('Failed downloading generated image');
  return Buffer.from(await dl.arrayBuffer());
}

// Free fallback when there's no FAL_KEY yet: a branded gradient placeholder
// card (or a crop of the reference photo if one was given) so Image Studio
// still produces something to look at end-to-end.
function mockImage({ outPath, aspectRatio, refFile }) {
  if (refFile) {
    execFileSync('ffmpeg', ['-y', '-i', refFile, '-vf', 'scale=1024:-1', outPath], { stdio: 'pipe' });
    return;
  }
  const [w, h] = aspectRatio === '9:16' ? [768, 1365] : aspectRatio === '16:9' ? [1365, 768] : [1024, 1365];
  execFileSync(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', `gradients=size=${w}x${h}:c0=0x6c5ce7:c1=0x00cec9:duration=1:rate=1`, '-frames:v', '1', outPath],
    { stdio: 'pipe' }
  );
}

export async function processImageJobs({ maxJobs = 1 } = {}) {
  const { getDb } = await import('../db');
  const { refundCredits } = await import('../credits');
  const db = getDb();
  const jobs = db.prepare(`SELECT * FROM images WHERE status = 'queued' ORDER BY id LIMIT ?`).all(maxJobs);
  const results = [];
  for (const job of jobs) {
    const publicDir = path.join(process.cwd(), 'data', 'uploads', 'images');
    fs.mkdirSync(publicDir, { recursive: true });
    db.prepare(`UPDATE images SET status = 'processing' WHERE id = ?`).run(job.id);
    try {
      const imageName = `img_${job.user_id}_${job.id}.jpg`;
      const outPath = path.join(publicDir, imageName);

      let buf = null;
      if (hasFalKey()) {
        const imageUrl = job.ref_image_path ? dataUri(job.ref_image_path) : undefined;
        buf = await falGenerateImage({ prompt: job.prompt, model: job.model, aspectRatio: job.aspect_ratio, imageUrl });
      }
      if (buf) {
        fs.writeFileSync(outPath, buf);
      } else {
        mockImage({ outPath, aspectRatio: job.aspect_ratio, refFile: job.ref_image_path ? mediaPathToFile(job.ref_image_path) : null });
      }

      db.prepare(`UPDATE images SET status = 'ready', image_path = ? WHERE id = ?`).run(`/api/media/images/${imageName}`, job.id);
      results.push({ id: job.id, ok: true, mode: buf ? 'fal.ai' : 'mock' });
    } catch (e) {
      db.prepare(`UPDATE images SET status = 'failed', error = ? WHERE id = ?`).run(String(e.message || e).slice(0, 400), job.id);
      if (job.credits_charged > 0) refundCredits(job.user_id, job.credits_charged, `refund: image #${job.id} failed`);
      results.push({ id: job.id, ok: false, error: String(e.message || e) });
    }
  }
  return results;
}
