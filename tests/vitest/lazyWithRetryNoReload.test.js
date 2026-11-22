import { afterEach, describe, expect, it, vi } from 'vitest';
import lazyWithRetry from '../../src/utils/lazyWithRetry.js';

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: /assets/x.js');

function stubBrowser() {
  const replace = vi.fn();
  const removeItem = vi.fn();
  vi.stubGlobal('window', {
    location: { href: 'https://www.thememes.net/', replace },
    sessionStorage: { getItem: () => null, setItem: vi.fn(), removeItem }
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
