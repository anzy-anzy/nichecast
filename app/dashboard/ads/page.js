'use client';
import { useEffect, useState } from 'react';

const TEMPLATES = [
  { name: 'Treadmill walk (viral)', prompt: 'A faceless mannequin-like figure in a smooth matte black full-body suit walking confidently on a treadmill in a minimalist bright studio, wearing the product. Product advertisement style, soft studio lighting, steady camera, fashion showcase, smooth walking motion' },
  { name: '360° product showcase', prompt: 'The product slowly rotating on a pedestal in a premium studio with dramatic spotlight, cinematic product commercial, macro details, luxurious mood' },
  { name: 'Street style walk', prompt: 'A stylish person seen from behind (face never visible) wearing the product, walking through a vibrant city street at golden hour, cinematic fashion film, slow motion' },
  { name: 'Unboxing reveal', prompt: 'Elegant hands opening a premium box revealing the product inside with soft light rays, satisfying unboxing commercial, shallow depth of field' },
];

export default function ProductAds() {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState(TEMPLATES[0].prompt);
  const [format, setFormat] = useState('vertical');
  const [files, setFiles] = useState([]);
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

  async function submit(e) {
    e.preventDefault();
    if (!files.length) return setError('Upload at least one product photo.');
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const photos = [];
      for (const file of files.slice(0, 5)) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await up.json();
        if (!up.ok) throw new Error(d.error || 'Photo upload failed');
        photos.push(d.media_path);
      }
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, prompt, photos, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue ad');
      setMsg('Ad queued! The worker generates it in the background — watch below.');
      setFiles([]);
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
      <h1>🛍️ Product Ads</h1>
      <p className="sub">
        Upload product photos (clothes, caps, watches, hair, anything) + pick a scene — get an AI ad video.
        Without a FAL_KEY it builds a product slideshow (mock); with one it generates real AI video (~$0.30-1/video).
      </p>

      <div className="card">
        <form onSubmit={submit}>
          <label>Product photos (up to 5 — hold ⌘ to select several)</label>
          <input type="file" multiple accept=".jpg,.jpeg,.png" onChange={(e) => setFiles([...(e.target.files || [])].slice(0, 5))} />
          {files.length > 0 && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{files.map((f) => f.name).join(' · ')}</p>}

          <label>Ad title / product name</label>
          <input placeholder="Summer drop — red cap + white tee" value={title} onChange={(e) => setTitle(e.target.value)} />

          <label>Scene template</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {TEMPLATES.map((t) => (
              <span key={t.name} className={`platform-chip ${prompt === t.prompt ? 'on' : ''}`} onClick={() => setPrompt(t.prompt)}>
                {t.name}
              </span>
            ))}
          </div>

          <label>Scene prompt (edit freely — describe exactly what should happen)</label>
          <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

          <div className="row">
            <div>
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="vertical">Vertical (TikTok/Reels)</option>
                <option value="horizontal">Horizontal (YouTube)</option>
              </select>
            </div>
          </div>

          <button className="btn" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Queueing…' : '🎬 Generate ad video'}
          </button>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
        </form>
      </div>

      {ads.length > 0 && (
        <>
          <h2 style={{ margin: '32px 0 12px', fontSize: 20 }}>Your ads</h2>
          {ads.map((ad) => (
            <div className="card" key={ad.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <strong>{ad.title || `Ad #${ad.id}`}</strong>
                  <p className="muted" style={{ fontSize: 13, margin: '4px 0' }}>{ad.prompt.slice(0, 110)}…</p>
                  {ad.status === 'queued' && <span className="status scheduled">queued</span>}
                  {ad.status === 'processing' && <span className="status publishing">generating…</span>}
                  {ad.status === 'failed' && <p className="error">Failed: {ad.error}</p>}
                  {ad.status === 'ready' && (
                    <>
                      <video src={ad.video_path} controls style={{ width: '100%', maxWidth: 280, borderRadius: 8, marginTop: 8 }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        <button className="btn small" onClick={() => postAd(ad)}>Post now (all accounts)</button>
                        <a className="btn secondary small" href={ad.video_path} download>Download</a>
                      </div>
                    </>
                  )}
                </div>
                {ad.status !== 'processing' && <button className="btn danger small" onClick={() => remove(ad.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
