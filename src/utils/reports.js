// ==========================================
// Phase 33 task 33.5 — send a report to the server (public.report_item RPC).
// The database enforces one report per account per item, rate limits, and the auto-hide
// rule (3 distinct accounts, or 1 report for "Involves a child").
// ==========================================
import { ensureWriteSession } from './serverWrites';
import { isUuid, reportErrorMessage, REPORT_NOTE_MAX } from '../../supabase/functions/_shared/moderationQueue.js';

/** Only rows that live in the database can be reported (not seed or local-only memes). */
export function isReportableId(id) {
  return isUuid(String(id || ''));
}

/**
 * submitReport(client, { memeId | commentId, reason, note })
 *   → { ok: true, hidden, alreadyReported } | { ok: false, message }
 */
export async function submitReport(client, { memeId = null, commentId = null, reason, note = '' }) {
  if (!client) return { ok: false, message: reportErrorMessage('network') };
  if (!(await ensureWriteSession(client))) return { ok: false, message: reportErrorMessage('sign_in_required') };
  try {
    const { data, error } = await client.rpc('report_item', {
      p_meme_id: memeId,
      p_comment_id: commentId,
      p_reason: reason,
      p_note: String(note || '').slice(0, REPORT_NOTE_MAX) || null
    });
    if (error || !data) return { ok: false, message: reportErrorMessage('network') };
    if (!data.ok) {
      if (data.error === 'rate_limited' && data.message) {
        return { ok: false, message: data.message };
      }
      return { ok: false, message: reportErrorMessage(data.error) };
    }
    return { ok: true, hidden: Boolean(data.hidden), alreadyReported: Boolean(data.already_reported) };
  } catch {
    return { ok: false, message: reportErrorMessage('network') };
  }
}
