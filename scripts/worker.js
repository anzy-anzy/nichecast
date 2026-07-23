// Local scheduler loop: hits the worker endpoint every 60s so due posts get published.
// Run alongside `npm run dev`:  npm run worker
const URL = (process.env.APP_URL || 'http://localhost:3000') + '/api/worker';
const SECRET = process.env.WORKER_SECRET || '';

async function tick() {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: SECRET ? { authorization: `Bearer ${SECRET}` } : {},
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok || data.error) {
      console.error(
        new Date().toISOString(),
        `worker call failed: HTTP ${res.status}`,
        data.error || ''
      );
      if (res.status === 401) {
        console.error('  → WORKER_SECRET mismatch: the web service expects a different secret than this worker sends.');
      }
      return;
    }
    console.log(
      new Date().toISOString(),
      `tick ok — posts published: ${data.processed || 0}, videos rendered: ${data.videosRendered || 0}, ads: ${data.adsRendered || 0}, autopilot queued: ${data.autopilotQueued || 0}`
    );
    if (data.videos?.length) {
      for (const v of data.videos) {
        if (!v.ok) console.error('  video job failed:', v.error);
      }
    }
    if (data.posts?.length) {
      for (const p of data.posts) {
        for (const o of p.outcomes || []) {
          console.log(`  post ${p.postId} → ${o.platform}: ${o.ok ? 'OK' : 'FAILED — ' + o.detail}`);
        }
      }
    }
  } catch (e) {
    console.error(new Date().toISOString(), 'worker error:', e.message);
  }
}

console.log('NicheCast worker running — checking for due posts every 60s at', URL);
tick();
setInterval(tick, 60_000);
