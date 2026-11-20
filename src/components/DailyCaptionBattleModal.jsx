import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SignUpNudgeBanner from './SignUpNudgeBanner';
import MemeOverlay from './MemeOverlay';
import BattleCountdown from './BattleCountdown';
import { supabase } from '../supabaseClient';
import {
  buildCaptionOverlay,
  castBattleVote,
  claimBattlePrize,
  entriesToVoteOn,
  entryCaption,
  fetchActiveCaptionKings,
  fetchBattleState,
  shuffleForVoter,
  submitBattleEntry
} from '../utils/dailyCaptionBattle';
import { track } from '../utils/analytics';
import { triggerWinCelebration } from '../utils/winCelebration';
import './DailyCaptionBattleModal.css';

// Plan 2.1 — Daily Caption Battle v2: Enter / Vote / Ranking / Results.
const TABS = [
  { id: 'enter', label: '✏️ Enter' },
  { id: 'vote', label: '😂 Vote' },
  { id: 'ranking', label: '🏆 Ranking' },
  { id: 'results', label: '👑 Results' }
];
const SWIPE_THRESHOLD = 90;

/**
 * Battle image with the caption drawn live on top, using the meme maker's own overlay renderer
 * (MemeMedia skips overlays on still images because their captions are normally baked in).
 */
function CaptionedImage({ imageUrl, top, bottom, alt }) {
  const hasText = Boolean(top || bottom);
  return (
    <div className="tm-cb-captioned">
      <img src={imageUrl} alt={alt || [top, bottom].filter(Boolean).join(' / ') || 'Caption Battle image'} draggable={false} />
      {/* Remount when text first appears so the overlay measures its box. */}
      <MemeOverlay key={hasText ? 'on' : 'off'} overlay={buildCaptionOverlay(top, bottom)} />
    </div>
  );
}

