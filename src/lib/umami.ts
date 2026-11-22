// ==========================================
// UMAMI CLOUD — cookieless page-view and event analytics (free Hobby plan).
// OFF unless VITE_UMAMI_WEBSITE_ID is set in Vercel's environment variables.
// Never loads on localhost / LAN dev hosts, and respects the same opt-outs as Pulse:
// Do Not Track, Global Privacy Control and the in-app "Usage stats" toggle.
//
// The tracker records SPA route changes itself (it wraps history.pushState/replaceState
// and sends a page view whenever the URL actually changes), so no router hook is needed.
// It loads from cloud.umami.is and sends to gateway.umami.is/api/send — both are in the CSP
// (index.html + vercel.json). Only called through src/lib/analytics.ts.
// ==========================================
import { isPulseAllowed } from '../utils/pulse';

export const UMAMI_SCRIPT_SRC = 'https://cloud.umami.is/script.js';

const WEBSITE_ID = String(import.meta.env.VITE_UMAMI_WEBSITE_ID || '').trim();

type UmamiData = Record<string, string | number | boolean>;
type UmamiGlobal = { track: (name: string, data?: UmamiData) => void };

declare global {
  interface Window {
    umami?: UmamiGlobal;
  }
}

// 'pending' until initUmami() runs (events are queued), then 'on' or 'off'.
let state: 'pending' | 'on' | 'off' = 'pending';
const pending: Array<[string, UmamiData | undefined]> = [];

export function isLocalHost(hostname: string): boolean {
  const h = String(hostname || '').toLowerCase();
  return (
    h === '' ||
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h === '0.0.0.0' ||
    h === '[::1]' ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

export function isUmamiEnabled(): boolean {
  if (!WEBSITE_ID || typeof window === 'undefined') return false;
  if (isLocalHost(window.location.hostname)) return false;
  return isPulseAllowed();
}

const UMAMI_BEFORE_SEND = '__tmUmamiBeforeSend';
const PRIVATE_PATH = /^((?:https?:\/\/[^/]+)?)\/(m|u|battle)\/[^?#]*/i;

/** Hides meme, handle and battle IDs in a path or URL: /u/name becomes /u/:id. */
export function redactUmamiPath(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(PRIVATE_PATH, (_match, origin: string, section: string) => {
    return `${origin}/${section.toLowerCase()}/:id`;
  });
}

const OWN_HOST = /(^|\.)thememes\.net$/i;
const stripQueryAndHash = (value: string) => value.replace(/[?#].*$/, '');

/** Our own pages keep a redacted path. Other sites are reduced to their origin. */
export function redactUmamiReferrer(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return value;
  if (value.startsWith('/')) return redactUmamiPath(stripQueryAndHash(value));
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    const isOwnSite =
      OWN_HOST.test(parsed.hostname) ||
      (typeof window !== 'undefined' && parsed.hostname === window.location.hostname);
    return isOwnSite ? redactUmamiPath(`${parsed.origin}${parsed.pathname}`) : parsed.origin;
  } catch {
    return '';
  }
}

/** Runs on every Umami payload, so it never carries an ID, handle, query or page title. */
export function redactUmamiPayload<T extends Record<string, unknown>>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const url =
    typeof payload.url === 'string' ? redactUmamiPath(stripQueryAndHash(payload.url)) : payload.url;
  const next: Record<string, unknown> = { ...payload, url };
  if ('referrer' in payload) next.referrer = redactUmamiReferrer(payload.referrer);
  // Meme views keep the URL at / while the document title names the meme and its author.
  if ('title' in payload) next.title = 'THE MEMES.net';
  return next as T;
}

/** Returning null makes the tracker drop the send, so the opt-out applies mid-session. */
export function umamiBeforeSend(
  _type: string,
  payload: Record<string, unknown>
): Record<string, unknown> | null {
  return isPulseAllowed() ? redactUmamiPayload(payload) : null;
}

function flushPending() {
  if (!isPulseAllowed()) {
    pending.length = 0;
    return;
  }
  const u = window.umami;
  if (!u || typeof u.track !== 'function') return;
  while (pending.length) {
    const [name, data] = pending.shift()!;
    try {
      u.track(name, data);
    } catch {
      // analytics must never break the site
    }
  }
}

/** Injects the Umami tracker once. Safe to call repeatedly. */
export function initUmami(): void {
  if (state !== 'pending' || typeof document === 'undefined') return;
  if (!isUmamiEnabled()) {
    state = 'off';
    pending.length = 0;
    return;
  }
  state = 'on';
  if (document.querySelector(`script[src="${UMAMI_SCRIPT_SRC}"]`)) {
    flushPending();
    return;
  }
  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SCRIPT_SRC;
  s.setAttribute('data-website-id', WEBSITE_ID);
  s.setAttribute('data-do-not-track', 'true');
  // Query strings change via replaceState (filters, ?m=, ?ref=) — don't count each as a page view.
  s.setAttribute('data-exclude-search', 'true');
  s.setAttribute('data-exclude-hash', 'true');
  (window as unknown as Record<string, unknown>)[UMAMI_BEFORE_SEND] = umamiBeforeSend;
  s.setAttribute('data-before-send', UMAMI_BEFORE_SEND);
  s.addEventListener('load', flushPending);
  document.head.appendChild(s);
}

/**
 * Sends a custom event. Events fired before initUmami() or before the script finishes
 * loading (e.g. game_started on a direct /games/… visit) are queued (max 50).
 */
export function umamiEvent(name: string, data?: UmamiData): void {
  if (state === 'off' || !WEBSITE_ID || typeof window === 'undefined') return;
  if (!isPulseAllowed()) {
    pending.length = 0;
    return;
  }
  const u = window.umami;
  if (u && typeof u.track === 'function') {
    try {
      u.track(name, data && Object.keys(data).length ? data : undefined);
    } catch {
      // ignore
    }
    return;
  }
  if (pending.length < 50) pending.push([name, data && Object.keys(data).length ? data : undefined]);
}
