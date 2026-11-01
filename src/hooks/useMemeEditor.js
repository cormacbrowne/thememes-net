import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDraft } from '../components/forge/draftStore';

const MAX_HISTORY = 60;

/**
 * PHASE 26: Meme Forge editor state — undo/redo history, gestures, selection, IndexedDB autosave.
 *  set(fn)    → committed change (one undo step)
 *  live(fn)   → transient change during a drag/pinch; wrap with beginGesture()/endGesture()
 */
export default function useMemeEditor(initialDoc) {
  const [hist, setHist] = useState({ past: [], present: initialDoc, future: [] });
  const [selectedId, setSelectedId] = useState(null);
  const gestureBase = useRef(null);
  const dirty = useRef(false);

  const set = useCallback((fn) => {
    dirty.current = true;
    setHist((h) => {
      const next = typeof fn === 'function' ? fn(h.present) : fn;
      if (next === h.present) return h;
      return { past: [...h.past, h.present].slice(-MAX_HISTORY), present: next, future: [] };
    });
  }, []);

  const live = useCallback((fn) => {
    dirty.current = true;
    setHist((h) => ({ ...h, present: typeof fn === 'function' ? fn(h.present) : fn }));
  }, []);

  const beginGesture = useCallback(() => {
    setHist((h) => {
      gestureBase.current = h.present;
      return h;
    });
  }, []);

  const endGesture = useCallback(() => {
    setHist((h) => {
      const base = gestureBase.current;
      gestureBase.current = null;
      if (!base || base === h.present) return h;
      return { past: [...h.past, base].slice(-MAX_HISTORY), present: h.present, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHist((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
        : h
    );
  }, []);

  const redo = useCallback(() => {
    setHist((h) =>
      h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h
    );
  }, []);

  const reset = useCallback((doc) => {
    dirty.current = false;
    setHist({ past: [], present: doc, future: [] });
    setSelectedId(null);
  }, []);

  const updateLayer = useCallback(
    (id, patch, transient = false) => {
      const fn = (d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
      if (transient) live(fn);
      else set(fn);
    },
    [live, set]
  );

  // Debounced IndexedDB autosave
  const doc = hist.present;
  useEffect(() => {
    if (!dirty.current) return undefined;
    const t = setTimeout(() => saveDraft(doc), 900);
    return () => clearTimeout(t);
  }, [doc]);

  return {
    doc,
    set,
    live,
    beginGesture,
    endGesture,
    undo,
    redo,
    reset,
    updateLayer,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    selectedId,
    setSelectedId
  };
}
