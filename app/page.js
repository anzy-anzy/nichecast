import Link from 'next/link';
import WaitlistForm from './waitlist-form';

// Paste your Paddle / Lemon Squeezy / Flutterwave payment links in .env.local
// (PAYMENT_LINK_PUBLISHER, PAYMENT_LINK_CREATOR, PAYMENT_LINK_STUDIO) and the
// buttons below will point to real checkout automatically.
function payLink(envVal) {
  return envVal || '/signup';
}

export default function Landing() {
  const links = {
    publisher: payLink(process.env.PAYMENT_LINK_PUBLISHER),
    creator: payLink(process.env.PAYMENT_LINK_CREATOR),
    autopilot: payLink(process.env.PAYMENT_LINK_AUTOPILOT),
    studio: payLink(process.env.PAYMENT_LINK_STUDIO),
  };

  return (
    <div>
      <div className="container">
        <nav className="nav">
          <span className="logo">Niche<span>Cast</span></span>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" className="btn secondary">Log in</Link>
            <Link href="/signup" className="btn">Start free</Link>
          </div>
        </nav>

        <section className="hero">
          <h1>Faceless videos for your niche, <em>posted everywhere</em></h1>
          <p>
            NicheCast researches what's trending in your niche, writes the script, generates the voice-over,
            edits the video with subtitles, creates the thumbnail and SEO — then posts it to YouTube, TikTok,
            Instagram and more. On schedule. On autopilot.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/signup" className="btn" style={{ fontSize: 17, padding: '14px 28px' }}>Create your first video free →</Link>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>3 free videos · No credit card required</p>
        </section>

        <section className="features">
          <div className="card feature">
            <h3>🔎 Trend research built in</h3>
            <p>Live trending-topic data matched to your niche, so every video rides what people are searching for this week — not last year.</p>
          </div>
          <div className="card feature">
            <h3>🎥 Full faceless pipeline</h3>
            <p>Idea → script → AI voice-over → stock visuals → auto-edit with subtitles → thumbnail → SEO title, description and tags. One click.</p>
          </div>
          <div className="card feature">
            <h3>📤 Bulk upload &amp; schedule</h3>
            <p>Have your own videos? Upload 10 at once and auto-schedule them — one a day, or whatever rhythm you choose.</p>
          </div>
          <div className="card feature">
            <h3>🔁 Never run out of ideas</h3>
            <p>After every video, NicheCast suggests the next one based on what you just published. Your content calendar fills itself.</p>
          </div>
        </section>

        <h2 className="section-title">Pick the plan that fits</h2>
        <p className="section-sub">Generate videos, distribute your own, or both.</p>
        <section className="pricing">
          <div className="card price-card">
            <div className="tier">Publisher</div>
            <div className="price">$29<small>/mo</small></div>
            <ul>
              <li>Upload &amp; auto-post your videos</li>
              <li>Bulk scheduling (10 at a time)</li>
              <li>5 connected accounts</li>
              <li>All platforms, one queue</li>
            </ul>
            <a href={links.publisher} className="btn secondary" style={{ width: '100%', textAlign: 'center' }}>Start free</a>
          </div>
          <div className="card price-card" style={{ borderColor: 'var(--accent)' }}>
            <div className="badge-popular">Most popular</div>
            <div className="tier">Creator</div>
            <div className="price">$99<small>/mo</small></div>
            <ul>
              <li>30 faceless videos / month</li>
              <li>Trend research + scripts + voice</li>
              <li>Subtitles, thumbnails &amp; SEO</li>
              <li>3 connected accounts</li>
            </ul>
            <a href={links.creator} className="btn" style={{ width: '100%', textAlign: 'center' }}>Start free</a>
          </div>
          <div className="card price-card">
            <div className="tier">Autopilot</div>
            <div className="price">$100<small>/mo</small></div>
            <ul>
              <li>🤖 Fully hands-off</li>
              <li>3 videos generated &amp; posted daily</li>
              <li>Trend research every day</li>
              <li>3 connected accounts</li>
            </ul>
            <a href={links.autopilot} className="btn secondary" style={{ width: '100%', textAlign: 'center' }}>Start free</a>
          </div>
          <div className="card price-card">
            <div className="tier">Studio</div>
            <div className="price">$119<small>/mo</small></div>
            <ul>
              <li>Everything in all plans</li>
              <li>60 faceless videos / month</li>
              <li>10 connected accounts</li>
              <li>Priority support</li>
            </ul>
            <a href={links.studio} className="btn secondary" style={{ width: '100%', textAlign: 'center' }}>Start free</a>
          </div>
        </section>

        <section style={{ paddingBottom: 80 }}>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <h2 style={{ marginBottom: 8 }}>Not ready yet? Join the waitlist</h2>
            <p className="muted" style={{ marginBottom: 20 }}>Get launch updates and early-bird pricing.</p>
            <WaitlistForm />
          </div>
        </section>
      </div>
      <footer>© {new Date().getFullYear()} NicheCast — faceless videos for your niche, posted everywhere.</footer>
    </div>
  );
}
