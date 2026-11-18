import { card } from '../../utils/thousand/thousandRules';

/** A playing card face (or back). `size`: 'xs' | 'sm' | 'md' | 'lg'. */
export function PlayingCard({
  id,
  back = false,
  size = 'md',
  selected = false,
  dim = false,
  glow = false,
  showPts = true,
  onClick,
  label
}) {
  const c = back ? null : card(id);
  const cls = [
    'tk-card',
    `is-${size}`,
    back || !c ? 'is-back' : c.isRed ? 'is-red' : 'is-black',
    selected ? 'is-selected' : '',
    dim ? 'is-dim' : '',
    glow ? 'is-glow' : '',
    onClick ? 'is-tappable' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const body =
    back || !c ? (
      <span className="tk-card-back">1000</span>
    ) : (
      <>
        <span className="tk-card-rank">{c.rank}</span>
        <span className="tk-card-suit">{c.suit}</span>
        {showPts && <span className="tk-card-pts">{c.pts}</span>}
      </>
    );
  if (onClick) {
    return (
      <button
        type="button"
        className={cls}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={label || (c ? `${c.rank} of ${c.suit}, ${c.pts} points` : 'card')}
        data-card={id}
      >
        {body}
      </button>
    );
  }
  return (
    <span
      className={cls}
      aria-label={label || (c ? `${c.rank}${c.suit}` : 'Face-down card')}
      data-card={c ? id : undefined}
    >
      {body}
    </span>
  );
}

export function CardBacks({ count, max = 10 }) {
  const n = Math.min(count, max);
  return (
    <span className="tk-backs" aria-label={`${count} cards`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="tk-back-mini" />
      ))}
      <span className="tk-backs-n">{count}</span>
    </span>
  );
}
