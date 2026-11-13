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
  'disco-strobe': ['🪩', '🌟', '💃', '✨', '🎵']
};

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

  const particleCount = litePerfMode ? 8 : 16;
  const emojis = THEME_EMOJIS[activeWin.theme] || THEME_EMOJIS['gold-fountain'];

  return (
    <div
      key={activeWin.id}
      className={`tm-win-overlay theme-${activeWin.theme} ${activeWin.isBig ? 'is-big' : ''}`}
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

        {/* Lightweight GPU Confetti / Emoji Burst */}
        <div className="tm-win-particles">
          {Array.from({ length: particleCount }).map((_, idx) => {
            const angle = (idx / particleCount) * Math.PI * 2;
            const dist = 70 + ((idx * 37) % 110);
            const tx = Math.round(Math.cos(angle) * dist);
            const ty = Math.round(Math.sin(angle) * dist * 0.65 - 25);
            const isConfetti = activeWin.theme === 'comic-confetti' && idx % 2 === 1;
            return (
              <span
                key={idx}
                className={isConfetti ? 'tm-win-ribbon' : 'tm-win-spark-emoji'}
                style={{
                  '--wx': `${tx}px`,
                  '--wy': `${ty}px`,
                  '--wrot': `${((idx * 53) % 240) - 120}deg`,
                  '--wdelay': `${(idx % 4) * 45}ms`,
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
