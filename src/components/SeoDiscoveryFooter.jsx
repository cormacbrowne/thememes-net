import { useState } from 'react';
import { sfx } from '../utils/soundEngine';

export default function SeoDiscoveryFooter({
  onSelectCategory,
  onOpenBlankStudio,
  onSelectViewMode,
  onOpenRewards
}) {
  const [sharedSite, setSharedSite] = useState(false);

  const handleShareSite = () => {
    const shareUrl = window.location.origin;
    const shareText =
      '🔥 Check out THE MEMES.net — Community Meme Feed, HTML5 Meme Maker, plus Las Vegas 777 Slots, Meme Crush & Pinball!';
    navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(() => {});
    if (typeof navigator.share === 'function') {
      navigator
        .share({
          title: 'THE MEMES.net — Viral Memes & Cyber-Arcade',
          text: shareText,
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop(2);
    setSharedSite(true);
    setTimeout(() => setSharedSite(false), 2600);
  };

  return (
    <footer className="tm-seo-footer">
      <div className="tm-seo-footer-inner">
        {/* Viral Share & Add-to-iPhone-Home-Screen Banner */}
        <div className="tm-seo-viral-strip">
          <div>
            <strong style={{ color: '#facc15', fontSize: '14px' }}>
              📲 Love THE MEMES.net on iPhone or Android?
            </strong>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
              Tap <strong>Share → Add to Home Screen</strong> in Safari/Chrome for 1-tap full-screen meme browsing, or invite a friend!
            </div>
          </div>
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            onClick={handleShareSite}
          >
            {sharedSite ? '✅ Site Link Copied!' : '🚀 Share THE MEMES.net'}
          </button>
        </div>

        <div className="tm-seo-grid">
          <div>
            <div className="tm-logo-badge" style={{ display: 'inline-block', marginBottom: '10px' }}>
              THE MEMES.net
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
              <strong>THE MEMES.net</strong> is the #1 Community Meme Feed, Free HTML5 Meme Generator,
              and Cyber-Arcade Lounge featuring Las Vegas 777 Neon Slots, Meme Crush Saga, and Retro
              Pinball. Create, remix, and share memes with zero watermarks or paywalls.
            </p>
          </div>

          <div>
            <h3 className="tm-seo-heading">🔥 Trending Meme Categories</h3>
            <div className="tm-seo-links">
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('dank')}>
                #Dank Memes &amp; Shitposts
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('tech')}>
                #Programming, Coding &amp; Tech Memes
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('gaming')}>
                #Gaming &amp; Esports Memes
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('relatable')}>
                #Relatable 3AM &amp; Work Memes
              </button>
            </div>
          </div>

          <div>
            <h3 className="tm-seo-heading">🕹️ Side-Entertainment Games &amp; Tools</h3>
            <div className="tm-seo-links">
              <button type="button" className="tm-seo-link" onClick={() => onSelectViewMode('slots')}>
                🎰 Las Vegas 777 Neon Slot Machine
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectViewMode('crush')}>
                🍬 Meme Crush Saga (Match-3 Jelly Puzzle)
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectViewMode('pinball')}>
                🎱 Las Vegas Retro Pinball Machine
              </button>
              <button type="button" className="tm-seo-link" onClick={onOpenBlankStudio}>
                🎨 Free Online Meme Forge Studio 2.0
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectViewMode('battle')}>
                ⚔️ 1v1 King of the Hill Meme Arena
              </button>
              <button type="button" className="tm-seo-link" onClick={onOpenRewards}>
                🏆 Fair Token Vault &amp; Daily Quests
              </button>
            </div>
          </div>
        </div>

        {/* Crawlable FAQ Accordion for Google Rich Snippets */}
        <div className="tm-seo-faq">
          <h3 className="tm-seo-heading" style={{ marginBottom: '10px' }}>
            ❓ Frequently Asked Questions (Memes, Slots, Meme Crush &amp; Soundboard Guide)
          </h3>
          <div className="tm-seo-faq-grid">
            <details className="tm-faq-item">
              <summary>How do I make or remix a meme for free on THE MEMES.net?</summary>
              <p>
                Click <strong>+ Upload / Create</strong> or hit <strong>🧬 REMIX</strong> on any card to open
                the HTML5 Meme Forge Studio 2.0. Drag and drop any image, paste from clipboard (Ctrl+V),
                apply Deep Fry or VHS Glitch filters, and export high-resolution PNGs (+100 XP).
              </p>
            </details>
            <details className="tm-faq-item">
              <summary>How do the Vegas 777 Slot Machine and Meme Crush Saga work?</summary>
              <p>
                After browsing memes, open <strong>🎰 Vegas Slots</strong>, <strong>🍬 Meme Crush</strong>, or{' '}
                <strong>🎱 Vegas Pinball</strong> from the Side-Games bar. Pull the 3D chrome slot lever with
                Reel HOLD &amp; NUDGE, or shatter Crystal Jelly with 2×2 Seeking Rockets to earn fair Arcade Tokens!
              </p>
            </details>
          </div>
        </div>

        <div className="tm-seo-copyright">
          <span>© 2026 THE MEMES.net // Community Memes &amp; Cyber-Arcade</span>
          <span>🔒 Secured with OAuth 2.0 (Apple • Google • Facebook • Discord)</span>
        </div>
      </div>
    </footer>
  );
}
