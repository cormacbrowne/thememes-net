import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const EightiesIconsStrip = lazy(() => import('./EightiesIconsStrip'));
const VintageCrtNewsTv = lazy(() => import('./VintageCrtNewsTv'));

// Phone-width height of the loaded row (cast bar + CRT TV), used to hold its space before it loads.
const PLACEHOLDER_PX = 740;

// Remembered across mounts: the phone feed unmounts/remounts this row as it scrolls (virtualized).
let loadedOnce = false;
let lastHeightPx = 0;

/**
 * Phase 35.4b / 34.4: Lazy-mounts the 80s Icons Strip + CRT TV when scrolled near the viewport.
 *
 * Owner report 20 Nov 2026: in the phone feed this row sat as an empty strip and only grew to
 * ~740px once loaded, often while at the top edge of the screen, shoving the feed down. It now
 * holds its space before loading, starts loading well ahead, and after the first load remounts
 * instantly at its known height.
 */
export default function LazyCompanionRow({ className = '', eager = false }) {
  const hostRef = useRef(null);
  const [mounted, setMounted] = useState(
    () => eager || loadedOnce || typeof IntersectionObserver === 'undefined'
  );
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (mounted) return undefined;
    const el = hostRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: '1200px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mounted]);

  // Note when the real content has rendered, and remember its height for the next remount.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !mounted) return undefined;
    const check = () => {
      if (el.childElementCount > 0 && el.offsetHeight > 0) {
        loadedOnce = true;
        lastHeightPx = el.offsetHeight;
        setFilled(true);
      }
    };
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [mounted]);

  const reserve = !filled && !eager ? lastHeightPx || PLACEHOLDER_PX : undefined;

  return (
    <div
      ref={hostRef}
      className={`tm-80s-companion-row ${className}`.trim()}
      style={reserve ? { minHeight: `${reserve}px` } : undefined}
    >
      {mounted ? (
        <Suspense fallback={null}>
          <EightiesIconsStrip />
          <VintageCrtNewsTv />
        </Suspense>
      ) : null}
    </div>
  );
}
