import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getBalance } from '@/lib/credits';
import { getPlan, videosUsedThisMonth } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const STUDIOS = [
  {
    href: '/dashboard/video',
    icon: '🎥',
    name: 'Faceless Studio',
    gradient: 'linear-gradient(145deg, #232946, #4b4e6d)',
    desc: 'Niche → trend research → script → voice-over → visuals → subtitles → SEO → schedule. Up to 2 minutes.',
    badges: ['Autopilot', 'Voice cloning'],
  },
  {
    href: '/dashboard/ads',
    icon: '🛍️',
    name: 'Marketing Studio',
    gradient: 'linear-gradient(145deg, #3a2e1a, #b8860b)',
    desc: 'Product ads, property/restaurant tours, or "make one like this" from a reference link.',
    badges: ['Kling', 'Seedance', 'Veo 3.1'],
  },
  {
    href: '/dashboard/creator',
    icon: '🧑‍🎤',
    name: 'Creator Studio',
    gradient: 'linear-gradient(145deg, #1f2a44, #4a6fa5)',
    desc: 'Turn one photo into a reusable digital Character, then place them in any scenario.',
    badges: ['Kling', 'Seedance', 'Veo 3.1'],
  },
  {
    href: '/dashboard/image',
    icon: '🖼️',
    name: 'Image Studio',
    gradient: 'linear-gradient(145deg, #2d2a1a, #e8d44d)',
    desc: 'Text-to-image, or edit/restyle a reference photo — product shots, ad stills, graphics.',
    badges: ['Nano Banana Pro', 'Seedream', 'Flux'],
  },
];

export default function StudioHub() {
  const user = getCurrentUser();
  const db = getDb();
  const plan = getPlan(user);
  const credits = getBalance(user.id);
  const videosThisMonth = videosUsedThisMonth(db, user.id);
  const accountCount = db.prepare('SELECT COUNT(*) AS n FROM accounts WHERE user_id = ?').get(user.id)?.n || 0;
  const queued = db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND status = 'scheduled'`).get(user.id)?.n || 0;

  return (
    <div>
      <h1>Studios</h1>
      <p className="sub">Pick a studio to generate video, images, or voice — everything renders in the background and can post itself.</p>

      <div className="stat-grid">
        <div className="stat"><div className="num">💰 {credits.toLocaleString()}</div><div className="lbl">Credits</div></div>
        <div className="stat"><div className="num">{videosThisMonth}{plan.videoLimitPerMonth ? `/${plan.videoLimitPerMonth}` : ''}</div><div className="lbl">Faceless videos this month</div></div>
        <div className="stat"><div className="num">{accountCount}</div><div className="lbl">Connected accounts</div></div>
        <div className="stat"><div className="num">{queued}</div><div className="lbl">Posts scheduled</div></div>
      </div>

      <div className="mode-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {STUDIOS.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
            <div className="tpl-card" style={{ borderRadius: 16 }}>
              <div className="tpl-thumb" style={{ background: s.gradient, aspectRatio: '16/9', fontSize: 40 }}>
                {s.icon}
              </div>
              <div className="tpl-meta" style={{ padding: '14px 16px' }}>
                <div className="tpl-name" style={{ fontSize: 16, marginBottom: 4 }}>{s.name}</div>
                <div className="tpl-desc" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{s.desc}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.badges.map((b) => (
                    <span key={b} style={{ fontSize: 11, background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px', color: 'var(--muted)' }}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
