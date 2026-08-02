'use client';
import { useEffect, useState } from 'react';

const SCENARIOS = [
  'Sitting at a modern office desk, talking to camera, professional lighting',
  'Sitting in a cozy remote-work home setup with a laptop, talking to camera',
  'Walking down a lively city street, talking to camera, handheld style',
  'Standing in a bright kitchen, talking to camera',
  'Sitting outdoors in a park on a sunny day, talking to camera',
];

export default function CreatorStudio() {
  const [characters, setCharacters] = useState([]);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [charBusy, setCharBusy] = useState(false);
  const [charMsg, setCharMsg] = useState('');

  const [characterId, setCharacterId] = useState('');
  const [script, setScript] = useState('');
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(8);
  const [cost, setCost] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [videos, setVideos] = useState([]);

  async function loadCharacters() {
    const res = await fetch('/api/characters');
    if (res.ok) setCharacters((await res.json()).characters || []);
  }
  async function loadVideos() {
    const res = await fetch('/api/creator-videos');
    if (res.ok) setVideos((await res.json()).videos || []);
  }
  useEffect(() => {
    loadCharacters();
    loadVideos();
    const t = setInterval(loadVideos, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/estimate-cost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolution, duration }),
    })
      .then((r) => r.json())
      .then((d) => setCost(d))
      .catch(() => {});
  }, [resolution, duration]);

  async function createCharacter(e) {
    e.preventDefault();
    if (!photo) return setCharMsg('Choose a clear reference photo.');
    setCharBusy(true);
    setCharMsg('');
    try {
      const fd = new FormData();
      fd.append('file', photo);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || 'Photo upload failed');
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, photo_path: upData.media_path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create character');
      setCharMsg(`Character "${name}" created ✓`);
      setName('');
      setPhoto(null);
      loadCharacters();
    } catch (err) {
      setCharMsg(String(err.message || err));
    }
    setCharBusy(false);
  }

  async function removeCharacter(id) {
    await fetch('/api/characters', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    loadCharacters();
  }

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    const res = await fetch('/api/creator-videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ character_id: characterId || null, script, scenario, resolution, duration }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Failed to queue video.');
    setMsg('Queued! Rendering in the background — watch below.');
    setScript('');
    loadVideos();
  }

  async function remove(id) {
    await fetch('/api/creator-videos', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    loadVideos();
  }

  return (
    <div>
      <h1>🧑‍💼 Creator Studio</h1>
      <p className="sub">
        Create a reusable digital version of yourself (or a client) from one photo, then place them in any scenario —
        office, remote-work desk, walking down a street. The same character can be reused in Marketing Studio ads too.
      </p>
      <p className="sub" style={{ marginTop: -12, fontSize: 13 }}>
        ℹ️ This describes the <em>action and mood</em> for the scene (not word-for-word lip-synced dialogue — true
        talking-avatar lip-sync is a separate, pricier add-on we can wire in later if you need it).
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <strong>Your characters</strong>
        <form onSubmit={createCharacter} style={{ marginTop: 12 }}>
          <div className="row">
            <div>
              <label>Character name</label>
              <input placeholder="e.g. Anzy, or client's name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label>Reference photo (clear face, good lighting)</label>
              <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPhoto(e.target.files?.[0] || null)} required />
            </div>
          </div>
          <button className="btn" disabled={charBusy} style={{ marginTop: 12 }}>
            {charBusy ? 'Creating…' : '+ Create character'}
          </button>
          {charMsg && <p className={charMsg.includes('✓') ? 'success' : 'error'}>{charMsg}</p>}
        </form>

        {characters.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            {characters.map((c) => (
              <div key={c.id} style={{ textAlign: 'center' }}>
                <img src={c.photo_path} alt={c.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                <p style={{ fontSize: 12, marginTop: 4 }}>{c.name}</p>
                <button className="btn danger small" onClick={() => removeCharacter(c.id)} style={{ marginTop: 4 }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <form onSubmit={generate}>
          <label>Character (optional — without one, generates from text only)</label>
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
            <option value="">No character (text-to-video)</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label>Describe the action / mood (not literal spoken dialogue)</label>
          <textarea rows={3} placeholder="Confidently explaining a quick tip, smiling, hand gestures, energetic" value={script} onChange={(e) => setScript(e.target.value)} required />

          <label>Scenario</label>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Or describe your own scenario…" value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ marginTop: 8 }} />

          <div className="row">
            <div>
              <label>Resolution</label>
              <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                <option value="480p">480p — cheapest</option>
                <option value="720p">720p — recommended</option>
                <option value="1080p">1080p — sharpest</option>
              </select>
            </div>
            <div>
              <label>Duration (sec)</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[5, 8, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}s</option>)}
              </select>
            </div>
          </div>

          {cost && (
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Estimated cost: <strong>${cost.cost}</strong>{' '}
              {!cost.liveGeneration && '— no FAL_KEY set, will render a free mock preview instead'}
            </p>
          )}

          <button className="btn" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? 'Queueing…' : '🎬 Generate'}
          </button>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
        </form>
      </div>

      {videos.length > 0 && (
        <>
          <h2 style={{ margin: '32px 0 12px', fontSize: 20 }}>Your videos</h2>
          {videos.map((v) => (
            <div className="card" key={v.id} style={{ marginBottom: 14 }}>
              <strong>{v.title || v.script.slice(0, 60)}</strong>
              <p className="muted" style={{ fontSize: 13, margin: '4px 0' }}>{v.resolution} · {v.duration}s</p>
              {v.status === 'queued' && <span className="status scheduled">queued</span>}
              {v.status === 'processing' && <span className="status publishing">generating…</span>}
              {v.status === 'failed' && <p className="error">Failed: {v.error}</p>}
              {v.status === 'ready' && (
                <>
                  <video src={v.video_path} controls style={{ width: '100%', maxWidth: 280, borderRadius: 8, marginTop: 8 }} />
                  <div style={{ marginTop: 10 }}>
                    <a className="btn secondary small" href={v.video_path} download>Download</a>
                  </div>
                </>
              )}
              {v.status !== 'processing' && <button className="btn danger small" onClick={() => remove(v.id)} style={{ marginTop: 10 }}>Delete</button>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
