import { Component, Suspense, useEffect, useRef, useState } from 'react';
import lazyWithRetry from '../utils/lazyWithRetry';
import './LazyCompanionRow.css';

// Optional decoration: if a chunk fails, hide it. Never reload the page or reach the root error screen.
const EightiesIconsStrip = lazyWithRetry(() => import('./EightiesIconsStrip'), null, { reloadOnFail: false });
const VintageCrtNewsTv = lazyWithRetry(() => import('./VintageCrtNewsTv'), null, { reloadOnFail: false });

class CompanionBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Phone-width height of the loaded row (cast bar + CRT TV), used to hold its space before it loads.
const PLACEHOLDER_PX = 740;
const DESKTOP_HUB_STORAGE_KEY = 'tm_desktop_hub_expanded';

// Remembered across mounts: the phone feed unmounts/remounts this row as it scrolls (virtualized).
let loadedOnce = false;
let lastHeightPx = 0;

function readInitialExpanded() {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(DESKTOP_HUB_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Phase 35.4b / 34.4: Lazy-mounts the 80s Icons Strip + CRT TV when scrolled near the viewport.
 * On wide desktop, `collapsible` starts collapsed as a compact bar so memes sit above the fold
 * and the hub chunks load only when expanded.
 */
export default function LazyCompanionRow({ className = '', eager = false, collapsible = false }) {
  const hostRef = useRef(null);
  const [expanded, setExpanded] = useState(readInitialExpanded);
  const [mounted, setMounted] = useState(() =>
    collapsible ? readInitialExpanded() : eager || loadedOnce || typeof IntersectionObserver === 'undefined'
  );
  const [filled, setFilled] = useState(false);
  const [chunkFailed, setChunkFailed] = useState(false);

  useEffect(() => {
    if (collapsible || mounted) return undefined;
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
  }, [collapsible, mounted]);

  // Note when the real content has rendered, and remember its height for the next remount.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !mounted || (collapsible && !expanded)) return undefined;
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
  }, [mounted, collapsible, expanded]);

  const handleToggleDesktopHub = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) setMounted(true);
    try {
      window.localStorage?.setItem(DESKTOP_HUB_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // storage disabled
    }
  };

  if (collapsible) {
    return (
      <div className={`tm-companion-shell ${className}`.trim()}>
        <div className="tm-companion-bar">
          <div className="tm-companion-bar-label">
            <span aria-hidden="true">📺</span>
            <span>80s Classics Crew (24 Icons)</span>
            <span className="tm-companion-bar-sub">&amp; Trinitron &apos;86 CRT News</span>
          </div>
          <button
            type="button"
            className="tm-companion-toggle"
            data-testid="desktop-hub-toggle"
            aria-expanded={expanded}
            onClick={handleToggleDesktopHub}
          >
            {expanded ? 'Hide Hub ▴' : 'Show Hub ▾'}
          </button>
        </div>
        {expanded && (
          <div ref={hostRef} className="tm-80s-companion-row">
            <Suspense fallback={null}>
              <CompanionBoundary onFail={() => setChunkFailed(true)}>
                <EightiesIconsStrip />
              </CompanionBoundary>
              <CompanionBoundary onFail={() => setChunkFailed(true)}>
                <VintageCrtNewsTv />
              </CompanionBoundary>
            </Suspense>
          </div>
        )}
      </div>
    );
  }

  const reserve = !filled && !eager && !chunkFailed ? lastHeightPx || PLACEHOLDER_PX : undefined;

  return (
    <div
      ref={hostRef}
      className={`tm-80s-companion-row ${className}`.trim()}
      style={reserve ? { minHeight: `${reserve}px` } : undefined}
    >
      {mounted ? (
        <Suspense fallback={null}>
          <CompanionBoundary onFail={() => setChunkFailed(true)}>
            <EightiesIconsStrip />
          </CompanionBoundary>
          <CompanionBoundary onFail={() => setChunkFailed(true)}>
            <VintageCrtNewsTv />
          </CompanionBoundary>
        </Suspense>
      ) : null}
    </div>
  );
}
