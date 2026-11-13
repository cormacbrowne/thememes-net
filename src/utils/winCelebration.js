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

  const isMegaWin = tier === 'jackpot' || tier === 'mega' || multiplier >= 6;
  const isBig = isMegaWin || tier === 'big' || multiplier >= 4;

  const explicitRare = Boolean(theme && RARE_WIN_THEMES.includes(theme));
  const explicitNormal = Boolean(theme && WIN_THEMES.includes(theme));

  let isRare = false;
  if (explicitRare) {
    isRare = true;
  } else if (!explicitNormal && (forceRare || isBig)) {
    const cooldownReady = !lastWasRare && now - lastRareTs >= RARE_COOLDOWN_MS;
    if (forceRare) {
      isRare = true;
    } else if (cooldownReady) {
      const rareChance = isMegaWin ? 0.2 : 0.1;
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
  const rareBadge = isRare ? RARE_BADGES[chosenTheme] || '✨ ULTRA RARE REWARD' : '';

  let soundVariant = 'silent';
  if (!skipSound) {
    soundVariant = isRare
      ? sfx.playRareWinFanfare?.({ rareTheme: chosenTheme, tier, multiplier }) ||
        sfx.playRandomWinFanfare?.({ tier, multiplier }) ||
        'fanfare'
      : sfx.playRandomWinFanfare?.({ tier, multiplier }) || 'fanfare';
  }

  const payload = {
    id: `win-${now}-${seqCounter}`,
    theme: chosenTheme,
    kicker,
    rareBadge,
    amount: Math.max(0, Math.round(Number(amount) || 0)),
    unit,
    game,
    headline: headline || (amount > 0 ? `+${Math.round(amount)} ${unit} WON!` : '🏆 WINNER!'),
    detail,
    multiplier,
    tier,
    isBig,
    isRare,
    soundVariant,
    durationMs: isRare ? 3900 : isBig ? 2600 : 2100
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
