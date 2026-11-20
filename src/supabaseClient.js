import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://otvvphmjojqyjaznjzyo.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

export const SUPABASE_OAUTH_CALLBACK_URL = `${SUPABASE_URL}/auth/v1/callback`;

// We read the sign-in redirect ourselves (see consumeAuthRedirect below) instead of letting
// supabase-js do it: it clears the tokens with `location.hash = ''`, which leaves a stray `#`
// in the address bar and fires a popstate that the app's history handler treats as a Back press.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { detectSessionInUrl: false }
});

let authRedirectError = null;
let authRedirectReady = Promise.resolve();

/**
 * Google / Discord sign-in and email confirm / magic links come back as
 * `/#access_token=...&refresh_token=...` (or `/#error=...` for an expired or reused link).
 * Strip that from the URL with replaceState (no `#`, no history entry, no popstate), then
 * start the session from the tokens. onAuthStateChange fires SIGNED_IN as usual.
 */
function consumeAuthRedirect() {
  if (typeof window === 'undefined' || !window.location.hash) return;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const hasError = params.has('error') || params.has('error_code') || params.has('error_description');
  if (!accessToken && !hasError) return;

  try {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  } catch {
    // ignore: the tokens are still consumed below
  }

  if (hasError) {
    authRedirectError = {
      code: params.get('error_code') || params.get('error') || 'unknown',
      description: (params.get('error_description') || '').replace(/\+/g, ' ')
    };
    return;
  }

  if (accessToken && refreshToken) {
    authRedirectReady = supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          authRedirectError = { code: error.code || 'session_failed', description: error.message || '' };
        }
      })
      .catch(() => {});
  }
}

consumeAuthRedirect();

// Until the redirect's session is saved, getSession() would still report the old (often
// anonymous, or no) session, and a first write could then sign in anonymously over the top
// of the Google login. Make every getSession() caller (ours and supabase-js's own token
// lookups) wait for it. setSession itself never calls getSession, so this cannot deadlock.
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
supabase.auth.getSession = async (...args) => {
  await authRedirectReady;
  return originalGetSession(...args);
};

/** The error the sign-in / email link this page was opened from came back with, if any. */
export function getAuthRedirectError() {
  return authRedirectError;
}

export function getSupabaseClient() {
  return supabase;
}

let cachedAuthSettings = null;

/**
 * Queries Supabase GoTrue `/auth/v1/settings` to inspect which OAuth providers
 * (google, apple, discord, facebook, email) are currently enabled on the project.
 * Prevents redirecting users to a raw 400 JSON error page when a provider hasn't
 * had its Client ID / Secret pasted into the Supabase Dashboard yet.
 */
export async function fetchSupabaseAuthSettings(forceRefresh = false) {
  if (cachedAuthSettings && !forceRefresh) return cachedAuthSettings;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_ANON_KEY
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedAuthSettings = data;
    return data;
  } catch {
    return null;
  }
}
