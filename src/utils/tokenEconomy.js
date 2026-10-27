// ==========================================
// LOGICAL, FAIR & ANTI-LOOPHOLE ARCADE TOKEN ECONOMY
// Enforces:
// 1. Global Daily Maximum Collection Cap (500 Tokens / Day)
// 2. Per-Category Daily Sub-Caps (Uploads, Sub-Games, Engagement, Quests)
// 3. Strict 1-Time-Per-Meme Action Deduplication (prevents vote/save/react toggle farming)
// 4. Per-Round Sub-Game Payout Caps (Meme Crush, Vegas Pinball, Slots)
// ==========================================

export const ARCADE_ECONOMY_RULES = {
  MAX_DAILY_TOKENS: 500,
  MAX_TOKENS_PER_ROUND: 35,
  CATEGORY_DAILY_CAPS: {
    upload: 120,     // Max 3 rewarded uploads/remixes per day (40 tokens each)
    games: 200,      // Combined daily cap across Meme Crush, Vegas Pinball & Slots
    engagement: 100, // Votes, Reactions, Comments, Saves, Shares (1x per unique meme)
    quests: 80       // Daily Streak & Daily Quests
  },
  REWARDS: {
    UPLOAD_MEME: { tokens: 40, xp: 100 },
    REMIX_MEME: { tokens: 40, xp: 120 },
    BOUNTY_UPLOAD: { tokens: 50, xp: 180 },
    VOTE_UNIQUE_MEME: { tokens: 5, xp: 15 },
    VOTE_MEME: { tokens: 5, xp: 15 },
    REACT_UNIQUE_MEME: { tokens: 3, xp: 10 },
    REACT_MEME: { tokens: 3, xp: 10 },
    COMMENT_UNIQUE_MEME: { tokens: 8, xp: 20 },
    COMMENT_MEME: { tokens: 8, xp: 20 },
    BOOKMARK_UNIQUE_MEME: { tokens: 4, xp: 10 },
    BOOKMARK_MEME: { tokens: 4, xp: 10 },
    SHARE_UNIQUE_MEME: { tokens: 5, xp: 10 },
    SHARE_MEME: { tokens: 5, xp: 10 },
    ROAST_UNIQUE_MEME: { tokens: 5, xp: 15 },
    ROAST_MEME: { tokens: 5, xp: 15 },
    DAILY_STREAK: { tokens: 20, xp: 100 },
    DAILY_QUEST: { tokens: 15, xp: 100 },
    QUEST_CLAIM: { tokens: 15, xp: 100 },
    KONAMI_DAILY: { tokens: 20, xp: 100 },
    GOBLIN_CATCH: { tokens: 15, xp: 100 }
  },
  SUB_GAMES: {
    MAX_TOKENS_PER_ROUND: 35,
    CRUSH_PLAYS_PER_WINDOW: 5,
    CRUSH_WINDOW_MS: 15 * 60 * 1000,
    PINBALL_PLAYS_PER_WINDOW: 5,
    PINBALL_WINDOW_MS: 15 * 60 * 1000,
    EXTRA_LIFE_TOKEN_COST: 15
  }
};

const LEDGER_STORAGE_KEY = 'tm_token_ledger_v1';
const TOKENS_BALANCE_KEY = 'tm_tokens_balance_v1';

export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createFreshDailyLedger(existingActionKeys = []) {
  return {
    date: getTodayDateString(),
    totalToday: 0,
    byCategory: {
      upload: 0,
      games: 0,
      engagement: 0,
      quests: 0
    },
    // Persist per-meme action keys across days so users cannot re-toggle votes on old memes
    rewardedActionKeys: Array.isArray(existingActionKeys)
      ? existingActionKeys.slice(-600)
      : []
  };
}

