import { useRef, useCallback, useState, memo } from 'react';
import { ArrowBigUp, ArrowBigDown, MessageCircle, Star, Download, Share2, Flag, Maximize2 } from 'lucide-react';
import MemeMedia from './MemeMedia';
import MemeLiveEmotes from './MemeLiveEmotes';
import HouseBadge from './HouseBadge';
import { isHouseItem } from '../utils/house';
import {
  getMemeRarityTier,
  COMIC_ACTION_WORDS,
  QUICK_REACTION_COMMENTS,
  formatMemeUploadDate
} from '../data/starterMemes';
import { formatUpvotesLastHourSignal } from '../utils/liveSignals';
import { exportMemeWithWatermark, triggerBlobDownload } from './forge/forgeEngine';
import { useMemeCategories } from '../data/memeCategories';
import './MemeCard.css';

function isReducedMotionEnabled() {
  if (typeof document !== 'undefined') {
    const pref = document.documentElement?.dataset?.reducedMotion;
    if (pref === 'on') return true;
    if (pref === 'off') return false;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

const MemeCard = memo(function MemeCard({
  meme,
  priority = false,
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
  onOpenTheater,
  onShareMeme,
  onDownloadMeme,
  onOpenProfile,
  onReportMeme,
  onReportComment,
  onDeleteComment,
  loadingComments = false,
  currentUserId = null,
  cardFrame = 'default',
  litePerfMode = false
}) {
  const cardRef = useRef(null);
  const lastTapRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [dblTapBurst, setDblTapBurst] = useState(false);
  const [comicWord, setComicWord] = useState('');
  const [squishCard, setSquishCard] = useState(false);
  const categories = useMemeCategories();
  const cat = categories.find((c) => c.id === meme.category);
  const rarity = getMemeRarityTier(meme);
  const isBlurred = Boolean(meme.is_spoiler) && !spoilerRevealed;
  const uploadInfo = formatMemeUploadDate(meme.created_at);
  const commentCount = meme.commentsLoaded
    ? (meme.comments || []).length
    : Math.max((meme.comments || []).length, Number(meme.comments_count || 0));
  const hourlyUpvotesSignal = formatUpvotesLastHourSignal(meme);

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
  const handleMouseMove = useCallback(
    (e) => {
      const el = cardRef.current;
      if (litePerfMode || isReducedMotionEnabled()) {
        if (el) {
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
          el.style.setProperty('--glare-opacity', '0');
        }
        return;
      }
      if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches) return;
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
    },
    [litePerfMode]
  );

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

  const handleDownloadMemeImage = async (e) => {
    e.stopPropagation();
    if (!meme?.image_url) return;
    if (onDownloadMeme) {
      onDownloadMeme(meme, e);
      return;
    }
    triggerComicPop('WATERMARKED! ⬇');
    const safeName = (meme.title || 'thememes-net').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
    try {
      const res = await exportMemeWithWatermark(meme, { watermark: true });
      if (res?.blob) {
        const ext = res.mime === 'image/gif' ? 'gif' : res.mime === 'video/webm' ? 'webm' : 'png';
        triggerBlobDownload(res.blob, `${safeName}-thememes-net.${ext}`);
        return;
      }
    } catch {
      // Fall back to direct file link when cross-origin video/GIF prevents canvas capture
    }
    const link = document.createElement('a');
    link.href = meme.image_url;
    const ext = meme.media_type === 'video' ? 'mp4' : meme.media_type === 'gif' ? 'gif' : 'webp';
    link.download = `${safeName}.${ext}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <article
      ref={cardRef}
      className={`tm-card tm-holo-card ${rarity.className} ${cardFrame && cardFrame !== 'default' ? `tm-frame-${cardFrame}` : ''} ${squishCard ? 'tm-card-jelly' : ''}`}
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

      <div className="mc-head">
        <div className="mc-byline">
          <button
            type="button"
            className="mc-author"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenProfile) onOpenProfile(meme.author_name || 'Anon');
            }}
            title="View creator profile"
          >
            @{meme.author_name || 'Anon'}
          </button>
          {isHouseItem(meme) && <HouseBadge />}
          <span className="mc-dot" aria-hidden="true">·</span>
          <time className="mc-time" dateTime={meme.created_at || undefined} title={`Uploaded ${uploadInfo.dateTime}`}>
            {uploadInfo.relative}
          </time>
          {uploadInfo.isNewToday && <span className="mc-new">NEW</span>}
        </div>
        <div className="mc-badges">
          {cardFrame === 'caption-king' && (
            <span className="tm-rarity-badge supernova" data-testid="caption-king-frame-badge">
              👑 CAPTION KING
            </span>
          )}
          {meme.is_spoiler && <span className="tm-rarity-badge heating">🌶️ SPICY</span>}
          {meme.is_bounty && <span className="tm-rarity-badge supernova">🎯 BOUNTY</span>}
          {rarity.label && <span className={`tm-rarity-badge ${rarity.tier}`}>{rarity.label}</span>}
          <span className="mc-cat">
            {cat?.emoji ? `${cat.emoji} ` : '#'}
            {cat?.label || meme.category || 'meme'}
          </span>
        </div>
      </div>

      <h2
        className="mc-title tm-clickable-title"
        onClick={() => onOpenTheater && onOpenTheater(meme)}
        title="Open full screen"
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
        title="Double-tap to upvote"
      >
        {dblTapBurst && (
          <div className="tm-dbltap-burst" aria-hidden="true">
            🔥
          </div>
        )}
        <button
          type="button"
          className="mc-expand"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenTheater) onOpenTheater(meme);
          }}
          aria-label="Open full screen"
          title="Open full screen"
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>

        {isBlurred && (
          <button
            type="button"
            className="tm-spoiler-shield"
            aria-label={`Reveal spicy or spoiler meme: ${meme.title || 'meme'}`}
            onClick={(e) => {
              e.stopPropagation();
              setSpoilerRevealed(true);
            }}
          >
            <span style={{ fontSize: '30px' }} aria-hidden="true">🌶️</span>
            <strong>SPICY / SPOILER MEME</strong>
            <span>Tap to reveal</span>
          </button>
        )}

        <MemeMedia
          meme={meme}
          mode="feed"
          priority={priority}
          imgLoading={priority ? 'eager' : 'lazy'}
          litePerfMode={litePerfMode}
          className={isBlurred ? 'tm-img-blurred' : ''}
        />
        <MemeLiveEmotes memeId={meme.id} litePerfMode={litePerfMode} />
      </div>

      {hourlyUpvotesSignal && (
        <div className="tm-hourly-upvotes-row">
          <span
            className="tm-hourly-upvotes-pill"
            data-testid={`meme-hourly-signal-${meme.id}`}
            title="Verified positive upvotes cast in the last 60 minutes"
          >
            {hourlyUpvotesSignal}
          </span>
        </div>
      )}

      <div className="mc-actions">
        <div className="mc-row mc-row--engage">
          <div className="mc-vote" role="group" aria-label="Vote">
            <button
              type="button"
              className={`mc-vote-btn up ${myVote === 1 ? 'is-on' : ''}`}
              aria-label="Upvote meme"
              aria-pressed={myVote === 1}
              onClick={(e) => {
                triggerComicPop('AWESOME! 🔥');
                onVote(meme.id, 1, e);
              }}
            >
              <ArrowBigUp size={20} aria-hidden="true" />
            </button>
            {Number(meme.score) !== 0 && Number.isFinite(Number(meme.score)) && (
              <span className="mc-score">{meme.score}</span>
            )}
            <button
              type="button"
              className={`mc-vote-btn down ${myVote === -1 ? 'is-on' : ''}`}
              aria-label="Downvote meme"
              aria-pressed={myVote === -1}
              onClick={(e) => {
                triggerComicPop('OOF 😅');
                onVote(meme.id, -1, e);
              }}
            >
              <ArrowBigDown size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="mc-reacts" role="group" aria-label="Reactions">
            {['🔥', '💀', '😂', '🗿'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="mc-react"
                aria-label={`React ${emoji}`}
                onClick={(e) => {
                  const mapWord = { '🔥': 'SPICY! 🔥', '💀': 'WILD! 💀', '😂': 'HAHA! 😂', '🗿': 'LEGEND! 🗿' };
                  triggerComicPop(mapWord[emoji]);
                  onReaction(meme.id, emoji, e);
                }}
              >
                <span aria-hidden="true">{emoji}</span>
                {Number(meme.reactions?.[emoji]) > 0 && <span className="mc-count">{meme.reactions[emoji]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mc-row mc-row--tools">
          <button
            type="button"
            className={`mc-tool ${isCommentsOpen ? 'is-on' : ''}`}
            onClick={() => onToggleComments(meme.id)}
            aria-label="Comments"
            aria-expanded={Boolean(isCommentsOpen)}
            data-testid={`meme-comments-toggle-${meme.id}`}
          >
            <MessageCircle size={18} aria-hidden="true" />
            {commentCount > 0 && <span className="mc-count">{commentCount}</span>}
          </button>
          {onToggleBookmark && (
            <button
              type="button"
              className={`mc-tool ${isBookmarked ? 'is-saved' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                triggerComicPop(isBookmarked ? 'REMOVED' : 'SAVED! ⭐');
                onToggleBookmark(meme, e);
              }}
              aria-label={isBookmarked ? 'Remove from saved' : 'Save meme'}
              aria-pressed={isBookmarked}
              title={isBookmarked ? 'Saved' : 'Save'}
            >
              <Star size={18} aria-hidden="true" fill={isBookmarked ? 'currentColor' : 'none'} />
              <span className="mc-tool-label">Save</span>
            </button>
          )}
          <button
            type="button"
            className="mc-tool"
            onClick={handleDownloadMemeImage}
            aria-label="Download meme with thememes.net logo"
            title="Download"
          >
            <Download size={18} aria-hidden="true" />
            <span className="mc-tool-label">Download</span>
          </button>
          <button
            type="button"
            className="mc-tool mc-tool--share"
            onClick={handleShareClick}
            aria-label="Share meme"
            title="Share"
          >
            <Share2 size={18} aria-hidden="true" />
            <span className="mc-tool-label">{copied ? 'Shared' : 'Share'}</span>
          </button>
          {onReportMeme && (
            <button
              type="button"
              className="mc-tool mc-tool--flag"
              onClick={(e) => {
                e.stopPropagation();
                onReportMeme(meme, e);
              }}
              aria-label="Report or hide meme"
              title="Report / hide"
            >
              <Flag size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Comments Drawer */}
      {isCommentsOpen && (
        <div className="tm-comments">
          {loadingComments && (meme.comments || []).length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--tm-text-dim)', marginBottom: '8px' }}>
              ⏳ Loading comments...
            </div>
          ) : (meme.comments || []).length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--tm-text-mute)', marginBottom: '8px' }}>
              No comments yet — be the first to comment (+25 XP)!
            </div>
          ) : (
            (meme.comments || []).map((c) => (
              <div key={c.id} className="tm-comment-item">
                <strong style={{ color: 'var(--tm-cyan)' }}>@{c.author_name}: </strong>
                <span>{c.body}</span>
                {onDeleteComment && c.user_id && currentUserId && String(c.user_id) === String(currentUserId) && (
                  <button
                    type="button"
                    className="tm-comment-report-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComment(meme.id, c.id);
                    }}
                    aria-label="Delete your comment"
                    title="Delete your comment"
                  >
                    🗑️
                  </button>
                )}
                {onReportComment && (
                  <button
                    type="button"
                    className="tm-comment-report-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReportComment(c, meme);
                    }}
                    aria-label={`Report or hide comment by ${c.author_name || 'Anon'}`}
                    title="Report / Hide comment"
                  >
                    🚩
                  </button>
                )}
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
});

export default MemeCard;
