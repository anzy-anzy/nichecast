'use client';
import { useEffect, useState } from 'react';

const MAX_FILES = 10;

export default function Upload() {
  const [items, setItems] = useState([]); // { file, caption }
  const [aiNiche, setAiNiche] = useState('');
  const [startWhen, setStartWhen] = useState('');
  const [gapHours, setGapHours] = useState(24);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/accounts').then((r) => r.json()).then((d) => {
      setAccounts(d.accounts || []);
      setSelected((d.accounts || []).map((a) => a.id));
    });
    const dt = new Date(Date.now() + 3600e3);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    setStartWhen(dt.toISOString().slice(0, 16));
  }, []);

  function pickFiles(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_FILES);
    setItems(files.map((file) => ({ file, caption: '' })));
    setError(files.length === MAX_FILES ? `Max ${MAX_FILES} files at a time.` : '');
  }

  function setCaption(i, caption) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, caption } : it)));
  }

  function toggleAccount(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit(e) {
    e.preventDefault();
    if (!items.length) return setError('Choose at least one video.');
    setBusy(true);
    setError('');
    setMsg('');
    let scheduled = 0;
    try {
      const start = new Date(startWhen);
      for (let i = 0; i < items.length; i++) {
        setProgress(`Uploading ${i + 1} of ${items.length}: ${items[i].file.name}`);
        const fd = new FormData();
        fd.append('file', items[i].file);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        const upData = await up.json();
        if (!up.ok) throw new Error(`${items[i].file.name}: ${upData.error || 'upload failed'}`);

        // AI caption with hashtags for files without a manual caption
        let caption = items[i].caption;
        if (!caption && aiNiche) {
          setProgress(`Writing AI caption ${i + 1} of ${items.length}…`);
          const cRes = await fetch('/api/caption', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ niche: aiNiche, hint: items[i].file.name.replace(/\.[^.]+$/, '') }),
          });
          if (cRes.ok) caption = (await cRes.json()).caption;
        }

        const when = new Date(start.getTime() + i * gapHours * 3600e3);
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            content: caption || items[i].file.name.replace(/\.[^.]+$/, ''),
            media_path: upData.media_path,
            account_ids: selected,
            scheduled_at: when.toISOString(),
          }),
        });
        if (!res.ok) throw new Error(`${items[i].file.name}: scheduling failed`);
        scheduled++;
      }
      setMsg(`✅ ${scheduled} video(s) uploaded and scheduled, one every ${gapHours}h starting ${new Date(startWhen).toLocaleString()}. See Post Queue.`);
      setItems([]);
    } catch (err) {
      setError(String(err.message || err) + (scheduled ? ` (${scheduled} were scheduled before the error)` : ''));
    }
    setProgress('');
    setBusy(false);
  }

  return (
    <div>
      <h1>Bulk Upload &amp; Schedule</h1>
      <p className="sub">Upload up to {MAX_FILES} videos at once — they'll be auto-scheduled one after another at your chosen interval.</p>

      <div className="card">
        <form onSubmit={submit}>
          <label>Videos (up to {MAX_FILES}) — hold ⌘ (Cmd) to select several files at once</label>
          <input type="file" multiple accept=".mp4,.mov,.webm,.jpg,.jpeg,.png,.gif" onChange={pickFiles} />

          <label>AI captions — enter your niche and captions with hashtags are written automatically for any file you leave blank</label>
          <input placeholder="e.g. gta vi fan clips (leave empty to use filenames)" value={aiNiche} onChange={(e) => setAiNiche(e.target.value)} />

          {items.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <span className="muted" style={{ fontSize: 13, flex: '0 0 200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i + 1}. {it.file.name}
                  </span>
                  <input placeholder="Caption (optional — filename used if empty)" value={it.caption} onChange={(e) => setCaption(i, e.target.value)} />
                </div>
              ))}
            </div>
          )}

          <div className="row" style={{ marginTop: 4 }}>
            <div>
              <label>First post goes out at</label>
              <input type="datetime-local" value={startWhen} onChange={(e) => setStartWhen(e.target.value)} />
            </div>
            <div>
              <label>Then one every</label>
              <select value={gapHours} onChange={(e) => setGapHours(Number(e.target.value))}>
                <option value={1}>1 hour</option>
                <option value={3}>3 hours</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours (daily)</option>
                <option value={48}>2 days</option>
              </select>
            </div>
          </div>

          <label>Post to</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {accounts.length === 0 && <span className="muted" style={{ fontSize: 14 }}>No accounts connected — add some in Accounts.</span>}
            {accounts.map((a) => (
              <span key={a.id} className={`platform-chip ${selected.includes(a.id) ? 'on' : ''}`} onClick={() => toggleAccount(a.id)}>
                {a.platform} · {a.handle}
              </span>
            ))}
          </div>

          <button className="btn" disabled={busy || !items.length} style={{ marginTop: 20 }}>
            {busy ? progress || 'Uploading…' : `📤 Upload & schedule ${items.length || ''} video(s)`}
          </button>
          {msg && <p className="success">{msg}</p>}
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}