export function loadTokenLedger() {
  const today = getTodayDateString();
  try {
    const raw = JSON.parse(localStorage.getItem(LEDGER_STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') {
      return createFreshDailyLedger();
    }
    if (raw.date !== today) {
      // New calendar day: reset daily counters, keep permanent per-meme deduplication keys
      const permanentKeys = (raw.rewardedActionKeys || []).filter(
        (k) => typeof k === 'string' && !k.startsWith('daily:')
      );
      return createFreshDailyLedger(permanentKeys);
    }
    return {
      date: today,
      totalToday: Math.max(0, Number(raw.totalToday || 0)),
      byCategory: {
        upload: Math.max(0, Number(raw.byCategory?.upload || 0)),
        games: Math.max(0, Number(raw.byCategory?.games || 0)),
        engagement: Math.max(0, Number(raw.byCategory?.engagement || 0)),
        quests: Math.max(0, Number(raw.byCategory?.quests || 0))
      },
      rewardedActionKeys: Array.isArray(raw.rewardedActionKeys)
        ? raw.rewardedActionKeys.slice(-600)
        : []
    };
  } catch {
    return createFreshDailyLedger();
  }
}

export function saveTokenLedger(ledger) {
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    // Ignore storage quota restrictions
  }
}

export function loadTokenBalance() {
  try {
    const saved = localStorage.getItem(TOKENS_BALANCE_KEY);
    if (saved === null) return 50; // Fair starter welcome balance of 50 Tokens
    return Math.max(0, Math.min(99999, Math.floor(Number(saved) || 0)));
  } catch {
    return 50;
  }
}

export function saveTokenBalance(tokens) {
  try {
    localStorage.setItem(TOKENS_BALANCE_KEY, String(Math.max(0, Math.floor(tokens))));
  } catch {
    // Ignore storage quota restrictions
  }
}

/**
 * Validates and computes a fair, capped token award with anti-loophole deduplication.
 */
export function evaluateTokenAward({
  ledger,
  category = 'engagement',
  requestedTokens = 0,
  actionKey = null
}) {
  const currentLedger =
    ledger && ledger.date === getTodayDateString()
      ? ledger
      : createFreshDailyLedger(ledger?.rewardedActionKeys);

  const cleanRequested = Math.max(0, Math.floor(Number(requestedTokens) || 0));
  if (cleanRequested <= 0) {
    return {
      allowed: false,
      awardedTokens: 0,
      reason: 'zero_requested',
      nextLedger: currentLedger
    };
  }

  // 1. Check 1-time action deduplication (e.g., voting/reacting/saving the same meme twice)
  if (actionKey && currentLedger.rewardedActionKeys.includes(actionKey)) {
    return {
      allowed: false,
      awardedTokens: 0,
      reason: 'already_rewarded',
      nextLedger: currentLedger
    };
  }

  // 2. Check Global Daily Maximum Collection Cap (500 Tokens / Day)
  const globalRemaining = Math.max(
    0,
    ARCADE_ECONOMY_RULES.MAX_DAILY_TOKENS - currentLedger.totalToday
  );
  if (globalRemaining <= 0) {
    return {
      allowed: false,
      awardedTokens: 0,
      reason: 'daily_cap_reached',
      nextLedger: currentLedger
    };
  }

  // 3. Check Category Daily Sub-Cap
  const catCap =
    ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS[category] ??
    ARCADE_ECONOMY_RULES.MAX_DAILY_TOKENS;
  const catUsed = currentLedger.byCategory[category] || 0;
  const catRemaining = Math.max(0, catCap - catUsed);
  if (catRemaining <= 0) {
    return {
      allowed: false,
      awardedTokens: 0,
      reason: 'category_cap_reached',
      nextLedger: currentLedger
    };
  }

  // 4. Clamp to fair allowed payout
  const maxForSubGame =
    category === 'games'
      ? Math.min(cleanRequested, ARCADE_ECONOMY_RULES.SUB_GAMES.MAX_TOKENS_PER_ROUND)
      : cleanRequested;

  const awardedTokens = Math.max(
    0,
    Math.min(maxForSubGame, globalRemaining, catRemaining)
  );

  if (awardedTokens <= 0) {
    return {
      allowed: false,
      awardedTokens: 0,
      reason: 'cap_reached',
      nextLedger: currentLedger
    };
  }

  const nextActionKeys = actionKey
    ? [...currentLedger.rewardedActionKeys.slice(-599), actionKey]
    : currentLedger.rewardedActionKeys;

  const nextLedger = {
    ...currentLedger,
    totalToday: currentLedger.totalToday + awardedTokens,
    byCategory: {
      ...currentLedger.byCategory,
      [category]: (currentLedger.byCategory[category] || 0) + awardedTokens
    },
    rewardedActionKeys: nextActionKeys
  };

  return {
    allowed: true,
    awardedTokens,
    reason: awardedTokens < cleanRequested ? 'clamped_to_cap' : 'ok',
    nextLedger
  };
}
