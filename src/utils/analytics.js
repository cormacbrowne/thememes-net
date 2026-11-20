import { track as vercelTrack } from '@vercel/analytics';
import { pulse, pulseTimer, isPulseAllowed } from './pulse';
import { plausibleEvent } from './plausible';
import { memePath } from './memeSeo';

const viewedKeysThisSession = new Set();
const featuresUsedThisSession = new Set();

function safeTrack(eventName, props = {}) {
  if (typeof window === 'undefined') return;
  try {
    const cleanProps = {};
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined) continue;
      if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        cleanProps[k] = typeof v === 'string' ? v.slice(0, 120) : v;
      } else {
        cleanProps[k] = String(v).slice(0, 120);
      }
    }
    pulse(eventName, cleanProps);
    vercelTrack(eventName, cleanProps);
    plausibleEvent(eventName, cleanProps);
  } catch {
    // Ignore analytics transport or adblocker errors
  }
}

export { pulse, pulseTimer };

/**
 * THE one analytics entry point (plan 1.4): track(event, props).
 * Sends to every configured provider: Pulse (first-party, cookieless, always on),
 * Vercel Web Analytics, and Plausible (cookieless; only when VITE_PLAUSIBLE_DOMAIN is set).
 * Swap or add providers inside safeTrack(); call sites never change.
 * Props: strings/numbers/booleans only, no personal data.
 *
 * Plan events: meme_created {type}, meme_shared {channel}, meme_downloaded, vote_cast,
 * reaction_added, battle_entry, battle_vote, guess_the_meme_completed, share_card_copied,
 * game_started {game}, prank_opened {prank}, signup, return_visit.
 */
export const PLAN_EVENTS = Object.freeze([
  'meme_created',
  'meme_shared',
  'meme_downloaded',
  'vote_cast',
  'reaction_added',
  'battle_entry',
  'battle_vote',
  'guess_the_meme_completed',
  'share_card_copied',
  'game_started',
  'prank_opened',
  'signup',
  'return_visit'
]);

export function track(eventName, props = {}) {
  if (!eventName) return;
  safeTrack(String(eventName), props);
}

/**
 * Share link for a meme, tagged so visits from shares can be measured (?ref=share&m=<id>).
 * Pass the meme (readable /m/<id>/<slug> URL) or just its id (/m/<id>).
 */
export function memeShareUrl(memeOrId, origin) {
  const base =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.thememes.net');
  const meme = memeOrId && typeof memeOrId === 'object' ? memeOrId : { id: memeOrId };
  const id = encodeURIComponent(String(meme.id));
  return `${base}${memePath(meme)}?ref=share&m=${id}`;
}

/** Fires return_visit once per browser session for people who have been here before. */
export function trackReturnVisitOnce() {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem('tm_return_tracked')) return;
    sessionStorage.setItem('tm_return_tracked', '1');
    if (localStorage.getItem('tm_intro_seen')) track('return_visit');
  } catch {
    // storage blocked: skip
  }
}

export { isPulseAllowed };

export function trackFeatureUseOnce(feature) {
  if (!feature || featuresUsedThisSession.has(feature)) return;
  featuresUsedThisSession.add(feature);
  pulse('feature_use', { feature: String(feature).slice(0, 40) });
}

export function sanitizeErrorMessage(msg) {
  return String(msg || 'Unknown error')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .slice(0, 80);
}

export function trackClientError(where, errorOrMsg) {
  const raw =
    typeof errorOrMsg === 'string'
      ? errorOrMsg
      : errorOrMsg?.message || String(errorOrMsg || 'Error');
  pulse('client_error', {
    where: String(where || 'unknown').slice(0, 40),
    message: sanitizeErrorMessage(raw)
  });
}

export function trackMemeViewed(meme, source = 'theater') {
  if (!meme?.id) return;
  const dedupeKey = `${source}:${String(meme.id)}`;
  if (viewedKeysThisSession.has(dedupeKey)) return;
  viewedKeysThisSession.add(dedupeKey);
  safeTrack('meme_viewed', {
    meme_id: String(meme.id),
    category: meme.category || 'unknown',
    media_type: meme.media_type || 'image',
    source
  });
}

export function trackUpvote(memeId, category = 'unknown', weight = 1) {
  if (!memeId) return;
  safeTrack('meme_upvote', {
    meme_id: String(memeId),
    category: category || 'unknown',
    weight: Number(weight) || 1
  });
  track('vote_cast', { meme_id: String(memeId), direction: Number(weight) > 0 ? 'up' : 'down' });
}

export function trackRemixOpened(meme, mode = 'remix') {
  safeTrack('remix_opened', {
    meme_id: meme?.id ? String(meme.id) : 'blank',
    category: meme?.category || 'unknown',
    mode
  });
}

export function trackMemePublished(meme, mode = 'forge') {
  safeTrack('meme_published', {
    meme_id: meme?.id ? String(meme.id) : 'unknown',
    category: meme?.category || 'dank',
    media_type: meme?.media_type || 'image',
    mode
  });
  track('meme_created', { type: meme?.media_type || 'image', mode });
}

export function trackShareClicked(meme, surface = 'card') {
  safeTrack('share_clicked', {
    meme_id: meme?.id ? String(meme.id) : 'site',
    category: meme?.category || 'site',
    surface
  });
  track('meme_shared', { channel: surface, meme_id: meme?.id ? String(meme.id) : 'site' });
}

export function trackGameStarted(game, mode = 'arcade') {
  if (!game) return;
  safeTrack('game_started', {
    game: String(game),
    mode
  });
}
