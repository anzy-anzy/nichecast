'use client';
import { useEffect, useState } from 'react';

const PROVIDERS = [
  { key: 'mock', label: 'Mock (no posting, testing only)' },
  { key: 'outstand', label: 'Outstand — recommended' },
  { key: 'postforme', label: 'Post for Me' },
  { key: 'blotato', label: 'Blotato' },
  { key: 'ayrshare', label: 'Ayrshare' },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState([]);
  const [values, setValues] = useState({});
  const [provider, setProvider] = useState('mock');
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/settings');
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setKeys(data.keys || []);
    setProvider(data.postingProvider || 'mock');
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const body = { ...values, POSTING_PROVIDER: provider };
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(data.error || 'Failed to save.');
    setMsg('Saved ✓ — takes effect on the next generation/post, no restart needed.');
    setValues({});
    load();
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (forbidden) {
    return (
      <div>
        <h1>🔑 API Keys</h1>
        <p className="sub">This page manages platform-wide API keys and is restricted to the account owner.</p>
      </div>
    );
  }

  const groups = [...new Set(keys.map((k) => k.group))];

  return (
    <div>
      <h1>🔑 API Keys</h1>
      <p className="sub">
        Paste or update the API keys that power every studio and posting provider — no code edits or Railway
        redeploys needed. Leave a field blank to keep the current value. Stored values override <code>.env.local</code>
        / Railway env vars automatically.
      </p>

      <form onSubmit={save}>
        <div className="card" style={{ marginBottom: 24 }}>
          <label>Posting provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            {PROVIDERS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>

        {groups.map((group) => (
          <div className="card" key={group} style={{ marginBottom: 24 }}>
            <strong style={{ fontSize: 15 }}>{group}</strong>
            {keys.filter((k) => k.group === group).map((k) => (
              <div key={k.key} style={{ marginTop: 14 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{k.label}</span>
                  <span
                    className="muted"
                    style={{ fontSize: 11, fontWeight: 400, textTransform: 'none' }}
                  >
                    {k.source === 'app' ? '● set in-app' : k.source === 'env' ? '● set via env var' : '○ not set'}
                    {k.masked ? ` (${k.masked})` : ''}
                  </span>
                </label>
                <input
                  type="password"
                  placeholder={k.masked ? `Currently: ${k.masked} — paste to replace` : 'Paste key…'}
                  value={values[k.key] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [k.key]: e.target.value }))}
                />
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{k.help}</p>
              </div>
            ))}
          </div>
        ))}

        <button className="btn" disabled={busy} style={{ marginBottom: 16 }}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {msg && <p className={msg.includes('✓') ? 'success' : 'error'}>{msg}</p>}
      </form>
    </div>
  );
}
