// ==========================================
// NEON SLOT ARCADE CATALOG & ENGINE MATH
// 5 Distinct Machines (House Always Wins ~88-90% RTP):
//   1. bandit85         — Classic 1985 3-Reel One-Arm Bandit (Authentic Stepper, Hold/Nudge + Fever Accumulator)
//   2. neon_special     — Neon Supernova Special '86 (5x3, 6 Interactive Powerups, Laser Chase Lights)
//   3. silver_mustang   — Midnight Diner '86 (5x3, 5/15/25 Lines, Lucky Lou the fry cook)
//   4. lightning_vault  — Neon Thunder Vault 5000 (5x3, 4 Progressives, Hold & Spin Lock-It)
//   5. buffalo_stampede — Cyber Herd '86 (5x4, 1024 Ways, Bonus Wheel & Cascade Wilds)
// ==========================================

export const NEON_SPECIAL_POWERUPS = [
  {
    id: 'laser_wild',
    icon: '⚡',
    name: 'Laser Wild Reel',
    short: 'WILD REEL',
    desc: 'Fires a vertical laser locking an entire center reel into stacked ⚡ Neon Cyber-Wilds!',
    color: '#00f3ff',
    chargeCost: 2
  },
  {
    id: 'synth_3x',
    icon: '🔥',
    name: '3× Synth Overdrive',
    short: '3× MULT',
    desc: 'Boosts all payline wins on the spin by 3× Turbo Neon Multiplier!',
    color: '#ff2a85',
    chargeCost: 2
  },
  {
    id: 'twin_sync',
    icon: '🎯',
    name: 'Twin-Reel Sync',
    short: 'REEL SYNC',
    desc: 'Locks Reels 2 & 3 in synchronized synth harmony so they land matching symbols!',
    color: '#facc15',
    chargeCost: 2
  },
  {
    id: 'low_zapper',
    icon: '💥',
    name: 'Low-Symbol Zapper',
    short: 'UPGRADE',
    desc: 'Vaporizes Quarters & Cassettes on center reels, upgrading them to Keytars, Polybius & Night Vipers!',
    color: '#a855f7',
    chargeCost: 2
  },
  {
    id: 'hyper_wilds',
    icon: '🌈',
    name: '25-Line Hyper Wilds',
    short: '+2 WILDS',
    desc: 'Drops +2 bonus ⚡ Neon Wilds across the 25 laser paylines!',
    color: '#22c55e',
    chargeCost: 2
  },
  {
    id: 'chopper_siren',
    icon: '🚁',
    name: 'Night Viper Siren Raid',
    short: 'CHOPPER',
    desc: 'Summons Night Viper & Sky Patrol searchlights — boosts 🚁 high symbols + triggers flyby on wins!',
    color: '#38bdf8',
    chargeCost: 3
  }
];

