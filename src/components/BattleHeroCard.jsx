import { useEffect, useState } from 'react';
import BattleCountdown from './BattleCountdown';
import { fetchBattleState, entryCaption } from '../utils/dailyCaptionBattle';
import './BattleHeroCard.css';

/**
 * Plan 2.1 / 2.7 — "Today's Caption Battle" hero card for the homepage:
 * the image, a countdown to close, the entry count, a big Enter button, and yesterday's winner.
 * Loads after the first screen is up (idle), so it never slows the homepage's first paint.
 */
export default function BattleHeroCard({ onOpenBattle }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    let alive = true;
    const run = () =>
      fetchBattleState().then((res) => {
        if (alive) setState(res);
      });
    const idle =
      typeof window !== 'undefined' && window.requestIdleCallback
        ? window.requestIdleCallback(run, { timeout: 2500 })
        : setTimeout(run, 800);
    return () => {
      alive = false;
      if (typeof window !== 'undefined' && window.cancelIdleCallback && window.requestIdleCallback) {
        window.cancelIdleCallback(idle);
      } else {
        clearTimeout(idle);
      }
    };
  }, []);

  const battle = state?.battle;
  const winner = state?.previous?.top?.[0] || null;

  if (state && !battle && !winner) return null;

  return (
    <section className="tm-battle-hero" aria-label="Today's Caption Battle" data-testid="battle-hero">
      <div className="tm-battle-hero-media">
        {battle ? (
          <img src={battle.image_url} alt={`Today's caption battle: ${battle.title}`} width="540" height="480" loading="lazy" decoding="async" />
        ) : (
          <div className="tm-battle-hero-skeleton" aria-hidden="true" />
        )}
        <span className="tm-battle-hero-badge">⚔️ TODAY’S CAPTION BATTLE</span>
      </div>
      <div className="tm-battle-hero-body">
        <h2 className="tm-battle-hero-title">{battle ? battle.title : 'Loading today’s battle…'}</h2>
        {battle?.theme && <span className="tm-battle-hero-theme">🏷️ {battle.theme}</span>}
        <div className="tm-battle-hero-stats">
          {battle && <BattleCountdown endsAt={battle.ends_at} prefix="⏳ Closes in " className="tm-battle-hero-stat" />}
          {battle && (
            <span className="tm-battle-hero-stat">
              ✍️ {state.entryCount} {state.entryCount === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
        <button
          type="button"
          className="tm-btn tm-btn-primary tm-battle-hero-cta"
          disabled={!battle}
          onClick={() => onOpenBattle?.(state?.myEntry ? 'vote' : 'enter')}
          data-testid="battle-hero-enter"
        >
          {state?.myEntry ? '😂 Vote on the others' : '⚔️ Enter today’s battle'}
        </button>
        {winner && (
          <button type="button" className="tm-battle-hero-winner" onClick={() => onOpenBattle?.('results')}>
            👑 Yesterday’s winner: <strong>@{winner.author_name}</strong> “{entryCaption(winner)}” →
          </button>
        )}
      </div>
    </section>
  );
}
