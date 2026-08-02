// Shared fal.ai video generation engine — powers Marketing Studio, Creator
// Studio and any "real AI video" (not slideshow) generation in the app.
// Pay-as-you-go: no subscription, billed per generation from your fal.ai
// credit balance. Without FAL_KEY, callers get null and should fall back
// to the free slideshow/mock path.

// Approximate per-second pricing (fal.ai, USD) — used only to SHOW an
// estimate to the user before they spend credit. Real cost is set by fal.ai.
const RATE_PER_SEC = {
  '480p': 0.045,
  '720p': 0.1,
  '1080p': 0.13,
};

const MODEL_BY_RES = {
  '480p': process.env.FAL_MODEL_480P || 'fal-ai/kling-video/v2.1/standard/image-to-video',
  '720p': process.env.FAL_MODEL_720P || 'fal-ai/kling-video/v2.1/standard/image-to-video',
  '1080p': process.env.FAL_MODEL_1080P || 'fal-ai/kling-video/v2.1/pro/image-to-video',
};

const TEXT_MODEL_BY_RES = {
  '480p': process.env.FAL_TEXT_MODEL_480P || 'fal-ai/kling-video/v2.1/standard/text-to-video',
  '720p': process.env.FAL_TEXT_MODEL_720P || 'fal-ai/kling-video/v2.1/standard/text-to-video',
  '1080p': process.env.FAL_TEXT_MODEL_1080P || 'fal-ai/kling-video/v2.1/pro/text-to-video',
};

export function estimateCost({ resolution = '720p', duration = 8 }) {
  const rate = RATE_PER_SEC[resolution] || RATE_PER_SEC['720p'];
  return Math.round(rate * duration * 100) / 100; // USD, 2dp
}

export function hasFalKey() {
  return !!process.env.FAL_KEY;
}

// imageDataUri: optional data: URI or https URL for image-to-video (e.g. a
// character reference photo or product photo). Without it, uses text-to-video.
export async function falGenerateVideo({ prompt, resolution = '720p', duration = 8, imageUrl }) {
  const key = process.env.FAL_KEY;
  if (!key) return null;

  const model = imageUrl ? MODEL_BY_RES[resolution] : TEXT_MODEL_BY_RES[resolution];
  const headers = { 'content-type': 'application/json', authorization: `Key ${key}` };
  const body = {
    prompt,
    duration: String(Math.min(Math.max(duration, 3), 30)),
    aspect_ratio: '9:16',
  };
  if (imageUrl) body.image_url = imageUrl;

  const submit = await fetch(`https://queue.fal.run/${model}`, {
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