export const SLOT_MACHINES = [
  {
    id: 'bandit85',
    name: "One-Arm Bandit '85",
    shortName: "Bandit '85",
    badge: '1985 STEPPER',
    tag: '3-Reel Mechanical • 25¢ Quarter Slot • Hold & Nudge',
    icon: '🎰',
    accent: '#facc15',
    marqueeSub: '★ CLASSIC 1985 NEON 25¢ STEPPER ★',
    eraYear: '1985',
    coinDenom: '25¢',
    payGlassTitle: 'NEON BOULEVARD • 25¢ QUARTER MECHANICAL 3-REEL STEPPER (CIRCA 1985)',
    houseEdgeLabel: '~11.5% house edge • play-money only, just for fun',
    description:
      'Retro 1985-style 3-reel chrome-arm stepper! 25¢ quarter play with physical center wire payline, Hold/Nudge, Streak Fever & mechanical bell clatter.',
    maxMult: 75,
    volatility: 'Medium'
  },
  {
    id: 'neon_special',
    name: "Neon Supernova Special '86",
    shortName: 'Neon Special',
    badge: '⚡ 6 POWERUPS',
    tag: '5×3 • 25 Laser Lines • Flashing Chase Lights & Powerups',
    icon: '🎆',
    accent: '#ff2a85',
    marqueeSub: '★ 1986 LASER SPECIAL • 6 POWERUPS • HOUSE ALWAYS WINS ★',
    eraYear: '1986',
    coinDenom: '25¢ – M$25 VIP',
    payGlassTitle: 'STARDOME ARCADE 1986 • NEON OVERDRIVE POWERUP REACTOR (~11.5% HOUSE EDGE)',
    houseEdgeLabel: '~11.5% house edge • play-money only, just for fun',
    isNeonSpecial: true,
    isHighRollerNeon: true,
    neonTheme: 'laser-magenta',
    vipLabel: '⚡ LASER NEON • UP TO M$25 VIP',
    description:
      'Flagship 1986 flashing neon laser slot! Multi-color chasing marquee bulbs, 6 explosive Powerups (Laser Wild Reel, 3× Synth, Twin Sync, Zapper, Hyper Wilds & Night Viper Raid) with retro house-always-wins odds (play-money only)!',
    maxMult: 120,
    volatility: 'High'
  },
  {
    id: 'silver_mustang',
    name: "Midnight Diner '86",
    shortName: "Diner '86",
    badge: 'LUCKY LOU',
    tag: '5×3 • 25 Lines • 25¢ Quarter • Coffee Free Spins',
    icon: '☕',
    accent: '#ef4444',
    marqueeSub: '★ MIDNIGHT DINER • ORDER UP! ★',
    eraYear: '1985',
    coinDenom: '25¢',
    payGlassTitle: 'MIDNIGHT DINER • 25¢ COIN-OP CABINET (1985 ODDS)',
    houseEdgeLabel: '~12.0% house edge • play-money only, just for fun',
    description:
      'Pull up a stool at the 1986 Midnight Diner! Lucky Lou the fry cook rolls the Golden Orb, brew 10 Coffees for Free Spins, & trigger Pie Wilds!',
    maxMult: 120,
    volatility: 'Med-High'
  },
  {
    id: 'lightning_vault',
    name: 'Neon Thunder Vault 5000',
    shortName: 'Thunder 5000',
    badge: '💎 VIP HIGH-ROLLER',
    tag: '5×3 • 4 Progressives • M$1–M$25 VIP Lock-It Orbs',
    icon: '⚡',
    accent: '#00f3ff',
    marqueeSub: '★ 1986 VIP HIGH-ROLLER • DUAL NEON PLASMA CABINET ★',
    eraYear: '1986',
    coinDenom: 'M$1.00 / M$25 VIP',
    payGlassTitle: 'THUNDER VAULT 5000 • HIGH-ROLLER PROGRESSIVE LOCK-IT CABINET (1986)',
    houseEdgeLabel: '~11.8% house edge • play-money only, just for fun',
    isHighRollerNeon: true,
    isFlagshipHighRoller: true,
    neonTheme: 'plasma-cyan',
    vipLabel: '💎 HIGH-ROLLER FLAGSHIP • MAX M$25–M$31.25 VIP',
    description:
      'Most expensive flagship High-Roller Hold & Spin neon cabinet! Charge the Voltage Surge, toggle Ante Boost, unlock the M$25 VIP chip, and lock 3+ Thunder Orbs for Mini/Minor/Major/Grand!',
    maxMult: 150,
    volatility: 'High'
  },
  {
    id: 'buffalo_stampede',
    name: "Cyber Herd '86",
    shortName: "Herd '86",
    badge: '🔥 HIGH-ROLLER 1024',
    tag: '5×4 • 2×/3× Wilds • M$1–M$25 VIP Bonus Wheel',
    icon: '🦬',
    accent: '#f97316',
    marqueeSub: '★ 1986 1,024-WAYS HIGH-ROLLER NEON MEGA CABINET ★',
    eraYear: '1986',
    coinDenom: 'M$1.00 / M$25 VIP',
    payGlassTitle: "CYBER HERD '86 • 1,024-WAYS HIGH-ROLLER WIDEBODY CABINET (1986)",
    houseEdgeLabel: '~12.0% house edge • play-money only, just for fun',
    isHighRollerNeon: true,
    neonTheme: 'solar-gold',
    vipLabel: '🔥 WIDEBODY HIGH-ROLLER • UP TO M$25 VIP',
    description:
      'Tall 5×4 widebody neon cabinet! Stack 2×/3× Multiplier Wilds, trigger Chrome Herd upgrades, unlock the M$25 VIP chip, and spin the 8-Wedge Bonus Wheel!',
    maxMult: 140,
    volatility: 'High'
  }
];

export const SLOT_MACHINE_BY_ID = Object.fromEntries(SLOT_MACHINES.map((m) => [m.id, m]));

