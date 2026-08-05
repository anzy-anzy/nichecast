'use client';
import { useEffect, useState } from 'react';

const AD_TEMPLATES = [
  {
    name: 'Treadmill walk (viral)',
    desc: 'Faceless model walking, studio lighting',
    icon: '🏃',
    gradient: 'linear-gradient(145deg, #232946, #4b4e6d)',
    prompt: 'A faceless mannequin-like figure in a smooth matte black full-body suit walking confidently on a treadmill in a minimalist bright studio, wearing the product. Product advertisement style, soft studio lighting, steady camera, fashion showcase, smooth walking motion',
  },
  {
    name: '360° product showcase',
    desc: 'Rotating pedestal, dramatic spotlight',
    icon: '💎',
    gradient: 'linear-gradient(145deg, #3a2e1a, #b8860b)',
    prompt: 'The product slowly rotating on a pedestal in a premium studio with dramatic spotlight, cinematic product commercial, macro details, luxurious mood',
  },
  {
    name: 'Street style walk',
    desc: 'City street, golden hour, cinematic',
    icon: '🚶',
    gradient: 'linear-gradient(145deg, #6a3a2c, #e07a5f)',
    prompt: 'A stylish person seen from behind (face never visible) wearing the product, walking through a vibrant city street at golden hour, cinematic fashion film, slow motion',
  },
  {
    name: 'Unboxing reveal',
    desc: 'Soft light rays, satisfying reveal',
    icon: '🎁',
    gradient: 'linear-gradient(145deg, #4a3b52, #d9a5b3)',
    prompt: 'Elegant hands opening a premium box revealing the product inside with soft light rays, satisfying unboxing commercial, shallow depth of field',
  },
];

const MODES = [
  { key: 'ad', icon: '📦', name: 'Product Ad', desc: 'Turn product photos into a scene-based ad video, pick a template below' },
  { key: 'property_tour', icon: '🏠', name: 'Property / Restaurant Tour', desc: 'Upload each room\'s photo, get one flowing walkthrough video' },
  { key: 'similar', icon: '🔗', name: 'Make One Like This', desc: 'Paste a reference video link, get an AI video inspired by its style' },
];

const RES_INFO = { '480p': 'Cheapest', '720p': 'Recommended', '1080p': 'Sharpest' };

