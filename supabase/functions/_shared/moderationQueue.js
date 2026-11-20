// ==========================================
// Task 33.5 — shared rules for reports and the moderator queue.
// Used by the `moderate` Edge Function, the browser report sheet and /admin/moderation,
// and covered by tests/unit/reportsModeration.unit.mjs.
// ==========================================

/** Report reasons, in the order the report sheet shows them. `weight` = queue severity
 *  (must match public.report_reason_weight() in migration 20261115000005). */
export const REPORT_REASONS = [
  { id: 'sexual', label: 'Nudity or sexual content', emoji: '🔞', weight: 80 },
  { id: 'violence', label: 'Violence or gore', emoji: '🩸', weight: 70 },
  { id: 'hate', label: 'Hate or harassment', emoji: '🤬', weight: 60 },
  { id: 'child', label: 'Involves a child', emoji: '🧒', weight: 100 },
  { id: 'spam', label: 'Spam or scam', emoji: '🎣', weight: 30 },
  { id: 'copyright', label: "It's my content (copyright)", emoji: '©️', weight: 25 },
  { id: 'other', label: 'Something else', emoji: '❓', weight: 10 }
];

export const REPORT_REASON_IDS = REPORT_REASONS.map((r) => r.id);
export const REPORT_NOTE_MAX = 300;
/** Distinct reporters needed to hide an item for everyone (1 for reason 'child'). */
export const AUTO_HIDE_REPORTERS = 3;

export function reasonWeight(reason) {
  return REPORT_REASONS.find((r) => r.id === reason)?.weight ?? 10;
}

export function reasonLabel(reason) {
  const r = REPORT_REASONS.find((x) => x.id === reason);
  return r ? `${r.emoji} ${r.label}` : reason;
}

/** Mirror of the server's auto-hide rule (the database decides; this is for tests/UI copy). */
export function shouldAutoHide(distinctReporters, reason, threshold = AUTO_HIDE_REPORTERS) {
  const limit = Math.max(1, Number(threshold) || AUTO_HIDE_REPORTERS);
  return reason === 'child' || Number(distinctReporters) >= limit;
}

export const MOD_DECISIONS = ['approve', 'remove', 'remove_ban_hash', 'remove_suspend'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE_RE = /^[A-Za-z0-9_.-]{2,32}$/;
export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Validate a moderator decision request.
 * → { ok: true, memeId, commentId, battleEntryId?, reportedHandle?, decision, note } | { ok: false, error }
 */
export function parseDecisionRequest(body) {
  const b = body && typeof body === 'object' ? body : {};
  const memeId = isUuid(b.memeId) ? b.memeId.toLowerCase() : null;
  const commentId = isUuid(b.commentId) ? b.commentId.toLowerCase() : null;
  const battleEntryId = isUuid(b.battleEntryId) ? b.battleEntryId.toLowerCase() : null;
  const rawHandle = typeof b.reportedHandle === 'string' ? b.reportedHandle.trim().replace(/^@+/, '') : '';
  const reportedHandle = rawHandle && HANDLE_RE.test(rawHandle) ? rawHandle : null;

  const targetCount =
    (memeId ? 1 : 0) +
    (commentId ? 1 : 0) +
    (battleEntryId ? 1 : 0) +
    (reportedHandle ? 1 : 0);
  if (targetCount !== 1) return { ok: false, error: 'bad_request' };

  const decision = String(b.decision ?? '');
  if (!MOD_DECISIONS.includes(decision)) return { ok: false, error: 'bad_decision' };
  if (!memeId && decision === 'remove_ban_hash') return { ok: false, error: 'bad_decision' };
  const note =
    typeof b.note === 'string'
      ? Array.from(b.note, (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c))
          .join('')
          .trim()
          .slice(0, REPORT_NOTE_MAX)
      : '';
  return {
    ok: true,
    memeId,
    commentId,
    ...(battleEntryId ? { battleEntryId } : {}),
    ...(reportedHandle ? { reportedHandle } : {}),
    decision,
    note: note || null
  };
}

const PUBLIC_BUCKETS = ['memes', 'meme-images'];

/**
 * Turn a Supabase public object URL into { bucket, path } for our own project's public
 * buckets, or null for anything else (seed images, external URLs, other projects).
 */
export function publicObjectFromUrl(url, supabaseUrl) {
  if (typeof url !== 'string' || !url) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (supabaseUrl) {
    try {
      if (u.host !== new URL(supabaseUrl).host) return null;
    } catch {
      return null;
    }
  }
  const m = u.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  const bucket = decodeURIComponent(m[1]);
  const path = decodeURIComponent(m[2]);
  if (!PUBLIC_BUCKETS.includes(bucket)) return null;
  if (path.includes('..') || path.startsWith('/')) return null;
  return { bucket, path };
}

/** Where a removed meme's file is kept (private quarantine bucket) for appeals. */
export function removedArchivePath(memeId, path) {
  const file = String(path).split('/').pop() || 'file';
  return `removed/${memeId}/${file}`;
}

/** Friendly copy for report_item() errors. */
export const REPORT_ERROR_MESSAGES = {
  sign_in_required: '🔑 Could not start a session to send your report. Please try again.',
  rate_limited: '⏳ Cool your jets, speed racer. Try again in a few min.',
  suspended: '🚫 Your account is suspended, so reports are paused.',
  not_found: '👻 That one is already gone or being reviewed.',
  bad_reason: '❓ Please pick a reason.',
  bad_request: '❓ Something went wrong. Please try again.',
  network: '📡 Could not reach the server. Your report was not sent.'
};

export function reportErrorMessage(code) {
  return REPORT_ERROR_MESSAGES[code] || REPORT_ERROR_MESSAGES.network;
}
