// ==========================================
// PHASE 33.18: REAL "PEOPLE HERE NOW" & TRUTHFUL 1-HOUR UPVOTE SIGNALS
// ==========================================

export const MIN_LIVE_PRESENCE_COUNT = 2;

/**
 * Only show the live "memers online" indicator when at least 2 real peers
 * are connected to the Realtime presence channel (hide below 2).
 */
export function shouldShowLivePresence(onlineCount) {
  const count = Math.floor(Number(onlineCount));
  return Number.isFinite(count) && count >= MIN_LIVE_PRESENCE_COUNT;
}

export function formatLivePresenceLabel(onlineCount) {
  if (!shouldShowLivePresence(onlineCount)) return null;
  const count = Math.floor(Number(onlineCount));
  return `🟢 ${count} memers online`;
}

/**
 * Read the server-verified 1-hour upvote count (`upvotes_last_hour`).
 * Never fabricates activity on local seed memes or from total score/reactions.
 */
export function getTruthfulUpvotesLastHour(meme) {
  if (!meme || typeof meme !== 'object') return 0;
  const id = String(meme.id || '');
  if (!id || id.startsWith('seed-') || id.startsWith('local-')) {
    return 0;
  }
  const raw = Math.floor(Number(meme.upvotes_last_hour));
  if (!Number.isFinite(raw) || raw < 1) return 0;
  return raw;
}

/**
 * Format `"🔥 12 upvotes in the last hour"` (singular for 1) ONLY when truthful.
 * Returns `null` when zero/missing/local seed.
 */
export function formatUpvotesLastHourSignal(memeOrCount) {
  const count =
    memeOrCount && typeof memeOrCount === 'object'
      ? getTruthfulUpvotesLastHour(memeOrCount)
      : Math.floor(Number(memeOrCount));

  if (!Number.isFinite(count) || count < 1) return null;
  if (count === 1) return '🔥 1 upvote in the last hour';
  return `🔥 ${count.toLocaleString('en-US')} upvotes in the last hour`;
}
