// ==========================================
// Phase 33 task 33.15 — pure helpers for `submit-caption-entry` Edge Function.
// Shared between Deno Edge runtime and unit tests.
// ==========================================
import { cleanText } from './publishCore.js';

export const CAPTION_LIMITS = {
  TOP_MAX: 140,
  BOTTOM_MAX: 140,
  TEMPLATE_ID_MAX: 64
};

const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/;
const TEMPLATE_ID_RE = /^[a-z0-9-]{2,64}$/;

export function todayUtcDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function validateCaptionEntryRequest(body, now = new Date()) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'bad_request' };
  }
  const today = todayUtcDateString(now);
  const rawDate = String(body.battleDate || today).trim();
  if (!DATE_STR_RE.test(rawDate) || rawDate !== today) {
    return { ok: false, error: 'battle_day_mismatch' };
  }

  const templateId = cleanText(body.templateId, CAPTION_LIMITS.TEMPLATE_ID_MAX).toLowerCase();
  if (!TEMPLATE_ID_RE.test(templateId)) {
    return { ok: false, error: 'bad_request' };
  }

  const topText = cleanText(body.topText, CAPTION_LIMITS.TOP_MAX);
  const bottomText = cleanText(body.bottomText, CAPTION_LIMITS.BOTTOM_MAX);
  if (!topText && !bottomText) {
    return { ok: false, error: 'empty_caption' };
  }

  return {
    ok: true,
    value: {
      battleDate: rawDate,
      templateId,
      topText,
      bottomText,
      texts: [topText, bottomText].filter(Boolean)
    }
  };
}

export function decideCaptionEntryStatus(textVerdict) {
  if (!textVerdict || typeof textVerdict !== 'object') return 'pending';
  if (textVerdict.decision === 'reject') return 'rejected';
  if (textVerdict.decision === 'approve') return 'approved';
  return 'pending';
}
