import './SeasonalOverlay.css';

const PARTICLES = [
  { left: 4, delay: 0, dur: 9.2, size: 11, sym: '❄' },
  { left: 10, delay: -3.1, dur: 11.4, size: 14, sym: '✦' },
  { left: 16, delay: -6.4, dur: 8.6, size: 12, sym: '❄' },
  { left: 22, delay: -1.8, dur: 10.8, size: 10, sym: '❅' },
  { left: 29, delay: -4.9, dur: 9.7, size: 13, sym: '❄' },
  { left: 36, delay: -7.2, dur: 12.1, size: 11, sym: '✦' },
  { left: 43, delay: -2.4, dur: 8.9, size: 14, sym: '❄' },
  { left: 50, delay: -5.6, dur: 10.4, size: 10, sym: '❅' },
  { left: 57, delay: -0.9, dur: 11.7, size: 13, sym: '❄' },
  { left: 64, delay: -4.1, dur: 9.3, size: 11, sym: '✦' },
  { left: 71, delay: -8.0, dur: 10.9, size: 14, sym: '❄' },
  { left: 78, delay: -2.7, dur: 8.8, size: 10, sym: '❅' },
  { left: 85, delay: -6.1, dur: 11.2, size: 13, sym: '❄' },
  { left: 91, delay: -1.4, dur: 9.5, size: 12, sym: '✦' },
  { left: 96, delay: -5.0, dur: 10.6, size: 11, sym: '❄' }
];

/**
 * Plan 2.9 — Lightweight ambient seasonal overlay (pointer-events: none, reduced-motion safe).
 */
export default function SeasonalOverlay({ skin = 'off' }) {
  if (skin !== 'christmas' && skin !== 'newyear') return null;

  const isNewYear = skin === 'newyear';

  return (
    <div
      className={`tm-seasonal-overlay is-${skin}`}
      aria-hidden="true"
      data-testid="seasonal-overlay"
    >
      {PARTICLES.map((p, idx) => (
        <span
          key={idx}
          className="tm-seasonal-flake"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            fontSize: `${p.size}px`
          }}
        >
          {isNewYear ? (idx % 2 === 0 ? '✨' : '★') : p.sym}
        </span>
      ))}
    </div>
  );
}
