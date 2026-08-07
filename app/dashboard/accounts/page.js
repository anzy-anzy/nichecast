'use client';
import { useEffect, useState } from 'react';

const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter', 'youtube', 'threads', 'pinterest'];
const PLATFORM_LABEL = {
  instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', linkedin: 'LinkedIn',
  twitter: 'X (Twitter)', youtube: 'YouTube', threads: 'Threads', pinterest: 'Pinterest',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ platform: 'instagram', handle: '', external_id: '' });
  const [msg, setMsg] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) setMsg('Account connected ✓');
    if (params.get('connect_error')) setMsg(params.get('connect_error'));
    if (params.get('connected') || params.get('connect_error')) {
      window.history.replaceState({}, '', '/dashboard/accounts');
    }
  }, []);

  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');

  const [pronunciations, setPronunciations] = useState([]);
  const [pWord, setPWord] = useState('');
  const [pReplacement, setPReplacement] = useState('');
  const [pMsg, setPMsg] = useState('');

  async function load() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data.accounts || []);
  }
  async function loadVoices() {
    const res = await fetch('/api/voices');
    if (res.ok) setVoices((await res.json()).voices || []);
  }
  async function loadPronunciations() {
    const res = await fetch('/api/pronunciations');
    if (res.ok) setPronunciations((await res.json()).pronunciations || []);
  }
  useEffect(() => { load(); loadVoices(); loadPronunciations(); }, []);

  async function addPronunciation(e) {
    e.preventDefault();
    setPMsg('');
    const res = await fetch('/api/pronunciations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ word: pWord, replacement: pReplacement }),
    });
    const data = await res.json();
    if (!res.ok) return setPMsg(data.error || 'Failed.');
    setPWord('');
    setPReplacement('');
    setPMsg('Added ✓');
    loadPronunciations();
  }

  async function removePronunciation(id) {
    await fetch('/api/pronunciations', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    loadPronunciations();
  }

  async function cloneVoice(e) {
    e.preventDefault();
    if (!voiceFile) return setVoiceMsg('Record or upload a short (30s+) voice sample first.');
    setVoiceBusy(true);
    setVoiceMsg('');
    try {
      const fd = new FormData();
      fd.append('file', voiceFile);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || 'Upload failed');
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: voiceName, sample_media_path: upData.media_path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cloning failed');
      setVoiceMsg(`Voice "${voiceName}" cloned ✓ — select it in Video Studio or Creator Studio.`);
      setVoiceName('');
      setVoiceFile(null);
      loadVoices();
    } catch (err) {
      setVoiceMsg(String(err.message || err));
    }
    setVoiceBusy(false);
  }

  async function removeVoice(id) {
    await fetch('/api/voices', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    loadVoices();
  }

  async function add(e) {
    e.preventDefault();
    setMsg('');
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ platform: 'instagram', handle: '', external_id: '' });
      setMsg('Account connected.');
      load();
    } else {
      const d = await res.json();
      setMsg(d.error || 'Failed.');
    }
  }

  async function remove(id) {
    await fetch('/api/accounts', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div>
      <h1>Connected Accounts</h1>
      <p className="sub">
        Click a platform below — you'll be sent straight to that platform's own login screen to approve access,
        then brought right back here. No separate dashboard, no copying IDs by hand.
      </p>
      {msg && <p className={msg.includes('✓') ? 'success' : 'error'}>{msg}</p>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PLATFORMS.map((p) => (
            <a key={p} className="btn" href={`/api/accounts/connect?platform=${p}`} style={{ textDecoration: 'none' }}>
              + Connect {PLATFORM_LABEL[p]}
            </a>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
          One-time setup: this requires an Outstand account (outstand.so) with <code>OUTSTAND_API_KEY</code> and{' '}
          <code>OUTSTAND_ORG_ID</code> set, and your app's callback URL added to Outstand's allowed redirect URIs.
        </p>

        <button type="button" className="btn secondary small" style={{ marginTop: 16 }} onClick={() => setShowManual((s) => !s)}>
          {showManual ? 'Hide manual / advanced entry' : 'Manual entry (Bluesky, mock mode, or other providers)'}
        </button>

        {showManual && (
          <form onSubmit={add} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <div className="row">
              <div>
                <label>Platform</label>
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label>Handle / page name</label>
                <input required placeholder="@yourbrand" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
              </div>
              <div>
                <label>Provider account ID (optional in mock mode)</label>
                <input placeholder="e.g. 1234" value={form.external_id} onChange={(e) => setForm({ ...form, external_id: e.target.value })} />
              </div>
            </div>
            <button className="btn" style={{ marginTop: 16 }}>Add account</button>
          </form>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: 24 }}>
        <table>
          <thead><tr><th>Platform</th><th>Handle</th><th>Provider ID</th><th></th></tr></thead>
          <tbody>
            {accounts.length === 0 && <tr><td colSpan={4} className="muted">No accounts connected yet.</td></tr>}
            {accounts.map((a) => (
              <tr key={a.id}>
                <td style={{ textTransform: 'capitalize' }}>{a.platform}</td>
                <td>{a.handle}</td>
                <td className="muted">{a.external_id || '—'}</td>
                <td><button className="btn danger small" onClick={() => remove(a.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h1 style={{ fontSize: 22 }}>🎙️ Cloned Voices</h1>
      <p className="sub">
        Record yourself (or a native speaker) saying a few sentences clearly. Your cloned voice gets names and
        local words right every time — no more AI mispronunciation. Select it in Video Studio or Creator Studio.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={cloneVoice}>
          <div className="row">
            <div>
              <label>Voice name</label>
              <input required placeholder="My voice" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} />
            </div>
            <div>
              <label>Sample recording (30s+ of clear speech, .mp3/.m4a as audio-in-video works too)</label>
              <input type="file" accept="audio/*,.mp3,.wav,.m4a,.mp4" onChange={(e) => setVoiceFile(e.target.files?.[0] || null)} required />
            </div>
          </div>
          <button className="btn" disabled={voiceBusy} style={{ marginTop: 12 }}>
            {voiceBusy ? 'Cloning…' : '+ Clone this voice'}
          </button>
          {voiceMsg && <p className={voiceMsg.includes('✓') ? 'success' : 'error'}>{voiceMsg}</p>}
        </form>
      </div>

      {voices.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: 24 }}>
          <table>
            <thead><tr><th>Name</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {voices.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td><span className={`status ${v.status === 'ready' ? 'posted' : v.status === 'failed' ? 'failed' : 'scheduled'}`}>{v.status}</span></td>
                  <td><button className="btn danger small" onClick={() => removeVoice(v.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h1 style={{ fontSize: 22 }}>🗣️ Pronunciation Dictionary</h1>
      <p className="sub">
        Fix AI mispronunciation of Cameroonian/African names and words without re-cloning a voice. Define how a
        word should sound phonetically — it's swapped in right before the voice-over speaks it (subtitles keep the
        original spelling). Works with cloned voices and OpenAI voices.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={addPronunciation}>
          <div className="row">
            <div>
              <label>Word or name (as written)</label>
              <input required placeholder="e.g. Ébolowa" value={pWord} onChange={(e) => setPWord(e.target.value)} />
            </div>
            <div>
              <label>Phonetic spelling (how it should sound)</label>
              <input required placeholder="e.g. Eh-boh-loh-vah" value={pReplacement} onChange={(e) => setPReplacement(e.target.value)} />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 12 }}>+ Add pronunciation</button>
          {pMsg && <p className={pMsg.includes('✓') ? 'success' : 'error'}>{pMsg}</p>}
        </form>
      </div>

      {pronunciations.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>Word</th><th>Pronounced as</th><th></th></tr></thead>
            <tbody>
              {pronunciations.map((p) => (
                <tr key={p.id}>
                  <td>{p.word}</td>
                  <td className="muted">{p.replacement}</td>
                  <td><button className="btn danger small" onClick={() => removePronunciation(p.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