export default function MarketingStudio() {
  const [mode, setMode] = useState('ad'); // 'ad' | 'property_tour' | 'similar'
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState(AD_TEMPLATES[0].prompt);
  const [format, setFormat] = useState('vertical');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(8);
  const [files, setFiles] = useState([]);
  const [refUrl, setRefUrl] = useState('');
  const [refNotes, setRefNotes] = useState('');
  const [cost, setCost] = useState(null);
  const [ads, setAds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/ads');
    if (res.ok) setAds((await res.json()).ads || []);
  }
  useEffect(() => {
    load();
    fetch('/api/accounts').then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/estimate-cost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolution, duration: mode === 'property_tour' ? duration : duration }),
    })
      .then((r) => r.json())
      .then(setCost)
      .catch(() => {});
  }, [resolution, duration, mode]);

  async function uploadFiles(fileList) {
    const paths = [];
    for (const file of fileList) {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await up.json();
      if (!up.ok) throw new Error(d.error || 'Photo upload failed');
      paths.push(d.media_path);
    }
    return paths;
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      if (mode === 'similar') {
        if (!refUrl) throw new Error('Paste a video link.');
        const res = await fetch('/api/ads/similar', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: refUrl, notes: refNotes, resolution, duration, format }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setMsg(`Queued — inspired by "${data.refTitle}". Watch below.`);
        setRefUrl('');
        setRefNotes('');
      } else {
        if (!files.length) throw new Error(mode === 'property_tour' ? 'Upload at least 2 room/area photos.' : 'Upload at least one product photo.');
        const photos = await uploadFiles(files.slice(0, 8));
        const res = await fetch('/api/ads', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title, prompt, photos, format, resolution, duration, mode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to queue');
        setMsg('Queued! Rendering in the background — watch below.');
        setFiles([]);
      }
      load();
    } catch (err) {
      setError(String(err.message || err));
    }
    setBusy(false);
  }

  async function postAd(ad) {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: ad.title || 'New drop 🔥',
        media_path: ad.video_path,
        account_ids: accounts.map((a) => a.id),
        scheduled_at: new Date().toISOString(),
        ai_generated: true,
      }),
    });
    if (res.ok) setMsg('Posted to queue — see Post Queue.');
  }

  async function remove(id) {
    await fetch('/api/ads', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div>
      <h1>🛍️ Marketing Studio</h1>
      <p className="sub">AI ad videos, property/restaurant tours, or "make one like this" from a link — pick resolution and duration, see the cost before you generate.</p>

      <div className="mode-grid">
        {MODES.map((m) => (
          <div key={m.key} className={`mode-card ${mode === m.key ? 'on' : ''}`} onClick={() => setMode(m.key)}>
            <div className="icon">{m.icon}</div>
            <div className="name">{m.name}</div>
            <div className="desc">{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <form onSubmit={submit}>
          {mode !== 'similar' && (
            <>
              <label>{mode === 'property_tour' ? 'Room / area photos (2-8 — hold ⌘ to select several)' : 'Product photos (up to 5)'}</label>
              <input type="file" multiple accept=".jpg,.jpeg,.png" onChange={(e) => setFiles([...(e.target.files || [])].slice(0, 8))} />
              {files.length > 0 && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{files.map((f) => f.name).join(' · ')}</p>}

              <label>Title</label>
              <input placeholder={mode === 'property_tour' ? 'Modern 3-bedroom villa, Douala' : 'Summer drop — red cap + white tee'} value={title} onChange={(e) => setTitle(e.target.value)} />

              {mode === 'ad' && (
                <>
                  <label>Scene template — click a sample to use its style</label>
                  <div className="tpl-grid" style={{ marginBottom: 8 }}>
                    {AD_TEMPLATES.map((t) => (
                      <div key={t.name} className={`tpl-card ${prompt === t.prompt ? 'on' : ''}`} onClick={() => setPrompt(t.prompt)}>
                        <div className="tpl-thumb" style={{ background: t.gradient }}>
                          {t.icon}
                          <span className="play">▶</span>
                        </div>
                        <div className="tpl-meta">
                          <div className="tpl-name">{t.name}</div>
                          <div className="tpl-desc">{t.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <label>{mode === 'property_tour' ? 'Tour style / description' : 'Scene prompt (edit freely)'}</label>
              <textarea
                rows={3}
                value={mode === 'property_tour' ? (prompt.startsWith('A faceless') ? '' : prompt) : prompt}
                placeholder={mode === 'property_tour' ? 'Bright, spacious, modern finishes, natural light throughout' : ''}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </>
          )}

          {mode === 'similar' && (
            <>
              <label>Paste a video link (YouTube / TikTok / Vimeo)</label>
              <input placeholder="https://www.youtube.com/watch?v=..." value={refUrl} onChange={(e) => setRefUrl(e.target.value)} />
              <label>Anything to change or add? (optional)</label>
              <input placeholder="e.g. use our product colors, more energetic" value={refNotes} onChange={(e) => setRefNotes(e.target.value)} />
            </>
          )}

          <div className="row">
            <div>
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="vertical">Vertical (TikTok/Reels)</option>
                <option value="horizontal">Horizontal (YouTube)</option>
              </select>
            </div>
            <div>
              <label>Resolution</label>
              <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                <option value="480p">480p — {RES_INFO['480p']}</option>
                <option value="720p">720p — {RES_INFO['720p']}</option>
                <option value="1080p">1080p — {RES_INFO['1080p']}</option>
              </select>
            </div>
            <div>
              <label>Duration</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[5, 8, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}s</option>)}
              </select>
            </div>
          </div>

          {cost && (
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Estimated cost: <strong>${cost.cost}</strong>{' '}
              {!cost.liveGeneration && '— no FAL_KEY set, will render a free mock preview instead'}
            </p>
          )}

          <button className="btn" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Queueing…' : '🎬 Generate video'}
          </button>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
        </form>
      </div>

      {ads.length > 0 && (
        <>
          <h2 style={{ margin: '32px 0 12px', fontSize: 20 }}>Your videos</h2>
          <div className="results-grid">
            {ads.map((ad) => (
              <div className="card" key={ad.id} style={{ padding: 14 }}>
                <strong style={{ fontSize: 14 }}>{ad.title || `Video #${ad.id}`}</strong>
                <p className="muted" style={{ fontSize: 12.5, margin: '4px 0' }}>
                  {ad.mode === 'property_tour' ? '🏠 Property tour' : ad.mode === 'similar' ? '🔗 Inspired video' : '📦 Product ad'} · {ad.resolution} · {ad.duration}s
                </p>
                {ad.status === 'queued' && <span className="status scheduled">queued</span>}
                {ad.status === 'processing' && <span className="status publishing">generating…</span>}
                {ad.status === 'failed' && <p className="error">Failed: {ad.error}</p>}
                {ad.status === 'ready' && (
                  <>
                    <video src={ad.video_path} controls style={{ width: '100%', aspectRatio: '9/12', objectFit: 'cover', borderRadius: 8, marginTop: 8, background: '#000' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="btn small" onClick={() => postAd(ad)}>Post now</button>
                      <a className="btn secondary small" href={ad.video_path} download>Download</a>
                    </div>
                  </>
                )}
                {ad.status !== 'processing' && (
                  <button className="btn danger small" onClick={() => remove(ad.id)} style={{ marginTop: 8 }}>Delete</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
