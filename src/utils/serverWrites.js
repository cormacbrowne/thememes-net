// ==========================================
// Phase 33 — helpers for writes that go through Edge Functions (publish-meme, post-comment).
// ==========================================
import { checkTexts } from '../../supabase/functions/_shared/textFilter.js';

/** Friendly copy for text-moderation refusals (task 33.4), keyed by the server's `detail`. */
export const TEXT_REJECTION_MESSAGES = {
  links: '🔗 Links aren’t allowed in titles, captions or comments.',
  personal_info: '📵 No personal info please: no phone numbers, emails or addresses.',
  impersonation: '🎭 That name is reserved. Please don’t post as TheMemesHQ, admins or mods.',
  default: '🚫 That breaks the House Rules (no slurs, threats, sexual content or spam).'
};

export function textRejectionMessage(detail) {
  return TEXT_REJECTION_MESSAGES[detail] || TEXT_REJECTION_MESSAGES.default;
}

/**
 * Instant browser-side pass over the same rules the server uses (the server still decides).
 * Returns null when fine, or the `detail` category of the first problem.
 */
export function precheckTexts(texts) {
  const r = checkTexts(texts);
  return r.decision === 'reject' ? r.category || 'rules' : null;
}

/**
 * Every server write needs a real Supabase session (auth.uid()) for ownership, rate limits
 * and bans. Visitors who have not signed in get an anonymous session on their first write,
 * with no form (task 33.6 builds the full account flow on top of this).
 * Returns the session, or null if one could not be created.
 */
export async function ensureWriteSession(client) {
  if (!client?.auth) return null;
  const { data } = await client.auth.getSession();
  if (data?.session) return data.session;
  try {
    const { data: anon, error } = await client.auth.signInAnonymously();
    if (error) return null;
    return anon?.session || null;
  } catch {
    return null;
  }
}

/** Read `{ error, detail }` from a failed functions.invoke call. */
export async function functionErrorPayload(error) {
  try {
    const payload = await error?.context?.json?.();
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

export const COMMENT_ERROR_MESSAGES = {
  sign_in_required: '🔑 Could not start a session to post your comment. Please try again.',
  comment_check_unavailable: '⏳ Our comment checker is busy. Your comment was not posted, try again in a moment.',
  too_long: '✂️ Comments can be up to 280 characters.',
  meme_not_found: '👻 That meme is not available for comments.',
  network: '📡 Could not reach the server. Your comment was not posted.'
};

/**
 * postComment(client, memeId, body) → { ok: true, comment } | { ok: false, message }
 * Goes through the `post-comment` Edge Function (text moderation, server-set author name).
 */
export async function postComment(client, memeId, body) {
  const local = precheckTexts([body]);
  if (local) return { ok: false, message: textRejectionMessage(local) };
  if (!(await ensureWriteSession(client))) return { ok: false, message: COMMENT_ERROR_MESSAGES.sign_in_required };
  const { data, error } = await client.functions.invoke('post-comment', { body: { memeId, body } });
  if (!error && data?.comment) return { ok: true, comment: data.comment };
  const payload = await functionErrorPayload(error);
  if (payload.error === 'rejected') return { ok: false, message: textRejectionMessage(payload.detail) };
  return { ok: false, message: COMMENT_ERROR_MESSAGES[payload.error] || COMMENT_ERROR_MESSAGES.network };
}
