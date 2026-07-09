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
    const data = await res.json();
    if (data.processed > 0) {
      console.log(new Date().toISOString(), 'published', data.processed, 'post(s)');
    }
  } catch (e) {
    console.error(new Date().toISOString(), 'worker error:', e.message);
  }
}

console.log('NicheCast worker running — checking for due posts every 60s at', URL);
tick();
setInterval(tick, 60_000);