// ==========================================
// SHARED & MACHINE-SPECIFIC SYMBOLS
// ==========================================
export const SLOT_SYMBOLS = {
  // Classic Bandit '85
  '777': { id: '777', label: 'FLAMING 777', short: '777', color: '#ef4444', mult3: 75 },
  diamond: { id: 'diamond', label: 'NEON DIAMOND', short: 'DIAMOND', color: '#00f3ff', mult3: 36 },
  bar: { id: 'bar', label: 'TRIPLE BAR', short: 'BAR', color: '#facc15', mult3: 22 },
  bell: { id: 'bell', label: 'LIBERTY BELL', short: 'BELL', color: '#f59e0b', mult3: 15 },
  cherry: { id: 'cherry', label: 'TWIN CHERRY', short: 'CHERRY', color: '#e11d48', mult3: 9 },
  watermelon: { id: 'watermelon', label: 'MELON SLICE', short: 'MELON', color: '#16a34a', mult3: 6 },
  lemon: { id: 'lemon', label: 'NEON LEMON', short: 'LEMON', color: '#eab308', mult3: 5 },

  // Midnight Diner '86 (id silver_mustang kept for saved progress)
  dougie: { id: 'dougie', label: 'LUCKY LOU', short: 'LOU', color: '#facc15' },
  orb: { id: 'orb', label: 'GOLDEN ORB WILD', short: 'ORB WILD', color: '#fde047', isWild: true },
  coffee: { id: 'coffee', label: 'BLACK COFFEE', short: 'COFFEE', color: '#fb923c' },
  pie: { id: 'pie', label: 'CHERRY PIE', short: 'PIE', color: '#f43f5e' },
  owlring: { id: 'owlring', label: 'LUCKY EMERALD RING', short: 'RING', color: '#22c55e' },
  redshoes: { id: 'redshoes', label: 'RED DANCING SHOES', short: 'SHOES', color: '#ef4444' },

  // Thunder Vault 5000
  volt7: { id: 'volt7', label: 'VOLT 777', short: 'VOLT 7', color: '#38bdf8' },
  vault: { id: 'vault', label: 'CYBER VAULT', short: 'VAULT', color: '#a855f7' },
  bolt: { id: 'bolt', label: 'THUNDER ORB', short: 'ORB', color: '#00f3ff', isOrb: true },
  wildchip: { id: 'wildchip', label: 'SURGE WILD', short: 'WILD', color: '#facc15', isWild: true },

  // Neon Supernova Special '86
  ns_wild: { id: 'ns_wild', label: 'NEON CYBER WILD', short: 'NEON WILD', color: '#00f3ff', isWild: true },
  ns_orb: { id: 'ns_orb', label: 'PLASMA POWER ORB', short: 'PWR ORB', color: '#a855f7', isScatter: true },
  ns_airwolf: { id: 'ns_airwolf', label: 'NIGHT VIPER CHOPPER', short: 'VIPER', color: '#38bdf8' },
  ns_arcade: { id: 'ns_arcade', label: "'86 ARCADE CABINET", short: 'ARCADE', color: '#ff2a85' },
  ns_synth: { id: 'ns_synth', label: 'DX7 KEYTAR LASER', short: 'KEYTAR', color: '#f472b6' },
  ns_shades: { id: 'ns_shades', label: 'OUTRUN AVIATORS', short: 'SHADES', color: '#facc15' },
  ns_cassette: { id: 'ns_cassette', label: 'CHROME 90 TAPE', short: 'TAPE', color: '#4ade80' },
  ns_quarter: { id: 'ns_quarter', label: '1986 25¢ QUARTER', short: '25¢', color: '#cbd5e1' },

  // Cyber Stampede '86
  buffalo: { id: 'buffalo', label: 'CYBER HERD', short: 'BISON', color: '#f97316' },
  eagle: { id: 'eagle', label: 'NEON EAGLE', short: 'EAGLE', color: '#38bdf8' },
  wolf: { id: 'wolf', label: 'SYNTH WOLF', short: 'WOLF', color: '#c084fc' },
  goldcoin: { id: 'goldcoin', label: 'CHROME HERD', short: 'CHROME', color: '#facc15' },
  wheel: { id: 'wheel', label: 'BONUS WHEEL', short: 'WHEEL', color: '#ec4899', isScatter: true },
  wild2x: { id: 'wild2x', label: '2×/3× WILD', short: 'WILD×', color: '#4ade80', isWild: true }
};

