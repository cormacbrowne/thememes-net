import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SignUpNudgeBanner from './SignUpNudgeBanner';
import MemeOverlay from './MemeOverlay';
import BattleCountdown from './BattleCountdown';
import HouseBadge from './HouseBadge';
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
import { AI_BATTLE_IMAGE_LABEL, isAiBattleImage } from '../utils/battleImages';
import './DailyCaptionBattleModal.css';
import { SITE_URL, ensureShareUrlInText, linkSafeShareText } from '../utils/shareText.js';

// Plan 2.1 — Daily Caption Battle v2: Enter / Vote / Ranking / Results.
const TABS = [
  { id: 'enter', label: '✏️ Enter' },
  { id: 'vote', label: '😂 Vote' },
  { id: 'ranking', label: '🏆 Ranking' },
  { id: 'results', label: '👑 Results' }
];

/**
 * Battle image with the caption drawn live on top, using the meme maker's own overlay renderer
 * (MemeMedia skips overlays on still images because their captions are normally baked in).
 */
function CaptionedImage({ imageUrl, top, bottom, alt }) {
  const aiLabel = isAiBattleImage(imageUrl);
  const hasText = Boolean(top || bottom);
  return (
    <>
      <div className="tm-cb-captioned">
        <img src={imageUrl} alt={alt || [top, bottom].filter(Boolean).join(' / ') || 'Caption Battle image'} draggable={false} />
        {/* Remount when text first appears so the overlay measures its box. */}
        <MemeOverlay key={hasText ? 'on' : 'off'} overlay={buildCaptionOverlay(top, bottom)} />
      </div>
      {aiLabel && <p className="tm-cb-ai-note">{AI_BATTLE_IMAGE_LABEL}</p>}
    </>
  );
}

