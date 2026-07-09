// AI-image visuals: generates styled images (cartoon, anime, realistic...)
// with the OpenAI Images API, then turns each into a slow-zoom "Ken Burns"
// clip with FFmpeg. Returns null when no key — caller falls back to stock.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

async function openaiImage(prompt, { vertical }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const attempts = [
    { model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1', size: vertical ? '1024x1536' : '1536x1024', extra: { quality: 'medium' } },
    { model: 'dall-e-3', size: vertical ? '1024x1792' : '1792x1024', extra: { response_format: 'b64_json' } },
  ];
  for (const a of attempts) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: a.model, prompt: prompt.slice(0, 3500), size: a.size, n: 1, ...a.extra }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if (b64) return Buffer.from(b64, 'base64');
      const url = data.data?.[0]?.url;
      if (url) {
        const dl = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (dl.ok) return Buffer.from(await dl.arrayBuffer());
      }
    } catch {}
  }
  return null;
}

export function kenBurnsClip(imgPath, outPath, { vertical, seconds = 6 }) {
  const [w, h] = vertical ? [720, 1280] : [1280, 720];
  const frames = seconds * 24;
  execFileSync(
    'ffmpeg',
    ['-y', '-i', imgPath,
      '-vf',
      `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},` +
      `zoompan=z='min(zoom+0.0012,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=24`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-pix_fmt', 'yuv420p',
      outPath],
    { stdio: 'pipe', maxBuffer: 1024 * 1024 * 64 }
  );
  return outPath;
}

export async function generateImageClips({ prompts, dir, vertical = true }) {
  fs.mkdirSync(dir, { recursive: true });
  const clips = [];
  for (let i = 0; i < prompts.length; i++) {
    const buf = await openaiImage(prompts[i], { vertical });
    if (!buf) continue;
    const imgPath = path.join(dir, `aimg_${i}.png`);
    fs.writeFileSync(imgPath, buf);
    try {
      clips.push(kenBurnsClip(imgPath, path.join(dir, `aiclip_${i}.mp4`), { vertical }));
    } catch {}
  }
  return clips.length >= 2 ? clips : null;
}
