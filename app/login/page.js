'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Login failed.');
    router.push('/dashboard');
  }

  return (
    <div className="auth-wrap">
      <Link href="/" className="logo">Niche<span>Cast</span></Link>
      <div className="card" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Welcome back</h1>
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label>Password</label>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy} style={{ width: '100%', marginTop: 20 }}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
          New here? <Link href="/signup" style={{ color: 'var(--accent2)' }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
