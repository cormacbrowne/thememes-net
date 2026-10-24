import { useState, useRef } from 'react';
import { getMemeRarityTier, formatMemeUploadDate } from '../data/starterMemes';

export default function SwipeDeck({
  filteredMemes,
  swipeIndex,
  swipeAnim,
  onTriggerSwipe,
  onPrevCard,
  onBackToFeed,
  onTriggerStudioMutate,
  onOpenTheater,
  onOpenBlankStudio
}) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [sessionSwipes, setSessionSwipes] = useState(0);
  const dragStartRef = useRef(null);

  if (!filteredMemes || filteredMemes.length === 0) {
    return (
      <section className="tm-arena" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="tm-empty-feed-card">
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>⚡📸</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '22px' }}>No Community Memes in Hyper-Swipe Yet!</h2>
          <p style={{ color: '#94a3b8', maxWidth: '460px', margin: '0 auto 16px', fontSize: '14px' }}>
            All memes on THE MEMES.net are 100% uploaded by real users. Upload the first meme to kick off the Hyper-Swipe deck!
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onOpenBlankStudio && (
              <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenBlankStudio}>
                + Upload Your Meme (+100 XP)
              </button>
            )}
            {onBackToFeed && (
              <button type="button" className="tm-btn" onClick={onBackToFeed}>
                ← Back to Feed
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const activeIdx = swipeIndex % filteredMemes.length;
  const m = filteredMemes[activeIdx];
  const rarity = getMemeRarityTier(m);
  const uploadInfo = formatMemeUploadDate(m.created_at);

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const { x, y } = dragOffset;
    dragStartRef.current = null;
    setDragOffset({ x: 0, y: 0 });

    if (y < -75 && Math.abs(y) > Math.abs(x)) {
      setSessionSwipes((s) => s + 1);
      onTriggerSwipe('up', e);
    } else if (x > 75) {
      setSessionSwipes((s) => s + 1);
      onTriggerSwipe('right', e);
    } else if (x < -75) {
      setSessionSwipes((s) => s + 1);
      onTriggerSwipe('left', e);
    }
  };

  let stampType = null;
  if (dragOffset.y < -40 && Math.abs(dragOffset.y) > Math.abs(dragOffset.x)) {
    stampType = 'super';
  } else if (dragOffset.x > 40) {
    stampType = 'based';
  } else if (dragOffset.x < -40) {
    stampType = 'nope';
  }

  const cardTransform = isDragging
    ? `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${(dragOffset.x * 0.06).toFixed(2)}deg)`
    : undefined;

  return (
    <section className="tm-arena">
      <div className="tm-swipe-hud">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onBackToFeed && (
            <button
              type="button"
              className="tm-btn tm-back-pill"
              onClick={onBackToFeed}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              ← Feed
            </button>
          )}
          {onPrevCard && (
            <button
              type="button"
              className="tm-btn"
              onClick={onPrevCard}
              style={{ padding: '5px 10px', fontSize: '12px' }}
              title="Previous Card"
            >
              ↺ Prev
            </button>
          )}
          <span>
            Card <strong>{activeIdx + 1}</strong> / <strong>{filteredMemes.length}</strong>
          </span>
        </div>
        <span style={{ color: '#facc15', fontWeight: 900 }}>
          ⚡ Swipes: {sessionSwipes}
        </span>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 10px' }}>
        Swipe card left/right or tap buttons: <strong>[← Skip]</strong>{' '}
        <strong>[↑ Super 2x]</strong> <strong>[→ Awesome!]</strong>
      </p>

      <div
        className={`tm-card tm-holo-card tm-swipe-card ${rarity.className} ${swipeAnim}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          textAlign: 'left',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'pan-y',
          userSelect: 'none',
          transform: cardTransform,
          transition: isDragging ? 'none' : undefined
        }}
      >
        {stampType === 'based' && (
          <div className="tm-swipe-stamp based">🔥 AWESOME (+XP)</div>
        )}
        {stampType === 'nope' && (
          <div className="tm-swipe-stamp nope">⏭️ SKIP</div>
        )}
        {stampType === 'super' && (
          <div className="tm-swipe-stamp super">🚀 SUPER 2x FIRE!</div>
        )}

        <div className="tm-card-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>@{m.author_name}</span>
            <span className="tm-upload-date-badge">
              📅 Uploaded {uploadInfo.dateTime} ({uploadInfo.relative})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {uploadInfo.isNewToday && <span className="tm-upload-new-pill">🆕 NEW</span>}
            {rarity.label && (
              <span className={`tm-rarity-badge ${rarity.tier}`}>{rarity.label}</span>
            )}
            <span className="tm-tag">SCORE: {m.score}</span>
          </div>
        </div>

        <h2 className="tm-card-title">{m.title}</h2>

        <div className="tm-img-wrap tm-swipe-img-wrap">
          <img src={m.image_url} alt={m.title} draggable={false} />
        </div>

        <div className="tm-swipe-actions">
          <button
            type="button"
            className="tm-btn"
            onClick={(e) => {
              setSessionSwipes((s) => s + 1);
              onTriggerSwipe('left', e);
            }}
          >
            ⏭️ Skip
          </button>
          <button
            type="button"
            className="tm-btn"
            style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
            onClick={(e) => {
              setSessionSwipes((s) => s + 1);
              onTriggerSwipe('up', e);
            }}
          >
            🚀 Super 2x
          </button>
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            onClick={(e) => {
              setSessionSwipes((s) => s + 1);
              onTriggerSwipe('right', e);
            }}
          >
            🔥 Awesome
          </button>
          <button
            type="button"
            className="tm-btn"
            onClick={() => onOpenTheater && onOpenTheater(m)}
            title="Inspect in Theater Mode"
          >
            🔍 View
          </button>
          <button
            type="button"
            className="tm-mutate-btn"
            onClick={(e) => onTriggerStudioMutate(m, e)}
          >
            🧬 Remix
          </button>
        </div>
      </div>
    </section>
  );
}
