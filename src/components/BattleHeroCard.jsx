import { useEffect, useState } from 'react';
import BattleCountdown from './BattleCountdown';
import { fetchBattleState, entryCaption } from '../utils/dailyCaptionBattle';
import { AI_BATTLE_IMAGE_LABEL, isAiBattleImage } from '../utils/battleImages';
import './BattleHeroCard.css';

/**
 * Plan 2.1 / 2.7 — "Today's Caption Battle" hero card for the homepage:
 * the image, a countdown to close, the entry count, a big Enter button, and yesterday's winner.
 */
export default function BattleHeroCard({ battleState = null, hideInlineWinner = false, onOpenBattle }) {
  const [fetchedState, setFetchedState] = useState(null);

  useEffect(() => {
    if (battleState) return undefined;
    let alive = true;
    fetchBattleState().then((res) => {
      if (alive) setFetchedState(res);
    });
    return () => {
      alive = false;
    };
  }, [battleState]);

  const state = battleState || fetchedState;
  const battle = state?.battle;
  const winner = state?.previous?.top?.[0] || null;

  if (state && !battle && !winner) return null;

  return (
    <section className="tm-battle-hero" aria-label="Today's Caption Battle" data-testid="battle-hero">
      <div className="tm-battle-hero-media">
        {battle ? (
          <img
            src={battle.image_url}
            alt={`Today's caption battle: ${battle.title}`}
            width="540"
            height="480"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <div className="tm-battle-hero-skeleton" aria-hidden="true" />
        )}
        <span className="tm-battle-hero-badge">⚔️ TODAY’S CAPTION BATTLE</span>
        {isAiBattleImage(battle?.image_url) && <span className="tm-battle-hero-ai">{AI_BATTLE_IMAGE_LABEL}</span>}
      </div>
      <div className="tm-battle-hero-body">
        <h2 className="tm-battle-hero-title">{battle ? battle.title : 'Loading today’s battle…'}</h2>
        {battle?.theme && <span className="tm-battle-hero-theme">🏷️ {battle.theme}</span>}
        <div className="tm-battle-hero-stats">
          {battle && <BattleCountdown endsAt={battle.ends_at} prefix="⏳ Closes in " className="tm-battle-hero-stat" />}
          {battle && (
            <span className="tm-battle-hero-stat" data-testid="battle-hero-entries">
              {state.humanEntryCount > 0
                ? `✍️ ${state.humanEntryCount} ${state.humanEntryCount === 1 ? 'entry' : 'entries'}`
                : '✍️ Be the first to enter'}
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
        {!hideInlineWinner && winner && (
          <button type="button" className="tm-battle-hero-winner" onClick={() => onOpenBattle?.('results')}>
            👑 Yesterday’s winner: <strong>@{winner.author_name}</strong> “{entryCaption(winner)}” →
          </button>
        )}
      </div>
    </section>
  );
}
