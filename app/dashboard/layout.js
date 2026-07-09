import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import LogoutButton from './logout-button';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }) {
  const user = getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="dash">
      <aside className="sidebar">
        <Link href="/" className="logo">Niche<span>Cast</span></Link>
        <Link href="/dashboard/video" className="navlink">🎥 Video Studio</Link>
        <Link href="/dashboard/ads" className="navlink">🛍️ Product Ads</Link>
        <Link href="/dashboard/upload" className="navlink">📤 Bulk Upload</Link>
        <Link href="/dashboard" className="navlink">📋 Post Queue</Link>
        <Link href="/dashboard/generate" className="navlink">✨ Captions (bonus)</Link>
        <Link href="/dashboard/accounts" className="navlink">🔗 Accounts</Link>
        <Link href="/dashboard/billing" className="navlink">💳 Billing</Link>
        <div style={{ marginTop: 24, padding: '0 12px' }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8, wordBreak: 'break-all' }}>{user.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
