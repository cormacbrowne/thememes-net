// ==========================================
// PHASE 2.4: FAMILY-FRIENDLY PROGRESSION LEVELS, XP AWARDS & LONDON DAILY STREAK
// ==========================================

export const LEVELS = [
  { level: 1, title: 'Arcade Lurker', minXp: 0 },
  { level: 2, title: 'Pixel Scroller', minXp: 150 },
  { level: 3, title: 'Caption Rookie', minXp: 400 },
  { level: 4, title: 'Certified Memer', minXp: 800 },
  { level: 5, title: 'Template Wizard', minXp: 1400 },
  { level: 6, title: 'Viral Architect', minXp: 2200 },
  { level: 7, title: 'Arena Contender', minXp: 3300 },
  { level: 8, title: 'Meme Maestro', minXp: 4800 },
  { level: 9, title: 'Synthwave Legend', minXp: 6800 },
  { level: 10, title: 'Cosmic Supernova', minXp: 9000 }
];

export const XP_AWARDS = {
  meme_created: 35,
  battle_entry: 25,
  battle_vote: 10,
  daily_puzzle: 25,
  upvote_received: 5,
  battle_win: 100,
  battle_podium: 50
};

export const MEANINGFUL_STREAK_ACTIONS = new Set([
  'meme_created',
  'battle_entry',
  'battle_vote',
  'daily_puzzle'
]);

export function getLevelForXp(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = LEVELS[0];
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (safeXp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      idx = i;
    }
  }
  const next = LEVELS[idx + 1] || null;
  const span = next ? Math.max(1, next.minXp - current.minXp) : 1;
  const progressPct = next
    ? Math.max(0, Math.min(100, Math.round(((safeXp - current.minXp) / span) * 100)))
    : 100;

  return {
    ...current,
    xp: safeXp,
    nextLevel: next,
    nextXp: next ? next.minXp : null,
    progressPct
  };
}

/**
 * Formats an instant into YYYY-MM-DD in Europe/London (handles GMT/BST transitions).
 */
export function getLondonDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function addDaysToDateKey(dateKey, deltaDays) {
  const [y, m, d] = String(dateKey || '2026-01-01').split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function dateKeyDiffDays(fromKey, toKey) {
  const [fy, fm, fd] = String(fromKey || '').split('-').map(Number);
  const [ty, tm, td] = String(toKey || '').split('-').map(Number);
  if (!fy || !ty) return 9999;
  const fromMs = Date.UTC(fy, (fm || 1) - 1, fd || 1);
  const toMs = Date.UTC(ty, (tm || 1) - 1, td || 1);
  return Math.round((toMs - fromMs) / 86400000);
}

/**
 * Returns the ISO-8601 week key (YYYY-Www) for a Europe/London calendar date key.
 */
export function getLondonIsoWeek(dateOrKey = new Date()) {
  const dateKey =
    typeof dateOrKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrKey)
      ? dateOrKey
      : getLondonDateKey(dateOrKey instanceof Date ? dateOrKey : new Date());
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Computes the Monday 00:00 Europe/London week key & reset label.
 */
export function getLondonWeekStartDateKey(dateOrKey = new Date()) {
  const dateKey =
    typeof dateOrKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrKey)
      ? dateOrKey
      : getLondonDateKey(dateOrKey instanceof Date ? dateOrKey : new Date());
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const isoDay = dt.getUTCDay() || 7; // Monday = 1, Sunday = 7
  return addDaysToDateKey(dateKey, -(isoDay - 1));
}

/**
 * Applies a meaningful daily action (`meme_created`, `battle_entry`, `battle_vote`, `daily_puzzle`)
 * using Europe/London days and 1 free streak freeze per ISO week (for a single missed day).
 */
export function applyDailyActivity(prevState = {}, dateOrKey = new Date()) {
  const today =
    typeof dateOrKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrKey)
      ? dateOrKey
      : getLondonDateKey(dateOrKey instanceof Date ? dateOrKey : new Date());
  const currentWeek = getLondonIsoWeek(today);

  const prevStreak = Math.max(0, Number(prevState.streakDays) || 0);
  const prevBest = Math.max(0, Number(prevState.bestStreak) || 0, prevStreak);
  const lastDay = typeof prevState.lastActiveDay === 'string' ? prevState.lastActiveDay : null;
  const prevFreezeWeek =
    typeof prevState.freezeUsedWeek === 'string' ? prevState.freezeUsedWeek : null;

  if (!lastDay) {
    return {
      streakDays: 1,
      bestStreak: Math.max(1, prevBest),
      lastActiveDay: today,
      freezeUsedWeek: prevFreezeWeek,
      freezeUsed: false,
      freezeAvailable: prevFreezeWeek !== currentWeek,
      changed: true
    };
  }

  const gap = dateKeyDiffDays(lastDay, today);
  if (gap <= 0) {
    return {
      streakDays: Math.max(1, prevStreak),
      bestStreak: Math.max(1, prevBest),
      lastActiveDay: lastDay,
      freezeUsedWeek: prevFreezeWeek,
      freezeUsed: false,
      freezeAvailable: prevFreezeWeek !== currentWeek,
      changed: false
    };
  }

  let nextStreak;
  let nextFreezeWeek = prevFreezeWeek;
  let freezeUsed = false;

  if (gap === 1) {
    nextStreak = prevStreak + 1;
  } else if (gap === 2 && prevFreezeWeek !== currentWeek && prevStreak > 0) {
    nextStreak = prevStreak + 1;
    nextFreezeWeek = currentWeek;
    freezeUsed = true;
  } else {
    nextStreak = 1;
  }

  return {
    streakDays: nextStreak,
    bestStreak: Math.max(prevBest, nextStreak),
    lastActiveDay: today,
    freezeUsedWeek: nextFreezeWeek,
    freezeUsed,
    freezeAvailable: nextFreezeWeek !== currentWeek,
    changed: true
  };
}
