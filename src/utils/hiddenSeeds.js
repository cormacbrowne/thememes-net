// Owner brief 18 Nov 2026 (item 3): seed memes a moderator has hidden (table hidden_seed_memes).
// Cached in localStorage so the feed filters them on first paint, refreshed from the server.
import { getSupabaseClient } from '../supabaseClient';

const CACHE_KEY = 'tm_hidden_seeds_v1';

export function readCachedHiddenSeeds() {
  try {
    const arr = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export async function fetchHiddenSeeds() {
  const client = getSupabaseClient();
  if (!client?.from) return null;
  try {
    const { data, error } = await client.from('hidden_seed_memes').select('seed_id').limit(1000);
    if (error || !Array.isArray(data)) return null;
    const ids = data.map((r) => String(r.seed_id));
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
    return new Set(ids);
  } catch {
    return null;
  }
}
