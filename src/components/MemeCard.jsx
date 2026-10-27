import { useRef, useCallback, useState } from 'react';
import {
  getMemeRarityTier,
  COMIC_ACTION_WORDS,
  QUICK_REACTION_COMMENTS,
  formatMemeUploadDate
} from '../data/starterMemes';

export default function MemeCard({
  meme,
  myVote,
  isBookmarked = false,
  onToggleBookmark,
  isCommentsOpen,
  commentInput,
  onVote,
  onReaction,
  onToggleComments,
  onCommentInputChange,
  onAddComment,
  onOpenEvolutionTree,
  onTriggerStudioMutate,
  onOpenTheater,
  onShareMeme,
  onOpenProfile,
  onReportMeme,
  onOpenAiRoast
}) {
  const cardRef = useRef(null);
  const lastTapRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [dblTapBurst, setDblTapBurst] = useState(false);
  const [comicWord, setComicWord] = useState('');
  const [squishCard, setSquishCard] = useState(false);
  const gen = meme.generation || 0;
  const remixCount = meme.mutation_count || 0;
  const rarity = getMemeRarityTier(meme);
  const isBlurred = Boolean(meme.is_spoiler) && !spoilerRevealed;
  const uploadInfo = formatMemeUploadDate(meme.created_at);

  const triggerComicPop = (customWord = null) => {
    const word =
      customWord ||
      COMIC_ACTION_WORDS[Math.floor(Math.random() * COMIC_ACTION_WORDS.length)];
    setComicWord(word);
    setSquishCard(true);
    setTimeout(() => setSquishCard(false), 360);
    setTimeout(() => setComicWord(''), 780);
  };

  const triggerBurstEffect = () => {
    setDblTapBurst(true);
    triggerComicPop('SUPERNOVA! 🔥');
    setTimeout(() => setDblTapBurst(false), 650);
  };

  // 60fps 3D Holographic Card Tilt + Specular Glare (active on pointer devices with hover)
  const handleMouseMove = useCallback((e) => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    const rotateY = (px - 0.5) * 11;
    const rotateX = (0.5 - py) * 11;

    el.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
    el.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
    el.style.setProperty('--glare-opacity', '1');
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--glare-opacity', '0');
  }, []);

  const handleImageTouchEnd = (e) => {
    if (e.target.closest('button')) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const touch = e.changedTouches?.[0];
      triggerBurstEffect();
      onVote(meme.id, 1, touch ? { clientX: touch.clientX, clientY: touch.clientY } : e);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    if (onShareMeme) onShareMeme(meme, e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMemeImage = (e) => {
    e.stopPropagation();
    if (!meme?.image_url) return;
    triggerComicPop('SAVED PNG! ⬇');
    const link = document.createElement('a');
    link.href = meme.image_url;
    link.download = `${(meme.title || 'thememes-net').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <article
      ref={cardRef}
      className={`tm-card tm-holo-card ${rarity.className} ${squishCard ? 'tm-card-jelly' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Specular Holographic Glare Overlay */}
      <div className="tm-holo-glare" aria-hidden="true" />

      {/* Comic Action Pop-Out Badge */}
      {comicWord && (
        <div className="tm-comic-pop-badge" aria-hidden="true">
          {comicWord}
        </div>
      )}

      <div className="tm-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            Posted by{' '}
            <strong
              className="tm-author-handle"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenProfile) onOpenProfile(meme.author_name || 'Anon');
              }}
              title="View Creator Profile & Badges"
            >
              @{meme.author_name || 'Anon'}
            </strong>
            {uploadInfo.isNewToday && (
              <span
                className="tm-upload-new-pill"
                title={`Uploaded within the last 24h (${uploadInfo.dateTime})`}
              >
                🆕 NEW
              </span>
            )}
          </span>
          <span
            className="tm-upload-date-badge"
            title={`Exact upload timestamp: ${uploadInfo.dateTime}`}
          >
            📅 Uploaded {uploadInfo.dateTime} • <strong>{uploadInfo.relative}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {meme.is_spoiler && (
            <span className="tm-rarity-badge heating">🌶️ SPICY</span>
          )}
          {meme.is_bounty && (
            <span className="tm-rarity-badge supernova">🎯 BOUNTY</span>
          )}
          {rarity.label && (
            <span className={`tm-rarity-badge ${rarity.tier}`}>{rarity.label}</span>
          )}
          <span className="tm-tag">#{meme.category || 'meme'}</span>
        </div>
      </div>

      <h2
        className="tm-card-title tm-clickable-title"
        onClick={() => onOpenTheater && onOpenTheater(meme)}
        title="Open in Fullscreen Theater Mode"
      >
        {meme.title}
      </h2>

      <div
        className="tm-img-wrap"
        onDoubleClick={(e) => {
          triggerBurstEffect();
          onVote(meme.id, 1, e);
        }}
        onTouchEnd={handleImageTouchEnd}
        title="Double-tap for instant Combo Upvote!"
      >
        {dblTapBurst && (
          <div className="tm-dbltap-burst" aria-hidden="true">
            🔥
          </div>
        )}
        {gen > 0 && <div className="tm-gen-pill">🧬 GEN-{gen} REMIX</div>}
        <button
          type="button"
          className="tm-theater-QuickBtn"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenTheater) onOpenTheater(meme);
          }}
          title="Open Theater View & Permalink"
        >
          🔍 Expand
        </button>

        {isBlurred && (
          <div
            className="tm-spoiler-shield"
            onClick={(e) => {
              e.stopPropagation();
              setSpoilerRevealed(true);
            }}
          >
            <span style={{ fontSize: '30px' }}>🌶️</span>
            <strong>SPICY / SPOILER MEME</strong>
            <span>Click to unblur artwork</span>
          </div>
        )}

        <img
          src={meme.image_url}
          alt={meme.title}
          loading="lazy"
          className={isBlurred ? 'tm-img-blurred' : ''}
        />
        <span className="tm-dbl-hint">⚡ Double-tap to Upvote</span>
      </div>

      <div className="tm-card-actions">
        {/* Upvote / Downvote Pill */}
        <div className="tm-vote-pill">
          <button
            type="button"
            className={`tm-vote-btn up ${myVote === 1 ? 'voted' : ''}`}
            onClick={(e) => {
              triggerComicPop('AWESOME! 🔥');
              onVote(meme.id, 1, e);
            }}
          >
            ▲
          </button>
          <span className="tm-score">{meme.score || 0}</span>
          <button
            type="button"
            className={`tm-vote-btn down ${myVote === -1 ? 'voted' : ''}`}
            onClick={(e) => {
              triggerComicPop('OOF 😅');
              onVote(meme.id, -1, e);
            }}
          >
            ▼
          </button>
        </div>

        {/* Emoji Reactions */}
        <div className="tm-react-group">
          {['🔥', '💀', '😂', '🗿'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="tm-react-btn"
              onClick={(e) => {
                const mapWord = {
                  '🔥': 'SPICY! 🔥',
                  '💀': 'WILD! 💀',
                  '😂': 'HAHA! 😂',
                  '🗿': 'LEGEND! 🗿'
                };
                triggerComicPop(mapWord[emoji]);
                onReaction(meme.id, emoji, e);
              }}
            >
              {emoji} {(meme.reactions && meme.reactions[emoji]) || 0}
            </button>
          ))}
        </div>

        {/* Comment, Bookmark, Share & Flag/Hide Buttons */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            type="button"
            className="tm-react-btn"
            onClick={() => onToggleComments(meme.id)}
            title="Toggle Comments"
          >
            💬 {(meme.comments || []).length}
          </button>
          {onToggleBookmark && (
            <button
              type="button"
              className="tm-react-btn"
              style={
                isBookmarked
                  ? { borderColor: '#facc15', color: '#facc15', background: 'rgba(250, 204, 21, 0.16)' }
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                triggerComicPop(isBookmarked ? 'REMOVED' : 'SAVED! ⭐');
                onToggleBookmark(meme, e);
              }}
              title={isBookmarked ? 'Remove from Saved Memes' : 'Save Meme to Favorites (+15 XP)'}
            >
              {isBookmarked ? '⭐' : '☆'}
            </button>
          )}
          <button
            type="button"
            className="tm-react-btn"
            onClick={handleDownloadMemeImage}
            title="Download / Save Meme Image"
          >
            ⬇
          </button>
          <button
            type="button"
            className="tm-react-btn"
            onClick={handleShareClick}
            title="Share Meme / Copy Link"
          >
            {copied ? '✅' : '🔗'}
          </button>
          {onReportMeme && (
            <button
              type="button"
              className="tm-react-btn"
              onClick={(e) => {
                e.stopPropagation();
                onReportMeme(meme, e);
              }}
              title="Flag / Hide Meme from Feed"
            >
              🚩
            </button>
          )}
        </div>
      </div>

      {/* FORK & MUTATE + AI ROAST ACTION BAR */}
      <div className="tm-mutate-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="tm-lineage-btn"
            onClick={(e) => onOpenEvolutionTree(meme, e)}
            title="Inspect full remix family tree"
          >
            🌿 GEN-{gen} {remixCount > 0 ? `• ${remixCount} REMIXES` : '• TREE'}
          </button>

          {onOpenAiRoast && (
            <button
              type="button"
              className="tm-roast-trigger-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAiRoast(meme, e);
              }}
              title="Run AI Vibe & Comedy Scanner"
            >
              🤖 AI Scan
            </button>
          )}
        </div>

        <button
          type="button"
          className="tm-mutate-btn"
          onClick={(e) => onTriggerStudioMutate(meme, e)}
        >
          🧬 REMIX (+150 XP)
        </button>
      </div>

      {/* Inline Comments Drawer */}
      {isCommentsOpen && (
        <div className="tm-comments">
          {(meme.comments || []).length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              No comments yet — be the first to comment (+25 XP)!
            </div>
          ) : (
            (meme.comments || []).map((c) => (
              <div key={c.id} className="tm-comment-item">
                <strong style={{ color: '#38bdf8' }}>@{c.author_name}: </strong>
                <span>{c.body}</span>
              </div>
            ))
          )}

          {/* 1-Tap Quick-Reaction Viral Comment Chips */}
          <div className="tm-quick-comment-chips">
            {QUICK_REACTION_COMMENTS.map((chip) => (
              <button
                key={chip}
                type="button"
                className="tm-quick-comment-chip"
                onClick={() => onCommentInputChange(meme.id, chip)}
                title="Tap to fill comment, then press Post!"
              >
                {chip}
              </button>
            ))}
          </div>

          <form className="tm-comment-form" onSubmit={(e) => onAddComment(meme.id, e)}>
            <input
              type="text"
              className="tm-input"
              placeholder="Write a friendly comment..."
              value={commentInput || ''}
              onChange={(e) => onCommentInputChange(meme.id, e.target.value)}
            />
            <button type="submit" className="tm-btn tm-btn-primary">
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
