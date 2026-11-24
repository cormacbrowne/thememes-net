// Share text and canonical URLs that phones turn into links.
// iMessage, WhatsApp, SMS and others auto-link anything that looks like a domain.
// "THE MEMES.net" is read as "MEMES.net" (wrong site), and bare "thememes.net"
// can fail to auto-link or lose the canonical www host. Always run share/invite
// copy through these helpers before handing it to navigator.share or the clipboard.

export const SITE_URL = 'https://www.thememes.net';

const BRAND_WITH_SPACE = /\bTHE\s+MEMES\.net\b/gi;
const NON_WWW_ORIGIN = /https?:\/\/thememes\.net\b/gi;
const BARE_DOMAIN = /(?<![/@\w.-])(?:www\.)?thememes\.net\b/gi;

/**
 * Builds a canonical https://www.thememes.net URL from a path or existing site URL.
 */
export function canonicalShareUrl(pathOrUrl = '/') {
  const raw = String(pathOrUrl || '/').trim();
  if (!raw) return SITE_URL;
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/^https?:\/\/(?:www\.)?thememes\.net\b/i, SITE_URL);
  }
  const cleanPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Rewrites spaced brand names, non-www origins, and bare domain mentions
 * to the canonical https://www.thememes.net URL. Idempotent on canonical URLs.
 */
export function linkSafeShareText(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(BRAND_WITH_SPACE, SITE_URL)
    .replace(NON_WWW_ORIGIN, SITE_URL)
    .replace(BARE_DOMAIN, SITE_URL);
}

/**
 * Sanitizes share text and ensures the full canonical https://www.thememes.net/... URL
 * is present in the message body so SMS / iMessage / WhatsApp always auto-link it.
 */
export function ensureShareUrlInText(text, url = SITE_URL) {
  const targetUrl = canonicalShareUrl(url);
  const safe = linkSafeShareText(typeof text === 'string' ? text.trim() : '');
  if (!safe) return targetUrl;
  if (safe.includes(targetUrl)) return safe;
  if (targetUrl === SITE_URL && safe.includes(SITE_URL)) return safe;
  return `${safe} ${targetUrl}`;
}
