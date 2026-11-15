import { useState, useRef, useEffect, useCallback } from 'react';

function readStoredOffset(storageKey, fallback) {
  if (typeof window === 'undefined' || !storageKey) return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const x = Number(parsed?.x);
    const y = Number(parsed?.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  } catch {
    // ignore storage errors
  }
  return fallback;
}

/**
 * Pointer-based drag hook for floating widgets, music bars, TV sets, and Copilot dialogs.
 * Persists translation offset in localStorage, clamps to viewport bounds, and separates
 * clicks (< 6px movement) from drags via `wasDragged()`.
 */
export function useDraggableFloating(storageKey, defaultOffset = { x: 0, y: 0 }) {
  const [offset, setOffset] = useState(() => readStoredOffset(storageKey, defaultOffset));
  const [isDragging, setIsDragging] = useState(false);

  const wasDraggedRef = useRef(false);
  const offsetRef = useRef(offset);
  const boundsRef = useRef({
    minDx: -Infinity,
    maxDx: Infinity,
    minDy: -Infinity,
    maxDy: Infinity
  });
  const dragSessionRef = useRef(null);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const persistOffset = useCallback(
    (next) => {
      if (!storageKey || typeof window === 'undefined') return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
    },
    [storageKey]
  );

  const resetPosition = useCallback(() => {
    const base = { x: defaultOffset?.x || 0, y: defaultOffset?.y || 0 };
    offsetRef.current = base;
    setOffset(base);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [defaultOffset?.x, defaultOffset?.y, storageKey]);

  const clampToViewport = useCallback((candidate) => {
    if (typeof window === 'undefined') return candidate;
    const maxW = Math.max(240, window.innerWidth - 48);
    const maxH = Math.max(240, window.innerHeight - 48);
    const b = boundsRef.current;
    let x = candidate.x;
    let y = candidate.y;
    if (Number.isFinite(b.minDx) && Number.isFinite(b.maxDx)) {
      x = Math.min(b.maxDx, Math.max(b.minDx, x));
    } else {
      x = Math.min(maxW, Math.max(-maxW, x));
    }
    if (Number.isFinite(b.minDy) && Number.isFinite(b.maxDy)) {
      y = Math.min(b.maxDy, Math.max(b.minDy, y));
    } else {
      y = Math.min(maxH, Math.max(-maxH, y));
    }
    return { x: Math.round(x), y: Math.round(y) };
  }, []);

  const handlePointerDown = useCallback((e) => {
    // Allow interactive controls inside a dragged container (buttons/selects/inputs) to work normally
    // unless the element itself is an explicit handle (`data-drag-handle="true"`)
    const isExplicitHandle = e.currentTarget?.dataset?.dragHandle === 'true';
    if (!isExplicitHandle) {
      const interactive = e.target?.closest?.('button, select, input, textarea, a');
      if (interactive && interactive !== e.currentTarget) {
        return;
      }
    }
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') {
      return;
    }

    wasDraggedRef.current = false;
    const startOff = offsetRef.current || { x: 0, y: 0 };

    // Compute dynamic viewport bounds from the element's current bounding box
    if (typeof window !== 'undefined') {
      // The draggable container is marked with `data-drag-box="true"` (no ref needed, so render stays ref-free)
      const targetEl = e.currentTarget?.closest?.('[data-drag-box="true"]') || e.currentTarget;
      const rect = targetEl?.getBoundingClientRect?.();
      if (rect && rect.width > 0 && rect.height > 0) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;
        const baseLeft = rect.left - startOff.x;
        const baseTop = rect.top - startOff.y;
        boundsRef.current = {
          minDx: margin - baseLeft,
          maxDx: Math.max(margin - baseLeft, vw - margin - rect.width - baseLeft),
          minDy: margin - baseTop,
          maxDy: Math.max(margin - baseTop, vh - margin - rect.height - baseTop)
        };
      }
    }

    dragSessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: startOff.x,
      startOffsetY: startOff.y
    };

    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore if capture unavailable
    }
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const sess = dragSessionRef.current;
      if (!sess) return;
      if (e.pointerId !== undefined && sess.pointerId !== undefined && e.pointerId !== sess.pointerId) {
        return;
      }
      const dx = e.clientX - sess.startX;
      const dy = e.clientY - sess.startY;
      if (!wasDraggedRef.current && Math.hypot(dx, dy) > 6) {
        wasDraggedRef.current = true;
        setIsDragging(true);
      }
      if (wasDraggedRef.current) {
        const next = clampToViewport({
          x: sess.startOffsetX + dx,
          y: sess.startOffsetY + dy
        });
        offsetRef.current = next;
        setOffset(next);
      }
    };

    const onUp = (e) => {
      const sess = dragSessionRef.current;
      if (!sess) return;
      if (e.pointerId !== undefined && sess.pointerId !== undefined && e.pointerId !== sess.pointerId) {
        return;
      }
      dragSessionRef.current = null;
      setIsDragging(false);
      if (wasDraggedRef.current) {
        persistOffset(offsetRef.current);
        setTimeout(() => {
          wasDraggedRef.current = false;
        }, 80);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [clampToViewport, persistOffset]);

  // Keep offset reasonable on viewport resize
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setOffset((prev) => {
        const clamped = {
          x: Math.min(vw - 80, Math.max(-(vw - 80), prev.x)),
          y: Math.min(vh - 80, Math.max(-(vh - 80), prev.y))
        };
        if (clamped.x !== prev.x || clamped.y !== prev.y) {
          persistOffset(clamped);
          return clamped;
        }
        return prev;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [persistOffset]);

  // Read from event handlers (not during render) to tell a click apart from the end of a drag.
  const wasDragged = useCallback(() => wasDraggedRef.current, []);

  const containerStyle =
    offset.x !== 0 || offset.y !== 0
      ? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }
      : undefined;

  const dragHandleProps = {
    'data-drag-handle': 'true',
    onPointerDown: handlePointerDown,
    onDoubleClick: (e) => {
      e.stopPropagation();
      resetPosition();
    },
    style: {
      touchAction: 'none',
      cursor: isDragging ? 'grabbing' : 'grab'
    }
  };

  // `wasDragged` is a getter (not the ref itself) so components can read it in click handlers
  // without the React Compiler `react-hooks/refs` rule treating the whole result as a ref.
  return {
    offset,
    isDragging,
    wasDragged,
    dragHandleProps,
    containerStyle,
    resetPosition
  };
}
