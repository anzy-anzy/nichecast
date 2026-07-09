'use client';
import { useEffect, useState } from 'react';

const STEPS = ['Writing script', 'Generating voice-over', 'Sourcing visuals', 'Editing video + subtitles', 'Writing SEO title, description, tags', 'Generating thumbnail'];

export default function VideoStudio() {
  const [niche, setNiche] = useState('');
  const [brief, setBrief] = useState('');
  const [refUrl, setRefUrl] = useState('');
  const [format, setFormat] = useState('vertical');
  const [duration, setDuration] = useState(45);
  const [visualStyle, setVisualStyle] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [trends, setTrends] = useState(null);
  const [videos, setVideos] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [ap, setAp] = useState({ enabled: false, niche: '', per_day: 3 });
  const [apMsg, setApMsg] = useState('');

  async function loadVideos() {
    const res = await fetch('/api/videos');
    if (res.ok) setVideos((await res.json()).videos || []);
  }
  useEffect(() => {
    loadVideos();
    fetch('/api/accounts').then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
    fetch('/api/autopilot').then((r) => r.json()).then((d) => d && !d.error && setAp(d));
    const t = setInterval(loadVideos, 8000);
    return () => clearInterval(t);
  }, []);

  async function saveAutopilot(next) {
    setApMsg('');
    const res = await fetch('/api/autopilot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (!res.ok) return setApMsg(data.error || 'Failed to save.');
    setAp(next);
    setApMsg(next.enabled ? `✅ Autopilot ON — ${next.per_day} video(s)/day for "${next.niche}", generated and posted automatically.` : 'Autopilot off.');
  }

  async function research(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setIdeas([]);
    const res = await fetch('/api/videos/ideas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ niche, brief }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Research failed.');
    setIdeas(data.ideas || []);
    setTrends(data.trends);
  }

  async function generate(idea) {
    setError('');
    setMsg('');
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ niche, idea: idea.idea, format, duration_target: duration, brief, visual_style: visualStyle }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Failed to queue video.');
    setMsg('Video queued! The worker renders it in the background (keep `npm run worker` running). Watch progress below.');
    loadVideos();
  }

  async function schedule(video, hoursFromNow) {
    const when = new Date(Date.now() + hoursFromNow * 3600e3);
    const res = await fetch('/api/videos/schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ video_id: video.id, account_ids: accounts.map((a) => a.id), scheduled_at: when.toISOString() }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Scheduling failed');
    setMsg(`Scheduled for ${when.toLocaleString()} — see Post Queue.`);
  }

  async function remove(id) {
    await fetch('/api/videos', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    loadVideos();
  }

  return (
    <div>
      <h1>🎥 Video Studio</h1>
      <p className="sub">Faceless videos on autopilot: trend research → script → voice-over → visuals → subtitles → thumbnail → SEO → schedule.</p>

      <div className="card">
        <form onSubmit={research}>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label>Your niche</label>
              <input required placeholder="gta vi fan clips" value={niche} onChange={(e) => setNiche(e.target.value)} />
            </div>
            <div>
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="vertical">Vertical (Shorts/TikTok/Reels)</option>
                <option value="horizontal">Horizontal (YouTube)</option>
              </select>
            </div>
            <div>
              <label>Length</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value={30}>~30 sec</option>
                <option value={45}>~45 sec</option>
                <option value={60}>~60 sec</option>
                <option value={90}>~90 sec</option>
              </select>
            </div>
            <div>
              <label>Visual style</label>
              <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)}>
                <option value="">Stock footage (real video)</option>
                <option value="cartoon">🎨 Cartoon (AI images)</option>
                <option value="anime">🎌 Anime (AI images)</option>
                <option value="3d render, pixar style">🧸 3D animated (AI images)</option>
                <option value="cinematic realistic digital art">🎬 Cinematic art (AI images)</option>
                <option value="pixel art, retro game style">👾 Pixel art (AI images)</option>
                <option value="comic book style">💥 Comic book (AI images)</option>
              </select>
            </div>
          </div>
          <label>What is your niche about? (optional but recommended — keeps ideas on-topic)</label>
          <textarea
            rows={2}
            placeholder="e.g. GTA 6 news, leaks and fan theories for hardcore Rockstar fans — hype tone, no finance talk"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <button className="btn" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Researching trends…' : '🔎 Research trends & get video ideas'}
          </button>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}

          <label style={{ marginTop: 20 }}>Or paste a video link to make one like it (YouTube / TikTok / Vimeo)</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input placeholder="https://www.youtube.com/watch?v=..." value={refUrl} onChange={(e) => setRefUrl(e.target.value)} />
            <button
              type="button"
              className="btn secondary"
              disabled={busy || !refUrl || !niche}
              style={{ flexShrink: 0 }}
              onClick={async () => {
                setBusy(true);
                setError('');
                const res = await fetch('/api/videos/similar', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ url: refUrl, niche }),
                });
                const data = await res.json();
                setBusy(false);
                if (!res.ok) return setError(data.error || 'Failed to analyze link.');
                setIdeas((prev) => [data.idea, ...prev]);
                setRefUrl('');
              }}
            >
              🎯 Make one like this
            </button>
          </div>
          {!niche && refUrl && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Enter your niche above first.</p>}
        </form>
      </div>

      <div className="card" style={{ marginTop: 20, borderColor: ap.enabled ? 'var(--green)' : 'var(--border)' }}>
        <strong>🤖 Autopilot</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 10px' }}>
          Fully hands-off: every day, NicheCast researches your niche, generates videos, and posts them to all your connected accounts. No clicks needed.
        </p>
        <div className="row">
          <div style={{ flex: 2 }}>
            <label>Autopilot niche</label>
            <input placeholder="fitness tips" value={ap.niche} onChange={(e) => setAp({ ...ap, niche: e.target.value })} />
          </div>
          <div>
            <label>Videos per day</label>
            <select value={ap.per_day} onChange={(e) => setAp({ ...ap, per_day: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className={`btn ${ap.enabled ? 'danger' : ''}`}
              style={{ width: '100%' }}
              onClick={() => saveAutopilot({ ...ap, enabled: !ap.enabled })}
            >
              {ap.enabled ? 'Turn off' : '🤖 Turn on Autopilot'}
            </button>
          </div>
        </div>
        {apMsg && <p className={apMsg.startsWith('✅') ? 'success' : 'muted'} style={{ marginTop: 8, fontSize: 13 }}>{apMsg}</p>}
      </div>

      {trends && (
        <p className="muted" style={{ fontSize: 13, margin: '14px 0 0' }}>
          {trends.live
            ? `📈 Live trend data used${trends.google?.length ? ` — trending now: ${trends.google.slice(0, 5).join(', ')}` : ''}`
            : 'ℹ️ No live trend data reachable — ideas from AI niche knowledge.'}
        </p>
      )}

      {ideas.map((idea, i) => (
        <div className="gen-card" key={i}>
          <strong>{idea.idea}</strong>
          {'\n'}Hook: “{idea.hook}”
          {'\n'}<span className="muted">Why now: {idea.why}</span>
          <div className="actions">
            <button className="btn small" onClick={() => generate(idea)}>🎬 Generate this video</button>
          </div>
        </div>
      ))}

      {videos.length > 0 && (
        <>
          <h2 style={{ margin: '32px 0 12px', fontSize: 20 }}>Your videos</h2>
          {videos.map((v) => (
            <div className="card" key={v.id} style={{ marginBottom: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 110px' }}>
                {v.thumb_path ? (
                  <img src={v.thumb_path} alt="" style={{ width: 110, borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 110, height: v.format === 'horizontal' ? 62 : 196, background: 'var(--panel2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎬</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <strong>{v.seo_title || v.idea}</strong>
                <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>{v.niche} · {v.format} · ~{v.duration_target}s</p>
                {v.status === 'processing' && (
                  <p style={{ fontSize: 14 }}>
                    <span className="status publishing">rendering</span>{' '}
                    {v.step} ({Math.max(1, STEPS.indexOf(v.step) + 1)}/6)
                  </p>
                )}
                {v.status === 'queued' && <span className="status scheduled">queued — worker will pick it up</span>}
                {v.status === 'failed' && <p className="error">Failed: {v.error}</p>}
                {v.status === 'ready' && (
                  <>
                    <video src={v.video_path} controls style={{ width: '100%', maxWidth: 300, borderRadius: 8, marginTop: 6 }} />
                    {v.seo_description && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{v.seo_description.slice(0, 160)}…</p>}
                    {v.tags && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Tags: {(JSON.parse(v.tags || '[]')).slice(0, 8).join(', ')}</p>}
                    {v.next_suggestion && <p style={{ fontSize: 13, marginTop: 6 }}>💡 Next video idea: {v.next_suggestion}</p>}
                    <div className="actions" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn small" onClick={() => schedule(v, 0)}>Post now (all accounts)</button>
                      <button className="btn secondary small" onClick={() => schedule(v, 1)}>In 1 hour</button>
                      <button className="btn secondary small" onClick={() => schedule(v, 24)}>Tomorrow</button>
                      <a className="btn secondary small" href={v.video_path} download>Download</a>
                    </div>
                  </>
                )}
              </div>
              <div>
                {v.status !== 'processing' && <button className="btn danger small" onClick={() => remove(v.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
