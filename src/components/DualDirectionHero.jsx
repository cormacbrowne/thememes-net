import { useState } from 'react';
import { sfx } from '../utils/soundEngine';
import './DualDirectionHero.css';

const ARCADE_QUICK_LAUNCH = [
  { id: 'eightball', icon: '🎱', label: 'Magic 8-Ball', tag: 'NEW' },
  { id: 'pinball', icon: '🛸', label: '80s Pinball', tag: '5 TABLES' },
  { id: 'slots', icon: '🎰', label: 'Vegas Slots', tag: '4 SLOTS' },
  { id: 'blackjack', icon: '🃏', label: 'Blackjack' },
  { id: 'poker', icon: '🤠', label: "Hold'em Poker" },
  { id: 'roulette', icon: '🎡', label: 'Roulette' },
  { id: 'pusher', icon: '🪙', label: 'Coin Dozer' },
  { id: 'derby', icon: '🏇', label: 'Neon Derby' },
  { id: 'stocks', icon: '📈', label: 'MEMEDAQ' }
];

export default function DualDirectionHero({
  tokens = 50,
  memeCentz = 25,
  onSelectViewMode,
  onOpenBlankStudio,
  onOpenSoundboard,
  onOpenInstallModal,
  onScrollToMemes
}) {
  const [realmFocus, setRealmFocus] = useState('both'); // 'both' | 'memes' | 'arcade'

  return (
    <section className="tm-dual-hero" aria-label="Choose Your Realm: Memes or 80s Cyber-Arcade">
      <div className="tm-dual-hero-top">
        <div className="tm-dual-hero-brand">
          <img
            src="/favicon.svg"
            alt="THE MEMES.net 80s Neon Crest"
            className="tm-dual-hero-logo"
            width="42"
            height="42"
          />
          <div>
            <div className="tm-dual-hero-kicker">
              ★ WELCOME TO THEMEMES.NET • WALLET M${tokens}.{String(memeCentz || 0).padStart(2, '0')} MEMEDOLLARZ ★
            </div>
            <h1 className="tm-dual-hero-heading">
              TWO 80s WORLDS IN ONE SITE: <span className="is-cyan">MEMES</span> &amp;{' '}
              <span className="is-pink">CYBER-ARCADE</span>
            </h1>
          </div>
        </div>

        <div className="tm-dual-hero-utils">
          <div className="tm-dual-focus-tabs" role="tablist" aria-label="Realm Focus View">
            <button
              type="button"
              role="tab"
              aria-selected={realmFocus === 'both'}
              className={`tm-dual-focus-btn ${realmFocus === 'both' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle?.();
                setRealmFocus('both');
              }}
            >
              ⚡ Both
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={realmFocus === 'memes'}
              className={`tm-dual-focus-btn ${realmFocus === 'memes' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle?.();
                setRealmFocus('memes');
              }}
            >
              🔥 Memes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={realmFocus === 'arcade'}
              className={`tm-dual-focus-btn ${realmFocus === 'arcade' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle?.();
                setRealmFocus('arcade');
              }}
            >
              🕹️ Gaming
            </button>
          </div>

          {onOpenInstallModal && (
            <button
              type="button"
              className="tm-dual-iphone-btn"
              onClick={() => {
                sfx.playToggle?.();
                onOpenInstallModal();
              }}
            >
              📲 iPhone App
            </button>
          )}
        </div>
      </div>

      <div className={`tm-dual-portals focus-${realmFocus}`}>
        {/* PORTAL A: MEMES & CREATOR STUDIO */}
        {realmFocus !== 'arcade' && (
          <article className="tm-portal-card is-memes">
            <div className="tm-portal-head">
              <span className="tm-portal-badge">REALM 01 • CREATE &amp; LAUGH</span>
              <h2>🔥 THE MEMES &amp; STUDIO</h2>
              <p>
                Browse viral community uploads, craft instant PNG &amp; animated GIF memes, blast the
                16-pad soundboard &amp; earn <strong>MemeDollarz ($)</strong> for every upvote.
              </p>
            </div>

            <div className="tm-portal-primary-row">
              <button
                type="button"
                className="tm-portal-cta is-cyan"
                onClick={() => {
                  sfx.playPop?.(2);
                  onScrollToMemes?.();
                }}
              >
                🔥 Browse Meme Feed ↓
              </button>
              <button
                type="button"
                className="tm-portal-cta is-outline"
                onClick={() => {
                  sfx.playToggle?.();
                  onOpenBlankStudio?.();
                }}
              >
                ➕ Make Meme / GIF
              </button>
            </div>

            <div className="tm-portal-chip-grid">
              <button
                type="button"
                className="tm-portal-quick-pill"
                onClick={() => {
                  sfx.playToggle?.();
                  onSelectViewMode?.('reels');
                }}
              >
                🎬 Fullscreen Reels
              </button>
              <button
                type="button"
                className="tm-portal-quick-pill"
                onClick={() => {
                  sfx.playToggle?.();
                  onOpenSoundboard?.();
                }}
              >
                🔊 16-Pad Soundboard
              </button>
              <button
                type="button"
                className="tm-portal-quick-pill"
                onClick={() => {
                  sfx.playToggle?.();
                  onSelectViewMode?.('battle');
                }}
              >
                ⚔️ 1v1 Meme Battle
              </button>
              <button
                type="button"
                className="tm-portal-quick-pill"
                onClick={() => {
                  sfx.playToggle?.();
                  onSelectViewMode?.('guess');
                }}
              >
                🧠 Guess The Meme
              </button>
            </div>
          </article>
        )}

        {/* PORTAL B: 80s CYBER-ARCADE & CASINO */}
        {realmFocus !== 'memes' && (
          <article className="tm-portal-card is-arcade">
            <div className="tm-portal-head">
              <span className="tm-portal-badge is-pink">REALM 02 • PLAY &amp; WIN</span>
              <h2>🕹️ 80s CYBER-ARCADE &amp; CASINO</h2>
              <p>
                Shake the <strong>80s Magic 8-Ball</strong>, flip neon Pinball with Magna-Save &amp;
                Mini-Slot bonuses, or try Slots, Poker &amp; Roulette (pure <strong>MemeDollarz M$</strong> fun).
              </p>
            </div>

            <div className="tm-portal-primary-row">
              <button
                type="button"
                className="tm-portal-cta is-pink"
                onClick={() => {
                  sfx.playJackpot?.();
                  onSelectViewMode?.('lobby');
                }}
              >
                🕹️ Enter Arcade Lobby →
              </button>
              <button
                type="button"
                className="tm-portal-cta is-outline-pink"
                onClick={() => {
                  sfx.playMagic8BallShake?.();
                  onSelectViewMode?.('eightball');
                }}
              >
                🎱 Shake Magic 8-Ball
              </button>
            </div>

            <div className="tm-portal-chip-grid is-games">
              {ARCADE_QUICK_LAUNCH.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="tm-portal-quick-pill is-game"
                  onClick={() => {
                    sfx.playToggle?.();
                    onSelectViewMode?.(g.id);
                  }}
                >
                  <span>
                    {g.icon} {g.label}
                  </span>
                  {g.tag && <em className="tm-portal-mini-tag">{g.tag}</em>}
                </button>
              ))}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
