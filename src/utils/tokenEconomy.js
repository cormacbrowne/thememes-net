// ==========================================
// HARDENED, MEME-FIRST & GAMBLING-READY ARCADE TOKEN ECONOMY (PHASE 25 AUDIT)
// Principles:
// 1. MEMES ARE THE PRIMARY TOKEN GENERATOR (Original uploads, Daily Bounties, Remixes, Pioneer Bonus)
// 2. MODEST, STRICTLY CAPPED TOKENS FOR VISITS & GENUINE ENGAGEMENT (Zero click-farming routes)
// 3. GAMES CONSUME & GAMBLE TOKENS (One-Arm Bandit Wagers, Meme Stock Market Trading, Coin-Op Prize Runs)
// 4. ZERO FREE-TOKEN LOOPHOLES (Free Practice / Demo modes award 0 tokens; Piñata requires 8 moving hits)
// ==========================================

export const ARCADE_ECONOMY_RULES = {
  STARTER_WELCOME_TOKENS: 25,
  MAX_DAILY_EARNED_TOKENS: 230, // Earned via uploads + visits + engagement (excludes gambling return of staked principal)
  CATEGORY_DAILY_CAPS: {
    upload: 180,     // Primary token engine: up to ~3-4 rewarded meme uploads/remixes per day
    engagement: 25,  // Modest daily cap for genuine upvotes, meaningful comments & reactions (1x per unique meme)
    quests: 25       // Daily visit streak, daily quests & 1x/day skill mini-events (Piñata / Goblin / Konami)
  },
  REWARDS: {
    // Primary Token Generators (Creating & Sharing Memes!)
    FIRST_UPLOAD_BONUS: { tokens: 30, xp: 150 },
    UPLOAD_MEME: { tokens: 45, xp: 120 },
    BOUNTY_UPLOAD: { tokens: 60, xp: 200 },
    REMIX_MEME: { tokens: 35, xp: 110 },
    REMIX_ROYALTY: { tokens: 5, xp: 25 },

    // Genuine Meme Engagement (Strictly 1x per unique meme ID forever; low anti-farm values)
    VOTE_UNIQUE_MEME: { tokens: 2, xp: 15 },
    VOTE_MEME: { tokens: 2, xp: 15 },
    COMMENT_UNIQUE_MEME: { tokens: 3, xp: 25 },
    COMMENT_MEME: { tokens: 3, xp: 25 },
    REACT_UNIQUE_MEME: { tokens: 1, xp: 10 },
    REACT_MEME: { tokens: 1, xp: 10 },

    // Zero-Token Actions (Award XP only — eliminates rapid click-farming on a single meme)
    BOOKMARK_UNIQUE_MEME: { tokens: 0, xp: 10 },
    BOOKMARK_MEME: { tokens: 0, xp: 10 },
    SHARE_UNIQUE_MEME: { tokens: 0, xp: 15 },
    SHARE_MEME: { tokens: 0, xp: 15 },
    ROAST_UNIQUE_MEME: { tokens: 0, xp: 15 },
    ROAST_MEME: { tokens: 0, xp: 15 },

    // Daily Visits, Quests & Skill Events (Strictly 1x/day & capped at 25/day total)
    DAILY_STREAK: { tokens: 10, xp: 100 },
    DAILY_QUEST: { tokens: 5, xp: 90 },
    QUEST_CLAIM: { tokens: 5, xp: 90 },
    PINATA_WHACK_WIN: { tokens: 5, xp: 50 },
    GOBLIN_CATCH: { tokens: 5, xp: 60 },
    KONAMI_DAILY: { tokens: 5, xp: 80 },
    WHEEL_RARE_JACKPOT: { tokens: 8, xp: 100 }
  },
  ARCADE_STAKES: {
    SLOT_BETS: [5, 10, 25, 50],
    CRUSH_ENTRY_COST: 10,
    CRUSH_STAR_PAYOUTS: { 1: 12, 2: 18, 3: 26 },
    CRUSH_CONTINUE_COST: 10,
    PINBALL_ENTRY_COST: 10,
    PINBALL_EXTRA_BALL_COST: 10,
    STOCK_FEE_RATE: 0.01 // 1% brokerage spread prevents rapid buy/sell arbitrage
  }
};

const LEDGER_STORAGE_KEY = 'tm_token_ledger_v2';
const TOKENS_BALANCE_KEY = 'tm_tokens_balance_v2';

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
      engagement: 0,
      quests: 0
    },
    // Persist per-meme & pioneer action keys across days so users cannot re-toggle votes on old memes
    rewardedActionKeys: Array.isArray(existingActionKeys)
      ? existingActionKeys.slice(-800)
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
        engagement: Math.max(0, Number(raw.byCategory?.engagement || 0)),
        quests: Math.max(0, Number(raw.byCategory?.quests || 0))
      },
      rewardedActionKeys: Array.isArray(raw.rewardedActionKeys)
        ? raw.rewardedActionKeys.slice(-800)
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
    if (saved === null) {
      return ARCADE_ECONOMY_RULES.STARTER_WELCOME_TOKENS;
    }
    return Math.max(0, Math.min(999999, Math.floor(Number(saved) || 0)));
  } catch {
    return ARCADE_ECONOMY_RULES.STARTER_WELCOME_TOKENS;
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
 * Checks whether a 1-time action key (e.g. 'pioneer:first_upload' or 'daily:pinata:2026-10-31')
 * has already been rewarded.
 */
export function hasActionBeenRewarded(ledger, actionKey) {
  if (!ledger || !actionKey || !Array.isArray(ledger.rewardedActionKeys)) return false;
  return ledger.rewardedActionKeys.includes(actionKey);
}

/**
 * Validates and computes a fair, capped token award with anti-loophole deduplication.
 * Used for earning tokens via Meme Uploads, Daily Visits, Engagement & Quests.
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

  // 1. Check 1-time action deduplication (e.g., voting/reacting/commenting on the same meme twice)
  if (actionKey && currentLedger.rewardedActionKeys.includes(actionKey)) {
    return {
      allowed: false,
      awardedTokens: 0,
      reason: 'already_rewarded',
      nextLedger: currentLedger
    };
  }

  // 2. Check Global Daily Earned Token Cap
  const globalRemaining = Math.max(
    0,
    ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS - currentLedger.totalToday
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
    ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS;
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
  const awardedTokens = Math.max(
    0,
    Math.min(cleanRequested, globalRemaining, catRemaining)
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
    ? [...currentLedger.rewardedActionKeys.slice(-799), actionKey]
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

/**
 * Validates a gambling / arcade game payout so free practice rounds can NEVER mint tokens
 * and payouts stay bounded by maximum house odds.
 */
export function validateStakedGamePayout({ stakedTokens = 0, rawPayout = 0, maxMultiplier = 55 }) {
  const stake = Math.max(0, Math.floor(Number(stakedTokens) || 0));
  if (stake <= 0) return 0; // Free Practice / Demo mode ALWAYS pays 0 tokens
  const cleanPayout = Math.max(0, Math.floor(Number(rawPayout) || 0));
  return Math.min(cleanPayout, Math.max(stake, stake * maxMultiplier));
}
