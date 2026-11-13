// ==========================================
// LAS VEGAS SLOT ARCADE CATALOG & ENGINE MATH
// 4 Distinct Machines:
//   1. bandit85       — Classic 1985 3-Reel One-Arm Bandit (Hold/Nudge + Fever Accumulator)
//   2. silver_mustang — Mr. Jackpots: Silver Mustang (5x3, 5/15/25 Lines, Twin Peaks S3 Dougie Jones)
//   3. lightning_vault — Neon Lightning Vault 5000 (5x3, 4 Progressives, Hold & Spin Lock-It)
//   4. buffalo_stampede — Cyber Buffalo Stampede '86 (5x4, 1024 Ways, Bonus Wheel & Cascade Wilds)
// ==========================================

export const SLOT_MACHINES = [
  {
    id: 'bandit85',
    name: "One-Arm Bandit '85",
    shortName: "Bandit '85",
    badge: 'CLASSIC',
    tag: '3-Reel Stepper • Hold & Nudge',
    icon: '🎰',
    accent: '#facc15',
    marqueeSub: '★ FABULOUS 1985 NEON CASINO ★',
    description:
      'Your beloved 3-reel chrome-lever stepper! Features Hold/Nudge, Streak Fever Accumulator & Siren Jackpots.',
    maxMult: 50,
    volatility: 'Medium'
  },
  {
    id: 'silver_mustang',
    name: 'Mr. Jackpots: Silver Mustang',
    shortName: 'Mr. Jackpots',
    badge: 'DOUGIE S3',
    tag: '5×3 • 25 Lines • Coffee Free Spins',
    icon: '☕',
    accent: '#ef4444',
    marqueeSub: '★ SILVER MUSTANG CASINO • HELLOOOOO-O-O! ★',
    description:
      'Twin Peaks S3 Dougie Jones tribute! Follow the Black Lodge Golden Orb, brew 5 Coffees for Free Spins, & trigger Pie Wilds!',
    maxMult: 120,
    volatility: 'Med-High'
  },
  {
    id: 'lightning_vault',
    name: 'Neon Lightning Vault 5000',
    shortName: 'Lightning 5000',
    badge: 'HOLD & SPIN',
    tag: '5×3 • 4 Progressives • Lock-It Orbs',
    icon: '⚡',
    accent: '#00f3ff',
    marqueeSub: '★ HIGH-VOLTAGE VEGAS PROGRESSIVE ★',
    description:
      'Modern Vegas Hold & Spin cabinet! Charge the Voltage Surge, toggle Ante Boost, and lock 3+ Lightning Orbs for Mini/Minor/Major/Grand!',
    maxMult: 150,
    volatility: 'High'
  },
  {
    id: 'buffalo_stampede',
    name: "Cyber Buffalo Stampede '86",
    shortName: "Buffalo '86",
    badge: '1024 WAYS',
    tag: '5×4 • 2×/3× Wilds • Bonus Wheel',
    icon: '🦬',
    accent: '#f97316',
    marqueeSub: '★ 1,024-WAYS VEGAS MEGA CABINET ★',
    description:
      'Tall 5×4 Vegas mega-machine! Stack 2×/3× Multiplier Wilds, trigger Gold Stampede upgrades, and spin the 8-Wedge Bonus Wheel!',
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
  '777': { id: '777', label: 'FLAMING 777', short: '777', color: '#ef4444', mult3: 50 },
  diamond: { id: 'diamond', label: 'NEON DIAMOND', short: 'DIAMOND', color: '#00f3ff', mult3: 25 },
  bar: { id: 'bar', label: 'TRIPLE BAR', short: 'BAR', color: '#facc15', mult3: 15 },
  bell: { id: 'bell', label: 'LIBERTY BELL', short: 'BELL', color: '#f59e0b', mult3: 10 },
  cherry: { id: 'cherry', label: 'TWIN CHERRY', short: 'CHERRY', color: '#e11d48', mult3: 6 },
  watermelon: { id: 'watermelon', label: 'MELON SLICE', short: 'MELON', color: '#16a34a', mult3: 4 },
  lemon: { id: 'lemon', label: 'VEGAS LEMON', short: 'LEMON', color: '#eab308', mult3: 4 },

  // Silver Mustang (Dougie Jones / Twin Peaks Series 3)
  dougie: { id: 'dougie', label: 'MR. JACKPOTS', short: 'DOUGIE', color: '#facc15' },
  orb: { id: 'orb', label: 'GOLDEN ORB WILD', short: 'ORB WILD', color: '#fde047', isWild: true },
  coffee: { id: 'coffee', label: 'BLACK COFFEE', short: 'COFFEE', color: '#fb923c' },
  pie: { id: 'pie', label: 'CHERRY PIE', short: 'PIE', color: '#f43f5e' },
  owlring: { id: 'owlring', label: 'OWL CAVE RING', short: 'OWL RING', color: '#22c55e' },
  redshoes: { id: 'redshoes', label: 'RED SHOES', short: 'SHOES', color: '#ef4444' },

  // Lightning Vault 5000
  volt7: { id: 'volt7', label: 'VOLT 777', short: 'VOLT 7', color: '#38bdf8' },
  vault: { id: 'vault', label: 'CYBER VAULT', short: 'VAULT', color: '#a855f7' },
  bolt: { id: 'bolt', label: 'LIGHTNING ORB', short: 'ORB', color: '#00f3ff', isOrb: true },
  wildchip: { id: 'wildchip', label: 'SURGE WILD', short: 'WILD', color: '#facc15', isWild: true },

  // Cyber Buffalo Stampede '86
  buffalo: { id: 'buffalo', label: 'CYBER BUFFALO', short: 'BUFFALO', color: '#f97316' },
  eagle: { id: 'eagle', label: 'NEON EAGLE', short: 'EAGLE', color: '#38bdf8' },
  wolf: { id: 'wolf', label: 'SYNTH WOLF', short: 'WOLF', color: '#c084fc' },
  goldcoin: { id: 'goldcoin', label: 'GOLD STAMPEDE', short: 'GOLD', color: '#facc15' },
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
          ? '🚨 TRIPLE FLAMING 777 VEGAS JACKPOT! (50× BET!)'
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
// 2. DOUGIE JONES / TWIN PEAKS S3 QUOTES & CALLOUTS
// ==========================================
export const DOUGIE_QUOTES = {
  idle: [
    '☕ "Damn good coffee." — Dougie eyes the glowing orb...',
    '🟡 "Follow the green & gold orb, Mr. Jackpots..."',
    '🎰 Silver Mustang Lady: "Don\'t touch my machine!"',
    '🥧 "Cherry pie & black coffee. Vegas calls."',
    '🕶️ Dougie stares blankly at the flashing buttons...'
  ],
  spin: [
    '🟡 Golden Black Lodge orb hovers over the reels...',
    '🕶️ Dougie presses MAX BET with two fingers...',
    '🎰 "Thank you, Mr. Jackpots!"',
    '☕ Steam rises from the Damn Fine Coffee Pot...'
  ],
  smallWin: [
    '🔔 "Jade give two rides." — Nice line hit!',
    '🥧 "Damn fine cherry pie!"',
    '🟢 Green Owl Ring glints on the payline!',
    '👠 Red shoes tap on the Silver Mustang carpet!'
  ],
  bigWin: [
    '🚨 "HELLOOOOO-O-O!!" — MR. JACKPOTS STRIKES!!',
    '🚨 "THANK YOU, MR. JACKPOTS!! HELLOOOOO-O-O!!"',
    '☕🚨 "COOP?! HELLOOOOO-O-O!!" — SIRENS BLARING!!',
    '🟡🚨 BLACK LODGE ORB OVERLOAD — SIREN MEGA PAYOUT!!'
  ],
  miss: [
    '🕶️ "...Call for help."',
    '👔 Dougie adjusts his green jacket...',
    '☕ "...Case files." — Spin again to brew Coffee!'
  ],
  bonus: [
    '☕🔥 5/5 BLACK COFFEE! "HELLOOOOO-O-O! FREE SPINS!"',
    '🟡⚡ GOLDEN ORB GUIDES THE SILVER MUSTANG!'
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

// Weighted symbol tables per 5x3 machine (calibrated for exciting hits + fair ~92% RTP)
const SILVER_MUSTANG_WEIGHTS = [
  { id: 'cherry', w: 22 },
  { id: 'redshoes', w: 19 },
  { id: 'owlring', w: 16 },
  { id: 'pie', w: 15 },
  { id: 'coffee', w: 13 },
  { id: '777', w: 8 },
  { id: 'dougie', w: 5 },
  { id: 'orb', w: 4 } // Wild
];

// Multipliers expressed in *line-bet* units (lineBet = totalBet / activeLines)
const SILVER_MUSTANG_PAYS = {
  dougie: { 3: 18, 4: 75, 5: 350 },
  orb: { 3: 22, 4: 90, 5: 420 },
  '777': { 3: 14, 4: 45, 5: 180 },
  coffee: { 3: 10, 4: 30, 5: 110 },
  pie: { 3: 8, 4: 22, 5: 75 },
  owlring: { 3: 6, 4: 16, 5: 55 },
  redshoes: { 3: 5, 4: 12, 5: 40 },
  cherry: { 3: 4, 4: 10, 5: 30 }
};

const LIGHTNING_VAULT_WEIGHTS = [
  { id: 'lemon', w: 21 },
  { id: 'cherry', w: 19 },
  { id: 'bell', w: 15 },
  { id: 'bar', w: 13 },
  { id: 'diamond', w: 10 },
  { id: 'vault', w: 8 },
  { id: 'volt7', w: 6 },
  { id: 'wildchip', w: 4 },
  { id: 'bolt', w: 7 } // Trigger Hold & Spin with 3+
];

const LIGHTNING_VAULT_PAYS = {
  volt7: { 3: 16, 4: 65, 5: 300 },
  wildchip: { 3: 20, 4: 80, 5: 360 },
  vault: { 3: 12, 4: 40, 5: 150 },
  diamond: { 3: 9, 4: 28, 5: 95 },
  bar: { 3: 7, 4: 20, 5: 65 },
  bell: { 3: 5, 4: 14, 5: 45 },
  cherry: { 3: 4, 4: 10, 5: 30 },
  lemon: { 3: 3, 4: 9, 5: 25 }
};

const BUFFALO_WEIGHTS = [
  { id: 'lemon', w: 20 },
  { id: 'cherry', w: 19 },
  { id: 'wolf', w: 15 },
  { id: 'eagle', w: 13 },
  { id: 'goldcoin', w: 11 },
  { id: 'buffalo', w: 9 },
  { id: 'wild2x', w: 4 },
  { id: 'wheel', w: 5 }
];

const BUFFALO_PAYS = {
  buffalo: { 3: 1.4, 4: 4.5, 5: 18 },
  goldcoin: { 3: 1.0, 4: 3.2, 5: 12 },
  eagle: { 3: 0.75, 4: 2.2, 5: 8 },
  wolf: { 3: 0.6, 4: 1.8, 5: 6 },
  cherry: { 3: 0.35, 4: 1.0, 5: 3.2 },
  lemon: { 3: 0.3, 4: 0.85, 5: 2.6 }
};

function pickWeighted(weights) {
  let total = 0;
  for (let i = 0; i < weights.length; i += 1) total += weights[i].w;
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i].w;
    if (r <= 0) return weights[i].id;
  }
  return weights[0].id;
}

export function generateVideoGrid(machineId, { cols = 5, rows = 3, anteOrbBoost = false, goldUpgrade = false, pieWildReel = false, lockedCols = null, prevGrid = null } = {}) {
  let weights = SILVER_MUSTANG_WEIGHTS;
  if (machineId === 'lightning_vault') {
    weights = LIGHTNING_VAULT_WEIGHTS.map((entry) =>
      entry.id === 'bolt' && anteOrbBoost ? { ...entry, w: entry.w * 2.1 } : entry
    );
  } else if (machineId === 'buffalo_stampede') {
    weights = BUFFALO_WEIGHTS.map((entry) => {
      if (!goldUpgrade) return entry;
      if (entry.id === 'lemon' || entry.id === 'cherry') return { ...entry, w: 6 };
      if (entry.id === 'buffalo' || entry.id === 'goldcoin') return { ...entry, w: entry.w + 8 };
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
      let sym = pickWeighted(weights);
      if (c === 0 && (sym === 'orb' || sym === 'wildchip' || sym === 'wild2x')) {
        sym = machineId === 'silver_mustang' ? 'dougie' : machineId === 'lightning_vault' ? 'volt7' : 'buffalo';
      }
      // Bonus Wheel scatter max 1 per reel for clean scatter counts
      if (sym === 'wheel' && col.includes('wheel')) {
        sym = 'goldcoin';
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
  return grid;
}

/**
 * Evaluates a 5x3 video slot grid across `activeLines` paylines.
 */
export function evaluate5x3Paylines(machineId, grid, activeLines = 25, spinMult = 1) {
  const pays = machineId === 'lightning_vault' ? LIGHTNING_VAULT_PAYS : SILVER_MUSTANG_PAYS;
  const wildId = machineId === 'lightning_vault' ? 'wildchip' : 'orb';
  const linesToCheck = PAYLINES_25.slice(0, activeLines);

  let totalLineMult = 0; // Sum of line-bet multipliers
  const winningCells = new Set(); // "c,r"
  const winningLines = [];
  let bestCount = 0;
  let bestSym = null;

  linesToCheck.forEach((pattern, lineIdx) => {
    const syms = pattern.map((row, col) => grid[col][row]);
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
  const totalBetMult = Number(((totalLineMult / activeLines) * spinMult).toFixed(2));
  return {
    totalBetMult,
    winningLines,
    winningCells,
    bestCount,
    bestSym
  };
}

/**
 * Evaluates a 5x4 Cyber Buffalo Stampede grid using 1,024 Ways to Win (left-to-right adjacent columns).
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
        const cell = grid[c][r];
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
      const cappedWild = Math.min(9, wildProd);
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
// 4. LIGHTNING VAULT HOLD & SPIN ORB GENERATOR
// ==========================================
export function rollLightningOrbValue() {
  const r = Math.random();
  if (r < 0.03) return { type: 'minor', label: 'MINOR', mult: 30, color: '#a855f7' };
  if (r < 0.11) return { type: 'mini', label: 'MINI', mult: 15, color: '#38bdf8' };
  if (r < 0.25) return { type: 'cash', label: '5×', mult: 5, color: '#facc15' };
  if (r < 0.50) return { type: 'cash', label: '3×', mult: 3, color: '#22d3ee' };
  if (r < 0.78) return { type: 'cash', label: '2×', mult: 2, color: '#4ade80' };
  return { type: 'cash', label: '1×', mult: 1, color: '#93c5fd' };
}

// ==========================================
// 5. CYBER BUFFALO 8-WEDGE BONUS WHEEL
// ==========================================
export const BUFFALO_WHEEL_SEGMENTS = [
  { label: '5×', mult: 5, color: '#0284c7', weight: 25 },
  { label: '8×', mult: 8, color: '#16a34a', weight: 22 },
  { label: '12×', mult: 12, color: '#7c3aed', weight: 18 },
  { label: '20×', mult: 20, color: '#db2777', weight: 14 },
  { label: '35×', mult: 35, color: '#ea580c', weight: 10 },
  { label: '50×', mult: 50, color: '#eab308', weight: 6 },
  { label: '75×', mult: 75, color: '#dc2626', weight: 3 },
  { label: '100× 🚨', mult: 100, color: '#facc15', weight: 2 }
];

export function spinBuffaloWheelSegment() {
  let total = 0;
  BUFFALO_WHEEL_SEGMENTS.forEach((s) => {
    total += s.weight;
  });
  let r = Math.random() * total;
  for (let i = 0; i < BUFFALO_WHEEL_SEGMENTS.length; i += 1) {
    r -= BUFFALO_WHEEL_SEGMENTS[i].weight;
    if (r <= 0) return { index: i, segment: BUFFALO_WHEEL_SEGMENTS[i] };
  }
  return { index: 0, segment: BUFFALO_WHEEL_SEGMENTS[0] };
}
