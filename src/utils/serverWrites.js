// ==========================================
// Phase 33 — helpers for writes that go through Edge Functions (publish-meme, post-comment).
// ==========================================
import { checkTexts } from '../../supabase/functions/_shared/textFilter.js';
import { anonymousHandleFor, validateUsername } from '../../supabase/functions/_shared/identity.js';
import { BOT_ERROR_MESSAGES, formatRateLimitMessage } from '../../supabase/functions/_shared/rateLimitAndBot.js';
import { getTurnstileToken } from './turnstile';

export { formatRateLimitMessage };

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
    const session = anon?.session || null;
    if (session?.user?.id && typeof window !== 'undefined') {
      try {
        window.sessionStorage?.setItem('tm_anon_just_created', session.user.id);
      } catch {
        // Ignore storage errors in private mode / tests
      }
      if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('tm-anon-session', { detail: { user: session.user } }));
      }
    }
    return session;
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
  suspended: '🚫 Your account is currently suspended from commenting.',
  rate_limited: '⏳ Cool your jets, speed racer. Try again in a few sec.',
  ...BOT_ERROR_MESSAGES,
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
  const turnstileToken = await getTurnstileToken('comment');
  const { data, error } = await client.functions.invoke('post-comment', {
    body: { memeId, body, ...(turnstileToken ? { turnstileToken } : {}) }
  });
  if (!error && data?.comment) return { ok: true, comment: data.comment };
  const payload = await functionErrorPayload(error);
  if (payload.error === 'rejected') return { ok: false, message: textRejectionMessage(payload.detail) };
  if (payload.error === 'rate_limited') {
    return {
      ok: false,
      message: payload.message || formatRateLimitMessage(payload.retry_after_seconds)
    };
  }
  if (payload.error && String(payload.error).startsWith('bot_check_')) {
    return {
      ok: false,
      message: payload.message || BOT_ERROR_MESSAGES[payload.error] || BOT_ERROR_MESSAGES.bot_check_failed
    };
  }
  return { ok: false, message: COMMENT_ERROR_MESSAGES[payload.error] || COMMENT_ERROR_MESSAGES.network };
}

/**
 * Returns a generated anonymous handle once if `ensureWriteSession()` created a new
 * anonymous session earlier in this browser tab, then clears the flag.
 */
export function consumeJustCreatedAnonHandle() {
  if (typeof window === 'undefined') return '';
  try {
    const newId = window.sessionStorage?.getItem('tm_anon_just_created');
    if (!newId) return '';
    window.sessionStorage.removeItem('tm_anon_just_created');
    if (window.sessionStorage.getItem('tm_anon_notice_shown')) return '';
    window.sessionStorage.setItem('tm_anon_notice_shown', '1');
    return anonymousHandleFor(newId);
  } catch {
    return '';
  }
}

export const USERNAME_ERROR_MESSAGES = {
  too_short: '✂️ Usernames need at least 3 characters.',
  too_long: '✂️ Usernames can be at most 20 characters.',
  invalid_chars: '🔤 Use letters, numbers, _, -, or . (do not start or end with - or .).',
  reserved_name: '🎭 That name is reserved. Please pick another handle.',
  username_taken: '⚡ That handle is already taken. Try another one!',
  upgrade_required: '🔑 Sign in or link your email first to claim a custom handle.',
  suspended: '🚫 Your account is currently suspended.',
  sign_in_required: '🔑 Sign in first to update your handle.',
  moderation_unavailable: '⏳ Handle checker is busy. Please try again in a moment.',
  network: '📡 Could not reach the server. Your handle was not updated.'
};

/**
 * claimUsername(client, rawUsername) -> { ok: true, username } | { ok: false, error, message }
 * Pre-validates with the shared identity rules, then invokes the `profile` Edge Function
 * (which re-validates, runs full moderation, and writes profiles.username).
 */
export async function claimUsername(client, rawUsername) {
  const local = validateUsername(rawUsername);
  if (!local.ok) {
    return {
      ok: false,
      error: local.error,
      message:
        local.error === 'rejected'
          ? textRejectionMessage(local.detail)
          : USERNAME_ERROR_MESSAGES[local.error] || USERNAME_ERROR_MESSAGES.invalid_chars
    };
  }
  if (!client?.functions) {
    return { ok: false, error: 'network', message: USERNAME_ERROR_MESSAGES.network };
  }
  const { data: sessionData } = await client.auth.getSession();
  const session = sessionData?.session;
  if (!session?.user || session.user.is_anonymous) {
    return { ok: false, error: 'upgrade_required', message: USERNAME_ERROR_MESSAGES.upgrade_required };
  }
  const { data, error } = await client.functions.invoke('profile', {
    body: { username: local.username }
  });
  if (!error && data?.ok) {
    return { ok: true, username: data.username || local.username };
  }
  const payload = await functionErrorPayload(error);
  if (payload.error === 'rejected') {
    return { ok: false, error: 'rejected', message: textRejectionMessage(payload.detail) };
  }
  return {
    ok: false,
    error: payload.error || 'network',
    message: USERNAME_ERROR_MESSAGES[payload.error] || USERNAME_ERROR_MESSAGES.network
  };
}
