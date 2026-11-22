import { afterEach, describe, expect, it, vi } from 'vitest';
import lazyWithRetry from '../../src/utils/lazyWithRetry.js';

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: /assets/x.js');

function stubBrowser() {
  const replace = vi.fn();
  const removeItem = vi.fn();
  vi.stubGlobal('window', {
    location: { href: 'https://www.thememes.net/', replace },
    sessionStorage: {
      store: new Map(),
      getItem(k) { return this.store.has(k) ? this.store.get(k) : null; },
      setItem(k, v) { this.store.set(k, String(v)); },
      removeItem
    }
  });
  return { replace, removeItem };
}

describe('lazyWithRetry reloadOnFail: false', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects without reloading when an optional chunk keeps failing', async () => {
    const { replace } = stubBrowser();
    const importer = vi.fn(() => Promise.reject(chunkError()));
    const Optional = lazyWithRetry(importer, null, { reloadOnFail: false });
    await expect(Optional.preload()).rejects.toThrow(/dynamically imported/);
    expect(importer).toHaveBeenCalledTimes(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not clear the shared reload guard when an optional chunk loads', async () => {
    const { removeItem } = stubBrowser();
    const Optional = lazyWithRetry(() => Promise.resolve({ default: () => null }), null, { reloadOnFail: false });
    await Optional.preload();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('keeps the one-time reload for normal chunks', async () => {
    const { replace } = stubBrowser();
    const Normal = lazyWithRetry(() => Promise.reject(chunkError()));
    Normal.preload();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });
});

describe('lazyWithRetry reload guard (no reload loop)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function stubStatefulBrowser({ refuseWrites = false } = {}) {
    const store = new Map();
    const replace = vi.fn();
    vi.stubGlobal('window', {
      location: { href: 'https://www.thememes.net/games/roulette', replace },
      sessionStorage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => {
          if (!refuseWrites) store.set(k, String(v));
        },
        removeItem: (k) => store.delete(k)
      }
    });
    return { replace, store };
  }

  it('a healthy chunk loading after the reload does not re-arm it', async () => {
    const { replace } = stubStatefulBrowser();
    const failing = () => lazyWithRetry(() => Promise.reject(chunkError()));
    failing().preload();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1));

    // "After the reload": another chunk loads fine, then the broken one fails again.
    await lazyWithRetry(() => Promise.resolve({ default: () => null })).preload();
    await expect(failing().preload()).rejects.toThrow(/dynamically imported/);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('allows one more reload once the cooldown has passed', async () => {
    const { replace, store } = stubStatefulBrowser();
    store.set('tm_chunk_reload_v1', String(Date.now() - 6 * 60 * 1000));
    lazyWithRetry(() => Promise.reject(chunkError())).preload();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });

  it('never reloads when session storage will not keep the guard', async () => {
    const { replace } = stubStatefulBrowser({ refuseWrites: true });
    await expect(lazyWithRetry(() => Promise.reject(chunkError())).preload()).rejects.toThrow(/dynamically imported/);
    expect(replace).not.toHaveBeenCalled();
  });
});
