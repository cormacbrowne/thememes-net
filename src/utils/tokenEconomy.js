// ==========================================
// HARDENED, MEME-FIRST ARCADE PRETEND-TOKEN ECONOMY (PHASE 25 AUDIT)
// Principles:
// 1. MEMES ARE THE PRIMARY TOKEN GENERATOR (Original uploads, Daily Bounties, Remixes, Pioneer Bonus)
// 2. MODEST, STRICTLY CAPPED TOKENS FOR VISITS & GENUINE ENGAGEMENT (Zero click-farming routes)
// 3. GAMES USE PRETEND TOKENS: free, just for fun, can't be bought or cashed out
// 4. ZERO FREE-TOKEN LOOPHOLES (Free Practice / Demo modes award 0 tokens; Piñata requires 8 moving hits)
// ==========================================

export const CURRENCY_BRAND = {
  name: 'MemeDollarz',
  symbol: 'M$',
  cent: '¢',
  centsPerToken: 25,
  dollarName: 'MemeDollarz',
  dollarShort: 'M$',
  centzName: 'MemeCentz',
  centzShort: '¢',
  maxDailyCentz: 125 // up to 5 tokens (M$1.25/day) from MemeCentz micro-earnings
};

/**
 * HARD RULE (plan 1.6) — MemeDollarz (M$) are free play-money:
 *   - can NEVER be bought with real money,
 *   - can NEVER be transferred between users,
 *   - can NEVER be cashed out or redeemed for anything of real value.
 * They are earned on the site and spent on the site (games, cosmetics) only.
 *
 * How it is enforced: the balance lives only in the player's own browser storage. There is
 * no wallet table, no balance RPC, no payment code and no transfer/cash-out path anywhere
 * (server or client). tests/unit/memeDollarzGuard.unit.mjs fails the build if any of
 * those appear. Any future paid currency must be SEPARATE and must never be usable in
 * casino games. Get legal advice before any real-money feature touches the arcade or M$.
 */
export const MEMEDOLLARZ_RULES = Object.freeze({
  purchasableWithRealMoney: false,
  transferableBetweenUsers: false,
  redeemableForRealValue: false,
  storedOnServer: false
});

