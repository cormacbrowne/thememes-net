// ==========================================
// PHASE 28.13 + 33.8: CREATOR NOTIFICATIONS & LOCAL VIEW COUNTS
// Notifications are created strictly on the server (triggers / RPCs) and read
// per-user via `recipient_id = auth.uid()` RLS.
// ==========================================
import { sanitizeUserText } from './securityGuard.js';

const VIEWS_STORAGE_KEY = 'tm_meme_views_v1';

const isUuid = (id) =>
  Boolean(id) &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));

export function loadLocalMemeViews() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function recordLocalMemeView(memeId) {
  if (typeof window === 'undefined' || !memeId) return;
  try {
    const key = String(memeId);
    const map = loadLocalMemeViews();
    map[key] = (Number(map[key]) || 0) + 1;
    // Keep map bounded to latest 300 entries
    const entries = Object.entries(map);
    if (entries.length > 300) {
      const trimmed = Object.fromEntries(entries.slice(-300));
      localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Fetch the signed-in creator's recent notifications (filtered strictly by auth user UUID).
 */
export async function fetchCreatorNotifications(client, recipientId) {
  if (!client || !isUuid(recipientId)) return [];
  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(25);
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => ({
      ...row,
      actor_name: sanitizeUserText(row.actor_name || 'Someone', 48),
      message: sanitizeUserText(row.message || '', 220)
    }));
  } catch {
    return [];
  }
}

/**
 * Mark unread notifications read for the current caller via the server-side RPC.
 * Passing an empty array marks all unread notifications for the caller read.
 */
export async function markCreatorNotificationsRead(client, ids = []) {
  if (!client) return;
  const validIds = Array.isArray(ids) ? ids.filter((id) => isUuid(id)) : [];
  try {
    await client.rpc('mark_notifications_read', {
      p_ids: validIds.length > 0 ? validIds : null
    });
  } catch {
    // ignore
  }
}
