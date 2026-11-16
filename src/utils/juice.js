// ==========================================
// THE JUICE KIT (Phase 35.6a)
// Framework-free tactile feedback helpers:
// haptics, shake, punch, hitStop, countUp, flash (<= 3/sec), slowMo.
// Every function is an immediate no-op when Calm mode, reduced motion,
// or .tm-lite-perf forbids it.
// ==========================================

import { sfx } from './soundEngine';
import { getSettings } from './settingsStore';

export const HAPTIC_PATTERNS = {
  tap: 8,
  tick: 4,
  thunk: 14,
  double: [10, 40, 10],
  win: [20, 30, 20, 30, 60],
  big: [40, 40, 40, 40, 120],
  jackpot: [60, 30, 60, 30, 60, 30, 200],
  heartbeat: [18, 110, 28],
  fail: [30, 60, 80]
};

const FLASH_WINDOW_MS = 1000;
const MAX_FLASHES_PER_WINDOW = 3;

const activeShakes = new WeakMap();
const activePunches = new WeakMap();
let flashTimestamps = [];
let currentTimeScale = 1;
let slowMoTimer = null;
let iosSwitchLabel = null;

function isReducedMotionActive(settings) {
  if (settings?.reducedMotion === 'on') return true;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (
      root?.dataset?.reducedMotion === 'on' ||
      root?.classList?.contains('tm-reduced-motion-force')
    ) {
      return true;
    }
    if (
      settings?.reducedMotion === 'off' ||
      root?.classList?.contains('tm-reduced-motion-allow')
    ) {
      return false;
    }
  } else if (settings?.reducedMotion === 'off') {
    return false;
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Returns true when Calm mode, reduced motion, or .tm-lite-perf disables juice effects.
 */
export function isJuiceDisabled() {
  const settings = getSettings();
  if (settings?.calmMode || settings?.litePerfMode) return true;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const body = document.body;
    if (
      root?.dataset?.calm === 'on' ||
      root?.classList?.contains('tm-calm') ||
      root?.classList?.contains('tm-lite-perf') ||
      body?.classList?.contains('tm-lite-perf')
    ) {
      return true;
    }
  }

  return isReducedMotionActive(settings);
}

function triggerIosSwitchFallback() {
  if (typeof document === 'undefined' || !document.body) return;
  try {
    const isAppleTouch =
      typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    if (!isAppleTouch) return;

    if (!iosSwitchLabel || !iosSwitchLabel.isConnected) {
      const label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText =
        'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      label.appendChild(input);
      document.body.appendChild(label);
      iosSwitchLabel = label;
    }
    iosSwitchLabel.click();
  } catch {
    // Never throw on unsupported devices
  }
}

/**
 * Play a named haptic pattern through SoundEngine's user-gesture + haptics gate.
 * @param {'tap'|'tick'|'thunk'|'double'|'win'|'big'|'jackpot'|'heartbeat'|'fail'} name
 */
export function haptic(name = 'tap') {
  if (isJuiceDisabled()) return false;

  const pattern =
    Object.prototype.hasOwnProperty.call(HAPTIC_PATTERNS, name)
      ? HAPTIC_PATTERNS[name]
      : typeof name === 'number' || Array.isArray(name)
        ? name
        : HAPTIC_PATTERNS.tap;

  try {
    sfx.triggerHaptic(pattern);
    if (
      sfx.hasUserGesture &&
      sfx.hapticsEnabled &&
      (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function')
    ) {
      triggerIosSwitchFallback();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Decaying transform-only screen/element shake.
 * power 1..5 maps to 2..14 px and 120..420 ms.
 */
export function shake(el, power = 2) {
  if (isJuiceDisabled() || !el || typeof el.animate !== 'function') return null;

  const prev = activeShakes.get(el);
  if (prev) {
    try {
      prev.cancel();
    } catch {
      // ignore
    }
  }

  const p = Math.max(1, Math.min(5, Math.round(Number(power) || 1)));
  const maxPx = 2 + (p - 1) * 3;
  const duration = 120 + (p - 1) * 75;
  const steps = Math.max(6, Math.round(duration / 28));
  const keyframes = [];

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const decay = i === steps ? 0 : Math.pow(1 - progress, 1.35);
    const angle = i * 2.35;
    const dx = Math.round(Math.cos(angle) * maxPx * decay * 10) / 10;
    const dy = Math.round(Math.sin(angle * 1.4) * maxPx * 0.72 * decay * 10) / 10;
    keyframes.push({
      transform: i === steps ? 'translate3d(0, 0, 0)' : `translate3d(${dx}px, ${dy}px, 0)`,
      offset: progress
    });
  }

  try {
    const anim = el.animate(keyframes, {
      duration,
      easing: 'ease-out',
      fill: 'none'
    });
    activeShakes.set(el, anim);
    const clear = () => {
      if (activeShakes.get(el) === anim) activeShakes.delete(el);
    };
    anim.onfinish = clear;
    anim.oncancel = clear;
    return anim;
  } catch {
    return null;
  }
}

/**
 * Quick 160 ms scale up & spring back using transform only.
 */
export function punch(el, scale = 1.08) {
  if (isJuiceDisabled() || !el || typeof el.animate !== 'function') return null;

  const prev = activePunches.get(el);
  if (prev) {
    try {
      prev.cancel();
    } catch {
      // ignore
    }
  }

  const s = Math.max(1.01, Math.min(1.4, Number(scale) || 1.08));
  try {
    const anim = el.animate(
      [
        { transform: 'scale(1)', offset: 0 },
        { transform: `scale(${s})`, offset: 0.36 },
        { transform: 'scale(0.975)', offset: 0.74 },
        { transform: 'scale(1)', offset: 1 }
      ],
      {
        duration: 160,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none'
      }
    );
    activePunches.set(el, anim);
    const clear = () => {
      if (activePunches.get(el) === anim) activePunches.delete(el);
    };
    anim.onfinish = clear;
    anim.oncancel = clear;
    return anim;
  } catch {
    return null;
  }
}

/**
 * Resolves after ms (or immediately as a no-op when disabled).
 */
export function hitStop(ms = 60) {
  if (isJuiceDisabled()) return Promise.resolve(false);
  const clamped = Math.min(250, Math.max(16, Number(ms) || 60));
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), clamped);
  });
}

