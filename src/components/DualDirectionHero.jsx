import { useEffect, useState } from 'react';
import { Crown, Film, Smartphone, Swords, Volume2 } from 'lucide-react';
import { sfx } from '../utils/soundEngine';
import GameIcon from './GameIcon';
import NeonSign from './NeonSign';
import './DualDirectionHero.css';

const MEME_EXPLORE_PILLS = [
  { id: 'reels', label: 'Reels', Icon: Film, type: 'view' },
  { id: 'caption_battle', label: 'Caption Battle', Icon: Crown, type: 'battle', testId: 'hero-caption-battle-btn' },
  { id: 'soundboard', label: 'Soundboard', Icon: Volume2, type: 'soundboard' },
  { id: 'battle', label: '1v1 Battle', Icon: Swords, type: 'view' },
  { id: 'guess', label: 'Guess Meme', gameIcon: 'guess', type: 'view' }
];

const ARCADE_EXPLORE_PILLS = [
  { id: 'bingo', label: "Bingo '86" },
  { id: 'slots', label: 'Slots' },
  { id: 'pinball', label: 'Pinball' },
  { id: 'pusher', label: 'Coin Dozer' },
  { id: 'blackjack', label: 'Blackjack' },
  { id: 'poker', label: 'Poker' },
  { id: 'roulette', label: 'Roulette' },
  { id: 'derby', label: 'Derby' },
  { id: 'stocks', label: 'MEMEDAQ' },
  { id: 'eightball', label: '8-Ball' }
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
      <div className="tm-dual-hero-body">
        <div className="tm-dual-hero-top">
          <div className="tm-dual-hero-brand">
            {/* Owner brief 17 Nov 2026 (item 12): the big lit sign, neon flowing through the tubes,
                is the first thing every visitor sees. Powers on with a stutter on a first visit. */}
            <div className="tm-dual-hero-sign">
              <NeonSign size="hero" flow powerOn={isFirstVisit} />
            </div>
            <h1 className="tm-dual-hero-heading tm-dual-hero-heading--sr">
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
            MEME_EXPLORE_PILLS.map((pill) => {
              const IconComp = pill.Icon;
              return (
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
                  {IconComp ? (
                    <IconComp size={13} aria-hidden="true" />
                  ) : (
                    <GameIcon id={pill.gameIcon || pill.id} size={14} />
                  )}
                  <span>{pill.label}</span>
                </button>
              );
            })}

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
                <GameIcon id={g.id} size={14} />
                <span>{g.label}</span>
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
              <Smartphone size={13} aria-hidden="true" />
              <span>iPhone App</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
