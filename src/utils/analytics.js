import { pulse, pulseTimer, isPulseAllowed, resolveReturningVisitor } from './pulse';
import { track as providerTrack } from '../lib/analytics';
import { memePath } from './memeSeo';

const viewedKeysThisSession = new Set();
const featuresUsedThisSession = new Set();

// All events go through the provider switchboard in src/lib/analytics.ts.
function safeTrack(eventName, props = {}) {
  providerTrack(eventName, props);
}

export { pulse, pulseTimer };

/**
 * THE one analytics entry point (plan 1.4): track(event, props).
 * Sends through src/lib/analytics.ts, which decides the providers (Pulse for everything;
 * Umami for the main product events). Swap or add providers there; call sites never change.
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
  if (typeof window === 'undefined' || !isPulseAllowed()) return;
  try {
    if (sessionStorage.getItem('tm_return_tracked')) return;
    sessionStorage.setItem('tm_return_tracked', '1');
    if (resolveReturningVisitor()) track('return_visit');
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
  // The card button only opens the share sheet; the sheet records meme_shared with the real
  // channel (whatsapp, x, copy, …), so don't count the card click as a share too.
  if (surface !== 'card') {
    track('meme_shared', { channel: surface, meme_id: meme?.id ? String(meme.id) : 'site' });
  }
}

export function trackGameStarted(game, mode = 'arcade') {
  if (!game) return;
  safeTrack('game_started', {
    game: String(game),
    mode
  });
}
