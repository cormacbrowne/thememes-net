import { useEffect, useState } from 'react';
import { sfx } from '../utils/soundEngine';
import NeonSign from './NeonSign';
import './DualDirectionHero.css';

const MEME_EXPLORE_PILLS = [
  { id: 'reels', label: '🎬 Reels', type: 'view' },
  { id: 'caption_battle', label: '👑 Caption Battle', type: 'battle', testId: 'hero-caption-battle-btn' },
  { id: 'soundboard', label: '🔊 Soundboard', type: 'soundboard' },
  { id: 'battle', label: '⚔️ 1v1 Battle', type: 'view' },
  { id: 'guess', label: '🧠 Guess Meme', type: 'view' }
];

const ARCADE_EXPLORE_PILLS = [
  { id: 'bingo', label: "🎱 Bingo '86" },
  { id: 'slots', label: '🎰 Slots' },
  { id: 'pinball', label: '🛸 Pinball' },
  { id: 'pusher', label: '🎰 Coin Dozer' },
  { id: 'blackjack', label: '🃏 Blackjack' },
  { id: 'poker', label: '🤠 Poker' },
  { id: 'roulette', label: '🎡 Roulette' },
  { id: 'derby', label: '🏇 Derby' },
  { id: 'stocks', label: '📈 MEMEDAQ' },
  { id: 'eightball', label: '🎱 8-Ball' }
];

export default function DualDirectionHero({
  onSelectViewMode,
  onOpenBlankStudio,
  onOpenCaptionBattle,
  onOpenSoundboard,
  onOpenInstallModal
}) {
  const [realmFocus, setRealmFocus] = useState('both'); // 'both' | 'memes' | 'arcade'
  const [isFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !localStorage.getItem('tm_intro_seen');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isFirstVisit || typeof window === 'undefined') return undefined;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem('tm_intro_seen', '1');
      } catch {
        // ignore storage errors
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [isFirstVisit]);

  return (
    <section
      className={`tm-dual-hero ${isFirstVisit ? 'is-first-visit' : ''}`}
      aria-label="Choose Your Realm: Memes or 80s Cyber-Arcade"
    >
      {isFirstVisit && (
        <div className="tm-dual-hero-sign-stage">
          <NeonSign size="hero" powerOn />
        </div>
      )}

      <div className="tm-dual-hero-body">
        <div className="tm-dual-hero-top">
          <div className="tm-dual-hero-brand">
            {!isFirstVisit && (
              <span className="tm-hide-mobile">
                <NeonSign size="icon" powerOn={false} />
              </span>
            )}
            <h1 className="tm-dual-hero-heading">
              <span className="tm-dual-hero-lede">TWO 80s WORLDS IN ONE SITE: </span>
              <span className="is-cyan">MEMES</span> &amp;{' '}
              <span className="is-pink">CYBER-ARCADE</span>
            </h1>
          </div>

          <div className="tm-dual-hero-actions">
            <button
              type="button"
              className="ui-tube ui-tube--pink ui-tube-box ui-tube-box--solid tm-hero-cta"
              onClick={() => {
                sfx.playToggle?.();
                onOpenBlankStudio?.();
              }}
            >
              Make a meme
            </button>
            <button
              type="button"
              className="ui-tube ui-tube--cyan ui-tube-box tm-hero-cta"
              onClick={() => {
                sfx.playJackpot?.();
                onSelectViewMode?.('lobby');
              }}
            >
              Play
            </button>
          </div>
        </div>

        {/* Desktop-only single horizontal Explore strip (hidden on phones so first meme is < 320px) */}
        <div className="tm-hero-explore-row tm-hide-mobile">
          <div className="tm-dual-focus-tabs" role="tablist" aria-label="Realm Focus View">
            {[
              { id: 'both', label: 'All' },
              { id: 'memes', label: 'Memes' },
              { id: 'arcade', label: 'Games' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={realmFocus === tab.id}
                className={`tm-dual-focus-btn ${realmFocus === tab.id ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setRealmFocus(tab.id);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {realmFocus !== 'arcade' &&
            MEME_EXPLORE_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                data-testid={pill.testId}
                className="tm-portal-quick-pill"
                onClick={() => {
                  sfx.playToggle?.();
                  if (pill.type === 'battle') onOpenCaptionBattle?.();
                  else if (pill.type === 'soundboard') onOpenSoundboard?.();
                  else onSelectViewMode?.(pill.id);
                }}
              >
                {pill.label}
              </button>
            ))}

          {realmFocus !== 'memes' &&
            ARCADE_EXPLORE_PILLS.map((g) => (
              <button
                key={g.id}
                type="button"
                className="tm-portal-quick-pill is-game"
                onClick={() => {
                  sfx.playToggle?.();
                  onSelectViewMode?.(g.id);
                }}
              >
                {g.label}
              </button>
            ))}

          {onOpenInstallModal && (
            <button
              type="button"
              className="tm-portal-quick-pill"
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
    </section>
  );
}
