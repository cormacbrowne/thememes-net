import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CARD_ROW_HEIGHT_PX,
  FEED_GRID_GAP_PX,
  buildGridRows,
  computeVariableGridWindow
} from '../utils/feedPagination';

const OVERSCAN_VIEWPORTS = 1.5;
const MIN_WINDOW_ITEMS = 24;

/** Read the real column count and row gap from the grid's computed CSS. */
function readGridLayout(el) {
  const style = window.getComputedStyle(el);
  const tracks = String(style.gridTemplateColumns || '')
    .split(' ')
    .filter((t) => t && t !== 'none');
  const columns = Math.max(1, tracks.length || 1);
  const gap = parseFloat(style.rowGap);
  return {
    columns,
    gapPx: Number.isFinite(gap) ? gap : FEED_GRID_GAP_PX,
    widthPx: el.clientWidth
  };
}

/** The box that actually takes space for an entry wrapper (meme wrappers are display: contents). */
function entryBox(wrapper) {
  if (!wrapper) return null;
  return wrapper.style.display === 'contents' ? wrapper.firstElementChild : wrapper;
}

/**
 * Windowed responsive CSS grid for 500+ meme cards (keeps mounted DOM small on older iPads).
 *
 * Owner report 20 Nov 2026: on iPhone the feed started jittering once cards began to unmount,
 * and a card would get thrown out of view. The old version assumed every row was as tall as
 * the first few cards and used the desktop gap, but phone cards differ a lot in height (each is
 * as tall as its image). Now every rendered card is measured (and re-measured when its image
 * loads), the spacers are built from those real heights, and the column count and gap come from
 * the grid's own CSS.
 */