export default function DailyCaptionBattleModal({
  battleId = null,
  highlightEntryId = null,
  initialTab = null,
  currentUser = null,
  onRequireAuth,
  onOpenProfile,
  onReportEntry,
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
  const [votingId, setVotingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [voteFeedback, setVoteFeedback] = useState(null); // { type: 'ok'|'skip'|'error'|'auth', text: string }
  const [previewEntryId, setPreviewEntryId] = useState(null);
  const [optimisticVotes, setOptimisticVotes] = useState(() => new Set());
  const [optimisticSkips, setOptimisticSkips] = useState(() => new Set());
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

  const myVoteSet = useMemo(() => {
    const s = new Set((state?.myVotes || []).map(String));
    optimisticVotes.forEach((id) => s.add(String(id)));
    return s;
  }, [state?.myVotes, optimisticVotes]);

  const mySkipSet = useMemo(() => {
    const s = new Set((state?.mySkips || []).map(String));
    optimisticSkips.forEach((id) => s.add(String(id)));
    return s;
  }, [state?.mySkips, optimisticSkips]);

  const effectiveState = useMemo(() => {
    if (!state) return null;
    return {
      ...state,
      myVotes: [...myVoteSet],
      mySkips: [...mySkipSet]
    };
  }, [state, myVoteSet, mySkipSet]);

  const voteQueue = useMemo(
    () => (effectiveState ? entriesToVoteOn(effectiveState, seed) : []),
    [effectiveState, seed]
  );

  const rankingList = useMemo(() => {
    if (!state) return [];
    const list = state.entries.filter((e) => e.status === 'approved' || e.is_mine);
    return state.showTotals
      ? [...list].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      : shuffleForVoter(list, `${seed}:rank:${battle?.id || ''}`);
  }, [state, seed, battle?.id]);

  // Keep unvoted captions first, then voted captions (highlighted with standings), then skipped / own.
  const voteCards = useMemo(() => {
    if (!state) return [];
    const approved = state.entries.filter((e) => e.status === 'approved');
    const rankById = new Map();
    if (state.showTotals) {
      [...approved]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .forEach((e, idx) => rankById.set(String(e.id), idx + 1));
    }
    const queueIds = new Set(voteQueue.map((e) => String(e.id)));
    const voted = approved.filter((e) => !e.is_mine && myVoteSet.has(String(e.id)));
    const skipped = approved.filter((e) => !e.is_mine && !myVoteSet.has(String(e.id)) && mySkipSet.has(String(e.id)));
    const mine = approved.filter((e) => e.is_mine);
    const ordered = [
      ...voteQueue,
      ...voted.filter((e) => !queueIds.has(String(e.id))),
      ...skipped.filter((e) => !queueIds.has(String(e.id))),
      ...mine
    ];
    return ordered.map((e) => ({
      entry: e,
      hasVoted: myVoteSet.has(String(e.id)),
      hasSkipped: mySkipSet.has(String(e.id)),
      rank: rankById.get(String(e.id)) || null
    }));
  }, [state, voteQueue, myVoteSet, mySkipSet]);

  const previewEntry = useMemo(() => {
    if (previewEntryId) {
      const found = voteCards.find((c) => String(c.entry.id) === String(previewEntryId));
      if (found) return found.entry;
    }
    return voteQueue[0] || voteCards[0]?.entry || null;
  }, [previewEntryId, voteCards, voteQueue]);

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
    const idStr = String(entry.id);
    setBusy(true);
    setVotingId(idStr);
    setPreviewEntryId(idStr);
    const res = await castBattleVote(entry.id, funny);
    setBusy(false);
    setVotingId(null);
    if (!res.ok) {
      if (res.error === 'sign_in_required') {
        setVoteFeedback({
          type: 'auth',
          text: 'Sign in required to cast a vote right now.'
        });
      } else {
        setVoteFeedback({
          type: 'error',
          text: res.message || 'Could not record your vote.'
        });
      }
      setMsg({ type: 'error', text: res.message || 'Could not record your vote.' });
      return;
    }
    if (funny) {
      track('battle_vote', { battle: String(battle?.id || '') });
      setOptimisticVotes((prev) => new Set([...prev, idStr]));
    } else {
      setOptimisticSkips((prev) => new Set([...prev, idStr]));
    }
    onActivityRecorded?.('battle_vote');
    const updated = await load();
    const updatedApproved = (updated?.entries || []).filter((e) => e.status === 'approved');
    const sorted = [...updatedApproved].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const idx = sorted.findIndex((e) => String(e.id) === idStr);
    const updatedEntry = idx >= 0 ? sorted[idx] : null;
    if (funny) {
      const standingNote =
        updated?.showTotals && updatedEntry
          ? ` Currently #${idx + 1} with ${updatedEntry.score ?? 0} ${(updatedEntry.score ?? 0) === 1 ? 'vote' : 'votes'}.`
          : updated?.votesNeeded > 0
            ? ` Vote on ${updated.votesNeeded} more to unlock live standings.`
            : '';
      setVoteFeedback({
        type: 'ok',
        text: `✓ Vote counted for “${entryCaption(entry)}”!${standingNote}`
      });
    } else {
      setVoteFeedback({
        type: 'skip',
        text: `Skipped “${entryCaption(entry)}”. Pick your favorite below.`
      });
    }
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
    const path = entryId
      ? `/battle/${encodeURIComponent(battle.id)}/e/${encodeURIComponent(entryId)}`
      : `/battle/${encodeURIComponent(battle.id)}`;
    const url = `${SITE_URL}${path}?ref=share`;
    const title = battle.title ? `${battle.title} — Daily Caption Battle` : 'Daily Caption Battle | THE MEMES.net';
    const text = customText || `⚔️ Caption battle: "${battle.title || 'Daily Caption Battle'}". Think you can out-caption me?`;
    const recordShare = () =>
      track('meme_shared', {
        channel: 'battle_link',
        battle: String(battle.id),
        ...(entryId ? { entry: String(entryId) } : {})
      });
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.innerWidth <= 860) {
        await navigator.share({
          title: linkSafeShareText(title),
          text: ensureShareUrlInText(text, url),
          url
        });
        recordShare();
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('clipboard_unavailable');
      }
      await navigator.clipboard.writeText(url);
      recordShare();
      setMsg({ type: 'ok', text: entryId ? '🔗 Entry link copied!' : '🔗 Battle link copied!' });
    } catch {
      setMsg({ type: 'ok', text: url });
    }
  };

  const firstUnvotedId = voteQueue[0] ? String(voteQueue[0].id) : null;
  const firstReportableId = voteCards.find((c) => !c.entry.is_mine)?.entry?.id || null;

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

        {!currentUser?.verified && onRequireAuth && (tab === 'enter' || tab === 'results') && (
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
              <span>
                🔥 Shared entry by <strong>@{highlightedEntry.author_name}</strong>{' '}
                {highlightedEntry.is_house && <HouseBadge />}
              </span>
              <div className="tm-cb-rank-actions">
                <button
                  type="button"
                  className="tm-btn tm-cb-entry-share"
                  onClick={() => shareBattleLink(highlightedEntry.id, `"${entryCaption(highlightedEntry)}" — @${highlightedEntry.author_name}`)}
                >
                  🔗 Share entry
                </button>
                {!highlightedEntry.is_mine && onReportEntry && (
                  <button
                    type="button"
                    className="tm-btn tm-cb-entry-share"
                    onClick={() => onReportEntry(highlightedEntry, battle)}
                    aria-label="Report this entry"
                    title="Report this entry"
                    data-testid="battle-report-highlighted-btn"
                  >
                    🚩
                  </button>
                )}
              </div>
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
                    {state.humanEntryCount > 0
                      ? `${state.humanEntryCount} ${state.humanEntryCount === 1 ? 'entry' : 'entries'} so far`
                      : 'Be the first to enter'}
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
              <div className="tm-cb-vote-shell">
                <div className="tm-cb-vote-status">
                  <span className="tm-cb-vote-note">
                    Tap <strong>Vote</strong> on any caption — no sign-in needed.
                    {!currentUser?.verified && onRequireAuth && (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="tm-cb-inline-signin"
                          onClick={() => {
                            onClose();
                            onRequireAuth();
                          }}
                        >
                          Sign in to save wins
                        </button>
                      </>
                    )}
                  </span>
                  <span className="tm-cb-standings-pill">
                    {state.showTotals
                      ? `🏆 Live standings unlocked (${myVoteSet.size} voted)`
                      : `🔒 ${state.votesNeeded} more ${state.votesNeeded === 1 ? 'vote' : 'votes'} to unlock standings`}
                  </span>
                </div>

                {voteFeedback && (
                  <div
                    className={`tm-cb-vote-feedback ${
                      voteFeedback.type === 'error' || voteFeedback.type === 'auth'
                        ? 'is-error'
                        : voteFeedback.type === 'skip'
                          ? 'is-skip'
                          : 'is-ok'
                    }`}
                    role="status"
                    aria-live="polite"
                    data-testid="battle-vote-feedback"
                  >
                    <span>{voteFeedback.text}</span>
                    {voteFeedback.type === 'auth' && onRequireAuth && (
                      <button
                        type="button"
                        className="tm-btn tm-cb-inline-auth-btn"
                        onClick={() => {
                          onClose();
                          onRequireAuth();
                        }}
                      >
                        Sign in →
                      </button>
                    )}
                  </div>
                )}

                {voteCards.length === 0 ? (
                  <div className="tm-cb-empty" data-testid="battle-vote-done">
                    Be the first to enter! Switch to the Enter tab to drop the opening caption.
                  </div>
                ) : (
                  <div className="tm-cb-vote-layout">
                    {previewEntry && (
                      <div className="tm-cb-vote-preview">
                        <CaptionedImage
                          imageUrl={battle.image_url}
                          top={previewEntry.top_text}
                          bottom={previewEntry.bottom_text}
                        />
                        <div className="tm-cb-vote-preview-meta">
                          <span>Previewing @{previewEntry.author_name}</span>
                          {previewEntry.is_house && <HouseBadge />}
                        </div>
                      </div>
                    )}

                    <div className="tm-cb-vote-column">
                      {voteQueue.length === 0 && (
                        <div className="tm-cb-empty tm-cb-vote-done-banner" data-testid="battle-vote-done">
                          🎉 You’ve judged every caption!
                          {state.showTotals
                            ? ' Live standings are shown below.'
                            : ' Check back later as new entries arrive.'}
                        </div>
                      )}

                      <ul className="tm-cb-vote-list" aria-label="Captions to vote on">
                        {voteCards.map(({ entry, hasVoted, hasSkipped, rank }) => {
                          const idStr = String(entry.id);
                          const isPreview = previewEntry && String(previewEntry.id) === idStr;
                          const isFirstUnvoted = firstUnvotedId === idStr;
                          const isFirstReport = firstReportableId && String(firstReportableId) === idStr;
                          return (
                            <li
                              key={entry.id}
                              className={`tm-cb-vote-card ${hasVoted ? 'is-voted' : ''} ${
                                hasSkipped ? 'is-skipped' : ''
                              } ${entry.is_mine ? 'is-mine' : ''} ${isPreview ? 'is-previewing' : ''}`}
                              data-testid={`battle-vote-card-${entry.id}`}
                            >
                              <button
                                type="button"
                                className="tm-cb-vote-card-select"
                                onClick={() => setPreviewEntryId(idStr)}
                                aria-label={`Preview caption by @${entry.author_name} on the meme`}
                              >
                                <span className="tm-cb-vote-card-top">
                                  <span className="tm-cb-vote-card-author">
                                    @{entry.author_name} {entry.is_house && <HouseBadge />}
                                  </span>
                                  {state.showTotals && rank && (
                                    <span className="tm-cb-vote-card-score">
                                      #{rank} · 😂 {entry.score ?? 0}
                                    </span>
                                  )}
                                </span>
                                <span className="tm-cb-vote-card-text">“{entryCaption(entry)}”</span>
                              </button>

                              <div className="tm-cb-vote-card-actions">
                                {entry.is_mine ? (
                                  <span className="tm-cb-vote-mine-pill">Your entry</span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={`tm-btn tm-cb-vote-btn ${
                                        hasVoted ? 'is-voted' : isFirstUnvoted ? 'tm-btn-primary' : 'tm-cb-vote-btn-ready'
                                      }`}
                                      disabled={busy || hasVoted}
                                      aria-pressed={hasVoted}
                                      onClick={() => handleDecide(entry, true)}
                                      data-testid={isFirstUnvoted ? 'battle-funny-btn' : `battle-vote-btn-${entry.id}`}
                                    >
                                      {votingId === idStr
                                        ? 'Voting…'
                                        : hasVoted
                                          ? '✓ Voted'
                                          : '😂 Vote'}
                                    </button>
                                    {!hasVoted && !hasSkipped && (
                                      <button
                                        type="button"
                                        className="tm-btn tm-cb-skip-btn"
                                        disabled={busy}
                                        onClick={() => handleDecide(entry, false)}
                                      >
                                        Skip
                                      </button>
                                    )}
                                    {onReportEntry && (
                                      <button
                                        type="button"
                                        className="tm-btn tm-cb-report-icon-btn"
                                        onClick={() => onReportEntry(entry, battle)}
                                        aria-label={`Report caption by @${entry.author_name}`}
                                        title="Report caption"
                                        data-testid={isFirstReport ? 'battle-report-vote-btn' : undefined}
                                      >
                                        🚩
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
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
                    {rankingList.map((e, i) => {
                      const hasVoted = myVoteSet.has(String(e.id));
                      return (
                        <li
                          key={e.id}
                          className={`tm-cb-rank-row ${e.is_mine ? 'is-mine' : ''} ${hasVoted ? 'is-voted' : ''}`}
                        >
                          <span className="tm-cb-rank-pos">{state.showTotals ? `#${i + 1}` : '•'}</span>
                          <span className="tm-cb-rank-text">
                            “{entryCaption(e)}”
                            <button type="button" className="tm-link-btn" onClick={() => onOpenProfile?.(e.author_name)}>
                              @{e.author_name}
                            </button>
                            {e.is_house && <HouseBadge />}
                            {e.status === 'pending' && <em> (waiting for review)</em>}
                          </span>
                          <div className="tm-cb-rank-actions">
                            <span className="tm-cb-rank-score">{state.showTotals ? `😂 ${e.score ?? 0}` : '🔒'}</span>
                            {!e.is_mine && e.status === 'approved' && (
                              <button
                                type="button"
                                className={`tm-btn tm-cb-entry-vote ${hasVoted ? 'is-voted' : ''}`}
                                disabled={busy || hasVoted}
                                aria-pressed={hasVoted}
                                onClick={() => handleDecide(e, true)}
                              >
                                {hasVoted ? '✓ Voted' : '😂 Vote'}
                              </button>
                            )}
                            <button
                              type="button"
                              className="tm-btn tm-cb-entry-share"
                              onClick={() => shareBattleLink(e.id, `"${entryCaption(e)}" — @${e.author_name}`)}
                              aria-label="Share this entry"
                              title="Share this entry"
                            >
                              🔗
                            </button>
                            {!e.is_mine && onReportEntry && (
                              <button
                                type="button"
                                className="tm-btn tm-cb-entry-share"
                                onClick={() => onReportEntry(e, battle)}
                                aria-label="Report this entry"
                                title="Report this entry"
                                data-testid="battle-report-rank-btn"
                              >
                                🚩
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
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
                                {!e.is_mine && onReportEntry && (
                                  <button
                                    type="button"
                                    className="tm-btn tm-cb-entry-share"
                                    onClick={() => onReportEntry(e, previous)}
                                    aria-label="Report this entry"
                                    title="Report this entry"
                                  >
                                    🚩
                                  </button>
                                )}
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
