// Phase 33 task 33.11: Crawlable standalone page for /rules, /terms, /privacy, /takedown, /contact.
import { useState } from 'react';
import { LEGAL_PAGES, LEGAL_ROUTE_PATHS } from '../data/legalPages';
import { getSupabaseClient } from '../supabaseClient';
import { submitTakedownRequest } from '../utils/serverWrites';
import './LegalInfoPage.css';

export default function LegalInfoPage({ pathname }) {
  const cleanPath = String(pathname || '/rules').replace(/\/+$/, '').toLowerCase() || '/rules';
  const page = LEGAL_PAGES[cleanPath] || LEGAL_PAGES['/rules'];

  const [kind, setKind] = useState('photo_of_me');
  const [targetUrl, setTargetUrl] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  const handleSubmitTakedown = async (e) => {
    e.preventDefault();
    setFormMsg('');
    if (!targetUrl.trim() || details.trim().length < 5) {
      setFormMsg('⚠️ Please enter the meme URL/ID and a brief explanation (at least 5 characters).');
      return;
    }
    setSubmitting(true);
    const res = await submitTakedownRequest(getSupabaseClient(), {
      targetUrl,
      kind,
      requesterEmail,
      details
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormMsg(res.message);
      return;
    }
    setTargetUrl('');
    setDetails('');
    setFormMsg(
      res.memeId
        ? `✅ High-priority takedown logged (#${String(res.id).slice(0, 8)}). That post has also been escalated in the moderation queue.`
        : `✅ High-priority takedown logged (#${String(res.id).slice(0, 8)}) for moderator review.`
    );
  };

  return (
    <div className="tm-legal-page">
      <div className="tm-legal-shell">
        <header className="tm-legal-header">
          <a href="/" className="tm-legal-back">
            ← Back to Memes &amp; Arcade
          </a>
          <span className="tm-legal-draft" role="note">
            📝 {page.badge}
          </span>
        </header>

        <nav className="tm-legal-nav" aria-label="Safety and legal pages">
          {LEGAL_ROUTE_PATHS.map((routePath) => (
            <a
              key={routePath}
              href={routePath}
              className={`tm-legal-nav-link ${page.path === routePath ? 'is-active' : ''}`}
            >
              {LEGAL_PAGES[routePath].navLabel}
            </a>
          ))}
        </nav>

        <main className="tm-legal-card">
          <h1>{page.h1}</h1>
          <p className="tm-legal-sub">{page.subtitle}</p>

          {page.sections.map((sec) => (
            <section key={sec.heading} className="tm-legal-section">
              <h2>{sec.heading}</h2>
              <ul>
                {sec.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}

          {page.path === '/takedown' && (
            <section className="tm-legal-section" aria-label="Takedown request form">
              <h2>📝 Submit High-Priority Takedown</h2>
              <form className="tm-legal-form" onSubmit={handleSubmitTakedown}>
                <label>
                  <span>Request Type</span>
                  <select value={kind} onChange={(e) => setKind(e.target.value)} className="tm-legal-input">
                    <option value="photo_of_me">🙅 This is a picture of me / private photo</option>
                    <option value="copyright">©️ Copyright / DMCA infringement</option>
                    <option value="privacy">🔒 Personal info / doxxing removal</option>
                    <option value="other">🛡️ Other urgent legal or safety request</option>
                  </select>
                </label>

                <label>
                  <span>Meme URL or ID (e.g. https://www.thememes.net/m/...)</span>
                  <input
                    type="text"
                    className="tm-legal-input"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://www.thememes.net/m/..."
                    maxLength={500}
                    required
                  />
                </label>

                <label>
                  <span>Contact Email (optional, for confirmation)</span>
                  <input
                    type="email"
                    className="tm-legal-input"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={200}
                  />
                </label>

                <label>
                  <span>Details &amp; Ownership / Identity Note</span>
                  <textarea
                    className="tm-legal-input"
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Explain what should be removed and why..."
                    maxLength={1000}
                    required
                  />
                </label>

                <button type="submit" className="tm-legal-submit" disabled={submitting}>
                  {submitting ? '⏳ Submitting High-Priority Report...' : '🚨 Submit High-Priority Takedown'}
                </button>

                {formMsg && (
                  <div className="tm-legal-form-msg" role="status" aria-live="polite">
                    {formMsg}
                  </div>
                )}
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
