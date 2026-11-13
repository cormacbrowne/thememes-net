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

const THEME_LABELS = {
  'gold-fountain': ['🪙 COIN SHOWER!', '💰 PURE GOLD!', '🏆 PAYDAY!'],
  'lightning-surge': ['⚡ HIGH VOLTAGE!', '⚡ LIGHTNING WIN!', '🌩️ 1.21 GIGAWATTS!'],
  'synth-lasers': ['🌈 NEON LASER WIN!', '🔥 SYNTHWAVE HIT!', '✨ ULTRA COMBO!'],
  'comic-confetti': ['🎉 BOOM! WINNER!', '💥 CERTIFIED W!', '🎊 JACKPOT POP!'],
  'delorean-88mph': ['🏎️ 88 MPH WIN!', '⚡ GREAT SCOTT!', '🔥 OUTATIME PAYOUT!'],
  'disco-strobe': ['🪩 DISCO FEVER!', '🌟 STARBURST WIN!', '💃 GROOVY PAYOUT!']
};

const listeners = new Set();
let lastTheme = null;
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
  skipSound = false
} = {}) {
  const now = Date.now();
  lastCelebrationTs = now;
  seqCounter += 1;

  // Pick a random visual theme without repeating the previous one
  const candidates = WIN_THEMES.filter((t) => t !== lastTheme);
  const chosenTheme =
    theme && WIN_THEMES.includes(theme)
      ? theme
      : candidates[Math.floor(Math.random() * candidates.length)] || WIN_THEMES[0];
  lastTheme = chosenTheme;

  const isBig = tier === 'jackpot' || tier === 'mega' || tier === 'big' || multiplier >= 4;
  const taglines = THEME_LABELS[chosenTheme] || THEME_LABELS['gold-fountain'];
  const kicker = taglines[Math.floor(Math.random() * taglines.length)];

  let soundVariant = 'silent';
  if (!skipSound) {
    soundVariant = sfx.playRandomWinFanfare?.({ tier, multiplier }) || 'fanfare';
  }

  const payload = {
    id: `win-${now}-${seqCounter}`,
    theme: chosenTheme,
    kicker,
    amount: Math.max(0, Math.round(Number(amount) || 0)),
    unit,
    game,
    headline: headline || (amount > 0 ? `+${Math.round(amount)} ${unit} WON!` : '🏆 WINNER!'),
    detail,
    multiplier,
    tier,
    isBig,
    soundVariant,
    durationMs: isBig ? 2600 : 2100
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
