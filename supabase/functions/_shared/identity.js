// ==========================================
// Server & shared display name + identity helpers (tasks 33.2 / 33.4 / 33.6).
// Pure JS (no runtime APIs) so it runs in Edge Functions, browser UI and unit tests.
// Anonymous visitors get a deterministic handle from their Supabase Auth UUID (e.g. NeonOtter_482).
// Signed-in accounts get their claimed profile username, validated metadata, or deterministic fallback.
// ==========================================
import { cleanText } from './publishCore.js';
import { checkText, isReservedName } from './textFilter.js';

export const FALLBACK_AUTHOR = 'AnonMemer';

export const ANON_ADJECTIVES = [
  'Neon', 'Cyber', 'Laser', 'Pixel', 'Turbo', 'Retro', 'Synth', 'Hyper',
  'Cosmic', 'Atomic', 'Glitch', 'Arcade', 'Vapor', 'Chrome', 'Astro', 'Sonic'
];

export const ANON_ANIMALS = [
  'Otter', 'Panda', 'Falcon', 'Badger', 'Ferret', 'Gecko', 'Cobra', 'Penguin',
  'Fox', 'Wolf', 'Lynx', 'Koala', 'Raccoon', 'Shark', 'Tiger', 'Hawk'
];

const ANON_HANDLE_RE = new RegExp(
  `^(?:${ANON_ADJECTIVES.join('|')})(?:${ANON_ANIMALS.join('|')})_\\d{3}$`,
  'i'
);

export const USERNAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{1,18}[A-Za-z0-9_]$/;

function fnv1a32(str, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic friendly handle from an auth UUID (or AnonMemer if missing). */
export function anonymousHandleFor(userId) {
  if (!userId || typeof userId !== 'string') return FALLBACK_AUTHOR;
  const norm = userId.trim().toLowerCase();
  if (!norm) return FALLBACK_AUTHOR;
  const h1 = fnv1a32(norm, 0x811c9dc5);
  const h2 = fnv1a32(`${norm}:num`, 0x9e3779b1);
  const adj = ANON_ADJECTIVES[h1 % ANON_ADJECTIVES.length];
  const animal = ANON_ANIMALS[(h1 >>> 8) % ANON_ANIMALS.length];
  const num = 100 + (h2 % 900);
  return `${adj}${animal}_${num}`;
}

/** True when a candidate name matches an auto-generated anonymous handle or AnonMemer. */
export function isGeneratedAnonHandle(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return false;
  return trimmed.toLowerCase() === 'anonmemer' || ANON_HANDLE_RE.test(trimmed);
}

/** Validate a user-claimed handle (3–20 chars, non-reserved, passes 33.4 text filter). */
export function validateUsername(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'invalid_chars' };
  const trimmed = raw.trim();
  if (trimmed.length < 3) return { ok: false, error: 'too_short' };
  if (trimmed.length > 20) return { ok: false, error: 'too_long' };
  if (!USERNAME_RE.test(trimmed)) return { ok: false, error: 'invalid_chars' };
  if (isReservedName(trimmed) || isGeneratedAnonHandle(trimmed)) {
    return { ok: false, error: 'reserved_name' };
  }
  const check = checkText(trimmed);
  if (check.decision !== 'approve') {
    return { ok: false, error: 'rejected', detail: check.category || 'rules' };
  }
  return { ok: true, username: trimmed };
}

/** Server-side display name derived strictly from auth user + DB profile row. */
export function authorNameFor(user, profile = null) {
  if (!user || typeof user !== 'object') return FALLBACK_AUTHOR;
  if (user.is_anonymous) return anonymousHandleFor(user.id);

  if (profile && typeof profile.username === 'string' && profile.username.trim()) {
    const v = validateUsername(profile.username);
    if (v.ok) return v.username;
  }

  const meta = user.user_metadata || {};
  const emailPrefix = typeof user.email === 'string' && user.email.includes('@')
    ? user.email.split('@')[0]
    : '';
  const candidate = meta.username || meta.full_name || meta.name || emailPrefix || '';
  const raw = cleanText(String(candidate).replace(/\s+/g, '_'), 20).replace(/[^A-Za-z0-9_.-]/g, '');
  if (
    raw.length >= 3 &&
    USERNAME_RE.test(raw) &&
    !isReservedName(raw) &&
    !isGeneratedAnonHandle(raw) &&
    checkText(raw).decision === 'approve'
  ) {
    return raw;
  }
  return anonymousHandleFor(user.id);
}

export function isProfileSuspended(profile, nowMs = Date.now()) {
  if (!profile || !profile.suspended_until) return false;
  const untilMs = Date.parse(profile.suspended_until);
  return Number.isFinite(untilMs) && untilMs > nowMs;
}
