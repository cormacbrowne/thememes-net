import { REMIX_ENABLED } from '../config/featureFlags';
import { useEffect, useState, useRef, useMemo } from 'react';
import MemeMedia from './MemeMedia';
import MemeLiveEmotes from './MemeLiveEmotes';
import BattleHeroCard from './BattleHeroCard';
import { getMemeRarityTier, formatMemeUploadDate } from '../data/starterMemes';
import { formatUpvotesLastHourSignal } from '../utils/liveSignals';
import { extractTemplateSlug } from '../utils/memeSeo';
import { exportMemeWithWatermark, triggerBlobDownload } from './forge/forgeEngine';
import './MemeTheaterModal.css';

export default function MemeTheaterModal({
  meme,
  filteredMemes,
  memes,
  myVote,
  commentInput,
  onCommentInputChange,
  onAddComment,
  onDeleteComment,
  currentUserId = null,
  onVote,
  onReaction,
  onTriggerStudioMutate,
  onCaptionThis,
  onOpenBlankStudio,
  onOpenTemplateStudio,
  onOpenBattle,
  openedFromShareLink = false,
  onSelectMeme,
  onClose,
  onShareMeme
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);

  const currentIndex = filteredMemes.findIndex((m) => String(m.id) === String(meme?.id));
  const hasPrev = filteredMemes.length > 1;
  const hasNext = filteredMemes.length > 1;

  const goPrev = () => {
    if (!hasPrev) return;
    const prevIdx = (currentIndex - 1 + filteredMemes.length) % filteredMemes.length;
    onSelectMeme(filteredMemes[prevIdx]);
  };

  const goNext = () => {
    if (!hasNext) return;
    const nextIdx = (currentIndex + 1) % filteredMemes.length;
    onSelectMeme(filteredMemes[nextIdx]);
  };

  useEffect(() => {
    if (!meme) return;
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && filteredMemes.length > 1) {
        const nextIdx = (currentIndex + 1) % filteredMemes.length;
        onSelectMeme(filteredMemes[nextIdx]);
      } else if (e.key === 'ArrowLeft' && filteredMemes.length > 1) {
        const prevIdx = (currentIndex - 1 + filteredMemes.length) % filteredMemes.length;
        onSelectMeme(filteredMemes[prevIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [meme, currentIndex, filteredMemes, onSelectMeme, onClose]);

  const relatedMemes = useMemo(() => {
    if (!meme || !Array.isArray(memes)) return [];
    const targetCat = String(meme.category || '').toLowerCase();
    return memes
      .filter(
        (m) =>
          m &&
          String(m.id) !== String(meme.id) &&
          (!targetCat || String(m.category || '').toLowerCase() === targetCat)
      )
      .slice(0, 6);
  }, [meme, memes]);

  if (!meme) return null;

  const templateSlug = extractTemplateSlug(meme.base_image_url);
  const canMakeYourOwn = Boolean((templateSlug && onOpenTemplateStudio) || onOpenBlankStudio);
  const handleMakeYourOwn = () => {
    onClose();
    if (templateSlug && onOpenTemplateStudio) {
      onOpenTemplateStudio(templateSlug);
    } else {
      onOpenBlankStudio?.();
    }
  };

  const rarity = getMemeRarityTier(meme);
  const uploadInfo = formatMemeUploadDate(meme.created_at);
  const gen = meme.generation || 0;
  const rootId = meme.root_meme_id || meme.parent_meme_id || meme.id;

  const lineageNodes = memes
    .filter(
      (m) =>
        String(m.id) === String(rootId) ||
        String(m.root_meme_id) === String(rootId) ||
        String(m.parent_meme_id) === String(rootId) ||
        String(m.id) === String(meme.id) ||
        String(m.parent_meme_id) === String(meme.id)
    )
    .sort((a, b) => (a.generation || 0) - (b.generation || 0));

  const handleCopyPermalink = (e) => {
    onShareMeme(meme, e);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleDownloadWatermarked = async () => {
    if (!meme?.image_url) return;
    const safeName = (meme.title || 'thememes-net').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
    try {
      const res = await exportMemeWithWatermark(meme, { watermark: true });
      if (res?.blob) {
        const ext = res.mime === 'image/gif' ? 'gif' : res.mime === 'video/webm' ? 'webm' : 'png';
        triggerBlobDownload(res.blob, `${safeName}-thememes-net.${ext}`);
        return;
      }
    } catch {
      // fallback
    }
    window.open(meme.image_url, '_blank', 'noopener');
  };

  const handleStageTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleStageTouchEnd = (e) => {
    const touch = e.changedTouches?.[0];
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!touch || !start) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) {
        goNext();
      } else {
        goPrev();
      }
      return;
    }

    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        onVote(meme.id, 1, { clientX: touch.clientX, clientY: touch.clientY });
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className={`tm-modal tm-theater-modal ${rarity.className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Bar */}
        <div className="tm-theater-header tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="tm-btn tm-back-pill"
              onClick={onClose}
              title="Back to Feed"
            >
              ← Back
            </button>
            <span className="tm-tag">#{meme.category || 'meme'}</span>
            {rarity.label && (
              <span className={`tm-rarity-badge ${rarity.tier}`}>{rarity.label}</span>
            )}
            <span style={{ fontSize: '12px', color: 'var(--tm-text-dim)' }}>
              by <strong style={{ color: 'var(--tm-cyan)' }}>@{meme.author_name || 'Anon'}</strong>
            </span>
            <span className="tm-upload-date-badge">
              📅 Uploaded {uploadInfo.dateTime} ({uploadInfo.relative})
            </span>
            {uploadInfo.isNewToday && <span className="tm-upload-new-pill">🆕 NEW</span>}
            {formatUpvotesLastHourSignal(meme) && (
              <span className="tm-hourly-upvotes-pill" data-testid="theater-hourly-signal">
                {formatUpvotesLastHourSignal(meme)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {hasPrev && (
              <button
                type="button"
                className="tm-btn"
                title="Previous Meme (←)"
                onClick={goPrev}
              >
                ← Prev
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                className="tm-btn"
                title="Next Meme (→)"
                onClick={goNext}
              >
                Next →
              </button>
            )}
            <button type="button" className="tm-btn" onClick={handleDownloadWatermarked} title="Download with www.thememes.net watermark">
              ⬇ Download
            </button>
            <button type="button" className="tm-btn" onClick={handleCopyPermalink}>
              {copiedLink ? '✅ Link Copied!' : '🔗 Share'}
            </button>
            {canMakeYourOwn && (
              <button
                type="button"
                className="tm-btn tm-btn-primary tm-make-your-own-cta"
                onClick={handleMakeYourOwn}
                title="Create your own meme in < 15 seconds!"
              >
                ✨ Make your own →
              </button>
            )}
            <button type="button" className="tm-btn" onClick={onClose} aria-label="Close modal">
              ✕ Close
            </button>
          </div>
        </div>

        {openedFromShareLink && (
          <div className="tm-shared-meme-recipient-banner">
            <span>🔥 Someone shared this meme with you on <strong>THE MEMES.net</strong>!</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {REMIX_ENABLED && (
                <button
                  type="button"
                  className="tm-btn tm-shared-remix-btn"
                  onClick={(e) => {
                    onClose();
                    if (onCaptionThis) {
                      onCaptionThis(meme, e);
                    } else if (onTriggerStudioMutate) {
                      onTriggerStudioMutate(meme, e);
                    }
                  }}
                >
                  ✏️ Remix this
                </button>
              )}
              {canMakeYourOwn && (
                <button
                  type="button"
                  className="tm-btn tm-btn-primary tm-make-your-own-cta"
                  onClick={handleMakeYourOwn}
                >
                  Make your own →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Split Layout: High-Res Stage (Left) + Lineage & Comments (Right) */}
        <div className="tm-theater-grid">
          {/* Left: High-Res Artwork Stage */}
          <div className="tm-theater-stage">
            <h2 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 900 }}>{meme.title}</h2>
            <div
              className="tm-theater-img-box"
              onDoubleClick={(e) => onVote(meme.id, 1, e)}
              onTouchStart={handleStageTouchStart}
              onTouchEnd={handleStageTouchEnd}
              title="Double-tap to Upvote • Swipe left/right for Next/Prev"
            >
              {REMIX_ENABLED && gen > 0 && <div className="tm-gen-pill">🧬 GEN-{gen} REMIX</div>}
              <MemeMedia meme={meme} mode="theater" />
              <MemeLiveEmotes memeId={meme.id} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--tm-text-mute)', marginTop: '6px', textAlign: 'center' }}>
              💡 Tip: Swipe left/right on image for Next/Prev • Double-tap to Upvote
            </div>

            {/* Engagement & Mutate Bar */}
            <div className="tm-theater-actions">
              <div className="tm-vote-pill">
                <button
                  type="button"
                  className={`tm-vote-btn up ${myVote === 1 ? 'voted' : ''}`}
                  onClick={(e) => onVote(meme.id, 1, e)}
                >
                  ▲
                </button>
                <span className="tm-score">{meme.score || 0}</span>
                <button
                  type="button"
                  className={`tm-vote-btn down ${myVote === -1 ? 'voted' : ''}`}
                  onClick={(e) => onVote(meme.id, -1, e)}
                >
                  ▼
                </button>
              </div>

              <div className="tm-react-group">
                {['🔥', '💀', '😂', '🗿'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="tm-react-btn"
                    onClick={(e) => onReaction(meme.id, emoji, e)}
                  >
                    {emoji} {(meme.reactions && meme.reactions[emoji]) || 0}
                  </button>
                ))}
              </div>

              {REMIX_ENABLED && (
                <button
                  type="button"
                  className="tm-mutate-btn"
                  onClick={(e) => {
                    onClose();
                    if (onCaptionThis) {
                      onCaptionThis(meme, e);
                    } else {
                      onTriggerStudioMutate(meme, e);
                    }
                  }}
                >
                  ✏️ Remix this (+M$2.50)
                </button>
              )}

              {canMakeYourOwn && (
                <button
                  type="button"
                  className="tm-btn tm-btn-primary tm-make-your-own-cta"
                  onClick={handleMakeYourOwn}
                >
                  Make your own →
                </button>
              )}
            </div>
          </div>

          {/* Right: Side-by-Side Evolution Lineage & Comments */}
          <div className="tm-theater-sidebar">
            {/* Mini Evolution Tree */}
            {REMIX_ENABLED && (
            <div className="tm-theater-panel">
                <div className="tm-studio-label" style={{ color: 'var(--tm-pink)', marginBottom: '8px' }}>
                  🧬 Genetic Lineage ({lineageNodes.length}{' '}
                  {lineageNodes.length === 1 ? 'Node' : 'Nodes'})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '190px', overflowY: 'auto' }}>
                  {lineageNodes.map((node) => {
                    const isCurrent = String(node.id) === String(meme.id);
                    const nGen = node.generation || 0;
                    const nodeDate = formatMemeUploadDate(node.created_at);
                    return (
                      <div
                        key={node.id}
                        onClick={() => onSelectMeme(node)}
                        style={{
                          marginLeft: `${Math.min(nGen * 14, 56)}px`,
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: isCurrent
                            ? 'rgba(0, 243, 255, 0.14)'
                            : 'rgba(255, 255, 255, 0.04)',
                          border: isCurrent
                            ? '1px solid var(--tm-cyan)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <img
                            src={node.image_url}
                            alt={node.title}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: 900, color: nGen === 0 ? '#a3e635' : 'var(--tm-pink)' }}>
                              {nGen === 0 ? 'GEN-0 ORIGIN' : `GEN-${nGen} REMIX`} • {nodeDate.dateOnly}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {node.title}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--tm-amber)', flexShrink: 0 }}>
                          🔥 {node.score || 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Comments Thread */}
            <div className="tm-theater-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
                💬 Comments ({(meme.comments || []).length})
              </div>
              <div style={{ flex: 1, maxHeight: '240px', overflowY: 'auto', marginBottom: '10px' }}>
                {(meme.comments || []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--tm-text-mute)' }}>
                    No comments yet — drop the first comment (+25 XP)!
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
                    </div>
                  ))
                )}
              </div>

              <form className="tm-comment-form" onSubmit={(e) => onAddComment(meme.id, e)}>
                <input
                  type="text"
                  className="tm-input"
                  placeholder="Write a comment..."
                  value={commentInput || ''}
                  onChange={(e) => onCommentInputChange(meme.id, e.target.value)}
                />
                <button type="submit" className="tm-btn tm-btn-primary">
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Plan 2.2: More like this (same category) + Today's Caption Battle */}
        {relatedMemes.length > 0 && (
          <section className="tm-theater-related" data-testid="theater-related-memes" aria-label="More like this">
            <h3 className="tm-theater-section-title">🔥 More like this (#{meme.category || 'meme'})</h3>
            <div className="tm-theater-related-grid">
              {relatedMemes.map((rel) => {
                const thumb = rel.media_type === 'video' ? rel.poster_url || rel.image_url : rel.image_url;
                return (
                  <button
                    key={rel.id}
                    type="button"
                    className="tm-theater-related-card"
                    onClick={() => onSelectMeme(rel)}
                  >
                    <img src={thumb} alt={rel.title || 'Related meme'} loading="lazy" decoding="async" />
                    <span className="tm-theater-related-title">{rel.title || 'Meme'}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="tm-theater-battle" data-testid="theater-battle-section" aria-label="Today's Caption Battle">
          <BattleHeroCard onOpenBattle={(tab) => onOpenBattle?.(tab)} />
        </section>
      </div>
    </div>
  );
}
