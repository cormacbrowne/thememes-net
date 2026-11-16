// ==========================================
// SLOT REEL MOTION & OFFSCREEN BLUR SPRITES (Phase 35.7b)
// Single requestAnimationFrame loop per machine driving transform3d directly on DOM refs.
// Pre-renders vertical 3x motion-blurred sprites once to offscreen canvases (no CSS filter: blur).
// Five phases: wind-up -> launch -> cruise -> brake -> overshoot settle.
// ==========================================

import { haptic, isJuiceDisabled } from '../../utils/juice';

const blurredSpriteCache = new Map();
const pendingSprites = new Map();

/**
 * Generates an offscreen canvas motion-blurred data URL (3x vertical smear at 55% opacity)
 * from a mounted SlotSymbolArt <svg> node. Cached globally across all spins & machines.
 */
export function buildBlurredSpriteFromSvg(cacheKey, svgEl, cellW = 72, cellH = 56) {
  if (!cacheKey || !svgEl || typeof document === 'undefined') return null;
  if (blurredSpriteCache.has(cacheKey)) return blurredSpriteCache.get(cacheKey);
  if (pendingSprites.has(cacheKey)) return null;

  try {
    const serializer = new XMLSerializer();
    const rawSvg = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    const promise = new Promise((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(48, Math.round(cellW));
          canvas.height = Math.max(72, Math.round(cellH * 1.8));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Vertical 3x stretch smear baked at ~55% total alpha cleanly without CSS filters
            const drawH = cellH * 2.1;
            const yTop = (canvas.height - drawH) * 0.5;
            ctx.globalAlpha = 0.24;
            ctx.drawImage(img, 4, yTop - 6, canvas.width - 8, drawH);
            ctx.drawImage(img, 4, yTop + 6, canvas.width - 8, drawH);
            ctx.globalAlpha = 0.35;
            ctx.drawImage(img, 4, yTop, canvas.width - 8, drawH);
            const dataUrl = canvas.toDataURL('image/png');
            blurredSpriteCache.set(cacheKey, dataUrl);
            resolve(dataUrl);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        } finally {
          URL.revokeObjectURL(url);
          pendingSprites.delete(cacheKey);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        pendingSprites.delete(cacheKey);
        resolve(null);
      };
    });

    pendingSprites.set(cacheKey, promise);
    img.src = url;
    return null;
  } catch {
    return null;
  }
}

export function getCachedBlurredSprite(cacheKey) {
  return blurredSpriteCache.get(cacheKey) || null;
}

/**
 * Nudges a cabinet container down 2px and back on heavy reel settle (transform only).
 */
export function nudgeCabinetOnStop(cabinetEl) {
  if (isJuiceDisabled() || !cabinetEl || typeof cabinetEl.animate !== 'function') return;
  try {
    cabinetEl.animate(
      [
        { transform: 'translate3d(0, 0, 0)' },
        { transform: 'translate3d(0, 2px, 0)', offset: 0.35 },
        { transform: 'translate3d(0, 0, 0)' }
      ],
      { duration: 95, easing: 'ease-out', fill: 'none' }
    );
  } catch {
    // ignore animation errors
  }
}

/**
 * Creates one isolated rAF loop controller for all reels on a slot cabinet.
 * Mutates only style.transform and style.opacity on registered DOM elements.
 */
