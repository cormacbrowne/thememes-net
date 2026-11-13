import { useState, useEffect, useRef } from 'react';
import { subscribeWinCelebration } from '../utils/winCelebration';
import { DeLoreanSvg } from './DeLoreanTimeMachine';
import './WinCelebrationOverlay.css';

const CONFETTI_COLORS = ['#facc15', '#00f3ff', '#ec4899', '#4ade80', '#a855f7', '#fb923c'];

const THEME_EMOJIS = {
  'gold-fountain': ['🪙', '🏆', '💰', '✨', '💎'],
  'lightning-surge': ['⚡', '🌩️', '✨', '💥', '🔋'],
  'synth-lasers': ['🌈', '🔥', '✨', '🎛️', '💫'],
  'comic-confetti': ['🎉', '🎊', '💥', '⭐', '🥳'],
  'delorean-88mph': ['🔥', '⚡', '🏎️', '✨', '💨'],
  'disco-strobe': ['🪩', '🌟', '💃', '✨', '🎵'],
  'ufo-abduction': ['🛸', '👽', '💎', '🪙', '✨', '🏆'],
  'meteor-vault': ['☄️', '🪙', '💎', '👑', '🔥', '💰'],
  'hyperdrive-aurora': ['🌌', '⚡', '🏎️', '✨', '💫', '🚀'],
  'arcade-fireworks': ['🎆', '🎇', '👑', '🏆', '✨', '🪙']
};

const FIREWORK_BURSTS = [
  { x: '18%', y: '24%', delay: '60ms', color: '#00f3ff' },
  { x: '80%', y: '22%', delay: '460ms', color: '#facc15' },
  { x: '28%', y: '44%', delay: '880ms', color: '#ec4899' },
  { x: '72%', y: '42%', delay: '1280ms', color: '#4ade80' }
];

const METEOR_TRAJECTORIES = [
  { top: '6%', left: '12%', delay: '0ms', scale: 1.05 },
  { top: '14%', left: '58%', delay: '180ms', scale: 0.92 },
  { top: '4%', left: '84%', delay: '360ms', scale: 1.1 },
  { top: '22%', left: '34%', delay: '560ms', scale: 0.88 },
  { top: '10%', left: '72%', delay: '780ms', scale: 1.0 }
];

function FlyingSaucerSvg() {
  return (
    <svg viewBox="0 0 180 84" className="tm-rare-ufo-svg" aria-hidden="true">
      <defs>
        <linearGradient id="tmUfoHull" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="tmUfoDome" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <ellipse cx="90" cy="48" rx="76" ry="18" fill="url(#tmUfoHull)" stroke="#67e8f9" strokeWidth="2.5" />
      <ellipse cx="90" cy="44" rx="52" ry="11" fill="#0f172a" opacity="0.55" />
      <path d="M54 41 C56 14, 124 14, 126 41 Z" fill="url(#tmUfoDome)" stroke="#a5f3fc" strokeWidth="2" />
      <ellipse cx="90" cy="62" rx="28" ry="6" fill="#34d399" opacity="0.9" />
      <circle cx="38" cy="48" r="4" fill="#facc15" />
      <circle cx="62" cy="54" r="4" fill="#ec4899" />
      <circle cx="90" cy="56" r="4.5" fill="#4ade80" />
      <circle cx="118" cy="54" r="4" fill="#ec4899" />
      <circle cx="142" cy="48" r="4" fill="#facc15" />
    </svg>
  );
}