// ==========================================
// 1. CLASSIC BANDIT '85 STRIP & PAYOUTS
// ==========================================
export const BANDIT_REEL_STRIP = [
  '777',
  'lemon',
  'cherry',
  'bar',
  'watermelon',
  'bell',
  'lemon',
  'diamond',
  'cherry',
  'watermelon',
  'bar',
  'lemon',
  'bell',
  'cherry',
  'watermelon',
  'diamond',
  'lemon',
  'bar',
  'cherry',
  'bell',
  'watermelon',
  'lemon'
];

export function wrapBanditStop(idx) {
  const len = BANDIT_REEL_STRIP.length;
  return ((idx % len) + len) % len;
}

export function evaluateBanditPayline(symIds) {
  const [s0, s1, s2] = symIds;

  if (s0 === s1 && s1 === s2) {
    const info = SLOT_SYMBOLS[s0] || SLOT_SYMBOLS.lemon;
    return {
      tier: s0 === '777' ? 'jackpot' : info.mult3 >= 10 ? 'big' : 'triple',
      mult: info.mult3,
      headline:
        s0 === '777'
          ? `🚨 TRIPLE FLAMING 777 JACKPOT! (${info.mult3}× BET!)`
          : `🎰 TRIPLE ${info.label}! (${info.mult3}× BET!)`
    };
  }

  const cherryCount = symIds.filter((s) => s === 'cherry').length;
  if (cherryCount === 2) {
    return {
      tier: 'double',
      mult: 2,
      headline: '🍒🍒 TWIN CHERRIES WINNER! (2× BET)'
    };
  }

  const highSet = new Set(['777', 'diamond', 'bar', 'bell']);
  if ((s0 === s1 && highSet.has(s0)) || (s1 === s2 && highSet.has(s1))) {
    const matched = s0 === s1 ? SLOT_SYMBOLS[s0] : SLOT_SYMBOLS[s1];
    return {
      tier: 'double',
      mult: 2,
      headline: `✨ DOUBLE ${matched.label} PAIR! (2× BET)`
    };
  }

  if (s0 === 'cherry') {
    return {
      tier: 'push',
      mult: 1,
      headline: '🍒 LEFT CHERRY PUSH — BET RETURNED (1×)'
    };
  }

  return {
    tier: 'miss',
    mult: 0,
    headline: 'NO PAYLINE MATCH — PULL THE CHROME ARM AGAIN!'
  };
}

// ==========================================
// 2. MIDNIGHT DINER '86 — LUCKY LOU QUOTES & CALLOUTS
// (T-018, 27 Nov 2026: original diner theme replaced a Twin Peaks tribute; legal would not
// clear a named TV character. Identifiers below keep their old names so nothing else breaks.)
// ==========================================
export const DOUGIE_QUOTES = {
  idle: [
    '☕ Lucky Lou tops up the coffee pot and eyes the glowing orb...',
    '🟡 "Golden orb\'s warming up, hon. Feeling lucky?"',
    '🍳 The griddle hisses. The jukebox flips to a synth ballad.',
    '🥧 "Cherry pie\'s fresh out the oven. Coffee\'s on the house."',
    '🌙 Neon OPEN sign flickers over the empty booths...'
  ],
  spin: [
    '🟡 The golden orb rolls along the diner counter...',
    '🍳 Lucky Lou flips a pancake mid-spin!',
    '🛎️ "Order up!"',
    '☕ Steam curls out of the midnight coffee pot...'
  ],
  smallWin: [
    '🛎️ "Order up — one small win, extra syrup!"',
    '🥧 "Slice of cherry pie for the winner!"',
    '💍 The lucky emerald ring glints on the payline!',
    '👠 Red dancing shoes tap along to the jukebox!'
  ],
  bigWin: [
    '🚨 "ORDER UP!!" — LUCKY LOU HITS THE BELL!!',
    '🚨 "JACKPOT SPECIAL, TABLE FOUR!!" — SIRENS BLARING!!',
    '☕🚨 THE WHOLE DINER CHEERS — BOTTOMLESS WIN!!',
    '🟡🚨 GOLDEN ORB OVERLOAD — SIREN MEGA PAYOUT!!'
  ],
  miss: [
    '🍳 "Burnt the toast. Spin again, hon."',
    '🧢 Lucky Lou straightens his paper hat...',
    '☕ "Pot\'s still brewing." — Spin again to brew Coffee!'
  ],
  bonus: [
    '☕🔥 15/15 BLACK COFFEE! "ORDER UP! FREE SPINS!"',
    '🟡⚡ THE GOLDEN ORB LIGHTS UP THE MIDNIGHT DINER!'
  ]
};

