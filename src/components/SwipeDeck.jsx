import { useState, useRef } from 'react';
import { getMemeRarityTier } from '../data/starterMemes';

export default function SwipeDeck({
  filteredMemes,
  swipeIndex,
  swipeAnim,
  onTriggerSwipe,
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

    if (y < -85 && Math.abs(y) > Math.abs(x)) {
      setSessionSwipes((s) => s + 1);
      onTriggerSwipe('up', e);
    } else if (x > 90) {
      setSessionSwipes((s) => s + 1);
      onTriggerSwipe('right', e);
    } else if (x < -90) {
      setSessionSwipes((s) => s + 1);
      onTriggerSwipe('left', e);
    }
  };

  // Determine active stamp overlay while dragging
  let stampType = null;
  if (dragOffset.y < -45 && Math.abs(dragOffset.y) > Math.abs(dragOffset.x)) {
    stampType = 'super';
  } else if (dragOffset.x > 45) {
    stampType = 'based';
  } else if (dragOffset.x < -45) {
    stampType = 'nope';
  }

  const cardTransform = isDragging
    ? `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${(dragOffset.x * 0.06).toFixed(2)}deg)`
    : undefined;

  return (
    <section className="tm-arena">
      <div className="tm-swipe-hud">
        <span>
          Card <strong>{activeIdx + 1}</strong> of <strong>{filteredMemes.length}</strong>
        </span>
        <span style={{ color: '#facc15', fontWeight: 900 }}>
          ⚡ Session Swipes: {sessionSwipes}
        </span>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 14px' }}>
        Drag the card with your mouse/finger or use arrows <strong>[← Nope]</strong>{' '}
        <strong>[↑ Super 2x]</strong> <strong>[→ Based]</strong>
      </p>

      <div
        className={`tm-card tm-holo-card ${rarity.className} ${swipeAnim}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          textAlign: 'left',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
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

        <div className="tm-img-wrap">
          <img src={m.image_url} alt={m.title} draggable={false} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            padding: '16px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            className="tm-btn"
            onClick={(e) => {
              setSessionSwipes((s) => s + 1);
              onTriggerSwipe('left', e);
            }}
          >
            💀 Pass (←)
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
            🚀 Super 2x (↑)
          </button>
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            onClick={(e) => {
              setSessionSwipes((s) => s + 1);
              onTriggerSwipe('right', e);
            }}
          >
            🔥 Based (→)
          </button>
          <button
            type="button"
            className="tm-btn"
            onClick={() => onOpenTheater && onOpenTheater(m)}
            title="Inspect in Theater Mode"
          >
            🔍 Theater
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
