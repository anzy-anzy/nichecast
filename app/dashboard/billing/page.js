import { getCurrentUser } from '@/lib/auth';
import { getPlan, PLANS, videosUsedThisMonth } from '@/lib/plans';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function Billing() {
  const user = getCurrentUser();
  const plan = getPlan(user);
  const used = videosUsedThisMonth(getDb(), user.id);
  const links = {
    publisher: process.env.PAYMENT_LINK_PUBLISHER || '',
    creator: process.env.PAYMENT_LINK_CREATOR || '',
    autopilot: process.env.PAYMENT_LINK_AUTOPILOT || '',
    studio: process.env.PAYMENT_LINK_STUDIO || '',
  };

  return (
    <div>
      <h1>💳 Billing &amp; Plan</h1>
      <p className="sub">Your current plan, usage this month, and upgrades.</p>

      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14 }} className="muted">Current plan</p>
        <p style={{ fontSize: 28, fontWeight: 800 }}>{plan.name}</p>
        <div className="stat-grid" style={{ marginTop: 16, marginBottom: 0 }}>
          <div className="stat">
            <div className="num">{used}{plan.videoLimitPerMonth ? `/${plan.videoLimitPerMonth}` : ''}</div>
            <div className="lbl">AI videos this month</div>
          </div>
          <div className="stat">
            <div className="num">{plan.accountLimit}</div>
            <div className="lbl">Account limit</div>
          </div>
          <div className="stat">
            <div className="num">{plan.canUploadPost ? '✓' : '—'}</div>
            <div className="lbl">Upload &amp; auto-post</div>
          </div>
        </div>
      </div>

      <div className="pricing" style={{ padding: 0 }}>
        {['publisher', 'creator', 'autopilot', 'studio'].map((key) => {
          const p = PLANS[key];
          const isCurrent = user.plan === key;
          return (
            <div className="card price-card" key={key} style={isCurrent ? { borderColor: 'var(--green)' } : {}}>
              <div className="tier">{p.name}</div>
              <div className="price">${p.price}<small>/mo</small></div>
              <ul>
                {p.canGenerateVideos && <li>{p.videoLimitPerMonth} AI videos / month</li>}
                {p.canUploadPost && <li>Upload &amp; auto-post</li>}
                {p.autopilot && <li>🤖 Autopilot: daily auto-generate + post</li>}
                <li>{p.accountLimit} connected accounts</li>
              </ul>
              {isCurrent ? (
                <span className="btn secondary" style={{ width: '100%', textAlign: 'center', opacity: 0.6 }}>Current plan</span>
              ) : links[key] ? (
                <a href={links[key]} className="btn" style={{ width: '100%', textAlign: 'center' }}>Upgrade</a>
              ) : (
                <span className="btn secondary" style={{ width: '100%', textAlign: 'center', opacity: 0.6 }}>Checkout coming soon</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
        Payments are handled securely by our payment provider. Questions? Email support.
      </p>
    </div>
  );
}
