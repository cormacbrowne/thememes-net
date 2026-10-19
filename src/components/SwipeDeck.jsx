import { useState, useRef } from 'react';
import { getMemeRarityTier } from '../data/starterMemes';

export default function SwipeDeck({
  filteredMemes,
  swipeIndex,
  swipeAnim,
  onTriggerSwipe,
  onPrevCard,
  onBackToFeed,
  onTriggerStudioMutate,
  onOpenTheater
}) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [sessionSwipes, setSessionSwipes] = useState(0);
  const dragStartRef = useRef(null);

  if (!filteredMemes || filteredMemes.length === 0) return null;

  const activeIdx = swipeIndex % filteredMemes.length;
  const m = filteredMemes[activeIdx];
  const rarity = getMemeRarityTier(m);

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

  // Determine active stamp overlay while dragging
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
        Swipe card left/right or tap buttons: <strong>[← Nope]</strong>{' '}
        <strong>[↑ Super 2x]</strong> <strong>[→ Based]</strong>
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
        {/* Dynamic Drag Stamp Overlays */}
        {stampType === 'based' && (
          <div className="tm-swipe-stamp based">🔥 BASED (+XP)</div>
        )}
        {stampType === 'nope' && (
          <div className="tm-swipe-stamp nope">💀 NOPE</div>
        )}
        {stampType === 'super' && (
          <div className="tm-swipe-stamp super">🚀 SUPER 2x FIRE!</div>
        )}

        <div className="tm-card-header">
          <span>@{m.author_name}</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
            💀 Pass
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
            🔥 Based
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
            🧬 Mutate
          </button>
        </div>
      </div>
    </section>
  );
}