/**
 * Eased number roll. Tapping the element finishes immediately.
 * Returns { cancel, finish }.
 */
export function countUp(el, from, to, { ms = 500, format, onTick } = {}) {
  if (isJuiceDisabled()) {
    return { cancel: () => {}, finish: () => {} };
  }

  const startVal = Number(from) || 0;
  const endVal = Number(to) || 0;
  const duration = Math.max(60, Number(ms) || 500);
  const formatVal = typeof format === 'function' ? format : (v) => String(Math.round(v));
  const useRaf = typeof requestAnimationFrame === 'function';

  let rafId = null;
  let timerId = null;
  let done = false;
  let lastFormatted = '';
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const cleanup = () => {
    if (rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (el && typeof el.removeEventListener === 'function') {
      el.removeEventListener('pointerdown', finish);
    }
  };

  const applyValue = (val, t) => {
    const formatted = formatVal(val);
    if (el) el.textContent = formatted;
    if (formatted !== lastFormatted) {
      lastFormatted = formatted;
      if (typeof onTick === 'function') onTick(val, t);
    }
  };

  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    applyValue(endVal, 1);
  };

  const cancel = () => {
    if (done) return;
    done = true;
    cleanup();
  };

  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener('pointerdown', finish, { once: true });
  }

  const step = () => {
    if (done) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startVal + (endVal - startVal) * eased;
    applyValue(current, t);
    if (t >= 1) {
      done = true;
      cleanup();
      return;
    }
    if (useRaf) {
      rafId = requestAnimationFrame(step);
    } else {
      timerId = setTimeout(step, 16);
    }
  };

  applyValue(startVal, 0);
  if (useRaf) {
    rafId = requestAnimationFrame(step);
  } else {
    timerId = setTimeout(step, 16);
  }

  return { cancel, finish };
}

/**
 * One soft overlay opacity flash.
 * Global clock refuses more than 3 flashes inside any 1000 ms window.
 */
export function flash(el, colour = 'rgba(255, 255, 255, 0.34)', ms = 140) {
  if (isJuiceDisabled() || !el) return false;

  const now = Date.now();
  flashTimestamps = flashTimestamps.filter((ts) => now - ts < FLASH_WINDOW_MS);
  if (flashTimestamps.length >= MAX_FLASHES_PER_WINDOW) {
    return false;
  }
  flashTimestamps.push(now);

  const duration = Math.max(60, Math.min(400, Number(ms) || 140));

  try {
    if (typeof document !== 'undefined' && typeof el.appendChild === 'function') {
      const overlay = document.createElement('span');
      overlay.setAttribute('aria-hidden', 'true');
      const needsRel =
        typeof window !== 'undefined' &&
        typeof window.getComputedStyle === 'function' &&
        window.getComputedStyle(el).position === 'static';
      let restoredPos = false;
      if (needsRel) {
        el.style.position = 'relative';
        restoredPos = true;
      }
      overlay.style.cssText =
        `position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:${colour};opacity:0;z-index:2;`;
      el.appendChild(overlay);

      const cleanup = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (restoredPos) el.style.position = '';
      };

      if (typeof overlay.animate === 'function') {
        const anim = overlay.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 0.78, offset: 0.18 },
            { opacity: 0, offset: 1 }
          ],
          { duration, easing: 'ease-out', fill: 'none' }
        );
        anim.onfinish = cleanup;
        anim.oncancel = cleanup;
      } else {
        overlay.style.opacity = '0.78';
        setTimeout(cleanup, duration);
      }
      return true;
    }

    if (typeof el.animate === 'function') {
      el.animate(
        [
          { opacity: 1 },
          { opacity: 0.72 },
          { opacity: 1 }
        ],
        { duration, easing: 'ease-out' }
      );
      return true;
    }
  } catch {
    return true;
  }

  return true;
}

/**
 * Sets a shared time-scale multiplier for game loops and restores it after ms.
 */
export function slowMo(factor = 0.35, ms = 450) {
  if (isJuiceDisabled()) {
    currentTimeScale = 1;
    return false;
  }

  currentTimeScale = Math.max(0.05, Math.min(2, Number(factor) || 0.35));
  if (slowMoTimer) {
    clearTimeout(slowMoTimer);
    slowMoTimer = null;
  }

  const duration = Math.max(40, Number(ms) || 450);
  slowMoTimer = setTimeout(() => {
    currentTimeScale = 1;
    slowMoTimer = null;
  }, duration);
  return true;
}

export function getTimeScale() {
  return isJuiceDisabled() ? 1 : currentTimeScale;
}

export function resetJuiceForTests() {
  flashTimestamps = [];
  currentTimeScale = 1;
  if (slowMoTimer) {
    clearTimeout(slowMoTimer);
    slowMoTimer = null;
  }
}
