// ==========================================
// Server-side display name for memes and comments (tasks 33.2 / 33.4).
// Never taken from the request body. Until task 33.6 adds real profiles, it comes from the
// signed-in account's metadata; anonymous users are "AnonMemer". Reserved names and names
// that fail the text filter also fall back to "AnonMemer".
// ==========================================
import { cleanText } from './publishCore.js';
import { checkText, isReservedName } from './textFilter.js';

export const FALLBACK_AUTHOR = 'AnonMemer';

export function authorNameFor(user) {
  if (!user || user.is_anonymous) return FALLBACK_AUTHOR;
  const meta = user.user_metadata || {};
  const candidate = meta.username || meta.full_name || meta.name || '';
  const raw = cleanText(String(candidate).replace(/\s+/g, '_'), 20);
  if (raw.length < 3 || isReservedName(raw) || checkText(raw).decision !== 'approve') return FALLBACK_AUTHOR;
  return raw;
}
