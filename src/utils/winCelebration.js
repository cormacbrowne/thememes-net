import { sfx } from './soundEngine';

// ==========================================
// GLOBAL VARIED WIN CELEBRATION BUS
// Fires distinct, unmistakable visual + audio win celebrations across all games
// so players immediately know they won — and never know which style is coming!
// ==========================================

export const WIN_THEMES = [
  'gold-fountain',
  'lightning-surge',
  'synth-lasers',
  'comic-confetti',
  'delorean-88mph',
  'disco-strobe'
];

export const RARE_WIN_THEMES = [
  'ufo-abduction',
  'meteor-vault',
  'hyperdrive-aurora',
  'arcade-fireworks'
];

const THEME_LABELS = {
  'gold-fountain': ['🪙 COIN SHOWER!', '💰 PURE GOLD!', '🏆 PAYDAY!'],
  'lightning-surge': ['⚡ HIGH VOLTAGE!', '⚡ LIGHTNING WIN!', '🌩️ 1.21 GIGAWATTS!'],
  'synth-lasers': ['🌈 NEON LASER WIN!', '🔥 SYNTHWAVE HIT!', '✨ ULTRA COMBO!'],
  'comic-confetti': ['🎉 BOOM! WINNER!', '💥 CERTIFIED W!', '🎊 JACKPOT POP!'],
  'delorean-88mph': ['🏎️ 88 MPH WIN!', '⚡ GREAT SCOTT!', '🔥 OUTATIME PAYOUT!'],
  'disco-strobe': ['🪩 DISCO FEVER!', '🌟 STARBURST WIN!', '💃 GROOVY PAYOUT!'],
  'ufo-abduction': [
    '🛸 MOTHERSHIP JACKPOT!',
    '👽 ABDUCTED BY WEALTH!',
    '🌌 COSMIC TRACTOR WIN!'
  ],
  'meteor-vault': [
    '☄️ GOLDEN METEOR STRIKE!',
    '💎 24K VAULT BREACH!',
    '🔥 TREASURY OVERLOAD!'
  ],
  'hyperdrive-aurora': [
    '🌌 QUANTUM 88 MPH!',
    '⚡ HYPERDRIVE OVERCLOCK!',
    '🚀 LUDICROUS PAYOUT!'
  ],
  'arcade-fireworks': [
    '🎆 GRAND FINALE WIN!',
    '👑 CHAMPIONSHIP JACKPOT!',
    '🎇 SKYLINE MEGA BLAST!'
  ]
};

const RARE_BADGES = {
  'ufo-abduction': '🛸 ULTRA RARE • MOTHERSHIP EVENT',
  'meteor-vault': '☄️ ULTRA RARE • GOLDEN METEOR',
  'hyperdrive-aurora': '🌌 MYTHIC • HYPERDRIVE OVERCLOCK',
  'arcade-fireworks': '🎆 LEGENDARY • GRAND FINALE'
};

const RARE_COOLDOWN_MS = 25000;
const listeners = new Set();
let lastTheme = null;
let lastRareTheme = null;
let lastWasRare = false;
let lastRareTs = 0;
let lastCelebrationTs = 0;
let seqCounter = 0;

