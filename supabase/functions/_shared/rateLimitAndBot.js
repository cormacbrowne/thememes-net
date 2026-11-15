// ==========================================
// Shared rate-limit definitions, arcade cooldown copy, IP hashing, and
// Cloudflare Turnstile verification (Phase 33 task 33.7).
// Pure JS (Web Crypto / Fetch only) so Edge Functions, browser code, and Node unit tests share one source of truth.
// ==========================================

export const RATE_LIMIT_TIERS = {
  standard: {
    upload: [
      { windowSeconds: 3600, max: 5, label: '1h' },
      { windowSeconds: 86400, max: 20, label: '24h' }
    ],
    comment: [
      { windowSeconds: 10, max: 1, label: '10s' },
      { windowSeconds: 86400, max: 60, label: '24h' }
    ],
    vote: [{ windowSeconds: 3600, max: 120, label: '1h' }],
    report: [
      { windowSeconds: 3, max: 1, label: '3s' },
      { windowSeconds: 86400, max: 20, label: '24h' }
    ]
  },
  linked: {
    upload: [
      { windowSeconds: 3600, max: 15, label: '1h' },
      { windowSeconds: 86400, max: 60, label: '24h' }
    ],
    comment: [
      { windowSeconds: 5, max: 1, label: '5s' },
      { windowSeconds: 86400, max: 120, label: '24h' }
    ],
    vote: [{ windowSeconds: 3600, max: 300, label: '1h' }],
    report: [
      { windowSeconds: 3, max: 1, label: '3s' },
      { windowSeconds: 86400, max: 40, label: '24h' }
    ]
  }
};

export const BOT_ERROR_MESSAGES = {
  bot_check_required: '🤖 Quick robot check needed — please refresh and try again.',
  bot_check_failed: '🤖 Robot shield tripped! Please refresh and try again.',
  bot_check_unavailable: '⏳ Robot check is busy right now. Try again in a moment.'
};

/**
 * Format retry-after seconds in arcade voice ("⏳ Cool your jets, speed racer. Try again in 4 min.").
 */
export function formatRateLimitMessage(retryAfterSeconds) {
  const s = Math.max(1, Math.ceil(Number(retryAfterSeconds) || 1));
  if (s < 60) {
    return `⏳ Cool your jets, speed racer. Try again in ${s} sec.`;
  }
  if (s < 3600) {
    const mins = Math.ceil(s / 60);
    return `⏳ Cool your jets, speed racer. Try again in ${mins} min.`;
  }
  const hrs = Math.ceil(s / 3600);
  return `⏳ Cool your jets, speed racer. Try again in ${hrs} hr.`;
}

function getHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return String(headers.get(name) ?? '');
  }
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return String(v ?? '');
  }
  return '';
}

/** Extract the originating client IP from standard proxy / Cloudflare headers. */
export function extractClientIp(headers) {
  const cfIp = getHeader(headers, 'cf-connecting-ip').trim();
  if (cfIp) return cfIp;

  const xff = getHeader(headers, 'x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = getHeader(headers, 'x-real-ip').trim();
  if (realIp) return realIp;

  return null;
}

/** Hash the client IP with SHA-256 (`<salt>:<ip>`) -> 64-char hex, or null when unavailable. */
export async function ipHashFor(reqOrHeaders, salt = 'tm_rl_v1') {
  const headers = reqOrHeaders && 'headers' in reqOrHeaders ? reqOrHeaders.headers : reqOrHeaders;
  const ip = extractClientIp(headers);
  if (!ip) return null;
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Cloudflare Turnstile token when `TURNSTILE_SECRET_KEY` is configured.
 * Passes cleanly with `{ ok: true, mode: 'unconfigured' }` if no secret is set.
 */
export async function verifyTurnstile({ token, remoteIp = null, env = null, fetchImpl = fetch } = {}) {
  const secret = env?.get ? env.get('TURNSTILE_SECRET_KEY') : env?.TURNSTILE_SECRET_KEY;
  if (!secret || !String(secret).trim()) {
    return { ok: true, mode: 'unconfigured' };
  }
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { ok: false, error: 'bot_check_required' };
  }

  const form = new URLSearchParams();
  form.set('secret', String(secret).trim());
  form.set('response', token.trim());
  if (remoteIp && String(remoteIp).trim()) {
    form.set('remoteip', String(remoteIp).trim());
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;

  try {
    const res = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: controller?.signal
    });
    if (!res?.ok) {
      return { ok: false, error: 'bot_check_unavailable' };
    }
    const data = await res.json();
    if (data?.success === true) {
      return { ok: true, mode: 'verified' };
    }
    return {
      ok: false,
      error: 'bot_check_failed',
      codes: Array.isArray(data?.['error-codes']) ? data['error-codes'] : []
    };
  } catch {
    return { ok: false, error: 'bot_check_unavailable' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
