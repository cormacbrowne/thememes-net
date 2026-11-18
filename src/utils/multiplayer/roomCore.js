/**
 * Multiplayer rooms — pure helpers (no React, no network) so they can be unit tested.
 *
 * How multiplayer works on THE MEMES.net (Nov 2026):
 * - A room is a Supabase Realtime channel `tm-mp:<game>:<CODE>` (broadcast + presence, no DB tables).
 * - The invite link is the normal game URL plus `?room=CODE`, e.g. /games/poker?room=K7QZP.
 * - The host is the player who has been in the room longest (earliest `joinedAt`). The host's
 *   browser runs the game engine and broadcasts the full table state; everyone else sends actions.
 *   If the host leaves, the next player in line becomes host and carries on from the last state.
 * - Multiplayer tables use free table chips only. MemeDollarz are never staked or paid out here,
 *   because a host-run game cannot be trusted with real wallet payouts.
 */

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
const ROOM_CODE_RE = /^[A-Z2-9]{4,8}$/;

export const MP_AVATARS = ['😎', '🤖', '👾', '🐸', '🦄', '🐍', '🔥', '💀', '🍕', '🦖', '🐱', '👽', '🤡', '🐧', '🦊', '🍩'];
export const MP_COLORS = ['#19f0ff', '#ff2e88', '#ffb800', '#3dff9a'];

export function generateRoomCode(rng = Math.random) {
  let out = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    out += ROOM_CODE_ALPHABET[Math.floor(rng() * ROOM_CODE_ALPHABET.length) % ROOM_CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeRoomCode(raw) {
  const code = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return ROOM_CODE_RE.test(code) ? code : null;
}

/** Player nicknames: printable, 2–16 chars, no angle brackets. Falls back to `fallback`. */
export function sanitizePlayerName(raw, fallback = 'Player') {
  const cleaned = String(raw || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return cleaned.length >= 2 ? cleaned : fallback;
}

export function sanitizeAvatar(raw) {
  return MP_AVATARS.includes(raw) ? raw : MP_AVATARS[0];
}

/**
 * Turn a Supabase presence state ({ key: [meta, ...] }) into a stable, ordered player list.
 * Order = joinedAt then id, so every browser agrees on who is host and who sits where.
 */
export function playersFromPresence(presenceState) {
  const out = [];
  const seen = new Set();
  Object.entries(presenceState || {}).forEach(([key, metas]) => {
    const meta = Array.isArray(metas) ? metas[0] : null;
    if (!meta) return;
    const id = String(meta.id || key);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      name: sanitizePlayerName(meta.name),
      avatar: sanitizeAvatar(meta.avatar),
      joinedAt: Number(meta.joinedAt) || 0
    });
  });
  out.sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

export function electHost(players) {
  return players && players.length ? players[0].id : null;
}

/** Accept a state message if it comes from the current host, or is newer than what we hold. */
export function shouldAcceptState({ from, v }, { hostId, lastV }) {
  if (typeof v !== 'number') return false;
  if (from && hostId && from === hostId) return true;
  return v > (lastV ?? -1);
}

export function buildInviteUrl(origin, path, code) {
  const base = `${String(origin || '').replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  return `${base}?room=${encodeURIComponent(code)}`;
}

/** Read `?room=` from a URL search string. */
export function readRoomFromSearch(search) {
  try {
    const params = new URLSearchParams(search || '');
    return normalizeRoomCode(params.get('room'));
  } catch {
    return null;
  }
}

/** Seats are the first `max` players; anyone after that watches. */
export function splitSeats(players, max) {
  return { seated: players.slice(0, max), watching: players.slice(max) };
}
