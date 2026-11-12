// ==========================================
// PHASE 28.13: REAL CREATOR NOTIFICATIONS & GENUINE VIEW COUNTS
// Uses the existing `public.notifications` Supabase table & Realtime.
// Never fakes notifications or views.
// ==========================================
import { sanitizeUserText } from './securityGuard';

const VIEWS_STORAGE_KEY = 'tm_meme_views_v1';

const isUuid = (id) =>
  Boolean(id) &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id)
  );

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
 * Inserts a real notification row in `public.notifications` when a real user
 * upvotes, reacts, comments, or remixes another creator's Supabase meme.
 */
export async function sendCreatorNotification({
  client,
  recipientUsername,
  actorName,
  type,
  memeId,
  message
}) {
  if (!client || !recipientUsername || !actorName || !isUuid(memeId)) return;
  const recipient = sanitizeUserText(recipientUsername, 48);
  const actor = sanitizeUserText(actorName, 48);
  if (!recipient || !actor) return;
  if (recipient.toLowerCase() === actor.toLowerCase()) return;
  if (recipient.toLowerCase() === 'thememeshq') return;

  const cleanMsg = sanitizeUserText(message, 220);
  if (!cleanMsg) return;

  try {
    await client.from('notifications').insert([
      {
        recipient_username: recipient,
        actor_name: actor,
        type,
        meme_id: memeId,
        message: cleanMsg,
        read: false
      }
    ]);
  } catch {
    // Non-blocking: ignore if table/network unavailable
  }
}

export async function fetchCreatorNotifications(client, username) {
  if (!client || !username) return [];
  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .ilike('recipient_username', sanitizeUserText(username, 48))
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

export async function markCreatorNotificationsRead(client, ids = []) {
  if (!client || !Array.isArray(ids) || ids.length === 0) return;
  const validIds = ids.filter((id) => isUuid(id));
  if (validIds.length === 0) return;
  try {
    await client.from('notifications').update({ read: true }).in('id', validIds);
  } catch {
    // ignore
  }
}
