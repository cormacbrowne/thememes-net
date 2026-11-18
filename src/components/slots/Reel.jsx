import { useEffect, useMemo, useRef, useState } from 'react';
import SlotSymbolArt from '../SlotSymbolArt';
import { buildBlurredSpriteFromSvg, getCachedBlurredSprite } from './reelMotion';
import './Reel.css';

/**
 * Unified Mechanical & Video Slot Reel Strip (Phase 35.7b)
 * Renders crisp + pre-blurred sprite strips inside overflow:hidden viewport.
 * Driven directly via translate3d on DOM refs by createMachineReelController().
 */
export default function Reel({
  reelIndex = 0,
  strip = [],
  cellHeight = 56,
  visibleRows = 3,
  centerRow = 1,
  stopIndex = 0,
  controller = null,
  isHeld = false,
  isWinner = false,
  isSpinning = false,
  isAnticipating = false,
  isDimmed = false,
  highlightRows = null,
  breathingRows = null,
  wildMultipliers = null,
  lockedCells = null,
  symbolSize = 48,
  peekPerspective = false,
  className = '',
  onTapReel = null
}) {
  const crispStripRef = useRef(null);
  const blurStripRef = useRef(null);
  const probeContainerRef = useRef(null);
  const [blurVersion, setBlurVersion] = useState(0);

  const prefixCount = 3;
  const suffixCount = visibleRows + 3;

  const { extendedStrip, uniqueSymbols } = useMemo(() => {
    const cleanStrip = Array.isArray(strip) && strip.length > 0 ? strip : ['cherry', 'lemon', '777'];
    const n = cleanStrip.length;
    const prefix = [];
    for (let i = prefixCount; i > 0; i -= 1) {
      prefix.push(cleanStrip[((n - i) % n + n) % n]);
    }
    const suffix = [];
    for (let i = 0; i < suffixCount; i += 1) {
      suffix.push(cleanStrip[i % n]);
    }
    return {
      extendedStrip: [...prefix, ...cleanStrip, ...suffix],
      uniqueSymbols: [...new Set(cleanStrip)]
    };
  }, [strip, suffixCount]);

  // Pre-render blurred sprites once per symbol onto offscreen canvas at mount
  useEffect(() => {
    const host = probeContainerRef.current;
    if (!host) return undefined;
    let cancelled = false;
    const timers = [];

    uniqueSymbols.forEach((symId, idx) => {
      const key = `${symId}-${symbolSize}-${cellHeight}`;
      if (getCachedBlurredSprite(key)) return;
      const svgEl = host.querySelector(`[data-probe-sym="${symId}"] svg`);
      if (!svgEl) return;
      buildBlurredSpriteFromSvg(key, svgEl, Math.max(56, symbolSize + 14), cellHeight);
      // Slight delayed check to pick up async blob decode once cached
      const t = setTimeout(() => {
        if (!cancelled && getCachedBlurredSprite(key)) {
          setBlurVersion((v) => v + 1);
        }
      }, 60 + idx * 12);
      timers.push(t);
    });

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [uniqueSymbols, symbolSize, cellHeight]);

  // Register strip refs with machine's single rAF controller
  useEffect(() => {
    if (!controller) return;
    controller.registerReel(reelIndex, {
      crispEl: crispStripRef.current,
      blurEl: blurStripRef.current,
      stripLen: Math.max(1, strip.length),
      cellH: cellHeight,
      prefixCount,
      centerRow,
      stopIndex
    });
  }, [controller, reelIndex, strip.length, cellHeight, prefixCount, centerRow, stopIndex]);

  const blurMap = useMemo(() => {
    const out = {};
    void blurVersion;
    uniqueSymbols.forEach((symId) => {
      const key = `${symId}-${symbolSize}-${cellHeight}`;
      const cached = getCachedBlurredSprite(key);
      if (cached) out[symId] = cached;
    });
    return out;
  }, [uniqueSymbols, symbolSize, cellHeight, blurVersion]);

  const windowHeight = visibleRows * cellHeight;
  const nLen = Math.max(1, strip.length);
  const wrappedStop = ((stopIndex % nLen) + nLen) % nLen;

  return (
    <div
      className={`tm-reel-window ${isSpinning ? 'is-spinning' : ''} ${isHeld ? 'is-held' : ''} ${
        isWinner && !isSpinning ? 'is-winner' : ''
      } ${isAnticipating ? 'is-anticipating' : ''} ${isDimmed ? 'is-dimmed' : ''} ${
        peekPerspective ? 'has-peek-shade' : ''
      } ${className}`}
      style={{ height: `${windowHeight}px` }}
      onClick={onTapReel || undefined}
      role={onTapReel ? 'button' : undefined}
      tabIndex={onTapReel ? 0 : undefined}
      onKeyDown={
        onTapReel
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTapReel();
              }
            }
          : undefined
      }
      aria-label={`Reel ${reelIndex + 1}`}
    >
      {/* Hidden one-time SVG probe for generating offscreen-canvas blurred sprites */}
      <div className="tm-reel-blur-probe" ref={probeContainerRef} aria-hidden="true">
        {uniqueSymbols.map((symId) => (
          <span key={symId} data-probe-sym={symId}>
            <SlotSymbolArt symbolId={symId} size={symbolSize} />
          </span>
        ))}
      </div>

      {/* Main crisp symbol strip driven by transform: translate3d */}
      <div className="tm-reel-strip" ref={crispStripRef}>
        {extendedStrip.map((symId, cellIdx) => {
          const stripPos = cellIdx - prefixCount;
          const visibleRow = stripPos - wrappedStop + centerRow;
          const isVisible = !isSpinning && visibleRow >= 0 && visibleRow < visibleRows;
          const rowWin =
            isVisible &&
            ((highlightRows && highlightRows.has(visibleRow)) ||
              (isWinner && visibleRow === centerRow));
          const isBreathing = Boolean(
            !isSpinning && breathingRows && isVisible && breathingRows.has(visibleRow)
          );
          const wildMult = isVisible && wildMultipliers ? wildMultipliers[`${reelIndex},${visibleRow}`] : null;
          const lockedOrb = isVisible && lockedCells ? lockedCells[`${reelIndex},${visibleRow}`] : null;

          return (
            <div
              key={`${reelIndex}-c-${cellIdx}`}
              className={`tm-reel-cell ${rowWin ? 'is-win-cell' : ''} ${
                isBreathing ? 'is-breathing-cell' : ''
              } ${lockedOrb ? 'is-orb-locked' : ''}`}
              style={{ height: `${cellHeight}px` }}
            >
              {lockedOrb ? (
                <div className="tm-locked-orb-badge" style={{ borderColor: lockedOrb.color }}>
                  <span>⚡</span>
                  <strong>{lockedOrb.label}</strong>
                </div>
              ) : (
                <SlotSymbolArt
                  symbolId={symId}
                  size={symbolSize}
                  badge={wildMult ? `${wildMult}×` : null}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Pre-blurred sprite strip shown only > 1400 px/s (no live CSS filter: blur!) */}
      <div className="tm-reel-strip is-blurred-layer" ref={blurStripRef} aria-hidden="true">
        {extendedStrip.map((symId, cellIdx) => {
          const spriteUrl = blurMap[symId];
          return (
            <div
              key={`${reelIndex}-b-${cellIdx}`}
              className="tm-reel-cell"
              style={{ height: `${cellHeight}px` }}
            >
              {spriteUrl ? (
                <img
                  src={spriteUrl}
                  alt=""
                  className="tm-reel-blur-sprite"
                  draggable={false}
                />
              ) : (
                <div className="tm-reel-blur-fallback">
                  <SlotSymbolArt symbolId={symId} size={symbolSize} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="tm-reel-glass-overlay" aria-hidden="true" />
      {isHeld && <span className="tm-bandit-held-tag">HELD</span>}
    </div>
  );
}