/** Swipe card: drag right = Funny, left = Skip. Touch AND mouse; buttons for everyone else. */
function SwipeCard({ entry, imageUrl, onDecide, busy }) {
  const [dx, setDx] = useState(0);
  const startX = useRef(null);
  const begin = (x) => {
    if (busy) return;
    startX.current = x;
  };
  const move = (x) => {
    if (startX.current === null) return;
    setDx(x - startX.current);
  };
  const end = () => {
    if (startX.current === null) return;
    const d = dx;
    startX.current = null;
    setDx(0);
    if (d > SWIPE_THRESHOLD) onDecide(true);
    else if (d < -SWIPE_THRESHOLD) onDecide(false);
  };
  const hint = dx > 30 ? 'funny' : dx < -30 ? 'skip' : '';
  return (
    <div
      className={`tm-swipe-card ${hint ? `is-${hint}` : ''}`}
      style={{ transform: `translateX(${dx}px) rotate(${dx / 24}deg)` }}
      onTouchStart={(e) => begin(e.touches[0].clientX)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
      onTouchEnd={end}
      onTouchCancel={end}
      onMouseDown={(e) => begin(e.clientX)}
      onMouseMove={(e) => move(e.clientX)}
      onMouseUp={end}
      onMouseLeave={end}
      data-testid="battle-swipe-card"
    >
      {hint && <span className={`tm-swipe-stamp is-${hint}`}>{hint === 'funny' ? '😂 FUNNY' : 'SKIP'}</span>}
      <CaptionedImage imageUrl={imageUrl} top={entry.top_text} bottom={entry.bottom_text} />
      <div className="tm-swipe-card-caption">“{entryCaption(entry)}”</div>
    </div>
  );
}

export default function DailyCaptionBattleModal({
  battleId = null,
  highlightEntryId = null,
  initialTab = null,
  currentUser = null,
  onRequireAuth,
  onOpenProfile,
  onKingsUpdated,
  onClaimPrize,
  onActivityRecorded,
  onClose
}) {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState(initialTab || 'enter');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [seed, setSeed] = useState('anon');
  const [claimed, setClaimed] = useState(null);
  const celebratedRef = useRef(false);

  const load = useCallback(async () => {
    const res = await fetchBattleState(battleId || null);
    setState(res);
    if (res.myEntry) {
      setTopText((t) => t || res.myEntry.top_text || '');
      setBottomText((b) => b || res.myEntry.bottom_text || '');
    }
    return res;
  }, [battleId]);

  useEffect(() => {
    let alive = true;
    supabase?.auth?.getSession?.().then(({ data }) => {
      if (alive && data?.session?.user?.id) setSeed(data.session.user.id);
    });
    fetchBattleState(battleId || null).then((res) => {
      if (!alive) return;
      setState(res);
      if (res.battle?.status === 'complete' && !initialTab) {
        setTab('ranking');
      } else if (res.myEntry) {
        setTopText(res.myEntry.top_text || '');
        setBottomText(res.myEntry.bottom_text || '');
        // First open: if you already entered, go straight to voting.
        if (!initialTab) setTab('vote');
      }
    });
    fetchActiveCaptionKings().then((kings) => alive && onKingsUpdated?.(Array.isArray(kings) ? kings : []));
    return () => {
      alive = false;
    };
  }, [battleId, initialTab, onKingsUpdated]);

  const battle = state?.battle || null;
  const highlightedEntry = useMemo(() => {
    if (!highlightEntryId || !Array.isArray(state?.entries)) return null;
    return state.entries.find((e) => String(e.id) === String(highlightEntryId)) || null;
  }, [highlightEntryId, state]);
  const captionMax = state?.captionMax || 120;
  const used = topText.trim().length + bottomText.trim().length;
  const voteQueue = useMemo(() => (state ? entriesToVoteOn(state, seed) : []), [state, seed]);
  const rankingList = useMemo(() => {
    if (!state) return [];
    const list = state.entries.filter((e) => e.status === 'approved' || e.is_mine);
    return state.showTotals ? list : shuffleForVoter(list, `${seed}:rank:${battle?.id || ''}`);
  }, [state, seed, battle?.id]);
  const previous = state?.previous || null;
  const myAward = previous?.my_award || null;

  useEffect(() => {
    if (tab !== 'results' || !previous) return;
    track('battle_result_viewed', { placed: myAward ? myAward.rank : 0 });
    if (myAward && !celebratedRef.current) {
      celebratedRef.current = true;
      triggerWinCelebration({
        amount: myAward.mdollarz,
        unit: 'M$',
        game: 'Caption Battle',
        headline: myAward.rank === 1 ? '👑 YOU WON THE CAPTION BATTLE!' : `🏆 You placed #${myAward.rank}!`,
        detail: 'Your caption made the podium',
        multiplier: myAward.rank === 1 ? 5 : 3,
        tier: myAward.rank === 1 ? 'jackpot' : 'win'
      });
    }
  }, [tab, previous, myAward]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy || !battle) return;
    setBusy(true);
    setMsg({ type: '', text: '' });
    const res = await submitBattleEntry({ battleId: battle.id, topText, bottomText, captionMax });
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.message || 'Could not submit your caption.' });
      return;
    }
    onActivityRecorded?.('battle_entry');
    setMsg({
      type: 'ok',
      text:
        res.status === 'pending'
          ? '⏳ Saved! A moderator will check it before others can see it.'
          : res.edited
            ? '✏️ Entry updated! (Votes on your old caption were reset.)'
            : '✅ You’re in! Now go vote on the others.'
    });
    await load();
  };

  const handleDecide = async (entry, funny) => {
    if (busy) return;
    setBusy(true);
    const res = await castBattleVote(entry.id, funny);
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.message || 'Could not record your vote.' });
      return;
    }
    if (funny) track('battle_vote', { battle: String(battle?.id || '') });
    onActivityRecorded?.('battle_vote');
    await load();
  };

  const handleClaim = async () => {
    if (!previous || busy) return;
    setBusy(true);
    const res = await claimBattlePrize(previous.id);
    setBusy(false);
    if (res.ok) {
      const credited = onClaimPrize?.(previous.id, res.mdollarz, res.rank) ?? res.mdollarz;
      setClaimed(credited);
      await load();
    } else {
      setMsg({ type: 'error', text: 'Prize already claimed, or nothing to claim.' });
    }
  };

  const shareBattleLink = async (entryId = null, customText = '') => {
    if (!battle?.id) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.thememes.net';
    const path = entryId
      ? `/battle/${encodeURIComponent(battle.id)}/e/${encodeURIComponent(entryId)}`
      : `/battle/${encodeURIComponent(battle.id)}`;
    const url = `${origin}${path}?ref=share`;
    const title = battle.title ? `${battle.title} — Daily Caption Battle` : 'Daily Caption Battle | THE MEMES.net';
    const text = customText || `Compete in "${battle.title || 'Daily Caption Battle'}" on THE MEMES.net`;
    track('meme_shared', {
      channel: 'battle_link',
      battle: String(battle.id),
      ...(entryId ? { entry: String(entryId) } : {})
    });
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.innerWidth <= 860) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard?.writeText(url);
      setMsg({ type: 'ok', text: entryId ? '🔗 Entry link copied!' : '🔗 Battle link copied!' });
    } catch {
      setMsg({ type: 'ok', text: url });
    }
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-caption-battle-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily Caption Battle"
        data-testid="daily-caption-battle-modal"
      >
        <div className="tm-modal-sticky-header">
          <div className="tm-cb-head">
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 className="tm-cb-title">⚔️ Daily Caption Battle</h2>
            {battle && <BattleCountdown endsAt={battle.ends_at} prefix="⏳ " />}
            {battle && (
              <button
                type="button"
                className="tm-btn tm-cb-share-btn"
                onClick={() => shareBattleLink()}
                title="Share this battle"
              >
                🔗 Share
              </button>
            )}
          </div>
          <div className="tm-cb-tabs" role="tablist" aria-label="Caption Battle sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`tm-cb-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => {
                  setTab(t.id);
                  setMsg({ type: '', text: '' });
                }}
                data-testid={`battle-tab-${t.id}`}
              >
                {t.label}
                {t.id === 'vote' && voteQueue.length > 0 && <span className="tm-cb-tab-count">{voteQueue.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {!currentUser?.verified && onRequireAuth && (
          <SignUpNudgeBanner
            reason="battle"
            currentUser={currentUser}
            onSignIn={() => {
              onClose();
              onRequireAuth();
            }}
          />
        )}

        {highlightedEntry && battle && (
          <div className="tm-cb-shared-entry" data-testid="battle-highlighted-entry">
            <div className="tm-cb-shared-entry-head">
              <span>🔥 Shared entry by <strong>@{highlightedEntry.author_name}</strong></span>
              <button
                type="button"
                className="tm-btn tm-cb-entry-share"
                onClick={() => shareBattleLink(highlightedEntry.id, `"${entryCaption(highlightedEntry)}" — @${highlightedEntry.author_name}`)}
              >
                🔗 Share entry
              </button>
            </div>
            <div className="tm-cb-shared-entry-media">
              <CaptionedImage imageUrl={battle.image_url} top={highlightedEntry.top_text} bottom={highlightedEntry.bottom_text} />
            </div>
          </div>
        )}

        {!state ? (
          <div className="tm-cb-empty">⏳ Loading today’s battle…</div>
        ) : !battle && tab !== 'results' ? (
          <div className="tm-cb-empty" data-testid="battle-none-live">
            No battle is live right now. The next one starts at 9:00 (UK time).
          </div>
        ) : (
          <>
            {tab === 'enter' && battle && (
              <div className="tm-cb-enter">
                <div className="tm-cb-preview">
                  <CaptionedImage imageUrl={battle.image_url} top={topText.trim()} bottom={bottomText.trim()} />
                </div>
                <form className="tm-cb-form" onSubmit={handleSubmit}>
                  <div className="tm-cb-kicker">
                    {battle.theme ? `🏷️ ${battle.theme} · ` : ''}
                    {state.entryCount} {state.entryCount === 1 ? 'entry' : 'entries'} so far
                  </div>
                  <h3 className="tm-cb-battle-name">{battle.title}</h3>
                  {battle.prompt && <p className="tm-cb-prompt">{battle.prompt}</p>}
                  <input
                    className="tm-battle-input"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Top text"
                    aria-label="Top caption"
                    maxLength={captionMax}
                    data-testid="battle-top-input"
                  />
                  <input
                    className="tm-battle-input"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Bottom text (optional)"
                    aria-label="Bottom caption"
                    maxLength={captionMax}
                    data-testid="battle-bottom-input"
                  />
                  <div className={`tm-cb-counter ${used > captionMax ? 'over' : ''}`} aria-live="polite">
                    {used}/{captionMax}
                  </div>
                  <button
                    type="submit"
                    className="tm-btn tm-btn-primary tm-cb-submit"
                    disabled={busy || used === 0 || used > captionMax}
                    data-testid="battle-submit-btn"
                  >
                    {busy ? '⏳ Checking…' : state.myEntry ? '✏️ Update my entry' : '⚔️ Enter the battle'}
                  </button>
                  <p className="tm-cb-fine">
                    One entry each; you can edit it until the battle closes (editing resets its votes). Top 3 win a
                    badge and play-money M$. By entering you agree to the <a href="/rules">House Rules</a>.
                  </p>
                  {state.myEntry?.status === 'pending' && (
                    <p className="tm-cb-fine">⏳ Your entry is waiting for a moderator.</p>
                  )}
                </form>
              </div>
            )}

            {tab === 'vote' && battle && (
              <div className="tm-cb-vote">
                {voteQueue.length === 0 ? (
                  <div className="tm-cb-empty" data-testid="battle-vote-done">
                    {state.entryCount === 0
                      ? 'No captions yet. Be the first to enter!'
                      : '🎉 You’ve seen every caption. Check the ranking, or come back later for new ones.'}
                  </div>
                ) : (
                  <>
                    <SwipeCard
                      key={voteQueue[0].id}
                      entry={voteQueue[0]}
                      imageUrl={battle.image_url}
                      busy={busy}
                      onDecide={(funny) => handleDecide(voteQueue[0], funny)}
                    />
                    <div className="tm-cb-vote-buttons">
                      <button type="button" className="tm-btn tm-cb-skip" disabled={busy} onClick={() => handleDecide(voteQueue[0], false)}>
                        👋 Skip
                      </button>
                      <button
                        type="button"
                        className="tm-btn tm-btn-primary tm-cb-funny"
                        disabled={busy}
                        onClick={() => handleDecide(voteQueue[0], true)}
                        data-testid="battle-funny-btn"
                      >
                        😂 Funny
                      </button>
                    </div>
                    <p className="tm-cb-fine">
                      Swipe right for funny, left to skip. {voteQueue.length} left.
                      {state.votesNeeded > 0 && ` Vote on ${state.votesNeeded} more to unlock the live scores.`}
                    </p>
                  </>
                )}
              </div>
            )}

            {tab === 'ranking' && battle && (
              <div className="tm-cb-ranking">
                {!state.showTotals && (
                  <p className="tm-cb-note" data-testid="battle-scores-hidden">
                    🔒 Scores are hidden until you’ve voted on {state.votesNeeded} more{' '}
                    {state.votesNeeded === 1 ? 'caption' : 'captions'} (keeps it fair).
                  </p>
                )}
                {rankingList.length === 0 ? (
                  <div className="tm-cb-empty">No captions yet.</div>
                ) : (
                  <ol className="tm-cb-rank-list">
                    {rankingList.map((e, i) => (
                      <li key={e.id} className={`tm-cb-rank-row ${e.is_mine ? 'is-mine' : ''}`}>
                        <span className="tm-cb-rank-pos">{state.showTotals ? `#${i + 1}` : '•'}</span>
                        <span className="tm-cb-rank-text">
                          “{entryCaption(e)}”
                          <button type="button" className="tm-link-btn" onClick={() => onOpenProfile?.(e.author_name)}>
                            @{e.author_name}
                          </button>
                          {e.status === 'pending' && <em> (waiting for review)</em>}
                        </span>
                        <div className="tm-cb-rank-actions">
                          <span className="tm-cb-rank-score">{state.showTotals ? `😂 ${e.score ?? 0}` : '🔒'}</span>
                          <button
                            type="button"
                            className="tm-btn tm-cb-entry-share"
                            onClick={() => shareBattleLink(e.id, `"${entryCaption(e)}" — @${e.author_name}`)}
                            aria-label="Share this entry"
                            title="Share this entry"
                          >
                            🔗
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {tab === 'results' && (
              <div className="tm-cb-results">
                {!previous ? (
                  <div className="tm-cb-empty">The first results arrive when today’s battle closes at 9:00 (UK time).</div>
                ) : (
                  <>
                    <h3 className="tm-cb-battle-name">
                      Results: {previous.title} ({previous.battle_day})
                    </h3>
                    {myAward && (
                      <div className="tm-cb-award" data-testid="battle-my-award">
                        <strong>
                          {myAward.rank === 1 ? '👑 You won!' : `🏆 You placed #${myAward.rank}!`}
                        </strong>{' '}
                        {myAward.claimed_at || claimed !== null ? (
                          <span>Prize claimed{claimed ? `: +${claimed} M$` : ''}. Badge added to your profile.</span>
                        ) : (
                          <button type="button" className="tm-btn tm-btn-primary" disabled={busy} onClick={handleClaim}>
                            Claim {myAward.mdollarz} M$ (play money)
                          </button>
                        )}
                      </div>
                    )}
                    {previous.top.length === 0 ? (
                      <div className="tm-cb-empty">Nobody entered that battle.</div>
                    ) : (
                      <div className="tm-cb-podium">
                        {previous.top.map((e) => (
                          <article key={e.id} className={`tm-cb-podium-card rank-${e.rank}`}>
                            <div className="tm-cb-podium-rank">{['👑 1st', '🥈 2nd', '🥉 3rd'][e.rank - 1]}</div>
                            <CaptionedImage imageUrl={previous.image_url} top={e.top_text} bottom={e.bottom_text} />
                            <div className="tm-cb-podium-foot">
                              <button type="button" className="tm-link-btn" onClick={() => onOpenProfile?.(e.author_name)}>
                                @{e.author_name}
                              </button>
                              <div className="tm-cb-rank-actions">
                                <span>😂 {e.score}</span>
                                <button
                                  type="button"
                                  className="tm-btn tm-cb-entry-share"
                                  onClick={() => shareBattleLink(e.id, `"${entryCaption(e)}" — @${e.author_name}`)}
                                  aria-label="Share this entry"
                                  title="Share this entry"
                                >
                                  🔗
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    <a href="/hall-of-fame" className="tm-btn" data-testid="hall-of-fame-link">
                      👑 Hall of Fame
                    </a>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {msg.text && (
          <div className={`tm-battle-form-msg ${msg.type === 'error' ? 'is-error' : ''}`} role="status" data-testid="battle-form-feedback">
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
