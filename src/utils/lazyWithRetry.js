import { lazy } from 'react';

const CHUNK_RELOAD_KEY = 'tm_chunk_reload_v1';
// One automatic reload per tab per cooldown. The guard is never cleared by a successful load:
// other chunks loading fine after the reload used to clear it, so a chunk that kept failing
// reloaded the page ~50 times in 20s instead of reaching the Reboot Cabinet screen.
export const CHUNK_RELOAD_COOLDOWN_MS = 5 * 60 * 1000;

function reloadGuardActive(now) {
  const stamp = Number(window.sessionStorage?.getItem(CHUNK_RELOAD_KEY));
  return Number.isFinite(stamp) && stamp > 0 && now - stamp < CHUNK_RELOAD_COOLDOWN_MS;
}

export function isChunkLoadError(err) {
  const msg = String(err?.message || err || '');
  return (
    err?.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg)
  );
}

/**
 * Wraps React.lazy so transient network hiccups or post-deploy hashed-chunk shifts
 * retry cleanly instead of permanently caching a rejected dynamic import in React.
 */
export default function lazyWithRetry(importer, exportPicker = null, { reloadOnFail = true } = {}) {
  const load = async () => {
    try {
      const mod = await importer();
      return exportPicker ? exportPicker(mod) : mod;
    } catch (firstErr) {
      // One micro-retry after short delay in case of transient mobile network stall
      await new Promise((resolve) => setTimeout(resolve, 180));
      try {
        const modRetry = await importer();
        return exportPicker ? exportPicker(modRetry) : modRetry;
      } catch (secondErr) {
        if (reloadOnFail && typeof window !== 'undefined' && isChunkLoadError(secondErr)) {
          try {
            const now = Date.now();
            if (!reloadGuardActive(now)) {
              window.sessionStorage?.setItem(CHUNK_RELOAD_KEY, String(now));
              // If storage silently refuses the write, don't reload: there'd be nothing to stop a loop.
              if (!reloadGuardActive(now)) throw secondErr;
              const url = new URL(window.location.href);
              url.searchParams.set('_cb', String(now));
              window.location.replace(url.toString());
              return new Promise(() => {});
            }
          } catch {
            // fall through and let ArcadeErrorBoundary present Reboot Cabinet
          }
        }
        throw secondErr || firstErr;
      }
    }
  };

  // preload(): fetch + remember the module. Once remembered, React gets a thenable that settles
  // synchronously, so the component renders straight away with no Suspense fallback and no
  // ~300ms reveal throttle (smooth PLAY portal -> lobby, owner brief 19 Nov 2026).
  let resolved = null;
  let pending = null;
  const preload = () => {
    if (resolved) return Promise.resolve(resolved);
    if (!pending) {
      pending = load().then(
        (mod) => {
          resolved = mod;
          return mod;
        },
        (err) => {
          pending = null;
          throw err;
        }
      );
    }
    return pending;
  };

  const Component = lazy(() => (resolved ? { then: (onFulfilled) => onFulfilled(resolved) } : preload()));
  Component.preload = preload;
  return Component;
}
