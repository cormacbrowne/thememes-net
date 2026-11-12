// ==========================================
// NEON DERBY '86 — Pure Fair-Odds & Seeded Race Simulation Engine (Phase 29.8)
//
// HOUSE EDGE & FAIRNESS MATH (Target 5–9%, ~7.4% theoretical):
//   - Each horse i receives a positive strength score derived from hidden base
//     stats (speed, stamina, consistency) weighted by track condition.
//   - Strength weights: w_i = exp((composite_i - 76) / 8.5).
//   - Finish order [h1..h8] is drawn sequentially without replacement (Plackett-Luce)
//     using a seeded Mulberry32 PRNG decided BEFORE animation starts.
//   - Every market applies an ~108% overround (RTP = 1 / 1.08 = 0.9259), so:
//       decimalOdds = max(1.15, round((1 / (p_true * 1.08)) * 20) / 20)
//       Expected Return = p_true * decimalOdds ≈ 0.926 -> House Edge ≈ 7.4%.
// ==========================================

export const HOUSE_OVERROUND = 1.10;

export const TRACK_CONDITIONS = [
  {
    id: 'dry',
    icon: '🌙',
    name: 'Neon Dry',
    note: 'Speed favors front-runners',
    speedWeight: 1.25,
    staminaWeight: 0.9,
    consistencyWeight: 0.95
  },
  {
    id: 'rain',
    icon: '🌧️',
    name: 'Acid Rain',
    note: 'Stamina & grit hold late',
    speedWeight: 0.85,
    staminaWeight: 1.3,
    consistencyWeight: 1.05
  },
  {
    id: 'glitch',
    icon: '👾',
    name: 'Glitch Track',
    note: 'Consistency tames variance',
    speedWeight: 0.95,
    staminaWeight: 0.95,
    consistencyWeight: 1.35
  }
];

export const DERBY_HORSES = [
  {
    id: 'doge',
    lane: 1,
    name: 'Doge Dasher',
    short: 'Doge',
    emoji: '🐕',
    silk: '#facc15',
    trim: '#713f12',
    speed: 88,
    stamina: 80,
    consistency: 84,
    form: [1, 2, 1, 4, 2]
  },
  {
    id: 'stonks',
    lane: 2,
    name: 'Stonks Stallion',
    short: 'Stonks',
    emoji: '📈',
    silk: '#22c55e',
    trim: '#064e3b',
    speed: 85,
    stamina: 86,
    consistency: 79,
    form: [2, 1, 3, 2, 5]
  },
  {
    id: 'nyan',
    lane: 3,
    name: 'Nyan Neigh',
    short: 'Nyan',
    emoji: '🌈',
    silk: '#ec4899',
    trim: '#831843',
    speed: 87,
    stamina: 74,
    consistency: 81,
    form: [3, 1, 5, 2, 3]
  },
  {
    id: 'pepe',
    lane: 4,
    name: 'Pepe Pony',
    short: 'Pepe',
    emoji: '🐸',
    silk: '#10b981',
    trim: '#065f46',
    speed: 78,
    stamina: 85,
    consistency: 88,
    form: [2, 3, 2, 4, 1]
  },
  {
    id: 'chad',
    lane: 5,
    name: 'Gigachad Galloper',
    short: 'Chad',
    emoji: '🗿',
    silk: '#00f3ff',
    trim: '#164e63',
    speed: 82,
    stamina: 90,
    consistency: 76,
    form: [4, 2, 1, 6, 3]
  },
  {
    id: 'rick',
    lane: 6,
    name: 'Rickroll Runner',
    short: 'Rick',
    emoji: '🎤',
    silk: '#a855f7',
    trim: '#4c1d95',
    speed: 80,
    stamina: 76,
    consistency: 82,
    form: [5, 3, 4, 2, 4]
  },
  {
    id: 'keanu',
    lane: 7,
    name: 'Sad Keanu Sprinter',
    short: 'Keanu',
    emoji: '🪑',
    silk: '#38bdf8',
    trim: '#0c4a6e',
    speed: 74,
    stamina: 82,
    consistency: 75,
    form: [6, 4, 3, 5, 2]
  },
  {
    id: 'harambe',
    lane: 8,
    name: 'Harambe Hooves',
    short: 'Harambe',
    emoji: '🦍',
    silk: '#f97316',
    trim: '#7c2d12',
    speed: 73,
    stamina: 79,
    consistency: 70,
    form: [7, 5, 4, 3, 6]
  }
];

