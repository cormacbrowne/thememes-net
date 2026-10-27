export default function SeoDiscoveryFooter({
  onSelectCategory,
  onOpenBlankStudio,
  onSelectViewMode,
  onOpenRewards
}) {
  return (
    <footer className="tm-seo-footer">
      <div className="tm-seo-footer-inner">
        <div className="tm-seo-grid">
          <div>
            <div className="tm-logo-badge" style={{ display: 'inline-block', marginBottom: '10px' }}>
              THE MEMES.net
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
              <strong>THE MEMES.net</strong> is the #1 Cyber-Arcade Meme Generator, Viral Dank Memes
              Feed, Crazy Meme Soundboard, and 1v1 Sudden-Death Meme Battle Arena. Create, remix,
              and mutate memes online with zero watermarks or paywalls.
            </p>
          </div>

          <div>
            <h3 className="tm-seo-heading">🔥 Trending Meme Categories</h3>
            <div className="tm-seo-links">
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('dank')}>
                #Dank Memes & Shitposts
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('tech')}>
                #Programming, Coding & Tech Memes
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('gaming')}>
                #Gaming & Esports Memes
              </button>
              <button type="button" className="tm-seo-link" onClick={() => onSelectCategory('relatable')}>
                #Relatable 3AM & Work Memes
              </button>
            </div>
          </div>

          <div>
            <h3 className="tm-seo-heading">🕹️ Interactive Arcade Games &amp; Tools</h3>
            <div className="tm-seo-links">
              <button type="button" className="tm-seo-link" onClick={() => onSelectViewMode('crush')}>
                🍬 Meme Crush Saga (Match-3 Puzzle Game)
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
                🎰 Fair Token Vault, Slots &amp; Daily Quests
              </button>
            </div>
          </div>
        </div>

        {/* Crawlable FAQ Accordion for Google Rich Snippets */}
        <div className="tm-seo-faq">
          <h3 className="tm-seo-heading" style={{ marginBottom: '10px' }}>
            ❓ Frequently Asked Questions (Meme Maker & Soundboard Guide)
          </h3>
          <div className="tm-seo-faq-grid">
            <details className="tm-faq-item">
              <summary>How do I make or remix a meme for free on THE MEMES.net?</summary>
              <p>
                Click <strong>+ Upload / Create</strong> or hit <strong>🧬 MUTATE</strong> on any card to open
                the HTML5 Meme Forge Studio 2.0. Drag and drop any image, paste from clipboard (Ctrl+V),
                apply Deep Fry or VHS Glitch filters, and export high-resolution PNGs (+100 XP).
              </p>
            </details>
            <details className="tm-faq-item">
              <summary>How do I enable the Crazy Meme Soundboard on iPhone and Android?</summary>
              <p>
                THE MEMES.net uses a custom iOS Safari & Web Audio synthesizer that works even when your
                iPhone Silent Switch is enabled! Tap any pad on the <strong>Crazy Soundboard Bar</strong> to play
                Vine Booms, MLG Airhorns, Clown Honks, Cartoon Boings, and Sad Trombones.
              </p>
            </details>
          </div>
        </div>

        <div className="tm-seo-copyright">
          <span>© 2026 THE MEMES.net // Cyber-Arcade Meme Arena</span>
          <span>🔒 Secured with OAuth 2.0 (Apple • Google • Facebook • Discord)</span>
        </div>
      </div>
    </footer>
  );
}
