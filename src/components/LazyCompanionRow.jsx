import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const EightiesIconsStrip = lazy(() => import('./EightiesIconsStrip'));
const VintageCrtNewsTv = lazy(() => import('./VintageCrtNewsTv'));

/**
 * Phase 35.4b / 34.4: Lazy-mounts the 80s Icons Strip + CRT TV when scrolled near the viewport.
 */
export default function LazyCompanionRow({ className = '', eager = false }) {
  const hostRef = useRef(null);
  const [mounted, setMounted] = useState(
    () => eager || typeof IntersectionObserver === 'undefined'
  );

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
      { rootMargin: '250px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mounted]);

  return (
    <div ref={hostRef} className={`tm-80s-companion-row ${className}`.trim()}>
      {mounted ? (
        <Suspense fallback={null}>
          <EightiesIconsStrip />
          <VintageCrtNewsTv />
        </Suspense>
      ) : null}
    </div>
  );
}
