'use client';
import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setDone(true);
  }

  if (done) return <p className="success">You're on the list! 🎉</p>;

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto' }}>
      <input type="email" required placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn" style={{ flexShrink: 0 }}>Join</button>
    </form>
  );
}
