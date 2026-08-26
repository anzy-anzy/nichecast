import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getBalance } from '@/lib/credits';
import LogoutButton from './logout-button';
import ChatWidget from './chat-widget';
import NavLinks from './nav-links';

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
            background: 'linear-gradient(145deg, var(--panel2), var(--panel))',
            border: '1px solid var(--border)', borderRadius: 10,
            padding: '8px 12px', margin: '0 4px 16px', fontSize: 13,
            transition: 'border-color .15s',
          }}
        >
          <span>💰 <strong>{credits.toLocaleString()}</strong> credits</span>
          <span style={{ color: 'var(--accent2)', fontWeight: 700, fontSize: 12 }}>Top up →</span>
        </Link>

        <NavLinks />
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