export function pickDougieQuote(bucket = 'idle') {
  const list = DOUGIE_QUOTES[bucket] || DOUGIE_QUOTES.idle;
  return list[Math.floor(Math.random() * list.length)];
}

// ==========================================
// 3. 5x3 VIDEO SLOT PAYLINE PATTERNS (25 LINES)
//    Grid is [col 0..4][row 0..2]
// ==========================================
export const PAYLINES_25 = [
  [1, 1, 1, 1, 1], // 1: Center
  [0, 0, 0, 0, 0], // 2: Top
  [2, 2, 2, 2, 2], // 3: Bottom
  [0, 1, 2, 1, 0], // 4: V
  [2, 1, 0, 1, 2], // 5: Inverted V
  [0, 0, 1, 0, 0], // 6
  [2, 2, 1, 2, 2], // 7
  [1, 0, 0, 0, 1], // 8
  [1, 2, 2, 2, 1], // 9
  [0, 1, 1, 1, 0], // 10
  [2, 1, 1, 1, 2], // 11
  [1, 0, 1, 0, 1], // 12
  [1, 2, 1, 2, 1], // 13
  [0, 1, 0, 1, 0], // 14
  [2, 1, 2, 1, 2], // 15
  [0, 2, 0, 2, 0], // 16
  [2, 0, 2, 0, 2], // 17
  [0, 0, 1, 2, 2], // 18
  [2, 2, 1, 0, 0], // 19
  [1, 0, 2, 0, 1], // 20
  [1, 2, 0, 2, 1], // 21
  [0, 2, 2, 2, 0], // 22
  [2, 0, 0, 0, 2], // 23
  [0, 1, 2, 2, 1], // 24
  [2, 1, 0, 0, 1]  // 25
];

// Weighted symbol tables per 5x3 machine (calibrated for ~88% Vegas RTP — house edge ~12%)
const SILVER_MUSTANG_WEIGHTS = [
  { id: 'cherry', w: 24 },
  { id: 'redshoes', w: 21 },
  { id: 'owlring', w: 18 },
  { id: 'pie', w: 15 },
  { id: 'coffee', w: 12 },
  { id: '777', w: 7 },
  { id: 'dougie', w: 4 },
  { id: 'orb', w: 3.2 } // Wild
];

// Multipliers expressed in *line-bet* units (lineBet = totalBet / activeLines)
const SILVER_MUSTANG_PAYS = {
  dougie: { 3: 14, 4: 50, 5: 220 },
  orb: { 3: 18, 4: 65, 5: 260 },
  '777': { 3: 10, 4: 34, 5: 130 },
  coffee: { 3: 8, 4: 22, 5: 75 },
  pie: { 3: 6, 4: 17, 5: 55 },
  owlring: { 3: 5, 4: 13, 5: 40 },
  redshoes: { 3: 4, 4: 9, 5: 28 },
  cherry: { 3: 3, 4: 7, 5: 20 }
};

const LIGHTNING_VAULT_WEIGHTS = [
  { id: 'lemon', w: 23 },
  { id: 'cherry', w: 21 },
  { id: 'bell', w: 16 },
  { id: 'bar', w: 14 },
  { id: 'diamond', w: 11 },
  { id: 'vault', w: 8 },
  { id: 'volt7', w: 6 },
  { id: 'wildchip', w: 3.4 },
  { id: 'bolt', w: 4.8 } // Trigger Hold & Spin with 3+
];

const LIGHTNING_VAULT_PAYS = {
  volt7: { 3: 22, 4: 80, 5: 280 },
  wildchip: { 3: 26, 4: 95, 5: 340 },
  vault: { 3: 15, 4: 48, 5: 160 },
  diamond: { 3: 11, 4: 34, 5: 110 },
  bar: { 3: 8, 4: 24, 5: 75 },
  bell: { 3: 6, 4: 16, 5: 50 },
  cherry: { 3: 4.5, 4: 12, 5: 34 },
  lemon: { 3: 3.5, 4: 9, 5: 26 }
};

