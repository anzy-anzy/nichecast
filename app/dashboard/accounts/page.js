'use client';
import { useEffect, useState } from 'react';

const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter', 'youtube', 'threads', 'pinterest'];

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ platform: 'instagram', handle: '', external_id: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data.accounts || []);
  }
  useEffect(() => { load(); }, []);

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
        Connect your socials once in your Blotato dashboard, then register each one here with its Blotato
        account ID. In mock mode you can add anything to test the flow.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={add}>
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
              <label>Blotato account ID (optional in mock mode)</label>
              <input placeholder="e.g. 1234" value={form.external_id} onChange={(e) => setForm({ ...form, external_id: e.target.value })} />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 16 }}>Connect account</button>
          {msg && <p className="success">{msg}</p>}
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
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
    </div>
  );
}
