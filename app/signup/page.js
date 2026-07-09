'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', niche: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Something went wrong.');
    router.push('/dashboard');
  }

  return (
    <div className="auth-wrap">
      <Link href="/" className="logo">Niche<span>Cast</span></Link>
      <div className="card" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Create your account</h1>
        <p className="muted" style={{ fontSize: 14 }}>Free to start. No credit card.</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label>Password (6+ characters)</label>
          <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label>Your niche (e.g. fitness coaching, real estate, restaurants)</label>
          <input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="fitness coaching" />
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy} style={{ width: '100%', marginTop: 20 }}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent2)' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