const BUFFALO_WEIGHTS = [
  { id: 'lemon', w: 24 },
  { id: 'cherry', w: 22 },
  { id: 'wolf', w: 16 },
  { id: 'eagle', w: 14 },
  { id: 'goldcoin', w: 11 },
  { id: 'buffalo', w: 8 },
  { id: 'wild2x', w: 2.8 },
  { id: 'wheel', w: 3.2 }
];

const BUFFALO_PAYS = {
  buffalo: { 3: 0.038, 4: 0.135, 5: 0.55 },
  goldcoin: { 3: 0.028, 4: 0.095, 5: 0.38 },
  eagle: { 3: 0.020, 4: 0.068, 5: 0.25 },
  wolf: { 3: 0.015, 4: 0.05, 5: 0.19 },
  cherry: { 3: 0.008, 4: 0.026, 5: 0.09 },
  lemon: { 3: 0.006, 4: 0.020, 5: 0.07 }
};

// Neon Supernova Special '86 — calibrated so base + 6 powerups + free spins yield ~88.5% RTP (house always wins ~11.5%)
const NEON_SPECIAL_WEIGHTS = [
  { id: 'ns_quarter', w: 25 },
  { id: 'ns_cassette', w: 22 },
  { id: 'ns_shades', w: 18 },
  { id: 'ns_synth', w: 15 },
  { id: 'ns_arcade', w: 11 },
  { id: 'ns_airwolf', w: 7 },
  { id: 'ns_wild', w: 3.1 },
  { id: 'ns_orb', w: 3.9 }
];

const NEON_SPECIAL_PAYS = {
  ns_wild: { 3: 20, 4: 60, 5: 200 },
  ns_airwolf: { 3: 15, 4: 46, 5: 155 },
  ns_arcade: { 3: 9.5, 4: 26, 5: 78 },
  ns_synth: { 3: 6.5, 4: 16, 5: 48 },
  ns_shades: { 3: 4.8, 4: 12, 5: 34 },
  ns_cassette: { 3: 3.6, 4: 8.5, 5: 24 },
  ns_quarter: { 3: 2.6, 4: 6.5, 5: 17 }
};

function pickWeighted(weights, rng = Math.random) {
  let total = 0;
  for (let i = 0; i < weights.length; i += 1) total += weights[i].w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i].w;
    if (r <= 0) return weights[i].id;
  }
  return weights[0].id;
}

