import { useState, useRef, useEffect, useCallback } from 'react';
import { getMemeRarityTier, formatMemeUploadDate } from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';

export default function VerticalReelsView({
  filteredMemes,
  userVotes,
  bookmarkedIds,
  onVote,
  onReaction,
  onToggleBookmark,
  onTriggerStudioMutate,
  onShareMeme,
  onOpenProfile,
  onOpenTheater,
  onOpenBlankStudio,
  onBackToFeed
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [burstMemeId, setBurstMemeId] = useState(null);
  const [activeCommentsMemeId, setActiveCommentsMemeId] = useState(null);
  const [localCommentInput, setLocalCommentInput] = useState('');
  const lastTapRef = useRef(0);
  const containerRef = useRef(null);

  const len = filteredMemes?.length || 0;

  // Handle keyboard Up/Down navigation
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(len - 1, prev + 1));
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
      {/* Top Floating Controls */}
      <div className="tm-reels-top-nav">
        <button
          type="button"
          className="tm-reels-pill-btn"
          onClick={onBackToFeed}
          title="Return to Grid Feed"
        >
          📱 Grid View
        </button>
        <span className="tm-reels-counter">
          🎬 {currentIndex + 1} / {len}
        </span>
        <button
          type="button"
          className="tm-reels-pill-btn tm-reels-pill-primary"
          onClick={onOpenBlankStudio}
        >
          + Upload
        </button>
      </div>

      {/* Full-Height Snap Container */}
      <div ref={containerRef} className="tm-reels-container">
        {filteredMemes.map((meme, idx) => {
          const rarity = getMemeRarityTier(meme);
          const uploadInfo = formatMemeUploadDate(meme.created_at);
          const myVote = userVotes?.[meme.id] || 0;
          const isSaved = bookmarkedIds?.includes(String(meme.id));
          const isBursting = burstMemeId === meme.id;
          const isCommentsOpen = activeCommentsMemeId === meme.id;

          return (
            <article
              key={meme.id}
              className={`tm-reels-slide ${idx === currentIndex ? 'active' : ''}`}
            >
              {/* Media Container with Double-Tap Upvote Area */}
              <div
                className="tm-reels-media-wrap"
                onDoubleClick={(e) => handleDoubleTap(meme, e)}
                onTouchEnd={(e) => handleTouchEnd(meme, e)}
              >
                <img
                  src={meme.image_url}
                  alt={meme.title}
                  className="tm-reels-img"
                  loading={Math.abs(idx - currentIndex) <= 1 ? 'eager' : 'lazy'}
                />

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

                  {/* 1-Tap Remix / Mutate Button */}
                  <button
                    type="button"
                    className="tm-reels-action-btn tm-reels-remix-btn"
                    onClick={(e) => onTriggerStudioMutate(meme, e)}
                    title="Remix Meme in Studio (+150 XP)"
                  >
                    <span className="tm-reels-action-icon">🧬</span>
                    <span className="tm-reels-action-lbl">Remix</span>
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

                  {/* Native Share */}
                  <button
                    type="button"
                    className="tm-reels-action-btn"
                    onClick={(e) => onShareMeme(meme, e)}
                    title="Share Meme / Copy Link"
                  >
                    <span className="tm-reels-action-icon">🔗</span>
                    <span className="tm-reels-action-lbl">Share</span>
                  </button>

                  {/* Reactions Popover */}
                  <div className="tm-reels-mini-reactions">
                    {['💀', '😂', '🗿'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="tm-reels-mini-react-btn"
                        onClick={(e) => onReaction(meme.id, emoji, e)}
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
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
                        if (!localCommentInput.trim()) return;
                        // Trigger comment addition
                        const fakeEvt = { preventDefault: () => {} };
                        onReaction(meme.id, '💬', fakeEvt);
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
      </div>
    </div>
  );
}