export default function WinCelebrationOverlay({ litePerfMode = false }) {
  const [activeWin, setActiveWin] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeWinCelebration((payload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setActiveWin(payload);
      timerRef.current = setTimeout(() => {
        setActiveWin((curr) => (curr && curr.id === payload.id ? null : curr));
      }, payload.durationMs || 2200);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!activeWin) return null;

  const isRare = Boolean(activeWin.isRare);
  const particleCount = litePerfMode ? (isRare ? 12 : 8) : isRare ? 26 : 16;
  const emojis = THEME_EMOJIS[activeWin.theme] || THEME_EMOJIS['gold-fountain'];

  return (
    <div
      key={activeWin.id}
      className={`tm-win-overlay theme-${activeWin.theme} ${activeWin.isBig ? 'is-big' : ''} ${
        isRare ? 'is-rare' : ''
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Background FX Layer per Theme */}
      <div className="tm-win-fx-layer" aria-hidden="true">
        {activeWin.theme === 'lightning-surge' && (
          <>
            <div className="tm-win-flash-veil" />
            <div className="tm-win-shockwave" />
            <div className="tm-win-shockwave delayed" />
          </>
        )}

        {activeWin.theme === 'synth-lasers' && (
          <div className="tm-win-lasers">
            <span className="tm-win-laser l1" />
            <span className="tm-win-laser l2" />
            <span className="tm-win-laser l3" />
            <span className="tm-win-laser l4" />
          </div>
        )}

        {activeWin.theme === 'delorean-88mph' && (
          <div className="tm-win-delorean-pass">
            <DeLoreanSvg showFlames fluxActive />
          </div>
        )}

        {activeWin.theme === 'disco-strobe' && (
          <div className="tm-win-disco-orb">🪩</div>
        )}

        {/* RARE THEME 1: UFO MOTHERSHIP ABDUCTION */}
        {activeWin.theme === 'ufo-abduction' && (
          <>
            <div className="tm-rare-aurora-veil" />
            <div className="tm-rare-tractor-beam" />
            <div className="tm-rare-ufo-craft">
              <FlyingSaucerSvg />
            </div>
            {Array.from({ length: litePerfMode ? 6 : 12 }).map((_, idx) => (
              <span
                key={`star-${idx}`}
                className="tm-rare-star"
                style={{
                  left: `${8 + ((idx * 17) % 84)}%`,
                  top: `${6 + ((idx * 23) % 52)}%`,
                  animationDelay: `${(idx % 5) * 140}ms`
                }}
              >
                ✦
              </span>
            ))}
            {Array.from({ length: litePerfMode ? 6 : 12 }).map((_, idx) => (
              <span
                key={`abduct-${idx}`}
                className="tm-rare-abduct-item"
                style={{
                  '--ax': `${((idx % 5) - 2) * 34}px`,
                  animationDelay: `${160 + idx * 175}ms`
                }}
              >
                {emojis[idx % emojis.length]}
              </span>
            ))}
          </>
        )}

        {/* RARE THEME 2: GOLDEN METEOR VAULT SHOWER */}
        {activeWin.theme === 'meteor-vault' && (
          <>
            <div className="tm-rare-vault-flare" />
            <div className="tm-rare-vault-ring" />
            <div className="tm-rare-vault-ring delayed" />
            {METEOR_TRAJECTORIES.slice(0, litePerfMode ? 3 : 5).map((m, idx) => (
              <div
                key={`meteor-${idx}`}
                className="tm-rare-meteor"
                style={{
                  top: m.top,
                  left: m.left,
                  animationDelay: m.delay,
                  '--mscale': m.scale
                }}
              />
            ))}
            {Array.from({ length: litePerfMode ? 8 : 18 }).map((_, idx) => (
              <span
                key={`rain-${idx}`}
                className="tm-rare-coin-rain"
                style={{
                  left: `${4 + ((idx * 11.5) % 92)}%`,
                  animationDelay: `${120 + (idx % 6) * 210}ms`,
                  '--rrot': `${idx % 2 === 0 ? 320 : -320}deg`
                }}
              >
                {emojis[idx % emojis.length]}
              </span>
            ))}
          </>
        )}

        {/* RARE THEME 3: 88-MPH QUANTUM HYPERDRIVE */}
        {activeWin.theme === 'hyperdrive-aurora' && (
          <>
            <div className="tm-rare-synth-horizon" />
            <div className="tm-rare-prism-ring" />
            <div className="tm-rare-prism-ring delayed" />
            <div className="tm-rare-warp-hub">
              {Array.from({ length: litePerfMode ? 6 : 14 }).map((_, idx) => (
                <span
                  key={`warp-${idx}`}
                  className="tm-rare-warp-streak"
                  style={{
                    '--wangle': `${Math.round((idx / (litePerfMode ? 6 : 14)) * 360)}deg`,
                    animationDelay: `${(idx % 4) * 140}ms`
                  }}
                />
              ))}
            </div>
            <div className="tm-rare-tire-tracks" />
            <div className="tm-rare-delorean-hyper">
              <DeLoreanSvg showFlames fluxActive />
            </div>
          </>
        )}

        {/* RARE THEME 4: NEON CHAMPIONSHIP FIREWORKS */}
        {activeWin.theme === 'arcade-fireworks' && (
          <>
            <div className="tm-rare-spotlight left" />
            <div className="tm-rare-spotlight right" />
            {FIREWORK_BURSTS.slice(0, litePerfMode ? 2 : 4).map((fw, fIdx) => (
              <div
                key={`fw-${fIdx}`}
                className="tm-rare-fw-cluster"
                style={{
                  left: fw.x,
                  top: fw.y,
                  '--fw-color': fw.color,
                  '--fw-delay': fw.delay
                }}
              >
                <span className="tm-rare-fw-core" />
                {Array.from({ length: litePerfMode ? 6 : 10 }).map((_, pIdx) => (
                  <span
                    key={`petal-${pIdx}`}
                    className="tm-rare-fw-petal"
                    style={{
                      '--pangle': `${pIdx * (litePerfMode ? 60 : 36)}deg`
                    }}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {/* Lightweight GPU Confetti / Emoji Burst */}
        <div className="tm-win-particles">
          {Array.from({ length: particleCount }).map((_, idx) => {
            const angle = (idx / particleCount) * Math.PI * 2;
            const dist = (isRare ? 95 : 70) + ((idx * 37) % (isRare ? 150 : 110));
            const tx = Math.round(Math.cos(angle) * dist);
            const ty = Math.round(Math.sin(angle) * dist * 0.68 - (isRare ? 10 : 25));
            const isConfetti =
              (activeWin.theme === 'comic-confetti' || isRare) && idx % 2 === 1;
            return (
              <span
                key={idx}
                className={isConfetti ? 'tm-win-ribbon' : 'tm-win-spark-emoji'}
                style={{
                  '--wx': `${tx}px`,
                  '--wy': `${ty}px`,
                  '--wrot': `${((idx * 53) % 240) - 120}deg`,
                  '--wdelay': `${(idx % 5) * 45}ms`,
                  backgroundColor: isConfetti
                    ? CONFETTI_COLORS[idx % CONFETTI_COLORS.length]
                    : undefined
                }}
              >
                {isConfetti ? '' : emojis[idx % emojis.length]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Unmistakable Center-Top Reward Banner */}
      <div className="tm-win-card">
        {isRare && activeWin.rareBadge && (
          <div className="tm-win-rare-ribbon">{activeWin.rareBadge}</div>
        )}
        <div className="tm-win-kicker-row">
          <span className="tm-win-kicker">{activeWin.kicker}</span>
          {activeWin.game && <span className="tm-win-game-tag">{activeWin.game}</span>}
        </div>
        <div className="tm-win-headline">{activeWin.headline}</div>
        {activeWin.amount > 0 && (
          <div className="tm-win-amount-pill">
            +{activeWin.amount.toLocaleString()} {activeWin.unit}
          </div>
        )}
        {activeWin.detail && <div className="tm-win-detail">{activeWin.detail}</div>}
      </div>
    </div>
  );
}
