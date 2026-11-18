// ==========================================
// GAME RATINGS (1–5 STARS) & TOP-RATED SORT
// Persists user ratings locally and syncs to Supabase rate_game / get_game_ratings RPCs.
// ==========================================

const USER_RATINGS_KEY = 'tm_game_user_ratings_v1';
const AGG_RATINGS_KEY = 'tm_game_agg_ratings_v1';
const RPC_UNAVAILABLE_KEY = 'tm_game_ratings_rpc_missing_v1';

function isRatingsRpcDisabled() {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RPC_UNAVAILABLE_KEY) === '1';
  } catch {
    return false;
  }
}

function markRatingsRpcUnavailable(error) {
  const msg = String(error?.message || error?.code || '');
  if (
    msg.includes('PGRST202') ||
    msg.includes('404') ||
    msg.includes('Could not find the function')
  ) {
    try {
      sessionStorage?.setItem(RPC_UNAVAILABLE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }
}

function readJsonStorage(key, fallback = {}) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function loadUserGameRatings() {
  const raw = readJsonStorage(USER_RATINGS_KEY, {});
  const clean = {};
  for (const [id, val] of Object.entries(raw)) {
    const num = Math.round(Number(val));
    if (num >= 1 && num <= 5) clean[id] = num;
  }
  return clean;
}

export function loadCachedCommunityRatings() {
  const raw = readJsonStorage(AGG_RATINGS_KEY, {});
  const clean = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    const avg = Number(entry.avgStars);
    const count = Math.max(0, Math.round(Number(entry.count) || 0));
    if (Number.isFinite(avg) && avg > 0 && count > 0) {
      clean[id] = { avgStars: Math.round(avg * 100) / 100, count };
    }
  }
  return clean;
}

/**
 * Computes effective rating summary for display and sorting.
 * If community aggregates exist, uses them (folded with any un-synced local rating);
 * otherwise falls back to the player's local 1-5 star rating.
 */
export function buildRatingsSummaryMap(communityMap = {}, userMap = {}) {
  const allIds = new Set([...Object.keys(communityMap), ...Object.keys(userMap)]);
  const summary = {};
  for (const id of allIds) {
    const comm = communityMap[id];
    const userStars = userMap[id] || 0;
    if (comm && comm.count > 0) {
      summary[id] = {
        avgStars: comm.avgStars,
        count: comm.count,
        userStars
      };
    } else if (userStars >= 1 && userStars <= 5) {
      summary[id] = {
        avgStars: userStars,
        count: 1,
        userStars
      };
    }
  }
  return summary;
}

/**
 * Sorts games so higher star-rated games appear at the top of the scroll list.
 * Ties preserve original catalog ordering.
 */
export function sortGamesByRating(games = [], summaryMap = {}) {
  return games
    .map((game, index) => ({ game, index }))
    .sort((a, b) => {
      const rA = summaryMap[a.game.id];
      const rB = summaryMap[b.game.id];
      const avgA = rA?.avgStars || 0;
      const avgB = rB?.avgStars || 0;
      if (avgB !== avgA) return avgB - avgA;

      const countA = rA?.count || 0;
      const countB = rB?.count || 0;
      if (countB !== countA) return countB - countA;

      const userA = rA?.userStars || 0;
      const userB = rB?.userStars || 0;
      if (userB !== userA) return userB - userA;

      return a.index - b.index;
    })
    .map((entry) => entry.game);
}

let inFlightRatingsPromise = null;

export async function fetchCommunityGameRatings() {
  if (isRatingsRpcDisabled()) return loadCachedCommunityRatings();
  if (inFlightRatingsPromise) return inFlightRatingsPromise;
  inFlightRatingsPromise = (async () => {
    try {
      const { getSupabaseClient } = await import('../supabaseClient.js');
      const supabase = await getSupabaseClient();
      if (!supabase) return loadCachedCommunityRatings();
      const { data, error } = await supabase.rpc('get_game_ratings');
      if (error) {
        markRatingsRpcUnavailable(error);
        return loadCachedCommunityRatings();
      }
      if (!Array.isArray(data)) return loadCachedCommunityRatings();
      const next = {};
      for (const row of data) {
        if (!row?.game_id) continue;
        const avg = Number(row.avg_stars);
        const count = Math.max(0, Math.round(Number(row.rating_count) || 0));
        if (Number.isFinite(avg) && avg > 0 && count > 0) {
          next[row.game_id] = { avgStars: Math.round(avg * 100) / 100, count };
        }
      }
      writeJsonStorage(AGG_RATINGS_KEY, next);
      return next;
    } catch {
      return loadCachedCommunityRatings();
    } finally {
      inFlightRatingsPromise = null;
    }
  })();
  return inFlightRatingsPromise;
}

export async function saveGameRating(gameId, stars, currentCommunity = {}) {
  const clamped = Math.max(1, Math.min(5, Math.round(Number(stars) || 0)));
  if (!gameId || clamped < 1) return { userRatings: loadUserGameRatings(), community: currentCommunity };

  const prevUser = loadUserGameRatings();
  const prevStars = prevUser[gameId] || 0;
  const nextUser = { ...prevUser, [gameId]: clamped };
  writeJsonStorage(USER_RATINGS_KEY, nextUser);

  // Optimistic local aggregate update
  const prevAgg = currentCommunity[gameId];
  let nextAgg;
  if (prevAgg && prevAgg.count > 0) {
    if (prevStars > 0) {
      const total = prevAgg.avgStars * prevAgg.count - prevStars + clamped;
      nextAgg = {
        avgStars: Math.round((total / prevAgg.count) * 100) / 100,
        count: prevAgg.count
      };
    } else {
      const total = prevAgg.avgStars * prevAgg.count + clamped;
      const count = prevAgg.count + 1;
      nextAgg = {
        avgStars: Math.round((total / count) * 100) / 100,
        count
      };
    }
  } else {
    nextAgg = { avgStars: clamped, count: 1 };
  }
  const nextCommunity = { ...currentCommunity, [gameId]: nextAgg };
  writeJsonStorage(AGG_RATINGS_KEY, nextCommunity);

  // Best-effort remote sync when signed in (including anonymous auth)
  if (isRatingsRpcDisabled()) {
    return { userRatings: nextUser, community: nextCommunity };
  }
  try {
    const { getSupabaseClient } = await import('../supabaseClient.js');
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data: sessData } = await supabase.auth.getSession();
      if (sessData?.session) {
        const { data, error } = await supabase.rpc('rate_game', {
          p_game_id: gameId,
          p_stars: clamped
        });
        if (error) {
          markRatingsRpcUnavailable(error);
        } else if (data?.ok) {
          const synced = {
            ...nextCommunity,
            [gameId]: {
              avgStars: Number(data.avg_stars) || clamped,
              count: Math.max(1, Math.round(Number(data.rating_count) || 1))
            }
          };
          writeJsonStorage(AGG_RATINGS_KEY, synced);
          return { userRatings: nextUser, community: synced };
        }
      }
    }
  } catch {
    // local rating already saved
  }

  return { userRatings: nextUser, community: nextCommunity };
}
