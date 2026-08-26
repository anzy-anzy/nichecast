// Shared fal.ai video generation engine — powers Marketing Studio, Creator
// Studio and any "real AI video" (not slideshow) generation in the app.
// Pay-as-you-go: no subscription, billed per generation from your fal.ai
// credit balance. Without FAL_KEY, callers get null and should fall back
// to the free slideshow/mock path.
//
// fal.ai hosts all of these under ONE api key — no separate deals needed
// with Google (Veo) or ByteDance (Seedance). Exact model slugs occasionally
// change on fal.ai's side; override any of them via env vars below if a
// default stops resolving (check fal.ai/models for the current slug).
// FAL_KEY itself can be set from Settings > API Keys in-app (see lib/settings.js).

import { envOrSetting } from '../settings';

export const VIDEO_MODELS = {
  kling: {
    label: 'Kling (balanced, default)',
    rateSec: { '480p': 0.045, '720p': 0.10, '1080p': 0.13 },
    imageModel: {
      '480p': process.env.FAL_MODEL_480P || 'fal-ai/kling-video/v2.1/standard/image-to-video',
      '720p': process.env.FAL_MODEL_720P || 'fal-ai/kling-video/v2.1/standard/image-to-video',
      '1080p': process.env.FAL_MODEL_1080P || 'fal-ai/kling-video/v2.1/pro/image-to-video',
    },
    textModel: {
      '480p': process.env.FAL_TEXT_MODEL_480P || 'fal-ai/kling-video/v2.1/standard/text-to-video',
      '720p': process.env.FAL_TEXT_MODEL_720P || 'fal-ai/kling-video/v2.1/standard/text-to-video',
      '1080p': process.env.FAL_TEXT_MODEL_1080P || 'fal-ai/kling-video/v2.1/pro/text-to-video',
    },
  },
  seedance: {
    label: 'Seedance (ByteDance, fastest + cheapest)',
    rateSec: { '480p': 0.02, '720p': 0.03, '1080p': 0.05 },
    imageModel: {
      '480p': process.env.FAL_SEEDANCE_480P || 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
      '720p': process.env.FAL_SEEDANCE_720P || 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
      '1080p': process.env.FAL_SEEDANCE_1080P || 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
    },
    textModel: {
      '480p': process.env.FAL_SEEDANCE_TEXT_480P || 'fal-ai/bytedance/seedance/v1/lite/text-to-video',
      '720p': process.env.FAL_SEEDANCE_TEXT_720P || 'fal-ai/bytedance/seedance/v1/lite/text-to-video',
      '1080p': process.env.FAL_SEEDANCE_TEXT_1080P || 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
    },
  },
  veo: {
    label: 'Veo 3.1 (Google, premium quality)',
    rateSec: { '480p': 0.4, '720p': 0.4, '1080p': 0.4 },
    imageModel: {
      '480p': process.env.FAL_VEO_480P || 'fal-ai/veo3.1/fast/image-to-video',
      '720p': process.env.FAL_VEO_720P || 'fal-ai/veo3.1/image-to-video',
      '1080p': process.env.FAL_VEO_1080P || 'fal-ai/veo3.1/image-to-video',
    },
    textModel: {
      '480p': process.env.FAL_VEO_TEXT_480P || 'fal-ai/veo3.1/fast',
      '720p': process.env.FAL_VEO_TEXT_720P || 'fal-ai/veo3.1',
      '1080p': process.env.FAL_VEO_TEXT_1080P || 'fal-ai/veo3.1',
    },
  },
};

// Kept for any old caller that imports the flat rate table directly.
const RATE_PER_SEC = VIDEO_MODELS.kling.rateSec;

export function estimateCost({ model = 'kling', resolution = '720p', duration = 8 }) {
  const catalog = VIDEO_MODELS[model] || VIDEO_MODELS.kling;
  const rate = catalog.rateSec[resolution] || catalog.rateSec['720p'];
  return Math.round(rate * duration * 100) / 100; // USD, 2dp
}

export function hasFalKey() {
  return !!envOrSetting('FAL_KEY');
}

// imageUrl: optional data: URI or https URL for image-to-video (e.g. a
// character reference photo or product photo). Without it, uses text-to-video.
export async function falGenerateVideo({ prompt, model = 'kling', resolution = '720p', duration = 8, imageUrl }) {
  const key = envOrSetting('FAL_KEY');
  if (!key) return null;

  const catalog = VIDEO_MODELS[model] || VIDEO_MODELS.kling;
  const modelSlug = imageUrl ? catalog.imageModel[resolution] : catalog.textModel[resolution];
  const headers = { 'content-type': 'application/json', authorization: `Key ${key}` };
  const body = {
    prompt,
    duration: String(Math.min(Math.max(duration, 3), 30)),
    aspect_ratio: '9:16',
  };
  if (imageUrl) body.image_url = imageUrl;

  const submit = await fetch(`https://queue.fal.run/${modelSlug}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!submit.ok) throw new Error(`fal.ai submit ${submit.status}: ${(await submit.text()).slice(0, 300)}`);
  const { status_url, response_url } = await submit.json();

  // poll up to ~6 minutes (longer/1080p generations take longer)
  for (let i = 0; i < 72; i++) {
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
  const dl = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!dl.ok) throw new Error('Failed downloading generated video');
  return Buffer.from(await dl.arrayBuffer());
}
