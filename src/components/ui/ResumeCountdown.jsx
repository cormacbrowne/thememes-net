import { useEffect, useRef, useState } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const COUNTDOWN_STEPS = [3, 2, 1];

// eslint-disable-next-line react-refresh/only-export-components
export function isReducedMotionActive() {
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

function ResumeCountdownInner({ stepMs, onComplete, reducedMotion }) {
  const [stepIdx, setStepIdx] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let idx = 0;
    let timerId = 0;
    const tick = () => {
      idx += 1;
      if (idx >= COUNTDOWN_STEPS.length) {
        onCompleteRef.current?.();
        return;
      }
      setStepIdx(idx);
      timerId = window.setTimeout(tick, stepMs);
    };
    timerId = window.setTimeout(tick, stepMs);
    return () => window.clearTimeout(timerId);
  }, [stepMs]);

  const isReduced =
    typeof reducedMotion === 'boolean' ? reducedMotion : isReducedMotionActive();
  const value = COUNTDOWN_STEPS[Math.min(stepIdx, COUNTDOWN_STEPS.length - 1)];

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-label={`Resuming in ${value}`}
      data-testid="resume-countdown-overlay"
      data-reduced-motion={isReduced ? 'true' : 'false'}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 'var(--tm-z-overlay)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--tm-space-2)',
        background: 'color-mix(in srgb, var(--tm-night-0) 76%, transparent)',
        color: 'var(--tm-cyan)',
        textAlign: 'center',
        pointerEvents: 'auto'
      }}
    >
      <div
        data-testid="resume-countdown-value"
        style={{
          fontFamily: 'var(--tm-font-title)',
          fontSize: 'var(--tm-text-3xl)',
          fontWeight: 900,
          lineHeight: 1,
          color: 'var(--tm-cyan-hot)',
          textShadow: isReduced ? 'none' : '0 0 18px var(--tm-cyan)',
          transition: isReduced ? 'none' : 'transform var(--tm-dur-fast) var(--tm-ease-out)',
          animation: 'none',
          transform: 'none'
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--tm-font-display)',
          fontSize: 'var(--tm-text-sm)',
          letterSpacing: '0.12em',
          color: 'var(--tm-text-dim)'
        }}
      >
        GET READY
      </div>
    </div>
  );
}

export default function ResumeCountdown({
  active = false,
  stepMs = 650,
  onComplete,
  reducedMotion
}) {
  if (!active) return null;
  return (
    <ResumeCountdownInner
      stepMs={stepMs}
      onComplete={onComplete}
      reducedMotion={reducedMotion}
    />
  );
}
