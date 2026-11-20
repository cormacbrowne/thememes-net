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

// ------------------------------------------------------------------
// Plan 2.1 — Daily Caption Battle v2 (battles table, one entry per user, editable).
// ------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Default total caption length (top + bottom); the live value comes from battle_settings. */
export const BATTLE_CAPTION_MAX = 120;

/**
 * Validates a v2 entry. `liveBattleId` is the battle the server says is live right now;
 * the client must be entering that one (stops entries into closed/old battles).
 */
export function validateBattleEntryRequest(body, liveBattleId, captionMax = BATTLE_CAPTION_MAX) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'bad_request' };
  const battleId = String(body.battleId || '').trim();
  if (!UUID_RE.test(battleId)) return { ok: false, error: 'bad_request' };
  if (!liveBattleId || battleId !== String(liveBattleId)) return { ok: false, error: 'battle_closed' };

  const topText = cleanText(body.topText, CAPTION_LIMITS.TOP_MAX);
  const bottomText = cleanText(body.bottomText, CAPTION_LIMITS.BOTTOM_MAX);
  if (!topText && !bottomText) return { ok: false, error: 'empty_caption' };
  const max = Number.isFinite(Number(captionMax)) ? Number(captionMax) : BATTLE_CAPTION_MAX;
  if (topText.length + bottomText.length > max) return { ok: false, error: 'caption_too_long', max };

  return {
    ok: true,
    value: { battleId, topText, bottomText, texts: [topText, bottomText].filter(Boolean) }
  };
}

/**
 * What to do with an existing entry by the same user in the same battle:
 * insert (none yet), update (edit allowed until close; votes reset), or refuse (removed by a mod).
 */
export function decideEntryWrite(existing) {
  if (!existing) return 'insert';
  if (existing.status === 'removed') return 'refuse';
  return 'update';
}
