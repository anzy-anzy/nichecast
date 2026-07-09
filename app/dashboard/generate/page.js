'use client';
import { useEffect, useState } from 'react';

export default function Generate() {
  const [form, setForm] = useState({ niche: '', topic: '', tone: 'engaging', platform: 'general', count: 5 });
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scheduledMsg, setScheduledMsg] = useState('');

  useEffect(() => {
    fetch('/api/accounts').then((r) => r.json()).then((d) => {
      setAccounts(d.accounts || []);
      setSelected((d.accounts || []).map((a) => a.id));
    });
  }, []);

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setPosts([]);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Generation failed.');
    setPosts(data.posts.map((p, i) => ({ ...p, key: i })));
  }

  function toggleAccount(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function schedule(post, hoursFromNow) {
    const when = new Date(Date.now() + hoursFromNow * 3600e3);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: post.content, account_ids: selected, scheduled_at: when.toISOString() }),
    });
    if (res.ok) {
      setPosts((ps) => ps.filter((p) => p.key !== post.key));
      setScheduledMsg(`Scheduled for ${when.toLocaleString()}. See it in the Post Queue.`);
      setTimeout(() => setScheduledMsg(''), 5000);
    }
  }

  return (
    <div>
      <h1>AI Generate</h1>
      <p className="sub">Describe your niche — get ready-to-post content. Review, then schedule with one click.</p>

      <div className="card">
        <form onSubmit={generate}>
          <div className="row">
            <div>
              <label>Niche</label>
              <input required placeholder="fitness coaching" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </div>
            <div>
              <label>Topic (optional)</label>
              <input placeholder="morning routines" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Tone</label>
              <select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                {['engaging', 'professional', 'funny', 'inspirational', 'educational', 'bold'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Platform style</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {['general', 'instagram', 'linkedin', 'twitter', 'tiktok caption', 'facebook'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>How many</label>
              <select value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })}>
                {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Generating…' : '✨ Generate posts'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>

      {posts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <label>Post to these accounts:</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {accounts.length === 0 && <span className="muted" style={{ fontSize: 14 }}>No accounts connected — add some in Accounts.</span>}
            {accounts.map((a) => (
              <span key={a.id} className={`platform-chip ${selected.includes(a.id) ? 'on' : ''}`} onClick={() => toggleAccount(a.id)}>
                {a.platform} · {a.handle}
              </span>
            ))}
          </div>
          {scheduledMsg && <p className="success">{scheduledMsg}</p>}
          {posts.map((p) => (
            <div className="gen-card" key={p.key}>
              {p.content}
              <div className="actions">
                <button className="btn small" onClick={() => schedule(p, 0)}>Post now</button>
                <button className="btn secondary small" onClick={() => schedule(p, 1)}>In 1 hour</button>
                <button className="btn secondary small" onClick={() => schedule(p, 24)}>Tomorrow</button>
                <button className="btn danger small" onClick={() => setPosts((ps) => ps.filter((x) => x.key !== p.key))}>Discard</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
