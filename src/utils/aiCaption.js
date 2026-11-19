// ==========================================
// Browser side of the AI Caption Writer (Edge Function `ai-caption`).
// The OpenAI key never reaches the browser: this only talks to our Supabase function.
// ==========================================
import { AI_CAPTION, AI_CAPTION_MESSAGES } from '../../supabase/functions/_shared/aiCaptionCore.js';
import {
  ensureWriteSession,
  functionErrorPayload,
  precheckTexts,
  textRejectionMessage
} from './serverWrites.js';
import { BOT_ERROR_MESSAGES } from '../../supabase/functions/_shared/rateLimitAndBot.js';
import { getTurnstileToken } from './turnstile.js';

export const AI_CAPTION_FUNCTION = 'ai-caption';
export const AI_IDEA_MAX = AI_CAPTION.ideaMax;

export function aiCaptionMessage(error, quota) {
  if (error === 'ai_quota_used') {
    return quota?.tier === 'account'
      ? AI_CAPTION_MESSAGES.ai_quota_used_account
      : AI_CAPTION_MESSAGES.ai_quota_used_anonymous;
  }
  return AI_CAPTION_MESSAGES[error] || BOT_ERROR_MESSAGES[error] || AI_CAPTION_MESSAGES.network;
}

/** How many free AI captions are left (does not use one). → quota | null */
export async function fetchAiCaptionQuota(client) {
  try {
    if (!(await ensureWriteSession(client))) return null;
    const { data, error } = await client.functions.invoke(AI_CAPTION_FUNCTION, { body: { action: 'quota' } });
    return !error && data?.quota ? data.quota : null;
  } catch {
    return null;
  }
}

/**
 * requestAiCaptions(client, { idea, picture?, template? })
 *   → { ok: true, options: [{ top, bottom }], quota }
 *   | { ok: false, error, message, quota? }
 */
export async function requestAiCaptions(client, { idea, picture = '', template = '' }) {
  const text = String(idea ?? '').trim();
  if (text.length < 2) return { ok: false, error: 'idea_required', message: AI_CAPTION_MESSAGES.idea_required };
  if (text.length > AI_CAPTION.ideaMax) return { ok: false, error: 'too_long', message: AI_CAPTION_MESSAGES.too_long };
  const local = precheckTexts([text, picture]);
  if (local) return { ok: false, error: 'rejected', message: textRejectionMessage(local) };

  if (!(await ensureWriteSession(client))) {
    return { ok: false, error: 'sign_in_required', message: AI_CAPTION_MESSAGES.sign_in_required };
  }
  const turnstileToken = await getTurnstileToken('ai_caption');
  try {
    const { data, error } = await client.functions.invoke(AI_CAPTION_FUNCTION, {
      body: { idea: text, picture, template, ...(turnstileToken ? { turnstileToken } : {}) }
    });
    if (!error && data?.ok && Array.isArray(data.options)) {
      return { ok: true, options: data.options, quota: data.quota || null };
    }
    const payload = await functionErrorPayload(error);
    if (payload.error === 'rejected') {
      return { ok: false, error: 'rejected', message: textRejectionMessage(payload.detail) };
    }
    return {
      ok: false,
      error: payload.error || 'network',
      message: payload.message || aiCaptionMessage(payload.error, payload.quota),
      quota: payload.quota || null
    };
  } catch {
    return { ok: false, error: 'network', message: AI_CAPTION_MESSAGES.network };
  }
}