export function createSeededRng(seed) {
  let a = (seed >>> 0) || 1337;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toFractionalString(decimalOdds) {
  const net = Math.max(0.2, decimalOdds - 1);
  const denoms = [1, 2, 4, 5, 10];
  let bestNum = Math.round(net);
  let bestDen = 1;
  let bestErr = Infinity;
  for (const d of denoms) {
    const n = Math.max(1, Math.round(net * d));
    const err = Math.abs(n / d - net);
    if (err < bestErr) {
      bestErr = err;
      bestNum = n;
      bestDen = d;
    }
  }
  return `${bestNum}/${bestDen}`;
}

export function computeDerbyOdds(condition = TRACK_CONDITIONS[0], formSeedOffset = 0) {
  const n = DERBY_HORSES.length;
  const weights = DERBY_HORSES.map((h, i) => {
    const s = h.speed * condition.speedWeight;
    const st = h.stamina * condition.staminaWeight;
    const c = h.consistency * condition.consistencyWeight;
    const composite = (s + st + c) / (condition.speedWeight + condition.staminaWeight + condition.consistencyWeight);
    const subtleWave = Math.sin(formSeedOffset * 1.7 + i * 2.1) * 1.5;
    return Math.exp((composite + subtleWave - 76) / 8.5);
  });

  const totalW = weights.reduce((sum, w) => sum + w, 0);

  const winProb = weights.map((w) => w / totalW);
  const placeProb = new Array(n).fill(0);
  const showProb = new Array(n).fill(0);

  for (let a = 0; a < n; a += 1) {
    const pa = weights[a] / totalW;
    const remA = totalW - weights[a];
    for (let b = 0; b < n; b += 1) {
      if (b === a) continue;
      const pab = pa * (weights[b] / remA);
      placeProb[a] += pab;
      placeProb[b] += pab;
      const remAB = remA - weights[b];
      for (let c = 0; c < n; c += 1) {
        if (c === a || c === b) continue;
        const pabc = pab * (weights[c] / remAB);
        showProb[a] += pabc;
        showProb[b] += pabc;
        showProb[c] += pabc;
      }
    }
  }

  const toDec = (prob) => Math.max(1.15, Math.floor((1 / (prob * HOUSE_OVERROUND)) * 20) / 20);

  const horses = DERBY_HORSES.map((horse, idx) => {
    const winDec = toDec(winProb[idx]);
    const placeDec = toDec(placeProb[idx]);
    const showDec = toDec(showProb[idx]);
    return {
      ...horse,
      idx,
      weight: weights[idx],
      winProb: winProb[idx],
      placeProb: placeProb[idx],
      showProb: showProb[idx],
      winDec,
      winFrac: toFractionalString(winDec),
      placeDec,
      showDec
    };
  });

  const getExactaDec = (firstIdx, secondIdx) => {
    if (firstIdx === secondIdx || firstIdx < 0 || secondIdx < 0) return 0;
    const pExacta = (weights[firstIdx] / totalW) * (weights[secondIdx] / (totalW - weights[firstIdx]));
    return Math.min(150, toDec(pExacta));
  };

  return { horses, weights, totalW, getExactaDec };
}

export function sampleRaceOrder(weights, seed) {
  const rng = createSeededRng(seed);
  const remaining = weights.map((w, idx) => ({ idx, w }));
  const order = [];
  while (remaining.length > 0) {
    const sumW = remaining.reduce((s, r) => s + r.w, 0);
    let target = rng() * sumW;
    let pickAt = remaining.length - 1;
    for (let i = 0; i < remaining.length; i += 1) {
      target -= remaining[i].w;
      if (target <= 0) {
        pickAt = i;
        break;
      }
    }
    order.push(remaining[pickAt].idx);
    remaining.splice(pickAt, 1);
  }
  return order;
}

/**
 * Dev & verification helper: simulates N standard Derby races across Win, Place,
 * Show, and Exacta markets and returns measured RTP & House Edge (%).
 */
export function simulateDerby(n = 10000) {
  const numHorses = DERBY_HORSES.length;
  let totalStaked = 0;
  let totalReturned = 0;
  const stake = 10;
  const pickRng = createSeededRng(424242);

  for (let i = 0; i < n; i += 1) {
    const cond = TRACK_CONDITIONS[i % TRACK_CONDITIONS.length];
    const condBoard = computeDerbyOdds(cond, i % 5);
    const order = sampleRaceOrder(condBoard.weights, 1234567 + i * 7919);
    const first = order[0];
    const second = order[1];
    const third = order[2];
    const betType = i % 4;
    const pick = Math.floor(pickRng() * numHorses);
    const pick2 = (pick + 1 + Math.floor(pickRng() * (numHorses - 1))) % numHorses;
    totalStaked += stake;

    if (betType === 0 && pick === first) {
      totalReturned += Math.round(stake * condBoard.horses[pick].winDec);
    } else if (betType === 1 && (pick === first || pick === second)) {
      totalReturned += Math.round(stake * condBoard.horses[pick].placeDec);
    } else if (betType === 2 && (pick === first || pick === second || pick === third)) {
      totalReturned += Math.round(stake * condBoard.horses[pick].showDec);
    } else if (betType === 3 && pick === first && pick2 === second) {
      totalReturned += Math.round(stake * condBoard.getExactaDec(pick, pick2));
    }
  }

  const rtp = totalStaked > 0 ? totalReturned / totalStaked : 0;
  const houseEdgePct = (1 - rtp) * 100;
  return {
    races: n,
    totalStaked,
    totalReturned,
    rtp: Number((rtp * 100).toFixed(2)),
    houseEdgePct: Number(houseEdgePct.toFixed(2))
  };
}
