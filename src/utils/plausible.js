// ==========================================
// PLAUSIBLE (plan 1.4) — cookieless, privacy-friendly page and event analytics.
// OFF unless VITE_PLAUSIBLE_DOMAIN is set (e.g. "thememes.net") in Vercel's environment
// variables. Optional VITE_PLAUSIBLE_SRC overrides the script URL (for a self-hosted or
// proxied Plausible). Respects Do Not Track / Global Privacy Control and the in-app
// "analytics off" setting (same rules as Pulse). Called only through track() in analytics.js.
// ==========================================
import { isPulseAllowed } from './pulse';

const DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN || '').trim();
const SRC = (import.meta.env.VITE_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js').trim();

let loaded = false;

export function isPlausibleEnabled() {
  return Boolean(DOMAIN) && isPulseAllowed();
}

/** Injects the Plausible script once (it tracks page views, including SPA navigation). */
export function initPlausible() {
  if (loaded || typeof document === 'undefined' || !isPlausibleEnabled()) return;
  loaded = true;
  window.plausible =
    window.plausible ||
    function plausibleQueue() {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  const s = document.createElement('script');
  s.defer = true;
  s.src = SRC;
  s.setAttribute('data-domain', DOMAIN);
  document.head.appendChild(s);
}

export function plausibleEvent(name, props) {
  if (!loaded || typeof window === 'undefined' || typeof window.plausible !== 'function') return;
  try {
    window.plausible(name, props && Object.keys(props).length ? { props } : undefined);
  } catch {
    // ignore: analytics must never break the site
  }
}
