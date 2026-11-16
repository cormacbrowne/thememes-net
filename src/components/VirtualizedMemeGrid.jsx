import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CARD_ROW_HEIGHT_PX,
  FEED_GRID_GAP_PX,
  computeVirtualGridWindow,
  estimateGridColumns
} from '../utils/feedPagination';

/**
 * Windowed responsive CSS grid for 500+ meme cards (keeps mounted DOM small on older iPads)
 * while maintaining accurate document scroll height via row-aligned spacers.
 */
export default function VirtualizedMemeGrid({
  items = [],
  inFeedArcadeCard = null,
  inFeedCompanionCard = null,
  renderMemeCard
}) {
  const gridRef = useRef(null);
  const [metrics, setMetrics] = useState({
    columns: 3,
    rowStridePx: DEFAULT_CARD_ROW_HEIGHT_PX + FEED_GRID_GAP_PX,
    gridTopPx: 0,
    scrollY: 0,
    viewportHeight: 900
  });

  // Combine meme cards + in-feed arcade promo (idx 4) + companion card (after 6th meme on mobile/tablet).
  const entries = useMemo(() => {
    const out = items.map((meme, memeIdx) => ({
      kind: 'meme',
      key: `meme-${meme.id}`,
      meme,
      memeIdx
    }));
    if (inFeedArcadeCard && out.length >= 4) {
      out.splice(4, 0, {
        kind: 'arcade',
        key: 'infeed-arcade-break'
      });
    }
    if (inFeedCompanionCard && out.length >= 7) {
      out.splice(7, 0, {
        kind: 'companion',
        key: 'infeed-companion-break'
      });
    }
    return out;
  }, [items, inFeedArcadeCard, inFeedCompanionCard]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let rafId = 0;

    const measure = () => {
      rafId = 0;
      const el = gridRef.current;
      if (!el) return;
      const style = window.getComputedStyle(el);
      const padLeft = parseFloat(style.paddingLeft || '0') || 0;
      const padRight = parseFloat(style.paddingRight || '0') || 0;
      const contentWidth = Math.max(0, el.clientWidth - padLeft - padRight);
      const columns = estimateGridColumns(contentWidth);
      const rect = el.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const gridTopPx = Math.max(0, Math.round(rect.top + scrollY));
      const sampleHeights = Array.from(
        el.querySelectorAll('.tm-card:not(.tm-infeed-arcade-card)')
      )
        .slice(0, 3)
        .map((c) => c.offsetHeight || 0)
        .filter((h) => h >= 220)
        .sort((a, b) => a - b);
      const measuredHeight =
        sampleHeights.length > 0 ? sampleHeights[Math.floor(sampleHeights.length / 2)] : 0;
      const rowHeight = measuredHeight >= 220 ? measuredHeight : DEFAULT_CARD_ROW_HEIGHT_PX;
      const rowStridePx = rowHeight + FEED_GRID_GAP_PX;
      const viewportHeight = window.innerHeight || 900;

      setMetrics((prev) => {
        if (
          prev.columns === columns &&
          Math.abs(prev.rowStridePx - rowStridePx) < 16 &&
          Math.abs(prev.gridTopPx - gridTopPx) < 8 &&
          Math.abs(prev.scrollY - scrollY) < 24 &&
          prev.viewportHeight === viewportHeight
        ) {
          return prev;
        }
        return {
          columns,
          rowStridePx,
          gridTopPx,
          scrollY,
          viewportHeight
        };
      });
    };

    const scheduleMeasure = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(measure);
      }
    };

    measure();
    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure, { passive: true });

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && gridRef.current) {
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(gridRef.current);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      ro?.disconnect();
    };
  }, [entries.length]);

  const win = useMemo(
    () =>
      computeVirtualGridWindow({
        totalItems: entries.length,
        columns: metrics.columns,
        rowStridePx: metrics.rowStridePx,
        gridTopPx: metrics.gridTopPx,
        scrollY: metrics.scrollY,
        viewportHeight: metrics.viewportHeight,
        overscanRows: 3,
        minWindowItems: 24
      }),
    [entries.length, metrics]
  );

  const visibleSlice = entries.slice(win.startIndex, win.endIndex);
  const topSpacerHeight = Math.max(0, win.topSpacerPx - (win.topSpacerPx > 0 ? FEED_GRID_GAP_PX : 0));
  const bottomSpacerHeight = Math.max(
    0,
    win.bottomSpacerPx - (win.bottomSpacerPx > 0 ? FEED_GRID_GAP_PX : 0)
  );

  return (
    <main
      ref={gridRef}
      className="tm-grid tm-virtual-grid"
      data-testid="meme-feed-grid"
      data-total-items={entries.length}
      data-virtual-range={`${win.startIndex}-${win.endIndex}`}
    >
      {topSpacerHeight > 0 && (
        <div
          className="tm-virtual-spacer"
          data-testid="virtual-top-spacer"
          style={{ gridColumn: '1 / -1', height: `${topSpacerHeight}px`, pointerEvents: 'none' }}
          aria-hidden="true"
        />
      )}

      {visibleSlice.map((entry) =>
        entry.kind === 'arcade' ? (
          <div key={entry.key} style={{ display: 'contents' }}>
            {inFeedArcadeCard}
          </div>
        ) : entry.kind === 'companion' ? (
          <div key={entry.key} style={{ gridColumn: '1 / -1' }}>
            {inFeedCompanionCard}
          </div>
        ) : (
          <div key={entry.key} style={{ display: 'contents' }}>
            {renderMemeCard(entry.meme, entry.memeIdx)}
          </div>
        )
      )}

      {bottomSpacerHeight > 0 && (
        <div
          className="tm-virtual-spacer"
          data-testid="virtual-bottom-spacer"
          style={{ gridColumn: '1 / -1', height: `${bottomSpacerHeight}px`, pointerEvents: 'none' }}
          aria-hidden="true"
        />
      )}
    </main>
  );
}