export const ARCADE_ECONOMY_RULES = {
  STARTER_WELCOME_TOKENS: 20,
  STARTER_FIRST_PLAY_BONUS: 10,
  MAX_BATTLE_PRIZE: 100, // Plan 2.1: Caption Battle podium prize (server-awarded once per battle; outside daily caps)
  MAX_DAILY_EARNED_TOKENS: 65, // Exact sum of category caps: 35 upload + 10 engagement + 10 quests + 10 xpConversion
  CATEGORY_DAILY_CAPS: {
    upload: 35,        // Primary token engine: ~2-3 rewarded meme uploads/remixes per day
    engagement: 10,    // Modest daily cap for genuine upvotes, meaningful comments & reactions (1x per unique meme)
    quests: 10,        // Daily visit streak, daily quests & 1x/day skill mini-events (Piñata / Goblin / Konami / Payphone)
    xpConversion: 10   // XP-to-Token Reactor: up to +10 Tokens/day minted from converting earned XP (100 XP -> +2 Tokens)
  },
  XP_CONVERSION: {
    XP_THRESHOLD: 100,       // Every 100 XP converts into Tokens
    TOKENS_MINTED: 2,        // +2 Arcade Tokens per 100 XP milestone
    MAX_DAILY_TOKENS: 10     // Max 5 reactor conversions per day (+10 Tokens)
  },
  REWARDS: {
    // Primary Token Generators (Creating & Sharing Memes!)
    FIRST_UPLOAD_BONUS: { tokens: 8, xp: 150 },
    UPLOAD_MEME: { tokens: 12, xp: 120 },
    BOUNTY_UPLOAD: { tokens: 18, xp: 200 },
    REMIX_MEME: { tokens: 10, xp: 110 },
    REMIX_ROYALTY: { tokens: 2, xp: 25 },

    // Genuine Meme Engagement (Strictly 1x per unique meme ID forever; modest anti-farm values)
    VOTE_UNIQUE_MEME: { tokens: 1, xp: 15 },
    VOTE_MEME: { tokens: 1, xp: 15 },
    COMMENT_UNIQUE_MEME: { tokens: 2, xp: 25 },
    COMMENT_MEME: { tokens: 2, xp: 25 },
    REACT_UNIQUE_MEME: { tokens: 1, xp: 10 },
    REACT_MEME: { tokens: 1, xp: 10 },

    // Zero-Token Actions (Award XP only — feeds the 100-XP Token Reactor without click-farming!)
    BOOKMARK_UNIQUE_MEME: { tokens: 0, xp: 15 },
    BOOKMARK_MEME: { tokens: 0, xp: 15 },
    SHARE_UNIQUE_MEME: { tokens: 0, xp: 15 },
    SHARE_MEME: { tokens: 0, xp: 15 },
    ROAST_UNIQUE_MEME: { tokens: 0, xp: 20 },
    ROAST_MEME: { tokens: 0, xp: 20 },

    // Daily Visits, Quests & Skill Events (Strictly 1x/day & capped at 10/day total)
    DAILY_STREAK: { tokens: 4, xp: 100 },
    DAILY_QUEST: { tokens: 2, xp: 120 },
    QUEST_CLAIM: { tokens: 2, xp: 120 },
    PINATA_WHACK_WIN: { tokens: 2, xp: 50 },
    PAYPHONE_COIN_RETURN: { tokens: 2, xp: 50 },
    GOBLIN_CATCH: { tokens: 2, xp: 60 },
    KONAMI_DAILY: { tokens: 2, xp: 100 },
    WHEEL_RARE_JACKPOT: { tokens: 4, xp: 100 }
  },
  ARCADE_STAKES: {
    SLOT_BETS: [5, 10, 25, 50],
    VIP_SLOT_BETS: [5, 10, 25, 50, 100],
    BLACKJACK_BETS: [5, 10, 25, 50],
    ROULETTE_CHIPS: [1, 5, 10, 25],
    POKER_BUYINS: [10, 25, 50, 100],
    POKER_MAX_MULTIPLIER: 12,
    CRUSH_ENTRY_COST: 10,
    CRUSH_STAR_PAYOUTS: { 1: 8, 2: 12, 3: 18 },
    CRUSH_CONTINUE_COST: 10,
    PINBALL_ENTRY_COST: 10,
    PINBALL_EXTRA_BALL_COST: 10,
    PINBALL_PAYOUT_TIERS: { 18000: 8, 32000: 12, 50000: 18, 75000: 28 },
    EIGHTBALL_BETS: [2, 5, 10],
    BINGO_CARD_BUYIN: 10,
    BINGO_PAYOUTS: { oneLine: 18, fourCorners: 22, twoLines: 35, fullHouse: 85 },
    STOCK_FEE_RATE: 0.015 // 1.5% brokerage spread prevents rapid buy/sell arbitrage & gives house edge
  }
};

const LEDGER_STORAGE_KEY = 'tm_token_ledger_v2';
const TOKENS_BALANCE_KEY = 'tm_tokens_balance_v2';
const LEGACY_CENTZ_BALANCE_KEY = 'tm_memecentz_balance_v1';
const CENTZ_BALANCE_KEY = 'tm_memecentz_balance_v2';
const CENTZ_DAILY_KEY = 'tm_memecentz_daily_v2';

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
      quests: 0,
      xpConversion: 0
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
        quests: Math.max(0, Number(raw.byCategory?.quests || 0)),
        xpConversion: Math.max(0, Number(raw.byCategory?.xpConversion || 0))
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

export function loadMemeCentzBalance() {
  try {
    const saved = localStorage.getItem(CENTZ_BALANCE_KEY);
    if (saved !== null) {
      return Math.max(0, Math.min(24, Math.floor(Number(saved) || 0)));
    }
    const legacy = localStorage.getItem(LEGACY_CENTZ_BALANCE_KEY);
    if (legacy !== null) {
      const migrated = Math.max(0, Math.min(24, Math.floor((Number(legacy) || 0) / 4)));
      localStorage.setItem(CENTZ_BALANCE_KEY, String(migrated));
      return migrated;
    }
    return 6;
  } catch {
    return 6;
  }
}

export function saveMemeCentzBalance(centz) {
  try {
    localStorage.setItem(CENTZ_BALANCE_KEY, String(Math.max(0, Math.min(24, Math.floor(centz || 0)))));
  } catch {
    // Ignore storage quota restrictions
  }
}

export function loadDailyCentzEarned() {
  const today = getTodayDateString();
  try {
    const raw = JSON.parse(localStorage.getItem(CENTZ_DAILY_KEY) || 'null');
    if (raw && raw.date === today) return Math.max(0, Math.floor(Number(raw.earned || 0)));
  } catch {
    // ignore
  }
  return 0;
}