export function generateVideoGrid(
  machineId,
  {
    cols = 5,
    rows = 3,
    anteOrbBoost = false,
    goldUpgrade = false,
    pieWildReel = false,
    lockedCols = null,
    prevGrid = null,
    neonPowerups = null
  } = {},
  rng = Math.random
) {
  let weights = SILVER_MUSTANG_WEIGHTS;
  if (machineId === 'lightning_vault') {
    weights = LIGHTNING_VAULT_WEIGHTS.map((entry) =>
      entry.id === 'bolt' && anteOrbBoost ? { ...entry, w: entry.w * 1.22 } : entry
    );
  } else if (machineId === 'buffalo_stampede') {
    weights = BUFFALO_WEIGHTS.map((entry) => {
      if (!goldUpgrade) return entry;
      if (entry.id === 'lemon' || entry.id === 'cherry') return { ...entry, w: 10 };
      if (entry.id === 'buffalo' || entry.id === 'goldcoin') return { ...entry, w: entry.w + 4 };
      return entry;
    });
  } else if (machineId === 'neon_special') {
    weights = NEON_SPECIAL_WEIGHTS.map((entry) => {
      if (neonPowerups?.low_zapper) {
        if (entry.id === 'ns_quarter' || entry.id === 'ns_cassette') return { ...entry, w: entry.w * 0.42 };
        if (entry.id === 'ns_airwolf' || entry.id === 'ns_arcade') return { ...entry, w: entry.w * 1.35 };
      }
      if (neonPowerups?.chopper_siren && entry.id === 'ns_airwolf') {
        return { ...entry, w: entry.w * 1.75 };
      }
      return entry;
    });
  }

  const grid = [];
  for (let c = 0; c < cols; c += 1) {
    if (lockedCols && lockedCols[c] && prevGrid && prevGrid[c]) {
      grid.push([...prevGrid[c]]);
      continue;
    }
    const col = [];
    for (let r = 0; r < rows; r += 1) {
      // Wilds typically appear on Reels 2..5 (cols 1..4) in Vegas video slots, except powerup drops
      let sym = pickWeighted(weights, rng);
      if (c === 0 && (sym === 'orb' || sym === 'wildchip' || sym === 'wild2x' || sym === 'ns_wild')) {
        sym =
          machineId === 'silver_mustang'
            ? 'dougie'
            : machineId === 'lightning_vault'
              ? 'volt7'
              : machineId === 'neon_special'
                ? 'ns_arcade'
                : 'buffalo';
      }
      // Scatter max 1 per reel for clean scatter counts
      if (sym === 'wheel' && col.includes('wheel')) {
        sym = 'goldcoin';
      }
      if (sym === 'ns_orb' && col.includes('ns_orb')) {
        sym = 'ns_synth';
      }
      col.push(sym);
    }
    if (pieWildReel && c === 2) {
      col[0] = 'orb';
      col[1] = 'orb';
      col[2] = 'orb';
    }
    grid.push(col);
  }

  // Apply Neon Supernova Special interactive powerup board transforms
  if (machineId === 'neon_special' && neonPowerups) {
    if (neonPowerups.laser_wild) {
      const targetCol = 1 + Math.floor(rng() * 3); // reel 2, 3, or 4
      grid[targetCol] = ['ns_wild', 'ns_wild', 'ns_wild'];
    }
    if (neonPowerups.twin_sync) {
      // Copy Reel 2 onto Reel 3 in Neon Twin-Sync harmony
      grid[2] = [...grid[1]];
    }
    if (neonPowerups.hyper_wilds) {
      const cA = 1 + Math.floor(rng() * 2);
      const rA = Math.floor(rng() * 3);
      const cB = 3 + Math.floor(rng() * 2);
      const rB = Math.floor(rng() * 3);
      grid[cA][rA] = 'ns_wild';
      grid[cB][rB] = 'ns_wild';
    }
  }

  return grid;
}

/**
 * Evaluates a 5x3 video slot grid across `activeLines` paylines.
 */
export function evaluate5x3Paylines(machineId, grid, activeLines = 25, spinMult = 1) {
  const pays =
    machineId === 'lightning_vault'
      ? LIGHTNING_VAULT_PAYS
      : machineId === 'neon_special'
        ? NEON_SPECIAL_PAYS
        : SILVER_MUSTANG_PAYS;
  const wildId =
    machineId === 'lightning_vault'
      ? 'wildchip'
      : machineId === 'neon_special'
        ? 'ns_wild'
        : 'orb';
  const fallbackSym = machineId === 'neon_special' ? 'ns_quarter' : 'cherry';
  const linesToCheck = PAYLINES_25.slice(0, activeLines);

  let totalLineMult = 0; // Sum of line-bet multipliers
  const winningCells = new Set(); // "c,r"
  const winningLines = [];
  let bestCount = 0;
  let bestSym = null;

  linesToCheck.forEach((pattern, lineIdx) => {
    const syms = pattern.map((row, col) => grid?.[col]?.[row] || fallbackSym);
    // Determine target paying symbol (first non-wild, or wild if all wilds)
    let target = syms.find((s) => s !== wildId);
    if (!target) target = wildId;
    if (!pays[target]) return;

    let matchLen = 0;
    let hasWild = false;
    for (let c = 0; c < 5; c += 1) {
      const s = syms[c];
      if (s === target || s === wildId) {
        if (s === wildId) hasWild = true;
        matchLen += 1;
      } else {
        break;
      }
    }

    const linePay = pays[target]?.[matchLen] || 0;
    if (linePay > 0) {
      const wildBoost = hasWild && target !== wildId ? 1.5 : 1;
      totalLineMult += linePay * wildBoost;
      winningLines.push({ lineIdx: lineIdx + 1, sym: target, matchLen, linePay });
      for (let c = 0; c < matchLen; c += 1) {
        winningCells.add(`${c},${pattern[c]}`);
      }
      if (matchLen > bestCount || (matchLen === bestCount && linePay > (pays[bestSym]?.[bestCount] || 0))) {
        bestCount = matchLen;
        bestSym = target;
      }
    }
  });

  // Convert total line-bet multiplier back to total-bet multiplier
  const totalBetMult = Number(((totalLineMult / Math.max(1, activeLines)) * spinMult).toFixed(2));
  return {
    totalBetMult,
    winningLines,
    winningCells,
    bestCount,
    bestSym
  };
}

