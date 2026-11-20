// ==========================================
// Phase 33 task 33.5 + Phase 2.6 — send a report to the server (public.report_content RPC).
// Supports memes, comments, Daily Caption Battle entries, and creator profiles.
// The database enforces one report per account per target, rate limits, and configurable auto-hide.
// ==========================================
import { ensureWriteSession } from './serverWrites';
import { isUuid, reportErrorMessage, REPORT_NOTE_MAX } from '../../supabase/functions/_shared/moderationQueue.js';

const HANDLE_RE = /^@?[A-Za-z0-9_.-]{2,32}$/;

/** Only rows that live in the database can be reported (not seed or local-only memes). */
export function isReportableId(id) {
  return isUuid(String(id || ''));
}

export function isReportableHandle(handle) {
  return HANDLE_RE.test(String(handle || '').trim());
}

/**
 * submitReport(client, { memeId | commentId | battleEntryId | reportedHandle, reason, note })
 *   → { ok: true, hidden, alreadyReported } | { ok: false, message }
 */
export async function submitReport(
  client,
  { memeId = null, commentId = null, battleEntryId = null, reportedHandle = null, reason, note = '' }
) {
  if (!client) return { ok: false, message: reportErrorMessage('network') };
  if (!(await ensureWriteSession(client))) return { ok: false, message: reportErrorMessage('sign_in_required') };

  const cleanHandle = reportedHandle ? String(reportedHandle).trim().replace(/^@+/, '') : null;
  const targetKind = commentId
    ? 'comment'
    : battleEntryId
      ? 'battle_entry'
      : cleanHandle
        ? 'profile'
        : 'meme';

  try {
    const { data, error } = await client.rpc('report_content', {
      p_target_kind: targetKind,
      p_meme_id: memeId || null,
      p_comment_id: commentId || null,
      p_battle_entry_id: battleEntryId || null,
      p_reported_handle: cleanHandle || null,
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
