import { useEffect, useState } from 'react';
import BattleHeroCard from './BattleHeroCard';
import WeeklyBountyCard from './WeeklyBountyCard';
import { fetchBattleState, entryCaption } from '../utils/dailyCaptionBattle';
import { getLocalDateKey, getPuzzleNumber, loadGuessState } from '../utils/guessTheMeme';
import './HomeDailyHub.css';

/**
 * Plan 2.7 — Top daily hub on mobile & left rail on desktop:
 * 1. Today's Caption Battle hero card
 * 2. Yesterday's winner strip (link to results & /hall-of-fame)
 * 3. Daily Guess the Meme tile (showing streak / solved count if played)
 */
export default function HomeDailyHub({ onOpenBattle, onOpenGuess, onAcceptBounty, onClaimBountyPrize }) {
  const [battleState, setBattleState] = useState(null);
  const [guessInfo] = useState(() => {
    const today = getLocalDateKey();
    const state = loadGuessState(today);
    const doneToday = Array.isArray(state.dailyResults) && state.dailyResults.length >= 5;
    const solvedToday = doneToday ? state.dailyResults.filter((r) => r?.won).length : 0;
    return {
      puzzleNumber: getPuzzleNumber(today),
      streak: state.streak || 0,
      doneToday,
      solvedToday
    };
  });

  useEffect(() => {
    let alive = true;
    fetchBattleState().then((res) => {
      if (alive) setBattleState(res);
    });
    return () => {
      alive = false;
    };
  }, []);

  const winner = battleState?.previous?.top?.[0] || null;

  return (
    <div className="tm-daily-hub" data-testid="home-daily-hub">
      <BattleHeroCard
        battleState={battleState}
        hideInlineWinner
        onOpenBattle={onOpenBattle}
      />

      <WeeklyBountyCard onAcceptBounty={onAcceptBounty} onClaimPrize={onClaimBountyPrize} />

      {/* Yesterday's winner strip */}
      <div className="tm-yesterday-strip" data-testid="home-yesterday-winner">
        {winner ? (
          <button
            type="button"
            className="tm-yesterday-main"
            onClick={() => onOpenBattle?.('results')}
          >
            <span className="tm-yesterday-kicker">👑 YESTERDAY’S WINNER</span>
            <span className="tm-yesterday-quote">
              <strong>@{winner.author_name}</strong> “{entryCaption(winner)}”
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="tm-yesterday-main"
            onClick={() => onOpenBattle?.('results')}
          >
            <span className="tm-yesterday-kicker">👑 YESTERDAY’S WINNER</span>
            <span className="tm-yesterday-quote">
              Battle crowns are awarded daily at 9:00 UK time
            </span>
          </button>
        )}
        <a href="/hall-of-fame" className="tm-yesterday-hof-link">
          Hall of Fame →
        </a>
      </div>

      {/* Daily Guess the Meme tile */}
      <button
        type="button"
        className="tm-daily-guess-tile"
        data-testid="home-daily-guess-tile"
        onClick={onOpenGuess}
      >
        <div className="tm-daily-guess-left">
          <span className="tm-daily-guess-badge">🎯 DAILY GUESS THE MEME · #{guessInfo.puzzleNumber}</span>
          <strong className="tm-daily-guess-title">
            {guessInfo.doneToday
              ? `Today solved: ${guessInfo.solvedToday}/5`
              : 'Name 5 pixelated memes before time runs out'}
          </strong>
          <span className="tm-daily-guess-sub">
            {guessInfo.streak > 0
              ? `🔥 Your streak: ${guessInfo.streak} day${guessInfo.streak === 1 ? '' : 's'}`
              : 'Build a daily streak & share your Wordle grid'}
          </span>
        </div>
        <span className="tm-btn tm-btn-primary tm-daily-guess-cta">
          {guessInfo.doneToday ? 'View →' : 'Play →'}
        </span>
      </button>
    </div>
  );
}
