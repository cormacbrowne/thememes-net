import { useEffect, useMemo, useState } from 'react';
import BattleCountdown from './BattleCountdown';
import HouseBadge from './HouseBadge';
import { supabase } from '../supabaseClient';
import {
  castBattleVote,
  entriesToVoteOn,
  entryCaption,
  fetchBattleState
} from '../utils/dailyCaptionBattle';
import { AI_BATTLE_IMAGE_LABEL, isAiBattleImage } from '../utils/battleImages';
import { track } from '../utils/analytics';
import './BattleHeroCard.css';

/**
 * Plan 2.1 / 2.7 / W2-1 — "Today's Caption Battle" hero card for the homepage:
 * image, countdown, entry count, 1-tap inline caption voting with instant feedback,
 * clear Vote & Enter buttons, and yesterday's winner.
 */
export default function BattleHeroCard({ battleState = null, hideInlineWinner = false, onOpenBattle }) {
  const [fetchedState, setFetchedState] = useState(null);
  const [localState, setLocalState] = useState(null);
  const [seed, setSeed] = useState('anon');
  const [busy, setBusy] = useState(false);
  const [votedIds, setVotedIds] = useState(() => new Set());
  const [feedback, setFeedback] = useState(null); // { type: 'ok'|'skip'|'error'|'auth', text: string }

  useEffect(() => {
    let alive = true;
    supabase?.auth?.getSession?.().then(({ data }) => {
      if (alive && data?.session?.user?.id) setSeed(data.session.user.id);
    });
    return () => {
      alive = false;
    };
  }, []);

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

  const state = localState || battleState || fetchedState;
  const battle = state?.battle;
  const winner = state?.previous?.top?.[0] || null;

  const approvedEntries = useMemo(
    () => (Array.isArray(state?.entries) ? state.entries.filter((e) => e.status === 'approved') : []),
    [state]
  );
  const voteQueue = useMemo(() => (state ? entriesToVoteOn(state, seed) : []), [state, seed]);
  const featuredEntry = voteQueue[0] || null;
  const myVoteSet = useMemo(() => {
    const s = new Set((state?.myVotes || []).map(String));
    votedIds.forEach((id) => s.add(String(id)));
    return s;
  }, [state, votedIds]);

  const topStandings = useMemo(() => {
    if (!state?.showTotals) return [];
    return [...approvedEntries]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 2);
  }, [approvedEntries, state?.showTotals]);

  if (state && !battle && !winner) return null;

  const handleQuickVote = async (entry, funny) => {
    if (!entry || busy) return;
    setBusy(true);
    const res = await castBattleVote(entry.id, funny);
    setBusy(false);
    if (!res.ok) {
      if (res.error === 'sign_in_required') {
        setFeedback({
          type: 'auth',
          text: 'Sign in required to cast a vote right now.'
        });
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Could not record your vote.'
        });
      }
      return;
    }
    if (funny) {
      track('battle_vote', { battle: String(battle?.id || ''), surface: 'hero_card' });
      setVotedIds((prev) => new Set([...prev, String(entry.id)]));
    }
    const refreshed = await fetchBattleState();
    if (refreshed?.ok) {
      setLocalState(refreshed);
    } else if (state) {
      const idStr = String(entry.id);
      setLocalState({
        ...state,
        myVotes: funny ? [...(state.myVotes || []), idStr] : state.myVotes || [],
        mySkips: !funny ? [...(state.mySkips || []), idStr] : state.mySkips || [],
        votesNeeded: funny ? Math.max(0, (state.votesNeeded || 0) - 1) : state.votesNeeded || 0
      });
    }
    const nextState = refreshed?.ok ? refreshed : state;
    const needed = nextState?.showTotals
      ? 'Live standings unlocked!'
      : nextState?.votesNeeded > 0
        ? `${nextState.votesNeeded} more ${nextState.votesNeeded === 1 ? 'vote' : 'votes'} to unlock standings.`
        : '';
    setFeedback({
      type: funny ? 'ok' : 'skip',
      text: funny
        ? `✓ Vote counted for "${entryCaption(entry)}"! ${needed}`.trim()
        : 'Skipped — next caption loaded.'
    });
  };

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

        {battle && featuredEntry && (
          <div className="tm-battle-hero-quickvote" data-testid="battle-hero-quickvote">
            <div className="tm-battle-hero-quickvote-head">
              <span className="tm-battle-hero-quickvote-kicker">1-TAP VOTE · NO SIGN-IN NEEDED</span>
              <span className="tm-battle-hero-quickvote-left">{voteQueue.length} to rate</span>
            </div>
            <p className="tm-battle-hero-quickvote-caption">
              “{entryCaption(featuredEntry)}”{' '}
              <span className="tm-battle-hero-quickvote-author">
                — @{featuredEntry.author_name} {featuredEntry.is_house && <HouseBadge />}
              </span>
            </p>
            <div className="tm-battle-hero-quickvote-btns">
              <button
                type="button"
                className="tm-btn tm-btn-primary tm-battle-hero-qbtn"
                disabled={busy}
                aria-pressed={myVoteSet.has(String(featuredEntry.id))}
                onClick={() => handleQuickVote(featuredEntry, true)}
                data-testid="battle-hero-quick-vote"
              >
                {busy ? 'Voting…' : '😂 Vote Funny'}
              </button>
              <button
                type="button"
                className="tm-btn tm-battle-hero-qskip"
                disabled={busy}
                onClick={() => handleQuickVote(featuredEntry, false)}
                data-testid="battle-hero-quick-skip"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={`tm-battle-hero-feedback ${feedback.type === 'error' || feedback.type === 'auth' ? 'is-error' : ''}`}
            role="status"
            aria-live="polite"
            data-testid="battle-hero-feedback"
          >
            <span>{feedback.text}</span>
            {feedback.type === 'auth' && (
              <button type="button" className="tm-battle-hero-feedback-btn" onClick={() => onOpenBattle?.('vote')}>
                Open battle →
              </button>
            )}
          </div>
        )}

        {topStandings.length > 0 && (
          <div className="tm-battle-hero-standings" data-testid="battle-hero-standings">
            <span className="tm-battle-hero-standings-kicker">🏆 Live standings</span>
            {topStandings.map((entry, idx) => (
              <div key={entry.id} className="tm-battle-hero-standing-row">
                <span>
                  #{idx + 1} “{entryCaption(entry)}”
                </span>
                <strong>😂 {entry.score ?? 0}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="tm-battle-hero-actions">
          {battle && approvedEntries.length > 0 && (
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-battle-hero-cta"
              onClick={() => onOpenBattle?.('vote')}
              data-testid="battle-hero-vote"
            >
              {voteQueue.length > 0
                ? `😂 All captions (${voteQueue.length})`
                : `🏆 Standings (${approvedEntries.length})`}
            </button>
          )}
          <button
            type="button"
            className={`tm-btn ${!battle || approvedEntries.length === 0 ? 'tm-btn-primary' : 'tm-battle-hero-secondary'} tm-battle-hero-cta`}
            disabled={!battle}
            onClick={() => onOpenBattle?.('enter')}
            data-testid="battle-hero-enter"
          >
            {state?.myEntry ? '✏️ Edit my caption' : '⚔️ Enter a caption'}
          </button>
        </div>

        {!hideInlineWinner && winner && (
          <button type="button" className="tm-battle-hero-winner" onClick={() => onOpenBattle?.('results')}>
            👑 Yesterday’s winner: <strong>@{winner.author_name}</strong> “{entryCaption(winner)}” →
          </button>
        )}
      </div>
    </section>
  );
}
