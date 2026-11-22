// Phase 35 task 35.1b: Pulse — private, first-party anonymous stats.
// No cookies, no client tracking IDs, no fingerprinting, no PII.

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://otvvphmjojqyjaznjzyo.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

const FLUSH_INTERVAL_MS = 15000;
const MAX_BATCH = 20;
export const RETURNING_VISITOR_KEY = 'tm_pulse_seen';
const SESSION_MARKER_KEY = 'tm_return_tracked';

let sessionId = null;
let landingSrc = null;
let landingRefHost = null;
let returningUser = null;
let listenersAttached = false;
let flushTimer = null;
const queue = [];

function isDebugMode() {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('pulse') === 'debug';
  } catch {
    return false;
  }
}

export function isPulseAllowed() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (navigator.globalPrivacyControl === true || navigator.globalPrivacyControl === '1') return false;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  if (navigator.webdriver === true) return false;
  if (import.meta.env.DEV && !isDebugMode()) return false;
  try {
    const raw = localStorage.getItem('tm_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.pulseOn === false) return false;
    }
  } catch {
    // ignore storage errors
  }
  return true;
}

function getSessionId() {
  if (!sessionId) {
    sessionId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return sessionId;
}

export function resolveReturningVisitor() {
  if (returningUser !== null) return returningUser;
  if (!isPulseAllowed()) return false;
  if (typeof localStorage === 'undefined') {
    returningUser = false;
    return false;
  }
  try {
    const raw = localStorage.getItem(RETURNING_VISITOR_KEY);
    const seen = raw === '1' || raw === 'true';
    if (!seen) {
      sessionStorage.setItem(SESSION_MARKER_KEY, 'first');
      localStorage.setItem(RETURNING_VISITOR_KEY, '1');
      returningUser = false;
      return false;
    }
    returningUser = sessionStorage.getItem(SESSION_MARKER_KEY) !== 'first';
    return returningUser;
  } catch {
    returningUser = false;
    return false;
  }
}

function initLandingMetadata() {
  if (landingSrc !== null) return;
  landingSrc = '';
  landingRefHost = '';
  if (typeof window === 'undefined') {
    returningUser = false;
    return;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const rawSrc = (params.get('ref') || params.get('utm_source') || '').trim();
    if (/^[a-zA-Z0-9_-]{1,24}$/.test(rawSrc)) {
      landingSrc = rawSrc;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof document !== 'undefined' && document.referrer) {
      const refUrl = new URL(document.referrer);
      if (refUrl.hostname && refUrl.hostname !== window.location.hostname) {
        landingRefHost = refUrl.hostname.toLowerCase().slice(0, 80);
      }
    }
  } catch {
    // ignore
  }

  returningUser = resolveReturningVisitor();
}

function getDeviceBucket() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth || 1024;
  if (w <= 640) return 'phone';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}

function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') clean[k] = v.slice(0, 120);
    else if (typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
    else if (typeof v === 'boolean') clean[k] = v;
    else clean[k] = String(v).slice(0, 120);
  }
  return clean;
}

export function flushPulse() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 25);

  if (import.meta.env.DEV && isDebugMode()) {
    console.info('[Pulse debug]', { session: getSessionId(), events: batch });
    return;
  }

  if (!isPulseAllowed()) return;

  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/pulse`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        p_session: getSessionId(),
        p_events: batch
      })
    }).catch(() => {});
  } catch {
    // Never throw from analytics
  }
}

function attachFlushListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  flushTimer = window.setInterval(flushPulse, FLUSH_INTERVAL_MS);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPulse();
    });
  }
  window.addEventListener('pagehide', flushPulse);
}

export function pulse(name, props = {}) {
  if (!isPulseAllowed()) return;
  if (typeof name !== 'string' || !/^[a-z][a-z0-9_]{1,31}$/.test(name)) return;

  initLandingMetadata();
  attachFlushListeners();

  const path =
    typeof window !== 'undefined'
      ? (window.location.pathname || '/').slice(0, 80)
      : '/';

  queue.push({
    name,
    path,
    ref_host: landingRefHost || undefined,
    src: landingSrc || undefined,
    device: getDeviceBucket(),
    returning: Boolean(returningUser),
    props: sanitizeProps(props)
  });

  if (queue.length >= MAX_BATCH) {
    flushPulse();
  }
}

export function pulseTimer(name, baseProps = {}) {
  let activeMs = 0;
  let visibleSince =
    typeof document !== 'undefined' && document.visibilityState === 'hidden'
      ? null
      : Date.now();
  let stopped = false;

  const onVis = () => {
    if (stopped) return;
    if (document.visibilityState === 'hidden') {
      if (visibleSince !== null) {
        activeMs += Math.max(0, Date.now() - visibleSince);
        visibleSince = null;
      }
    } else if (visibleSince === null) {
      visibleSince = Date.now();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVis);
  }

  return function stop(extraProps = {}) {
    if (stopped) return;
    stopped = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVis);
    }
    if (visibleSince !== null) {
      activeMs += Math.max(0, Date.now() - visibleSince);
      visibleSince = null;
    }
    pulse(name, { ...baseProps, ...extraProps, ms: Math.round(activeMs) });
  };
}

export function resetPulseForTest() {
  queue.length = 0;
  sessionId = null;
  landingSrc = null;
  landingRefHost = null;
  returningUser = null;
  if (flushTimer && typeof window !== 'undefined') {
    window.clearInterval(flushTimer);
    flushTimer = null;
  }
  listenersAttached = false;
}