/**
 * Evaluates a 5x4 Cyber Stampede grid using 1,024 Ways to Win (left-to-right adjacent columns).
 */
export function evaluateBuffalo1024Ways(grid, wildMultipliers = {}, spinMult = 1) {
  const cols = 5;
  const rows = 4;
  const wildId = 'wild2x';
  const checkedSymbols = Object.keys(BUFFALO_PAYS);

  let totalMult = 0;
  const winningCells = new Set();
  const matchedWays = [];

  checkedSymbols.forEach((sym) => {
    const colMatches = [];
    for (let c = 0; c < cols; c += 1) {
      const matchingRows = [];
      let colWildBoost = 1;
      for (let r = 0; r < rows; r += 1) {
        const cell = grid?.[c]?.[r] || 'lemon';
        if (cell === sym || cell === wildId) {
          matchingRows.push(r);
          if (cell === wildId) {
            const wm = wildMultipliers[`${c},${r}`] || 2;
            colWildBoost = Math.max(colWildBoost, wm);
          }
        }
      }
      if (matchingRows.length === 0) break;
      colMatches.push({ c, rows: matchingRows, colWildBoost });
    }

    const matchLen = colMatches.length;
    const basePay = BUFFALO_PAYS[sym]?.[matchLen] || 0;
    if (basePay > 0) {
      let ways = 1;
      let wildProd = 1;
      colMatches.forEach((cm) => {
        ways *= cm.rows.length;
        wildProd *= cm.colWildBoost;
        cm.rows.forEach((r) => winningCells.add(`${cm.c},${r}`));
      });
      const cappedWild = Math.min(4, wildProd);
      const symMult = basePay * ways * cappedWild;
      totalMult += symMult;
      matchedWays.push({ sym, matchLen, ways, wildProd: cappedWild, symMult });
    }
  });

  return {
    totalBetMult: Number((totalMult * spinMult).toFixed(2)),
    winningCells,
    matchedWays
  };
}

// ==========================================
// 4. THUNDER VAULT HOLD & SPIN ORB GENERATOR
// ==========================================
export function rollLightningOrbValue(rng = Math.random) {
  const r = rng();
  if (r < 0.025) return { type: 'minor', label: 'MINOR', mult: 20, color: '#a855f7' };
  if (r < 0.09) return { type: 'mini', label: 'MINI', mult: 10, color: '#38bdf8' };
  if (r < 0.22) return { type: 'cash', label: '4×', mult: 4, color: '#facc15' };
  if (r < 0.44) return { type: 'cash', label: '3×', mult: 3, color: '#22d3ee' };
  if (r < 0.72) return { type: 'cash', label: '2×', mult: 2, color: '#4ade80' };
  return { type: 'cash', label: '1×', mult: 1, color: '#93c5fd' };
}

// ==========================================
// 5. CYBER STAMPEDE 8-WEDGE BONUS WHEEL
// ==========================================
export const BUFFALO_WHEEL_SEGMENTS = [
  { label: '2×', mult: 2, color: '#0284c7', weight: 30 },
  { label: '3×', mult: 3, color: '#16a34a', weight: 24 },
  { label: '5×', mult: 5, color: '#7c3aed', weight: 18 },
  { label: '8×', mult: 8, color: '#db2777', weight: 13 },
  { label: '12×', mult: 12, color: '#ea580c', weight: 8 },
  { label: '20×', mult: 20, color: '#eab308', weight: 4 },
  { label: '35×', mult: 35, color: '#dc2626', weight: 2 },
  { label: '60× 🚨', mult: 60, color: '#facc15', weight: 1 }
];

export function spinBuffaloWheelSegment(rng = Math.random) {
  let total = 0;
  BUFFALO_WHEEL_SEGMENTS.forEach((s) => {
    total += s.weight;
  });
  let r = rng() * total;
  for (let i = 0; i < BUFFALO_WHEEL_SEGMENTS.length; i += 1) {
    r -= BUFFALO_WHEEL_SEGMENTS[i].weight;
    if (r <= 0) return { index: i, segment: BUFFALO_WHEEL_SEGMENTS[i] };
  }
  return { index: 0, segment: BUFFALO_WHEEL_SEGMENTS[0] };
}
