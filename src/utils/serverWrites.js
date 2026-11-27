// ==========================================
// Phase 33 — helpers for writes that go through Edge Functions (publish-meme, post-comment).
// ==========================================
import { checkTexts } from '../../supabase/functions/_shared/textFilter.js';
import { anonymousHandleFor, validateUsername } from '../../supabase/functions/_shared/identity.js';
import { BOT_ERROR_MESSAGES, formatRateLimitMessage } from '../../supabase/functions/_shared/rateLimitAndBot.js';
import { ensureActionBotCheck, getTurnstileToken } from './turnstile.js';

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

/** Clamp any vote input strictly to -1, 0, or 1 so combo multipliers never affect DB score. */
export function normalizeVoteDirection(direction) {
  const n = Number(direction);
  if (!Number.isFinite(n) || n === 0) return 0;
  return n > 0 ? 1 : -1;
}

/** Compute the next per-user vote (-1 | 0 | 1) and local delta when toggling or switching. */
export function nextVoteState(currentVote, requestedDirection) {
  const cur = normalizeVoteDirection(currentVote);
  const req = normalizeVoteDirection(requestedDirection);
  if (req === 0) return { nextDirection: 0, delta: -cur };
  const nextDirection = cur === req ? 0 : req;
  return { nextDirection, delta: nextDirection - cur };
}

export const VOTE_ERROR_MESSAGES = {
  sign_in_required: '🔑 Could not start a session to save your vote. Please try again.',
  suspended: '🚫 Your account is currently suspended from voting.',
  not_found: '👻 That meme is no longer available.',
  invalid_direction: '⚠️ Invalid vote.',
  network: '📡 Could not save your vote. Please try again.'
};

export const REACTION_ERROR_MESSAGES = {
  sign_in_required: '🔑 Could not start a session to save your reaction. Please try again.',
  suspended: '🚫 Your account is currently suspended from reacting.',
  not_found: '👻 That meme is no longer available.',
  invalid_reaction: '⚠️ Unsupported reaction.',
  network: '📡 Could not save your reaction. Please try again.'
};

export const DELETE_COMMENT_ERROR_MESSAGES = {
  sign_in_required: '🔑 Could not verify your session to delete this comment.',
  suspended: '🚫 Your account is currently suspended.',
  not_found: '👻 Could not delete that comment (you can only delete your own comments).',
  network: '📡 Could not reach the server. Your comment was not deleted.'
};

function mapRpcFailure(data, error, messages) {
  if (data && data.ok === false) {
    if (data.error === 'rate_limited') {
      return data.message || formatRateLimitMessage(data.retry_after_seconds);
    }
    return messages[data.error] || messages.network;
  }
  const msg = String(error?.message || '');
  const rlMatch = msg.match(/rate_limited:(\d+)/i);
  if (rlMatch) return formatRateLimitMessage(Number(rlMatch[1]));
  if (/suspended/i.test(msg)) return messages.suspended;
  if (/auth(?:entication)?_required|sign_in_required/i.test(msg)) return messages.sign_in_required;
  return messages.network;
}

/**
 * Cast or clear the caller's single vote (-1, 0, or 1) via the tamper-resistant `cast_vote` RPC.
 */
export async function castVote(client, memeId, direction) {
  if (!(await ensureWriteSession(client))) {
    return { ok: false, error: 'sign_in_required', message: VOTE_ERROR_MESSAGES.sign_in_required };
  }
  await ensureActionBotCheck('vote');
  const { data, error } = await client.rpc('cast_vote', {
    p_meme_id: memeId,
    p_direction: normalizeVoteDirection(direction)
  });
  if (!error && data?.ok) {
    return {
      ok: true,
      memeId: data.meme_id || memeId,
      userVote: normalizeVoteDirection(data.user_vote),
      score: typeof data.score === 'number' ? data.score : null,
      upvotesLastHour:
        typeof data.upvotes_last_hour === 'number' ? data.upvotes_last_hour : null,
      changed: Boolean(data.changed)
    };
  }
  return {
    ok: false,
    error: data?.error || 'rpc_error',
    message: mapRpcFailure(data, error, VOTE_ERROR_MESSAGES)
  };
}

/**
 * Toggle one emoji reaction on a meme via the tamper-resistant `toggle_reaction` RPC.
 */
