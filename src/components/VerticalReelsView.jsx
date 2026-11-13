import { useState, useRef, useEffect, useCallback } from 'react';
import MemeMedia from './MemeMedia';
import MemeLiveEmotes from './MemeLiveEmotes';
import { getMemeRarityTier, formatMemeUploadDate } from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';
import { trackMemeViewed } from '../utils/analytics';
import { RadioToggleButton } from './MemesRadio';

const REELS_VIEWED_KEY = 'tm_reels_viewed_ids_v1';
const REELS_GOLDEN_CLAIMED_KEY = 'tm_reels_golden_claimed_v1';

function loadStoredIdList(key) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export default function VerticalReelsView({
  filteredMemes,
  userVotes,
  bookmarkedIds,
  onVote,
  onReaction,
  onAddComment,
  onToggleBookmark,
  onTriggerStudioMutate,
  onCaptionThis,
  onShareMeme,
  onOpenProfile,
  onOpenTheater,
  onOpenBlankStudio,
  onBackToFeed,
  onOpenGames,
  onClaimGoldenMeme,
  litePerfMode = false
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleReelsCount, setVisibleReelsCount] = useState(8);
  const [burstMemeId, setBurstMemeId] = useState(null);
  const [activeCommentsMemeId, setActiveCommentsMemeId] = useState(null);
  const [localCommentInput, setLocalCommentInput] = useState('');
  const [goldenMemeIds, setGoldenMemeIds] = useState([]);
  const [claimedGoldenIds, setClaimedGoldenIds] = useState(() =>
    loadStoredIdList(REELS_GOLDEN_CLAIMED_KEY)
  );
  const viewedSetRef = useRef(new Set(loadStoredIdList(REELS_VIEWED_KEY)));
  const lastTapRef = useRef(0);
  const containerRef = useRef(null);

  const len = filteredMemes?.length || 0;
  const effectiveVisibleCount = Math.min(len, Math.max(visibleReelsCount, currentIndex + 4));

  const recordReelView = useCallback((meme) => {
    if (!meme?.id) return;
    trackMemeViewed(meme, 'reels');
    const idStr = String(meme.id);
    if (!viewedSetRef.current.has(idStr)) {
      viewedSetRef.current.add(idStr);
      const count = viewedSetRef.current.size;
      try {
        localStorage.setItem(
          REELS_VIEWED_KEY,
          JSON.stringify(Array.from(viewedSetRef.current).slice(-250))
        );
      } catch {
        // ignore quota errors
      }
      if (count > 0 && count % 10 === 0) {
        setGoldenMemeIds((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));
      }
    }
  }, []);

  useEffect(() => {
    const activeMeme = filteredMemes?.[currentIndex];
    if (activeMeme) {
      Promise.resolve().then(() => recordReelView(activeMeme));
    }
  }, [filteredMemes, currentIndex, recordReelView]);

  const handleContainerScroll = useCallback((e) => {
    const el = e.currentTarget;
    if (!el) return;
    const slideH = el.clientHeight || 1;
    const approxIdx = Math.round(el.scrollTop / slideH);
    const clampedIdx = Math.max(0, Math.min(Math.max(0, len - 1), approxIdx));
    if (approxIdx !== currentIndex && approxIdx < len) {
      setCurrentIndex(clampedIdx);
    }
    const scrolledMeme = filteredMemes?.[clampedIdx];
    if (scrolledMeme) {
      recordReelView(scrolledMeme);
    }
    if (approxIdx + 4 > visibleReelsCount) {
      setVisibleReelsCount((prev) => Math.min(len, Math.max(prev + 8, approxIdx + 6)));
    }
  }, [filteredMemes, len, visibleReelsCount, currentIndex, recordReelView]);

  // Handle keyboard Up/Down navigation
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(Math.max(0, len - 1), prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [len]);

  // Scroll to active index smoothly when index changes
  useEffect(() => {
    const el = containerRef.current?.children?.[currentIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  const handleDoubleTap = useCallback(
    (meme, e) => {
      setBurstMemeId(meme.id);
      sfx.playVote(true, 2);
      onVote(meme.id, 1, e);
      setTimeout(() => setBurstMemeId(null), 700);
    },
    [onVote]
  );

  const handleTouchEnd = useCallback(
    (meme, e) => {
      if (e.target.closest('button') || e.target.closest('input')) return;
      const now = e.timeStamp || performance.now();
      if (now - lastTapRef.current < 280) {
        const touch = e.changedTouches?.[0];
        handleDoubleTap(meme, touch ? { clientX: touch.clientX, clientY: touch.clientY } : e);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    },
    [handleDoubleTap]
  );

  if (!filteredMemes || len === 0) {
    return (
      <section className="tm-reels-empty">
        <div className="tm-empty-feed-card">
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎬📱✨</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '22px' }}>No Memes in Reels Feed Yet!</h2>
          <p style={{ color: '#94a3b8', maxWidth: '460px', margin: '0 auto 16px', fontSize: '14px' }}>
            All memes on THE MEMES.net are 100% community-uploaded. Upload the first meme to launch the full-screen Meme Reels feed!
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onOpenBlankStudio && (
              <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenBlankStudio}>
                + Upload Meme (+100 XP)
              </button>
            )}
            {onBackToFeed && (
              <button type="button" className="tm-btn" onClick={onBackToFeed}>
                ← Back to Grid
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="tm-reels-viewport">
      {/* Top Floating Controls (Desktop shows Grid/+Upload; Mobile uses bottom 5-tab dock) */}
      <div className="tm-reels-top-nav">
        <button
          type="button"
          className="tm-reels-pill-btn tm-hide-mobile"
          onClick={onBackToFeed}
          title="Return to Grid Feed"
        >
          📱 Grid View
        </button>
        <span className="tm-reels-counter">
          🎬 {currentIndex + 1} / {len} • Double-tap to 🔥
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <RadioToggleButton className="tm-reels-pill-btn" />
          <button
            type="button"
            className="tm-reels-pill-btn tm-reels-pill-primary tm-hide-mobile"
            onClick={onOpenBlankStudio}
          >
            + Create
          </button>
        </div>
      </div>

      {/* Full-Height Snap Container */}
      <div ref={containerRef} className="tm-reels-container" onScroll={handleContainerScroll}>
        {filteredMemes.slice(0, effectiveVisibleCount).map((meme, idx) => {
          const rarity = getMemeRarityTier(meme);
          const uploadInfo = formatMemeUploadDate(meme.created_at);
          const myVote = userVotes?.[meme.id] || 0;
          const isSaved = bookmarkedIds?.includes(String(meme.id));
          const isBursting = burstMemeId === meme.id;
          const isCommentsOpen = activeCommentsMemeId === meme.id;
          const isGoldenDrop =
            goldenMemeIds.includes(String(meme.id)) && !claimedGoldenIds.includes(String(meme.id));

          return (
            <article
              key={meme.id}
              className={`tm-reels-slide ${idx === currentIndex ? 'active' : ''} ${isGoldenDrop ? 'tm-reels-golden-slide' : ''}`}
            >
              {/* Media Container with Double-Tap Upvote Area */}
              <div
                className="tm-reels-media-wrap"
                onDoubleClick={(e) => handleDoubleTap(meme, e)}
                onTouchEnd={(e) => handleTouchEnd(meme, e)}
              >
                <MemeMedia
                  meme={meme}
                  mode="reel"
                  priority={idx === 0}
                  imgLoading={idx < 2 ? 'eager' : 'lazy'}
                  active={idx === currentIndex}
                  preload={Math.abs(idx - currentIndex) <= 1 ? 'auto' : 'metadata'}
                  litePerfMode={litePerfMode}
                  className="tm-reels-img"
                />
                <MemeLiveEmotes memeId={meme.id} litePerfMode={litePerfMode} />

                {isGoldenDrop && (
                  <button
                    type="button"
                    className="tm-golden-meme-drop-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      const idStr = String(meme.id);
                      const next = [...claimedGoldenIds, idStr];
                      setClaimedGoldenIds(next);
                      try {
                        localStorage.setItem(REELS_GOLDEN_CLAIMED_KEY, JSON.stringify(next.slice(-100)));
                      } catch {
                        // ignore
                      }
                      if (onClaimGoldenMeme) onClaimGoldenMeme(meme, e);
                    }}
                  >
                    ✨ GOLDEN MEME DROP! Tap to claim surprise reward
                  </button>
                )}

                {/* Explosive Heart / Flame Double-Tap Burst */}
                {isBursting && (
                  <div className="tm-reels-heart-burst" aria-hidden="true">
                    🔥
                  </div>
                )}

                {/* Overlay Metadata (Bottom-Left) */}
                <div className="tm-reels-meta-overlay">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="tm-reels-author-btn"
                      onClick={() => onOpenProfile && onOpenProfile(meme.author_name)}
                    >
                      @{meme.author_name || 'Anon'}
                    </button>
                    {uploadInfo.isNewToday && <span className="tm-upload-new-pill">🆕 NEW</span>}
                    {rarity.label && (
                      <span className={`tm-rarity-badge ${rarity.tier}`}>{rarity.label}</span>
                    )}
                    <span className="tm-tag">#{meme.category || 'meme'}</span>
                  </div>

                  <h2
                    className="tm-reels-title"
                    onClick={() => onOpenTheater && onOpenTheater(meme)}
                  >
                    {meme.title}
                  </h2>

                  <div className="tm-reels-date">
                    📅 {uploadInfo.dateTime} ({uploadInfo.relative})
                  </div>

                  {/* Clear 1-Tap Remix & Share Quick Loop Bar */}
                  <div className="tm-reels-quick-loop-row">
                    <button
                      type="button"
                      className="tm-reels-remix-cta-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCaptionThis) {
                          onCaptionThis(meme, e);
                        } else if (onTriggerStudioMutate) {
                          onTriggerStudioMutate(meme, e);
                        }
                      }}
                      title="Open this exact meme template in the Studio to write your own caption!"
                    >
                      ✏️ Remix this
                    </button>
                    <button
                      type="button"
                      className="tm-reels-share-cta-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onShareMeme) onShareMeme(meme, e);
                      }}
                      title="Copy or send a direct link to this exact meme"
                    >
                      🔗 Share
                    </button>
                  </div>
                </div>

                {/* Right-Hand Floating Action Bar */}
                <aside className="tm-reels-action-bar">
                  {/* Upvote */}
                  <button
                    type="button"
                    className={`tm-reels-action-btn ${myVote === 1 ? 'active-up' : ''}`}
                    onClick={(e) => onVote(meme.id, 1, e)}
                    title="Upvote (+XP)"
                  >
                    <span className="tm-reels-action-icon">🔥</span>
                    <span className="tm-reels-action-lbl">{meme.score || 0}</span>
                  </button>

                  {/* 1-Tap Remix this Button */}
                  <button
                    type="button"
                    className="tm-reels-action-btn tm-reels-remix-btn"
                    onClick={(e) =>
                      onCaptionThis ? onCaptionThis(meme, e) : onTriggerStudioMutate(meme, e)
                    }
                    title="Remix this meme (+150 XP)"
                  >
                    <span className="tm-reels-action-icon">✏️</span>
                    <span className="tm-reels-action-lbl">Remix this</span>
                  </button>

                  {/* Native Share */}
                  <button
                    type="button"
                    className="tm-reels-action-btn"
                    onClick={(e) => onShareMeme(meme, e)}
                    title="Share Meme / Copy Direct Link"
                  >
                    <span className="tm-reels-action-icon">🔗</span>
                    <span className="tm-reels-action-lbl">Share</span>
                  </button>

                  {/* Comments Drawer Toggle */}
                  <button
                    type="button"
                    className="tm-reels-action-btn"
                    onClick={() =>
                      setActiveCommentsMemeId(isCommentsOpen ? null : meme.id)
                    }
                    title="Comments"
                  >
                    <span className="tm-reels-action-icon">💬</span>
                    <span className="tm-reels-action-lbl">
                      {(meme.comments || []).length}
                    </span>
                  </button>

                  {/* Save / Bookmark */}
                  {onToggleBookmark && (
                    <button
                      type="button"
                      className={`tm-reels-action-btn ${isSaved ? 'active-star' : ''}`}
                      onClick={(e) => onToggleBookmark(meme, e)}
                      title={isSaved ? 'Saved to Favorites' : 'Save Meme (+15 XP)'}
                    >
                      <span className="tm-reels-action-icon">{isSaved ? '⭐' : '☆'}</span>
                      <span className="tm-reels-action-lbl">{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  )}
                </aside>

                {/* Inline Slide-Up Comments Drawer */}
                {isCommentsOpen && (
                  <div className="tm-reels-comments-drawer">
                    <div className="tm-reels-drawer-header">
                      <strong>💬 Comments ({(meme.comments || []).length})</strong>
                      <button
                        type="button"
                        className="tm-link-btn"
                        onClick={() => setActiveCommentsMemeId(null)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="tm-reels-drawer-body">
                      {(meme.comments || []).length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '13px', padding: '16px 0' }}>
                          No comments yet — drop the first comment!
                        </div>
                      ) : (
                        (meme.comments || []).map((c) => (
                          <div key={c.id} className="tm-comment-item">
                            <strong style={{ color: '#38bdf8' }}>@{c.author_name}: </strong>
                            <span>{c.body}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <form
                      className="tm-comment-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const text = localCommentInput.trim();
                        if (!text) return;
                        if (onAddComment) {
                          onAddComment(meme.id, e, text);
                        } else {
                          onReaction?.(meme.id, '💬', e);
                        }
                        setLocalCommentInput('');
                      }}
                    >
                      <input
                        type="text"
                        className="tm-input"
                        placeholder="Add a friendly comment..."
                        value={localCommentInput}
                        onChange={(e) => setLocalCommentInput(e.target.value)}
                      />
                      <button type="submit" className="tm-btn tm-btn-primary">
                        Post
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {effectiveVisibleCount >= len && len > 0 && (
          <article className="tm-reels-slide tm-reels-end-slide">
            <div className="tm-end-of-internet-card">
              <div style={{ fontSize: '46px', marginBottom: '6px' }}>🫠</div>
              <h2 style={{ margin: '0 0 8px', fontSize: '21px', fontWeight: 900 }}>
                You&apos;ve reached the end of the internet
              </h2>
              <p style={{ margin: '0 auto 16px', maxWidth: '380px', fontSize: '13px', color: '#94a3b8' }}>
                Every meme in this Reels stream has been scrolled. Drop your own banger or hit the Arcade!
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {onOpenBlankStudio && (
                  <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenBlankStudio}>
                    🎨 Remix / Create Meme
                  </button>
                )}
                {onOpenGames && (
                  <button type="button" className="tm-btn" onClick={onOpenGames}>
                    🕹️ Play Arcade Games
                  </button>
                )}
                <button
                  type="button"
                  className="tm-btn"
                  onClick={() => {
                    setCurrentIndex(0);
                    containerRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
                  }}
                >
                  🔝 Back to Top
                </button>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
