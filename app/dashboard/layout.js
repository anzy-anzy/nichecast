import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getBalance } from '@/lib/credits';
import LogoutButton from './logout-button';
import ChatWidget from './chat-widget';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }) {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  const credits = getBalance(user.id);

  return (
    <div className="dash">
      <aside className="sidebar">
        <Link href="/" className="logo">Niche<span>Cast</span></Link>

        <Link
          href="/dashboard/billing"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '8px 12px', margin: '0 4px 16px', fontSize: 13,
          }}
        >
          <span>💰 {credits.toLocaleString()} credits</span>
          <span style={{ color: 'var(--accent2)', fontWeight: 700, fontSize: 12 }}>Top up →</span>
        </Link>

        <Link href="/dashboard/video" className="navlink">🎥 Faceless Studio</Link>
        <Link href="/dashboard/ads" className="navlink">🛍️ Marketing Studio</Link>
        <Link href="/dashboard/creator" className="navlink">🧑‍🎤 Creator Studio</Link>
        <Link href="/dashboard/image" className="navlink">🖼️ Image Studio</Link>
        <Link href="/dashboard" className="navlink">📋 Post Queue</Link>
        <Link href="/dashboard/generate" className="navlink">✨ Captions (bonus)</Link>
        <Link href="/dashboard/accounts" className="navlink">🔗 Accounts &amp; Voices</Link>
        <Link href="/dashboard/billing" className="navlink">💳 Billing</Link>
        <div style={{ marginTop: 24, padding: '0 12px' }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8, wordBreak: 'break-all' }}>{user.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
      <ChatWidget />
    </div>
  );
}
