// ==========================================
// PHASE 26: MEME FEED BRIDGE (Extras x Memes)
// Powers Slots, MEMEDAQ, Meme Crush, Dank Pet, Boss Key, Arena & Pinball
// with real user memes from the community feed.
// ==========================================

const PERK_KEY = 'tm_daily_free_perks';

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns top N trending memes sorted by score + remix count.
 */
export function getTrendingMemes(memes = [], limit = 6) {
  if (!Array.isArray(memes) || memes.length === 0) return [];
  return [...memes]
    .filter((m) => m && (m.image_url || m.poster_url))
    .sort((a, b) => {
      const scoreA = (a.score || 0) + (a.mutation_count || 0) * 10;
      const scoreB = (b.score || 0) + (b.mutation_count || 0) * 10;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Calculates category activity scores in the last 24h for MEMEDAQ stock price adjustments.
 */
export function getCategoryActivity(memes = []) {
  const activity = { dank: 0, tech: 0, gaming: 0, relatable: 0, all: 0 };
  if (!Array.isArray(memes) || memes.length === 0) return activity;

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  memes.forEach((m) => {
    const age = now - new Date(m.created_at || 0).getTime();
    if (age <= ONE_DAY) {
      const cat = (m.category || 'dank').toLowerCase();
      const weight = 1 + Math.max(0, m.score || 0) * 0.1 + (m.mutation_count || 0) * 0.5;
      if (activity[cat] !== undefined) activity[cat] += weight;
      activity.all += weight;
    }
  });

  return activity;
}

/**
 * Returns breaking news headline blurbs quoting real community meme titles.
 */
export function getRecentMemeHeadlines(memes = [], limit = 5) {
  if (!Array.isArray(memes) || memes.length === 0) return [];
  return memes
    .filter((m) => m?.title && m.title.trim().length > 3)
    .slice(0, limit)
    .map((m) => `VIRAL SURGE: "${m.title.slice(0, 48)}" by @${m.author_name || 'Anon'}`);
}

/**
 * Maps levels 1-10 in Meme Crush to community meme backdrops.
 */
export function getLevelBackdropMeme(memes = [], levelNumber = 1) {
  if (!Array.isArray(memes) || memes.length === 0) return null;
  const filtered = memes.filter((m) => m && (m.image_url || m.poster_url));
  if (filtered.length === 0) return null;
  const idx = (Math.max(1, levelNumber) - 1) % filtered.length;
  return filtered[idx];
}

/**
 * Check if the user has unlocked today's free daily perk for publishing a meme.
 */
export function checkDailyPerk(type = 'pinball') {
  try {
    const raw = JSON.parse(localStorage.getItem(PERK_KEY) || '{}');
    const today = getTodayString();
    return raw.date === today && Boolean(raw[type]);
  } catch {
    return false;
  }
}

/**
 * Grants a daily free perk (e.g. pinball prize run or arena boost) when a meme is published.
 */
export function recordPublishDailyPerk() {
  try {
    const today = getTodayString();
    const raw = JSON.parse(localStorage.getItem(PERK_KEY) || '{}');
    const cur = raw.date === today ? raw : { date: today };
    cur.pinball = true;
    cur.arena = true;
    cur.blackjack = true;
    cur.roulette = true;
    localStorage.setItem(PERK_KEY, JSON.stringify(cur));
  } catch {
    // ignore
  }
}

/**
 * Consumes today's free perk after use.
 */
export function consumeDailyPerk(type = 'pinball') {
  try {
    const raw = JSON.parse(localStorage.getItem(PERK_KEY) || '{}');
    const today = getTodayString();
    if (raw.date === today && raw[type]) {
      raw[type] = false;
      localStorage.setItem(PERK_KEY, JSON.stringify(raw));
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
