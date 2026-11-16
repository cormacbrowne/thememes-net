import { useEffect, useId, useRef, useState } from 'react';
import { CURRENCY_BRAND, formatMoney } from '../../utils/tokenEconomy';
import './Money.css';

const COUNT_DURATION_MS = 400;

function isMotionReduced() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;
  const root = document.documentElement;
  if (root.dataset.reducedMotion === 'on') return true;
  if (root.classList.contains('tm-reduced-motion-force')) return true;
  if (root.classList.contains('tm-lite-perf')) return true;
  if (root.dataset.reducedMotion === 'off') return false;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function toTotalCents(tokens, centz) {
  return Math.round((Number(tokens) || 0) * CURRENCY_BRAND.centsPerToken + (Number(centz) || 0));
}

/**
 * Small inline SVG amber coin with an "M" stamp (replaces the coin emoji).
 */
export function MemeCoinIcon({ size = 16, className = '' }) {
  const uid = useId();
  const fillId = `tm-coin-fill-${uid}`;
  const rimId = `tm-coin-rim-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`ui-coin-icon ${className}`.trim()}
    >
      <defs>
        <radialGradient id={fillId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff1c9" />
          <stop offset="55%" stopColor="#ffb800" />
          <stop offset="100%" stopColor="#b87300" />
        </radialGradient>
        <linearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff1c9" />
          <stop offset="100%" stopColor="#7a4c00" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${fillId})`} stroke={`url(#${rimId})`} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(122, 76, 0, 0.45)" strokeWidth="1" />
      <path
        d="M7.2 16.5V7.5H9.6L12 12.1L14.4 7.5H16.8V16.5H14.8V10.9L12.6 15H11.4L9.2 10.9V16.5H7.2Z"
        fill="#3d2c05"
      />
    </svg>
  );
}

/**
 * Renders any MemeDollarz / MemeCentz amount in tabular amber numerals,
 * counting smoothly up or down over 400 ms unless reduced motion is active.
 */
export function Money({
  tokens = 0,
  centz = 0,
  compact = false,
  sign = false,
  zero = 'free',
  animate = true,
  className = '',
  as = 'span'
}) {
  const Tag = as;
  const targetCents = toTotalCents(tokens, centz);
  const [displayCents, setDisplayCents] = useState(targetCents);
  const currentCentsRef = useRef(targetCents);

  useEffect(() => {
    const startCents = currentCentsRef.current;
    if (startCents === targetCents) return undefined;

    if (!animate || isMotionReduced() || typeof requestAnimationFrame !== 'function') {
      currentCentsRef.current = targetCents;
      const syncId = requestAnimationFrame(() => setDisplayCents(targetCents));
      return () => cancelAnimationFrame(syncId);
    }

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now) => {
      const elapsed = Math.max(0, now - startTime);
      const t = Math.min(1, elapsed / COUNT_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(startCents + (targetCents - startCents) * eased);
      currentCentsRef.current = next;
      setDisplayCents(next);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [targetCents, animate]);

  const text = formatMoney(0, {
    centz: displayCents,
    compact,
    sign,
    zero
  });

  return <Tag className={`ui-money ${className}`.trim()}>{text}</Tag>;
}

/**
 * Unified MemeDollarz wallet badge/button used in the top bar, lobby, and games.
 */
export function Wallet({
  tokens = 0,
  centz = 0,
  compact = false,
  size = 'md',
  onClick,
  badge = null,
  delta = null,
  title,
  ariaLabel,
  className = ''
}) {
  const formatted = formatMoney(tokens, { centz, compact, zero: 'balance' });
  const sizeClass =
    size === 'sm' ? 'ui-wallet--sm' : size === 'inline' ? 'ui-wallet--inline' : 'ui-wallet--md';
  const coinSize = size === 'sm' ? 14 : size === 'inline' ? 15 : 16;

  const content = (
    <>
      <MemeCoinIcon size={coinSize} />
      <Money tokens={tokens} centz={centz} compact={compact} zero="balance" />
      {badge}
      {delta && (
        <span
          key={delta.id}
          className={`ui-wallet__delta ${delta.diff >= 0 ? 'is-up' : 'is-down'}`}
        >
          {formatMoney(delta.diff, { sign: true, zero: 'balance' })}
        </span>
      )}
    </>
  );

  const mergedClass = `ui-wallet ${sizeClass} ${className}`.trim();
  const label = ariaLabel || `MemeDollarz Wallet ${formatted}`;

  if (typeof onClick === 'function') {
    return (
      <button
        type="button"
        className={mergedClass}
        onClick={onClick}
        aria-label={label}
        title={title}
        data-tm-wallet="true"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={mergedClass} aria-label={label} title={title} data-tm-wallet="true">
      {content}
    </span>
  );
}

export default Money;
