// ==========================================
// Lazy Cloudflare Turnstile client helper (Phase 33 task 33.7).
// Returns `null` immediately when VITE_TURNSTILE_SITE_KEY is unset (local dev / unconfigured),
// so ordinary interactions never fail when Turnstile is disabled.
// ==========================================

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptLoadPromise = null;
let widgetHostEl = null;

function getSiteKey() {
  try {
    return String(import.meta.env?.VITE_TURNSTILE_SITE_KEY || '').trim();
  } catch {
    return '';
  }
}

function loadTurnstileApi() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.turnstile && typeof window.turnstile.render === 'function') {
    return Promise.resolve(window.turnstile);
  }
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-tm-turnstile="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile || null), { once: true });
      existing.addEventListener('error', () => resolve(null), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.tmTurnstile = '1';
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => {
      scriptLoadPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

function ensureHostElement() {
  if (!widgetHostEl && typeof document !== 'undefined') {
    widgetHostEl = document.createElement('div');
    widgetHostEl.setAttribute('aria-hidden', 'true');
    widgetHostEl.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;';
    document.body.appendChild(widgetHostEl);
  }
  return widgetHostEl;
}

/**
 * Execute an invisible Turnstile challenge for `action` when configured.
 * Returns a token string, or `null` when Turnstile is unconfigured / unavailable.
 */
export async function getTurnstileToken(action = 'write') {
  const siteKey = getSiteKey();
  if (!siteKey || typeof window === 'undefined') return null;

  const api = await loadTurnstileApi();
  if (!api || typeof api.render !== 'function') return null;

  const container = ensureHostElement();
  if (!container) return null;

  return new Promise((resolve) => {
    let settled = false;
    let widgetId = null;

    const finish = (token) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (widgetId !== null && typeof api.remove === 'function') {
        try {
          api.remove(widgetId);
        } catch {
          // ignore cleanup failure
        }
      }
      resolve(token || null);
    };

    const timer = setTimeout(() => finish(null), 5000);

    try {
      widgetId = api.render(container, {
        sitekey: siteKey,
        action,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (tok) => finish(tok),
        'error-callback': () => finish(null),
        'expired-callback': () => finish(null)
      });
      if (typeof api.execute === 'function' && widgetId !== null) {
        api.execute(widgetId);
      }
    } catch {
      finish(null);
    }
  });
}

const VOTE_CHECK_TTL_MS = 5 * 60 * 1000;
const recentBotChecks = new Map();

/**
 * Cached invisible Turnstile check for rapid interactive actions (voting).
 * Returns immediately with `null` when VITE_TURNSTILE_SITE_KEY is unset.
 */
export async function ensureActionBotCheck(action = 'vote') {
  const siteKey = getSiteKey();
  if (!siteKey || typeof window === 'undefined') return null;
  const cached = recentBotChecks.get(action);
  if (cached && Date.now() - cached.at < VOTE_CHECK_TTL_MS) {
    return cached.token;
  }
  const token = await getTurnstileToken(action);
  if (token) recentBotChecks.set(action, { token, at: Date.now() });
  return token;
}