export function createMachineReelController() {
  const reels = new Map();
  let rafId = null;
  let lastNow = 0;

  function applyDomTransform(state) {
    const {
      crispEl,
      blurEl,
      stripLen,
      cellH,
      prefixCount,
      centerRow,
      posPx,
      speedPx,
      reducedMotion
    } = state;
    if (!crispEl || stripLen <= 0 || cellH <= 0) return;

    const L = stripLen * cellH;
    const u = ((posPx % L) + L) % L;
    // Offset aligns strip[stopIdx] (when posPx === L - stopIdx*cellH) with centerRow
    const baseShift = (prefixCount - centerRow) * cellH;
    const y = u - L - baseShift;
    const blurred = !reducedMotion && speedPx > 1400;
    const stretchY = blurred ? 1.06 : 1;

    crispEl.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scaleY(${stretchY})`;
    if (blurEl) {
      blurEl.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scaleY(${stretchY})`;
      blurEl.style.opacity = blurred ? '0.92' : '0';
      crispEl.style.opacity = blurred ? '0.28' : '1';
    } else {
      crispEl.style.opacity = '1';
    }
  }

  function registerReel(
    idx,
    { crispEl, blurEl, stripLen, cellH, prefixCount = 3, centerRow = 1, stopIndex = 0 }
  ) {
    const existing = reels.get(idx);
    const L = Math.max(1, stripLen) * cellH;
    const restPos = (L - ((stopIndex % stripLen) + stripLen) % stripLen * cellH) % L;
    const next = {
      idx,
      crispEl,
      blurEl,
      stripLen,
      cellH,
      prefixCount,
      centerRow,
      posPx: existing?.spinning ? existing.posPx : restPos,
      speedPx: existing?.spinning ? existing.speedPx : 0,
      spinning: Boolean(existing?.spinning),
      phase: existing?.phase || 'idle',
      elapsedMs: existing?.elapsedMs || 0,
      startDelayMs: existing?.startDelayMs || 0,
      windUpMs: existing?.windUpMs || 90,
      windUpPx: existing?.windUpPx || 14,
      launchMs: existing?.launchMs || 160,
      cruiseSpeed: existing?.cruiseSpeed || 2600,
      brakeStartMs: existing?.brakeStartMs || 400,
      stopTimeMs: existing?.stopTimeMs || 500,
      settleMs: existing?.settleMs || 180,
      overshootPx: existing?.overshootPx || 13,
      targetStopIndex: existing?.targetStopIndex ?? stopIndex,
      targetPosPx: existing?.targetPosPx ?? restPos,
      brakeStartPosPx: existing?.brakeStartPosPx ?? restPos,
      brakeSpanPx: existing?.brakeSpanPx ?? 0,
      lastTickCell: existing?.lastTickCell ?? -1,
      crawlMode: Boolean(existing?.crawlMode),
      crawlDurationMs: existing?.crawlDurationMs || 0,
      settled: Boolean(existing?.settled),
      reducedMotion: Boolean(existing?.reducedMotion),
      onStop: existing?.onStop || null,
      onTickSymbol: existing?.onTickSymbol || null
    };
    reels.set(idx, next);
    if (!next.spinning) {
      applyDomTransform(next);
    }
  }

  function snapReelToStop(idx, stopIndex) {
    const r = reels.get(idx);
    if (!r) return;
    const L = r.stripLen * r.cellH;
    const wrapped = ((stopIndex % r.stripLen) + r.stripLen) % r.stripLen;
    r.spinning = false;
    r.phase = 'idle';
    r.speedPx = 0;
    r.posPx = L - wrapped * r.cellH;
    r.targetStopIndex = wrapped;
    applyDomTransform(r);
  }

  function configureBrake(r, nowMsInSpin) {
    const L = r.stripLen * r.cellH;
    const wrapped = ((r.targetStopIndex % r.stripLen) + r.stripLen) % r.stripLen;
    const baseTargetMod = (L - wrapped * r.cellH) % L;
    const minDist = Math.max(r.cellH * 1.5, L * 0.12);
    const currMod = ((r.posPx % L) + L) % L;
    let delta = baseTargetMod - currMod;
    while (delta < minDist) {
      delta += L;
    }
    r.brakeStartPosPx = r.posPx;
    r.targetPosPx = r.posPx + delta + r.overshootPx;
    r.brakeSpanPx = r.targetPosPx - r.brakeStartPosPx;
    r.brakeStartMs = nowMsInSpin;
  }

  function startSpin({
    mask = [],
    targetStops = [],
    stopDelaysMs = [],
    turbo = false,
    windUpScale = 1,
    crawlReels = [],
    onReelStop = null,
    onTickSymbol = null
  }) {
    const disabled = isJuiceDisabled();
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    lastNow = now;

    reels.forEach((r, idx) => {
      if (!mask[idx]) {
        r.spinning = false;
        r.phase = 'idle';
        r.speedPx = 0;
        applyDomTransform(r);
        return;
      }

      const stopDelay = Math.max(80, Number(stopDelaysMs[idx]) || 450);
      const startDelay = turbo ? idx * 35 : idx * 60;
      const windUpMs = disabled ? 0 : turbo ? 36 : 90;
      const launchMs = disabled ? 0 : turbo ? 60 : 160;
      const settleMs = disabled ? 0 : turbo ? 105 : 180;
      const hasCrawl = Boolean(crawlReels[idx]) && !disabled && !turbo;

      r.spinning = true;
      r.settled = false;
      r.reducedMotion = disabled;
      r.startDelayMs = startDelay;
      r.elapsedMs = 0;
      r.windUpMs = windUpMs;
      r.windUpPx = Math.round(14 * Math.max(0.7, Math.min(1.6, windUpScale)));
      r.launchMs = launchMs;
      r.cruiseSpeed = turbo ? 3600 : 2600;
      r.settleMs = settleMs;
      r.overshootPx = disabled ? 0 : 12 + (idx % 3);
      r.targetStopIndex = targetStops[idx] ?? 0;
      r.stopTimeMs = stopDelay;
      r.crawlMode = hasCrawl;
      r.crawlDurationMs = hasCrawl ? 600 : 0;
      r.brakeStartMs = Math.max(startDelay + windUpMs + launchMs, stopDelay - settleMs - (hasCrawl ? 780 : 190));
      r.phase = disabled ? 'reduced' : 'wait';
      r.speedPx = 0;
      r.brakeStartPosPx = r.posPx;
      r.targetPosPx = r.posPx;
      r.brakeSpanPx = 0;
      r.lastTickCell = Math.floor(r.posPx / Math.max(1, r.cellH));
      r.onStop = onReelStop;
      r.onTickSymbol = onTickSymbol;
    });

    if (rafId === null && typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(step);
    }
  }

  function slamStop({ targetStops = [], onReelStop = null } = {}) {
    const disabled = isJuiceDisabled();
    reels.forEach((r, idx) => {
      if (!r.spinning) return;
      if (targetStops[idx] !== undefined) {
        r.targetStopIndex = targetStops[idx];
      }
      if (onReelStop) r.onStop = onReelStop;
      if (disabled) {
        r.stopTimeMs = Math.min(r.stopTimeMs, r.elapsedMs + idx * 40);
        return;
      }
      r.crawlMode = false;
      r.crawlDurationMs = 0;
      const slamBrakeEnd = r.elapsedMs + 95 + idx * 40;
      r.settleMs = 110;
      r.stopTimeMs = slamBrakeEnd + r.settleMs;
      r.phase = 'brake';
      configureBrake(r, r.elapsedMs);
    });
  }

  function step(now) {
    if (!lastNow) lastNow = now;
    const dtMs = Math.min(50, Math.max(1, now - lastNow));
    const dtSec = dtMs / 1000;
    lastNow = now;

    let anyActive = false;

    reels.forEach((r, idx) => {
      if (!r.spinning) return;
      anyActive = true;
      r.elapsedMs += dtMs;

      if (r.reducedMotion) {
        if (r.elapsedMs >= r.stopTimeMs) {
          r.spinning = false;
          r.settled = true;
          snapReelToStop(idx, r.targetStopIndex);
          if (typeof r.onStop === 'function') r.onStop(idx);
        }
        return;
      }

      const tRel = r.elapsedMs - r.startDelayMs;
      if (tRel < 0) {
        return;
      }

      const windEnd = r.windUpMs;
      const launchEnd = windEnd + r.launchMs;
      const brakeEnd = r.stopTimeMs - r.settleMs;

      if (tRel < windEnd && r.phase !== 'brake' && r.phase !== 'settle') {
        r.phase = 'windup';
        const p = tRel / windEnd;
        const backOffset = Math.sin(p * Math.PI) * -r.windUpPx;
        const L = r.stripLen * r.cellH;
        const restPos = (r.brakeStartPosPx % L + L) % L;
        r.posPx = restPos + backOffset;
        r.speedPx = 0;
      } else if (tRel < launchEnd && r.phase !== 'brake' && r.phase !== 'settle') {
        if (r.phase === 'windup') {
          r.posPx = r.brakeStartPosPx;
        }
        r.phase = 'launch';
        const p = (tRel - windEnd) / Math.max(1, r.launchMs);
        r.speedPx = r.cruiseSpeed * (p * p);
        r.posPx += r.speedPx * dtSec;
      } else if (r.elapsedMs < r.brakeStartMs && r.phase !== 'brake' && r.phase !== 'settle') {
        r.phase = 'cruise';
        r.speedPx = r.cruiseSpeed;
        r.posPx += r.speedPx * dtSec;
      } else if (r.elapsedMs < brakeEnd && r.phase !== 'settle') {
        if (r.phase !== 'brake') {
          r.phase = 'brake';
          configureBrake(r, r.elapsedMs);
        }
        const totalBrake = Math.max(80, brakeEnd - r.brakeStartMs);
        const rawP = Math.min(1, Math.max(0, (r.elapsedMs - r.brakeStartMs) / totalBrake));
        // Deceleration ease (longer readable tail when anticipating crawl)
        const easePower = r.crawlMode ? 3.2 : 2.15;
        const eased = 1 - Math.pow(1 - rawP, easePower);
        const prevPos = r.posPx;
        r.posPx = r.brakeStartPosPx + r.brakeSpanPx * eased;
        r.speedPx = Math.abs((r.posPx - prevPos) / Math.max(0.001, dtSec));

        if (r.crawlMode && r.elapsedMs >= brakeEnd - r.crawlDurationMs) {
          const cellTick = Math.floor(r.posPx / Math.max(1, r.cellH));
          if (cellTick !== r.lastTickCell) {
            r.lastTickCell = cellTick;
            haptic('tick');
            if (typeof r.onTickSymbol === 'function') {
              r.onTickSymbol(idx, rawP);
            }
          }
        }
      } else if (r.elapsedMs < r.stopTimeMs) {
        if (r.phase !== 'settle') {
          r.phase = 'settle';
          r.posPx = r.targetPosPx;
          r.speedPx = 0;
          if (!r.settled) {
            r.settled = true;
            haptic('thunk');
            if (typeof r.onStop === 'function') r.onStop(idx);
          }
        }
        const p = Math.min(1, Math.max(0, (r.elapsedMs - brakeEnd) / Math.max(1, r.settleMs)));
        const springBack = 1 - Math.pow(1 - p, 2.5);
        r.posPx = r.targetPosPx - r.overshootPx * springBack;
        r.speedPx = 0;
      } else {
        r.spinning = false;
        if (!r.settled) {
          r.settled = true;
          haptic('thunk');
          if (typeof r.onStop === 'function') r.onStop(idx);
        }
        snapReelToStop(idx, r.targetStopIndex);
        return;
      }

      applyDomTransform(r);
    });

    if (anyActive) {
      rafId = requestAnimationFrame(step);
    } else {
      rafId = null;
      lastNow = 0;
    }
  }

  function destroy() {
    if (rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    reels.clear();
  }

  return {
    registerReel,
    snapReelToStop,
    startSpin,
    slamStop,
    destroy
  };
}
