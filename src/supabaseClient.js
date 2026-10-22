import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://otvvphmjojqyjaznjzyo.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

export const SUPABASE_OAUTH_CALLBACK_URL = `${SUPABASE_URL}/auth/v1/callback`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
