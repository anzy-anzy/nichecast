'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: '🏠 Home', exact: true },
  { href: '/dashboard/video', label: '🎥 Faceless Studio' },
  { href: '/dashboard/ads', label: '🛍️ Marketing Studio' },
  { href: '/dashboard/creator', label: '🧑‍🎤 Creator Studio' },
  { href: '/dashboard/image', label: '🖼️ Image Studio' },
  { href: '/dashboard/queue', label: '📋 Post Queue' },
  { href: '/dashboard/generate', label: '✨ Captions (bonus)' },
  { href: '/dashboard/accounts', label: '🔗 Accounts & Voices' },
  { href: '/dashboard/billing', label: '💳 Billing' },
  { href: '/dashboard/settings', label: '🔑 API Keys' },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`navlink${active ? ' active' : ''}`}>
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
