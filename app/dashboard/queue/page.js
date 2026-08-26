'use client';
import { useEffect, useState } from 'react';

export default function Queue() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      // server restarting or offline — keep showing last known posts
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  async function remove(id) {
    await fetch('/api/posts', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const stats = {
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    posted: posts.filter((p) => p.status === 'posted').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  };

  return (
    <div>
      <h1>Post Queue</h1>
      <p className="sub">Everything scheduled and published. The worker checks for due posts every minute.</p>

      <div className="stat-grid">
        <div className="stat"><div className="num">{stats.scheduled}</div><div className="lbl">Scheduled</div></div>
        <div className="stat"><div className="num">{stats.posted}</div><div className="lbl">Posted</div></div>
        <div className="stat"><div className="num">{stats.failed}</div><div className="lbl">Failed</div></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead>
            <tr><th>Content</th><th>Media</th><th>Scheduled (UTC)</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="muted">Loading…</td></tr>}
            {!loading && posts.length === 0 && (
              <tr><td colSpan={5} className="muted">No posts yet. Generate some with AI or upload a video.</td></tr>
            )}
            {posts.map((p) => {
              let detail = '';
              try {
                const r = JSON.parse(p.result || '[]');
                detail = r.map((x) => `${x.ok ? '✓' : '✗'} ${x.detail}`).join('\n');
              } catch {}
              return (
                <tr key={p.id}>
                  <td style={{ maxWidth: 340, whiteSpace: 'pre-wrap' }}>
                    {(p.content || '').slice(0, 180)}{(p.content || '').length > 180 ? '…' : ''}
                    {detail && <div className="muted" style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap' }}>{detail}</div>}
                  </td>
                  <td>{p.media_path ? '🎬' : '—'}</td>
                  <td className="muted">{p.scheduled_at}</td>
                  <td><span className={`status ${p.status}`}>{p.status}</span></td>
                  <td>{p.status !== 'publishing' && <button className="btn danger small" onClick={() => remove(p.id)}>Delete</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