export async function toggleReaction(client, memeId, emoji, active = true) {
  if (!(await ensureWriteSession(client))) {
    return { ok: false, error: 'sign_in_required', message: REACTION_ERROR_MESSAGES.sign_in_required };
  }
  const { data, error } = await client.rpc('toggle_reaction', {
    p_meme_id: memeId,
    p_emoji: emoji,
    p_active: Boolean(active)
  });
  if (!error && data?.ok) {
    return {
      ok: true,
      memeId: data.meme_id || memeId,
      emoji: data.emoji || emoji,
      active: Boolean(data.active),
      reactions: data.reactions && typeof data.reactions === 'object' ? data.reactions : null
    };
  }
  return {
    ok: false,
    error: data?.error || 'rpc_error',
    message: mapRpcFailure(data, error, REACTION_ERROR_MESSAGES)
  };
}

/**
 * Delete the caller's own comment via RLS-protected DELETE on `public.comments`.
 */
export async function deleteComment(client, commentId) {
  if (!client || !commentId) {
    return { ok: false, error: 'not_found', message: DELETE_COMMENT_ERROR_MESSAGES.not_found };
  }
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session?.user) {
    return { ok: false, error: 'sign_in_required', message: DELETE_COMMENT_ERROR_MESSAGES.sign_in_required };
  }
  const { data, error } = await client
    .from('comments')
    .delete()
    .eq('id', commentId)
    .select('id');
  if (error) {
    const msg = String(error.message || '');
    return {
      ok: false,
      error: 'delete_failed',
      message: /suspended|rls|permission/i.test(msg)
        ? DELETE_COMMENT_ERROR_MESSAGES.not_found
        : DELETE_COMMENT_ERROR_MESSAGES.network
    };
  }
  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, error: 'not_found', message: DELETE_COMMENT_ERROR_MESSAGES.not_found };
  }
  return { ok: true, id: data[0].id };
}

/**
 * Submit a high-priority copyright / photo-of-me / privacy takedown request (task 33.11).
 */
export async function submitTakedownRequest(
  client,
  { targetUrl, kind = 'copyright', requesterEmail = '', details = '' }
) {
  if (!client) {
    return { ok: false, error: 'network', message: '⚠️ Offline right now: your report was not sent. What you typed is still here, so please press the submit button again once you are back online.' };
  }
  if (!(await ensureWriteSession(client))) {
    return {
      ok: false,
      error: 'sign_in_required',
      message:
        '🔑 Your report was not sent yet: we could not open a secure session. What you typed is still here. Please press the submit button again in a few minutes, or try from another connection (for example, mobile data instead of shared Wi-Fi).'
    };
  }
  const { data, error } = await client.rpc('submit_takedown_request', {
    p_target_url: String(targetUrl || '').trim().slice(0, 500),
    p_kind: kind,
    p_requester_email: String(requesterEmail || '').trim().slice(0, 200) || null,
    p_details: String(details || '').trim().slice(0, 1000)
  });
  if (!error && data?.ok) {
    return { ok: true, id: data.id, memeId: data.meme_id || null, priority: data.priority || 95 };
  }
  const messages = {
    missing_fields: '⚠️ Please include the URL or meme ID and at least a few words explaining the request.',
    invalid_kind: '⚠️ Pick one of the listed takedown reasons.',
    sign_in_required: '🔑 Please sign in or refresh and try again.',
    network: '⚠️ Could not reach the server. Please try again in a moment.'
  };
  return {
    ok: false,
    error: data?.error || 'rpc_error',
    message: mapRpcFailure(data, error, messages)
  };
}

/**
 * Permanently remove the signed-in caller's account, memes, comments, and uploaded media (task 33.11).
 */
export async function deleteMyAccountAndMemes(client) {
  if (!client) {
    return { ok: false, error: 'network', message: '⚠️ Offline right now — cannot delete server data without a connection.' };
  }
  const { data: sessionData } = await client.auth.getSession();
  const session = sessionData?.session;
  if (!session?.user) {
    return { ok: false, error: 'sign_in_required', message: '🔑 Please sign in first to delete a server account.' };
  }
  const { data, error } = await client.functions.invoke('delete-account', {
    body: { confirm: true }
  });
  if (error || !data?.ok) {
    return {
      ok: false,
      error: data?.error || 'server_error',
      message: '⚠️ Could not delete your account automatically right now. You can submit a /takedown privacy request as backup.'
    };
  }
  try {
    await client.auth.signOut();
  } catch {
    // account already deleted on auth server
  }
  if (typeof localStorage !== 'undefined') {
    for (const key of ['tm_user', 'tm_user_memes', 'tm_votes', 'tm_saved_memes', 'tm_notifications']) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore storage errors
      }
    }
  }
  return {
    ok: true,
    deletedMemes: data.deletedMemes ?? 0,
    removedFiles: data.removedFiles ?? 0
  };
}

