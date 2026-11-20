/**
 * Browser storage is ~5 MB per site, and the site saves to it from ~110 places, most of them
 * unguarded. When it fills up (the owner's PC on 20 Nov 2026: "Setting the value of 'tm_votes'
 * exceeded the quota"), the first save that throws inside React crashed the whole page.
 *
 * Installed once, before the app loads: localStorage.setItem never throws for a full quota.
 * It frees space in steps and retries; if the value still does not fit, that one save is
 * skipped. The first time this happens per page load, the biggest keys are reported to Pulse
 * so we can see what filled the storage.
 */

// Caches the site rebuilds from the server on its own: safe to drop.
export const REBUILDABLE_KEYS = [
  'tm_meme_categories_v1',
  'tm_hidden_seeds_v1',
  'tm_meme_views_v1',
  'tm_game_agg_ratings_v1'
];

/** Local copy of the person's own memes: keep the memes, drop embedded images over 20 KB. */
export const USER_MEMES_KEY = 'tm_user_memes';
const MAX_INLINE_IMAGE_CHARS = 20000;

export function isQuotaError(err) {
  if (!err) return false;
  const name = String(err.name || '');
  const msg = String(err.message || '');
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    /quota/i.test(msg)
  );
}

/** Keys sorted by size (characters of key + value), biggest first. */
export function storageSizes(storage) {
  const out = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k == null) continue;
      const v = storage.getItem(k) || '';
      out.push([k, k.length + v.length]);
    }
  } catch {
    // ignore
  }
  return out.sort((a, b) => b[1] - a[1]);
}

/** Free space in the given order. Returns true if anything was freed by this step. */
export function freeStorageStep(storage, step, realRemove, realSet) {
  if (step === 0) {
    let freed = false;
    for (const k of REBUILDABLE_KEYS) {
      if (storage.getItem(k) != null) {
        realRemove.call(storage, k);
        freed = true;
      }
    }
    return freed;
  }
  if (step === 1) {
    const raw = storage.getItem(USER_MEMES_KEY);
    if (!raw) return false;
    try {
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return false;
      let changed = false;
      const slim = list.map((m) => {
        if (m && typeof m.image_url === 'string' && m.image_url.startsWith('data:') && m.image_url.length > MAX_INLINE_IMAGE_CHARS) {
          changed = true;
          return { ...m, image_url: '' };
        }
        return m;
      });
      if (!changed) return false;
      realRemove.call(storage, USER_MEMES_KEY);
      try {
        realSet.call(storage, USER_MEMES_KEY, JSON.stringify(slim));
      } catch {
        // still too big: leave it removed
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

let installed = false;
let reported = false;

export function installStorageGuard(win = typeof window !== 'undefined' ? window : undefined) {
  if (installed || !win) return;
  let storage;
  try {
    storage = win.localStorage;
  } catch {
    return; // storage blocked entirely (privacy mode): callers already handle that
  }
  if (!storage) return;
  const proto = Object.getPrototypeOf(storage);
  const realSet = proto.setItem;
  const realRemove = proto.removeItem;
  if (typeof realSet !== 'function') return;
  installed = true;

  proto.setItem = function guardedSetItem(key, value) {
    try {
      return realSet.call(this, key, value);
    } catch (err) {
      if (!isQuotaError(err) || this !== storage) throw err;
      for (let step = 0; step < 2; step += 1) {
        if (!freeStorageStep(this, step, realRemove, realSet)) continue;
        try {
          return realSet.call(this, key, value);
        } catch (retryErr) {
          if (!isQuotaError(retryErr)) throw retryErr;
        }
      }
      if (!reported) {
        reported = true;
        const top = storageSizes(this)
          .slice(0, 3)
          .map(([k, n]) => `${k.slice(0, 24)}=${Math.round(n / 1024)}k`)
          .join(' ');
        try {
          console.warn('[storageGuard] storage full, skipped saving', key, top);
        } catch {
          // ignore
        }
        import('./analytics.js')
          .then((m) => m.trackClientError('storage', `full ${String(key).slice(0, 20)} ${top}`))
          .catch(() => {});
      }
      return undefined;
    }
  };
}
