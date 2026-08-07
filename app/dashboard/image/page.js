'use client';
import { useEffect, useState } from 'react';

const MODELS = [
  { key: 'nano-banana-pro', name: 'Nano Banana Pro', icon: '🍌', gradient: 'linear-gradient(145deg, #2d2a1a, #e8d44d)', desc: 'Google, highest fidelity' },
  { key: 'seedream', name: 'Seedream', icon: '🌱', gradient: 'linear-gradient(145deg, #1a2d24, #4de88a)', desc: 'ByteDance, fast + cheap' },
  { key: 'flux', name: 'Flux Pro', icon: '⚡', gradient: 'linear-gradient(145deg, #241a2d, #a54de8)', desc: 'General purpose' },
];

const ASPECTS = [
  { key: '3:4', label: '3:4 — portrait' },
  { key: '9:16', label: '9:16 — story/reel' },
  { key: '16:9', label: '16:9 — landscape' },
  { key: '1:1', label: '1:1 — square' },
];

export default function ImageStudio() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('nano-banana-pro');
  const [aspect, setAspect] = useState('3:4');
  const [refFile, setRefFile] = useState(null);
  const [cost, setCost] = useState(null);
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/images');
    if (res.ok) setImages((await res.json()).images || []);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/images/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model }),
    })
      .then((r) => r.json())
      .then(setCost)
      .catch(() => {});
  }, [model]);

  async function submit(e) {
    e.preventDefault();
    if (!prompt) return setError('Describe the image you want.');
    setBusy(true);
    setError('');
    setMsg('');
    try {
      let ref_image_path = '';
      if (refFile) {
        const fd = new FormData();
        fd.append('file', refFile);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error || 'Reference image upload failed');
        ref_image_path = upData.media_path;
      }
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, model, aspect_ratio: aspect, ref_image_path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue image');
      setMsg(`Queued — ${data.creditsCharged} credits used. Watch below.`);
      setPrompt('');
      setRefFile(null);
      load();
    } catch (err) {
      setError(String(err.message || err));
    }
    setBusy(false);
  }

  async function remove(id) {
    await fetch('/api/images', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div>
      <h1>🖼️ Image Studio</h1>
      <p className="sub">Generate product shots, scene images, or edit a reference photo — pick a model, see the credit cost before you generate.</p>

      <div className="card">
        <form onSubmit={submit}>
          <label>Model — click a sample to select</label>
          <div className="tpl-grid" style={{ marginBottom: 8 }}>
            {MODELS.map((m) => (
              <div key={m.key} className={`tpl-card ${model === m.key ? 'on' : ''}`} onClick={() => setModel(m.key)}>
                <div className="tpl-thumb" style={{ background: m.gradient, aspectRatio: '4/3' }}>
                  {m.icon}
                </div>
                <div className="tpl-meta">
                  <div className="tpl-name">{m.name}</div>
                  <div className="tpl-desc">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <label>Prompt</label>
          <textarea rows={3} placeholder="A pair of white sneakers on a marble pedestal, soft studio lighting, product photography" value={prompt} onChange={(e) => setPrompt(e.target.value)} required />

          <label>Reference photo (optional — edits/restyles this image instead of generating from scratch)</label>
          <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setRefFile(e.target.files?.[0] || null)} />
          {refFile && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{refFile.name}</p>}

          <label>Aspect ratio</label>
          <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
            {ASPECTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>

          {cost && (
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Cost: <strong>{cost.credits} credits</strong> · balance: <strong>{cost.balance}</strong>{' '}
              {!cost.liveGeneration && '— no FAL_KEY set, will render a free placeholder instead'}
            </p>
          )}

          <button className="btn" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? 'Queueing…' : `✨ Generate${cost ? ` — ${cost.credits} credits` : ''}`}
          </button>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
        </form>
      </div>

      {images.length > 0 && (
        <>
          <h2 style={{ margin: '32px 0 12px', fontSize: 20 }}>Your images</h2>
          <div className="results-grid">
            {images.map((img) => (
              <div className="card" key={img.id} style={{ padding: 14 }}>
                <p className="muted" style={{ fontSize: 12.5, margin: '0 0 6px' }}>{img.prompt.slice(0, 90)}…</p>
                {img.status === 'queued' && <span className="status scheduled">queued</span>}
                {img.status === 'processing' && <span className="status publishing">generating…</span>}
                {img.status === 'failed' && <p className="error">Failed: {img.error}</p>}
                {img.status === 'ready' && (
                  <>
                    <img src={img.image_path} alt={img.prompt} style={{ width: '100%', borderRadius: 8, marginTop: 6, background: '#000' }} />
                    <div style={{ marginTop: 10 }}>
                      <a className="btn secondary small" href={img.image_path} download>Download</a>
                    </div>
                  </>
                )}
                {img.status !== 'processing' && <button className="btn danger small" onClick={() => remove(img.id)} style={{ marginTop: 8 }}>Delete</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
