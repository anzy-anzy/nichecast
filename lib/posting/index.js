import { mockProvider } from './mock';
import { blotatoProvider } from './blotato';
import { ayrshareProvider } from './ayrshare';
import { getDb } from '../db';

export function getProvider() {
  const name = (process.env.POSTING_PROVIDER || 'mock').toLowerCase();
  if (name === 'blotato') return blotatoProvider;
  if (name === 'ayrshare') return ayrshareProvider;
  return mockProvider;
}

// Finds due scheduled posts and publishes them to each selected account.
// Called by /api/worker (cron) and scripts/worker.js (local loop).
export async function processDuePosts() {
  const db = getDb();
  const provider = getProvider();
  const due = db
    .prepare(`SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= datetime('now')`)
    .all();

  const results = [];
  for (const post of due) {
    db.prepare(`UPDATE posts SET status = 'publishing' WHERE id = ?`).run(post.id);
    const accountIds = JSON.parse(post.account_ids || '[]');
    const accounts = accountIds.length
      ? db
          .prepare(
            `SELECT * FROM accounts WHERE user_id = ? AND id IN (${accountIds.map(() => '?').join(',')})`
          )
          .all(post.user_id, ...accountIds)
      : db.prepare(`SELECT * FROM accounts WHERE user_id = ?`).all(post.user_id);

    const mediaUrl = post.media_path
      ? `${process.env.APP_URL || 'http://localhost:3000'}${post.media_path}`
      : null;

    const outcomes = [];
    for (const account of accounts) {
      try {
        const r = await provider.publish({ account, content: post.content, mediaUrl });
        outcomes.push({ platform: account.platform, ok: true, detail: r.detail, id: r.externalPostId });
      } catch (e) {
        outcomes.push({ platform: account.platform, ok: false, detail: String(e.message || e) });
      }
    }

    const allOk = outcomes.length > 0 && outcomes.every((o) => o.ok);
    db.prepare(`UPDATE posts SET status = ?, result = ? WHERE id = ?`).run(
      allOk ? 'posted' : outcomes.length ? 'failed' : 'failed',
      JSON.stringify(outcomes.length ? outcomes : [{ ok: false, detail: 'No connected accounts' }]),
      post.id
    );
    results.push({ postId: post.id, outcomes });
  }
  return results;
}
