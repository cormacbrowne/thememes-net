import { useState } from 'react';
import { sfx } from '../utils/soundEngine';
import { trackShareClicked } from '../utils/analytics';
import { ARCADE_GAMES_CATALOG } from '../data/arcadeGamesCatalog';

export default function SeoDiscoveryFooter({
  onSelectCategory,
  onOpenBlankStudio,
  onOpenGifStudio,
  onOpenSoundboard,
  onOpenPrankDisguise,
  onSelectViewMode,
  onOpenRewards,
  onOpenInstallModal
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
              📲 Make THE MEMES.net an iPhone or Mobile App!
            </strong>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
              Tap <strong>Share (⬆️) → Add to Home Screen</strong> in iPhone Safari for full-screen 80s neon icon &amp; app mode!
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onOpenInstallModal && (
              <button
                type="button"
                className="tm-btn"
                style={{ borderColor: 'rgba(0, 245, 255, 0.5)', color: '#7df9ff' }}
                onClick={onOpenInstallModal}
              >
                📱 iPhone App Guide
              </button>
            )}
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              onClick={handleShareSite}
            >
              {sharedSite ? '✅ Site Link Copied!' : '🚀 Share THE MEMES.net'}
            </button>
          </div>
        </div>

        <div className="tm-seo-grid">
          <div>
            <div className="tm-logo-badge" style={{ display: 'inline-block', marginBottom: '10px' }}>
              THE MEMES.net
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
              <strong>THE MEMES.net</strong> is a simple Image &amp; GIF meme maker (upload media, add
              classic Top &amp; Bottom text, export &amp; share with <code>www.thememes.net</code>),
              community meme feed, 16-pad Vine Boom Soundboard, and retro Cyber-Arcade.
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
                🕹️ Cyber-Arcade Lobby (All {ARCADE_GAMES_CATALOG.length} Games)
              </a>
              <a
                href="/games/neon-bingo"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('bingo'))}
              >
                🎱 Neon Bingo &apos;86 (80s Caller &amp; UV Dabber)
              </a>
              <a
                href="/games/coin-pusher"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('pusher'))}
              >
                🪙 Neon Coin Dozer &apos;86 (Coin Pusher Online Free)
              </a>
              <a
                href="/games/meme-invaders"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('invaders'))}
              >
                👾 Meme Invaders &apos;86 (Free Space Shooter)
              </a>
              <a
                href="/games/neon-serpent"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('serpent'))}
              >
                🐍 Neon Serpent (Synthwave Reaction Snake)
              </a>
              <a
                href="/games/brick-blaster"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('blaster'))}
              >
                🧱 Brick Blaster (Word &amp; Pixel-Face Breaker)
              </a>
              <a
                href="/games/sunset-sprint"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('sunset'))}
              >
                🌅 Sunset Sprint (80s OutRun Highway Racer)
              </a>
              <a
                href="/games/vector-void"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('void'))}
              >
                🛸 Vector Void (Twin-Stick Space Shooter)
              </a>
              <a
                href="/games/pinball"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('pinball'))}
              >
                🛸 Las Vegas Retro Pinball (5 Tables)
              </a>
              <a
                href="/games/magic-8-ball"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('eightball'))}
              >
                🎱 80s Neon Magic 8-Ball Fortune Oracle
              </a>
              <a
                href="/games/horse-racing"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('derby'))}
              >
                🏇 Neon Derby &apos;86 Synthwave Horse Racing
              </a>
              <a
                href="/games/guess-the-meme"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('guess'))}
              >
                🧠 Guess The Meme Daily Pixel Puzzle
              </a>
              <a
                href="/games/higher-or-lower"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('hilow'))}
              >
                ⬆️ Higher or Lower Meme Score Streak
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
                href="/games/poker"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('poker'))}
              >
                🟡 Neon Hold&apos;em &apos;86 Texas Poker (Chips &amp; Tokens)
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
                href="/games/speed-swipe"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('swipe'))}
              >
                ⚡ Meme Speed Swipe (Fast Meme Rating)
              </a>
              <a
                href="/games/meme-battle-arena"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onSelectViewMode('battle'))}
              >
                ⚔️ 1v1 King of the Hill Meme Arena
              </a>
              <a
                href="/fake-teams-zoom-call-screen"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('zoom'))}
              >
                📹 Fake Microsoft Teams &amp; Zoom Call Screen (Boss Key)
              </a>
              <a
                href="/fake-excel-boss-screen"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('excel'))}
              >
                📊 Fake Excel Boss Key Screen Disguise
              </a>
              <a
                href="/fake-blue-screen-prank"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('bsod'))}
              >
                💀 Fake Blue Screen of Death (BSOD Prank)
              </a>
              <a
                href="/fake-windows-update-screen"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('update'))}
              >
                🔄 Fake Windows Update Screen (F11 Prank)
              </a>
              <a
                href="/fake-hacker-terminal-screen"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('terminal'))}
              >
                💻 Fake Hacker &amp; DevOps Linux Terminal Screen
              </a>
              <a
                href="/fake-ai-workspace-boss-screen"
                className="tm-seo-link"
                onClick={(e) => handleSpaLinkClick(e, () => onOpenPrankDisguise?.('ai'))}
              >
                🤖 Fake Enterprise AI Workspace Boss Screen
              </a>
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
          <span>© 2026 THE MEMES.net // Community Memes &amp; 80s Cyber-Arcade</span>
          <span>💵 MemeDollarz (M$) &amp; MemeCentz (¢) are free pretend tokens, just for fun — cannot be bought or cashed out.</span>
          <span style={{ display: 'inline-flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href="/hall-of-fame" style={{ color: '#facc15', textDecoration: 'none' }}>👑 Hall of Fame</a>
            <a href="/rules" style={{ color: '#7df9ff', textDecoration: 'none' }}>📜 House Rules</a>
            <a href="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>⚖️ Terms</a>
            <a href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>🔐 Privacy</a>
            <a href="/takedown" style={{ color: '#fda4af', textDecoration: 'none' }}>🚩 Takedown</a>
            <a href="/contact" style={{ color: '#94a3b8', textDecoration: 'none' }}>✉️ Contact</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