export function saveDailyCentzEarned(earned) {
  try {
    localStorage.setItem(
      CENTZ_DAILY_KEY,
      JSON.stringify({ date: getTodayDateString(), earned: Math.max(0, Math.floor(earned || 0)) })
    );
  } catch {
    // ignore
  }
}

export function formatMoney(
  tokens = 0,
  { centz = 0, compact = false, sign = false, zero = 'free' } = {}
) {
  const totalCents = Math.round((Number(tokens) || 0) * CURRENCY_BRAND.centsPerToken + (Number(centz) || 0));
  const isNeg = totalCents < 0;
  const absCents = Math.abs(totalCents);
  if (absCents === 0) {
    return zero === 'balance' ? `${CURRENCY_BRAND.symbol}0.00` : 'FREE';
  }
  const prefix = isNeg ? '−' : sign ? '+' : '';
  if (absCents < 100) {
    return `${prefix}${absCents}${CURRENCY_BRAND.cent}`;
  }
  const whole = Math.floor(absCents / 100);
  const rem = absCents % 100;
  if (compact && whole >= 100 && rem === 0) {
    return `${prefix}${CURRENCY_BRAND.symbol}${whole.toLocaleString('en-US')}`;
  }
  return `${prefix}${CURRENCY_BRAND.symbol}${whole.toLocaleString('en-US')}.${String(rem).padStart(2, '0')}`;
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
 * Validates an arcade mini-game payout so free practice rounds can NEVER mint tokens
 * and pretend-token payouts stay bounded by maximum house odds.
 */
export function validateStakedGamePayout({ stakedTokens = 0, rawPayout = 0, maxMultiplier = 55 }) {
  const stake = Math.max(0, Math.floor(Number(stakedTokens) || 0));
  if (stake <= 0) return 0; // Free Practice / Demo mode ALWAYS pays 0 tokens
  const cleanPayout = Math.max(0, Math.floor(Number(rawPayout) || 0));
  return Math.min(cleanPayout, Math.max(stake, stake * maxMultiplier));
}

/**
 * Computes the live state of the XP-to-Token Reactor without reducing total Rank XP.
 * Every 100 unconverted XP mints +5 🪙 (up to 50 🪙/day via the XP Reactor).
 */
export function computeXpConversionState(xp = 0, convertedXp = 0, ledger = null) {
  const { XP_THRESHOLD, TOKENS_MINTED, MAX_DAILY_TOKENS } = ARCADE_ECONOMY_RULES.XP_CONVERSION;
  const totalXp = Math.max(0, Math.floor(Number(xp) || 0));
  const safeConvertedXp = Math.max(0, Math.min(totalXp, Math.floor(Number(convertedXp) || 0)));
  const unconvertedXp = Math.max(0, totalXp - safeConvertedXp);

  const dailyConvertedTokens = Math.max(0, Number(ledger?.byCategory?.xpConversion || 0));
  const globalUsed = Math.max(0, Number(ledger?.totalToday || 0));
  const globalRemaining = Math.max(0, ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS - globalUsed);
  const dailyRemainingTokens = Math.min(
    globalRemaining,
    Math.max(0, MAX_DAILY_TOKENS - dailyConvertedTokens)
  );

  const maxConvertibleUnitsToday = Math.floor(dailyRemainingTokens / TOKENS_MINTED);
  const rawReadyUnits = Math.floor(unconvertedXp / XP_THRESHOLD);
  const readyUnits = Math.min(rawReadyUnits, maxConvertibleUnitsToday);
  const readyTokens = readyUnits * TOKENS_MINTED;

  const progressXp = unconvertedXp % XP_THRESHOLD;
  const progressPct = Math.min(100, Math.round((progressXp / XP_THRESHOLD) * 100));
  const xpRemaining = XP_THRESHOLD - progressXp;

  return {
    xpThreshold: XP_THRESHOLD,
    tokensPerBatch: TOKENS_MINTED,
    maxDailyTokens: MAX_DAILY_TOKENS,
    totalXp,
    convertedXp: safeConvertedXp,
    unconvertedXp,
    rawReadyUnits,
    readyUnits,
    readyTokens,
    progressXp,
    progressPct,
    xpRemaining,
    dailyConvertedTokens,
    dailyRemainingTokens,
    isDailyCapped: dailyRemainingTokens < TOKENS_MINTED
  };
}