export function subscribeWinCelebration(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function wasCelebrationRecentlyTriggered(windowMs = 450) {
  return Date.now() - lastCelebrationTs < windowMs;
}

function resolveRewardTier({ numericAmount, unit, multiplier, tier }) {
  const isTokenLike = unit === '🪙' || unit === 'CHIPS' || unit === 'FREE 🪙';
  const scoreAmt = isTokenLike
    ? numericAmount
    : unit.includes('DEMO')
    ? numericAmount * 10
    : Math.round(numericAmount / 12);

  if (scoreAmt >= 320 || multiplier >= 30 || (tier === 'jackpot' && scoreAmt >= 120)) {
    return { rewardTier: 'legendary', rank: 5, label: '👑 LEGENDARY JACKPOT!' };
  }
  if (scoreAmt >= 100 || multiplier >= 12 || tier === 'mega' || tier === 'jackpot') {
    return { rewardTier: 'mega', rank: 4, label: '🔥 MEGA REWARD!' };
  }
  if (scoreAmt >= 35 || multiplier >= 5 || tier === 'big') {
    return { rewardTier: 'big', rank: 3, label: '⚡ BIG ARCADE WIN!' };
  }
  if (scoreAmt >= 14 || multiplier >= 2.2) {
    return { rewardTier: 'nice', rank: 2, label: '✨ NICE WIN!' };
  }
  return { rewardTier: 'micro', rank: 1, label: '' };
}

export function triggerWinCelebration({
  amount = 0,
  unit = '🪙',
  game = '',
  headline = '',
  detail = '',
  multiplier = 1,
  tier = 'win',
  theme = null,
  forceRare = false,
  skipSound = false
} = {}) {
  const now = Date.now();
  lastCelebrationTs = now;
  seqCounter += 1;

  const numericAmount = Math.max(0, Math.round(Number(amount) || 0));
  const { rewardTier, rank, label: tierBanner } = resolveRewardTier({
    numericAmount,
    unit: String(unit || '🪙'),
    multiplier: Number(multiplier) || 1,
    tier
  });

  const isMegaWin = rank >= 4;
  const isBig = rank >= 3;

  const explicitRare = Boolean(theme && RARE_WIN_THEMES.includes(theme));
  const explicitNormal = Boolean(theme && WIN_THEMES.includes(theme));

  let isRare = false;
  if (explicitRare) {
    isRare = true;
  } else if (!explicitNormal && (forceRare || rank === 5)) {
    isRare = true;
  } else if (!explicitNormal && isBig) {
    const cooldownReady = !lastWasRare && now - lastRareTs >= RARE_COOLDOWN_MS;
    if (cooldownReady) {
      const rareChance = rank >= 4 ? 0.55 : 0.15;
      isRare = Math.random() < rareChance;
    }
  }

  let chosenTheme;
  if (isRare) {
    const rareCandidates = RARE_WIN_THEMES.filter((t) => t !== lastRareTheme);
    chosenTheme = explicitRare
      ? theme
      : rareCandidates[Math.floor(Math.random() * rareCandidates.length)] || RARE_WIN_THEMES[0];
    lastRareTheme = chosenTheme;
    lastWasRare = true;
    lastRareTs = now;
  } else {
    // Pick a random visual theme without repeating the previous one
    const candidates = WIN_THEMES.filter((t) => t !== lastTheme);
    chosenTheme = explicitNormal
      ? theme
      : candidates[Math.floor(Math.random() * candidates.length)] || WIN_THEMES[0];
    lastTheme = chosenTheme;
    lastWasRare = false;
  }

  const taglines = THEME_LABELS[chosenTheme] || THEME_LABELS['gold-fountain'];
  const kicker = taglines[Math.floor(Math.random() * taglines.length)];
  const rareBadge = isRare ? RARE_BADGES[chosenTheme] || '✨ ULTRA RARE REWARD' : tierBanner;

  let soundVariant = 'silent';
  if (!skipSound) {
    soundVariant = isRare
      ? sfx.playRareWinFanfare?.({ rareTheme: chosenTheme, tier, multiplier }) ||
        sfx.playRandomWinFanfare?.({ tier, multiplier }) ||
        'fanfare'
      : sfx.playRandomWinFanfare?.({ tier, multiplier }) || 'fanfare';
  }

  const durationByRank = {
    1: 1650,
    2: 2150,
    3: 2750,
    4: 3500,
    5: 4300
  };

  const payload = {
    id: `win-${now}-${seqCounter}`,
    theme: chosenTheme,
    kicker,
    rareBadge,
    tierBanner,
    rewardTier,
    rewardRank: rank,
    amount: numericAmount,
    unit,
    game,
    headline: headline || (numericAmount > 0 ? `+${numericAmount} ${unit} WON!` : '🏆 WINNER!'),
    detail,
    multiplier,
    tier,
    isBig,
    isMega: isMegaWin,
    isRare,
    soundVariant,
    durationMs: isRare ? Math.max(3600, durationByRank[rank] || 3900) : durationByRank[rank] || 2150
  };

  listeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // ignore subscriber errors
    }
  });

  return payload;
}
