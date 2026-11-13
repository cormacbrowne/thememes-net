import { useState } from 'react';
import { sfx } from '../utils/soundEngine';
import { trackShareClicked } from '../utils/analytics';

export default function SeoDiscoveryFooter({
  onSelectCategory,
  onOpenBlankStudio,
  onOpenGifStudio,
  onOpenTemplateStudio,
  onOpenSoundboard,
  onOpenPrankDisguise,
  onSelectViewMode,
  onOpenRewards
}) {
  const [sharedSite, setSharedSite] = useState(false);

  const handleShareSite = () => {
    const shareUrl = window.location.origin;
    const shareText =
      '🔥 Check out THE MEMES.net — Community Meme Feed, Free Meme Generator, Soundboard & Retro Arcade Games!';
    navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(() => {});
    if (typeof navigator.share === 'function') {
      navigator
        .share({
          title: 'THE MEMES.net — Free Meme Generator, Soundboard & Retro Arcade Games',
          text: shareText,
          url: shareUrl
        })
        .catch(() => {});
    }
    trackShareClicked(null, 'site_footer');
    sfx.playPop(2);
    setSharedSite(true);
    setTimeout(() => setSharedSite(false), 2600);
  };

  const handleSpaLinkClick = (e, fn) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (fn) fn();
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
              <strong>THE MEMES.net</strong> is a community meme feed, free HTML5 Meme Generator with
              20+ blank templates, 16-pad Vine Boom Soundboard, and retro Cyber-Arcade featuring Neon
              Coin Dozer &apos;86, Retro Pinball, Vegas 777 Slots, Meme Crush Saga, and MEMEDAQ &apos;86.
            </p>
          </div>

          <div>
            <h3 className="tm-seo-heading">🔥 Meme Categories &amp; Tools</h3>
            <div className="tm-seo-links">
              <a
                href="/memes/dank"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectCategory('dank'))}
              >
                #Dank Memes &amp; Shitposts
              </a>
              <a
                href="/memes/programming"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectCategory('tech'))}
              >
                #Programming, Coding &amp; Tech Memes
              </a>
              <a
                href="/memes/gaming"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectCategory('gaming'))}
              >
                #Gaming &amp; Esports Memes
              </a>
              <a
                href="/memes/relatable"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectCategory('relatable'))}
              >
                #Relatable 3AM &amp; Work Memes
              </a>
              <a
                href="/meme-generator"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, onOpenBlankStudio)}
              >
                🎨 Free Online Meme Generator (Top &amp; Bottom Text)
              </a>
              <a
                href="/gif-meme-maker"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, onOpenGifStudio || onOpenBlankStudio)}
              >
                🎞️ Free Animated GIF Meme Maker
              </a>
              <a
                href="/templates"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, onOpenBlankStudio)}
              >
                🖼️ All 20 Classic Blank Meme Templates
              </a>
              <a
                href="/templates/drake-meme-generator"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenTemplateStudio?.('tpl-drake-compare'))}
              >
                🙅 Drake 2-Panel Meme Generator
              </a>
              <a
                href="/templates/expanding-brain-meme-generator"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenTemplateStudio?.('tpl-expanding-brain'))}
              >
                🧠 Expanding Brain Meme Generator
              </a>
              <a
                href="/templates/this-is-fine-meme-generator"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenTemplateStudio?.('tpl-this-is-fine'))}
              >
                🔥 This Is Fine Meme Generator
              </a>
              <a
                href="/meme-soundboard"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, onOpenSoundboard)}
              >
                🎹 Vine Boom &amp; 16-Pad Meme Soundboard
              </a>
            </div>
          </div>

          <div>
            <h3 className="tm-seo-heading">🕹️ Retro Arcade Games &amp; Prank Screens</h3>
            <div className="tm-seo-links">
              <a
                href="/games"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('lobby'))}
              >
                🕹️ Cyber-Arcade Lobby (All 13 Games)
              </a>
              <a
                href="/games/coin-pusher"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('pusher'))}
              >
                🪙 Neon Coin Dozer &apos;86 (Coin Pusher Online Free)
              </a>
              <a
                href="/games/pinball"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('pinball'))}
              >
                🎱 Las Vegas Retro Pinball (5 Tables)
              </a>
              <a
                href="/games/slots"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('slots'))}
              >
                🎰 Las Vegas 777 Neon Slot Machine
              </a>
              <a
                href="/games/blackjack"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('blackjack'))}
              >
                🃏 Neon 21&apos;s Blackjack vs Dealer Bot &apos;86
              </a>
              <a
                href="/games/roulette"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('roulette'))}
              >
                🎡 Neon Lightning Roulette &apos;86 (150× Multipliers)
              </a>
              <a
                href="/games/meme-crush"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('crush'))}
              >
                🍬 Meme Crush Saga (Match-3 Jelly Puzzle)
              </a>
              <a
                href="/games/meme-stock-market"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('stocks'))}
              >
                📈 MEMEDAQ &apos;86 Meme Stock Market Simulator
              </a>
              <a
                href="/fake-windows-update-screen"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('update'))}
              >
                🔄 Fake Windows Update Screen (F11 Prank)
              </a>
              <a
                href="/fake-blue-screen-prank"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('bsod'))}
              >
                💀 Fake Blue Screen of Death (BSOD Prank)
              </a>
              <a
                href="/fake-excel-boss-screen"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('excel'))}
              >
                📊 Fake Excel Boss Key Screen Disguise
              </a>
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
                Open the <a href="/meme-generator" onClick={(e) => handleSpaLinkClick(e, onOpenBlankStudio)} style={{ color: '#00f3ff' }}>Meme Generator</a> or hit <strong>🧬 REMIX</strong> on any card to launch
                the HTML5 Meme Forge 3.0 studio. Pick from 20 blank meme templates, paste from clipboard (Ctrl+V),
                apply Deep Fry or VHS Glitch filters, and download or publish watermark-free memes.
              </p>
            </details>
            <details className="tm-faq-item">
              <summary>Are the Coin Pusher, Slots, Blackjack, and Roulette games free?</summary>
              <p>
                Yes! Every arcade game on THE MEMES.net uses 100% free Practice Chips and earned in-site
                Meme Tokens—zero real-money deposits, betting, or cashouts. Play{' '}
                <a href="/games/coin-pusher" onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('pusher'))} style={{ color: '#00f3ff' }}>Coin Dozer</a>,{' '}
                <a href="/games/pinball" onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('pinball'))} style={{ color: '#00f3ff' }}>Pinball</a>, or{' '}
                <a href="/games/meme-crush" onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('crush'))} style={{ color: '#00f3ff' }}>Meme Crush Saga</a> right in your browser.
              </p>
            </details>
          </div>
        </div>

        <div className="tm-seo-copyright">
          <span>© 2026 THE MEMES.net // Community Memes &amp; Cyber-Arcade</span>
          <span>🪙 Tokens are free, just for fun, can&apos;t be bought or cashed out.</span>
          <span>🔒 Secured with OAuth 2.0 (Google • Discord • Facebook)</span>
        </div>
      </div>
    </footer>
  );
}