export default function VirtualizedMemeGrid({
  items = [],
  inFeedArcadeCard = null,
  inFeedCompanionCard = null,
  renderMemeCard
}) {
  const gridRef = useRef(null);
  const observedRef = useRef(new Map()); // element -> entry key
  const roRef = useRef(null);
  const layoutKeyRef = useRef('');
  // Measured card heights for the current column width: { layoutKey, map: entry key -> px }.
  const [heights, setHeights] = useState(() => ({ layoutKey: '', map: new Map() }));
  const [metrics, setMetrics] = useState({
    columns: 1,
    gapPx: FEED_GRID_GAP_PX,
    widthPx: 0,
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
        key: 'infeed-companion-break',
        fullWidth: true
      });
    }
    return out;
  }, [items, inFeedArcadeCard, inFeedCompanionCard]);

  const rows = useMemo(() => buildGridRows(entries, metrics.columns), [entries, metrics.columns]);

  // Card heights depend on column width: measurements from another width are ignored.
  const layoutKey = `${metrics.columns}:${Math.round(metrics.widthPx)}`;
  useLayoutEffect(() => {
    layoutKeyRef.current = layoutKey;
  }, [layoutKey]);

  /** Measure every mounted entry; bump the version if anything changed by a pixel or more. */
  const measureEntries = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const measured = [];
    el.querySelectorAll(':scope > [data-vkey]').forEach((wrapper) => {
      const box = entryBox(wrapper);
      if (!box) return;
      const key = wrapper.getAttribute('data-vkey');
      const h = box.offsetHeight;
      if (h > 0) measured.push([key, h]);
      if (roRef.current && !observedRef.current.has(box)) {
        observedRef.current.set(box, key);
        roRef.current.observe(box);
      }
    });
    // Stop observing cards that have been unmounted.
    observedRef.current.forEach((_key, box) => {
      if (!box.isConnected) {
        roRef.current?.unobserve(box);
        observedRef.current.delete(box);
      }
    });
    const lk = layoutKeyRef.current;
    setHeights((prev) => {
      const fresh = prev.layoutKey !== lk;
      let next = null;
      for (const [key, h] of measured) {
        const old = fresh ? 0 : prev.map.get(key) || 0;
        if (Math.abs(old - h) >= 1) {
          if (!next) next = fresh ? new Map() : new Map(prev.map);
          next.set(key, h);
        }
      }
      if (!next) return fresh ? { layoutKey: lk, map: new Map() } : prev;
      return { layoutKey: lk, map: next };
    });
  }, []);

  // Window metrics: scroll position, viewport, the grid's real columns/gap/top.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let rafId = 0;

    const measure = () => {
      rafId = 0;
      const el = gridRef.current;
      if (!el) return;
      const layout = readGridLayout(el);
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const gridTopPx = Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY));
      const viewportHeight = window.innerHeight || 900;
      setMetrics((prev) => {
        if (
          prev.columns === layout.columns &&
          prev.gapPx === layout.gapPx &&
          Math.abs(prev.widthPx - layout.widthPx) < 1 &&
          Math.abs(prev.gridTopPx - gridTopPx) < 2 &&
          Math.abs(prev.scrollY - scrollY) < 24 &&
          prev.viewportHeight === viewportHeight
        ) {
          return prev;
        }
        return { ...layout, gridTopPx, scrollY, viewportHeight };
      });
    };

    const scheduleMeasure = () => {
      if (!rafId) rafId = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    // Content above the grid (hero, filter bar) can change height and move the grid's top.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(document.body);
    }
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      ro?.disconnect();
    };
  }, []);

  // One ResizeObserver for every mounted card: catches images loading, captions wrapping, etc.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    let rafId = 0;
    const observed = observedRef.current;
    const ro = new ResizeObserver(() => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          measureEntries();
        });
      }
    });
    roRef.current = ro;
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro.disconnect();
      roRef.current = null;
      observed.clear();
    };
  }, [measureEntries]);

  const win = useMemo(() => {
    const map = heights.layoutKey === layoutKey ? heights.map : new Map();
    const known = [];
    map.forEach((h) => known.push(h));
    known.sort((a, b) => a - b);
    const estimateRowPx = known.length ? known[Math.floor(known.length / 2)] : DEFAULT_CARD_ROW_HEIGHT_PX;
    const rowHeights = rows.map((row) => {
      let max = 0;
      for (const idx of row) {
        const h = map.get(entries[idx].key);
        if (!h) return null;
        if (h > max) max = h;
      }
      return max;
    });
    const minWindowRows = Math.ceil(MIN_WINDOW_ITEMS / Math.max(1, metrics.columns));
    return computeVariableGridWindow({
      rowHeights,
      estimateRowPx,
      gapPx: metrics.gapPx,
      gridTopPx: metrics.gridTopPx,
      scrollY: metrics.scrollY,
      viewportHeight: metrics.viewportHeight,
      overscanPx: metrics.viewportHeight * OVERSCAN_VIEWPORTS,
      minWindowRows
    });
  }, [rows, entries, metrics, heights, layoutKey]);

  const startIndex = rows.length ? rows[win.startRow][0] : 0;
  const endIndex = rows.length && win.endRow > 0 ? rows[win.endRow - 1][rows[win.endRow - 1].length - 1] + 1 : 0;
  const visibleSlice = entries.slice(startIndex, endIndex);

  // Measure what just rendered before the browser paints.
  useLayoutEffect(() => {
    measureEntries();
  });

  // Each spacer is itself a grid row, so the grid adds one gap after/before it: take that off.
  const topSpacerHeight = Math.max(0, win.topSpacerPx - (win.topSpacerPx > 0 ? metrics.gapPx : 0));
  const bottomSpacerHeight = Math.max(0, win.bottomSpacerPx - (win.bottomSpacerPx > 0 ? metrics.gapPx : 0));

  return (
    <main
      ref={gridRef}
      className="tm-grid tm-virtual-grid"
      data-testid="meme-feed-grid"
      data-total-items={entries.length}
      data-virtual-range={`${startIndex}-${endIndex}`}
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
          <div key={entry.key} data-vkey={entry.key} style={{ display: 'contents' }}>
            {inFeedArcadeCard}
          </div>
        ) : entry.kind === 'companion' ? (
          <div key={entry.key} data-vkey={entry.key} style={{ gridColumn: '1 / -1', minWidth: 0 }}>
            {inFeedCompanionCard}
          </div>
        ) : (
          <div key={entry.key} data-vkey={entry.key} style={{ display: 'contents' }}>
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
