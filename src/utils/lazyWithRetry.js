import { lazy } from 'react';

const CHUNK_RELOAD_KEY = 'tm_chunk_reload_v1';

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
      // Optional chunks must not clear the guard, or a broken sibling chunk can reload forever.
      if (reloadOnFail && typeof window !== 'undefined') {
        try {
          window.sessionStorage?.removeItem(CHUNK_RELOAD_KEY);
        } catch {
          // ignore storage errors
        }
      }
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
            const alreadyReloaded = window.sessionStorage?.getItem(CHUNK_RELOAD_KEY);
            if (!alreadyReloaded) {
              window.sessionStorage?.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
              const url = new URL(window.location.href);
              url.searchParams.set('_cb', String(Date.now()));
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
