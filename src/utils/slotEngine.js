// ==========================================
// PURE SLOT ENGINE (Phase 35.7a)
// Decides every spin outcome, feature trigger, hold-and-spin respin,
// bonus wheel spin, and honest anticipation reel BEFORE animation starts.
// Zero React dependencies; accepts injectable `rng = Math.random` for seeded tests.
// ==========================================

import {
  BANDIT_REEL_STRIP,
  BUFFALO_WHEEL_SEGMENTS,
  NEON_SPECIAL_POWERUPS,
  PAYLINES_25,
  SLOT_MACHINE_BY_ID,
  SLOT_SYMBOLS,
  evaluate5x3Paylines,
  evaluateBanditPayline,
  evaluateBuffalo1024Ways,
  generateVideoGrid,
  rollLightningOrbValue,
  spinBuffaloWheelSegment,
  wrapBanditStop
} from '../data/slotMachinesCatalog';
import { validateStakedGamePayout } from './tokenEconomy';

export const SLOT_PAYOUT_CAPS = {
  bandit85: 100,
  silver_mustang: 120,
  lightning_vault: 150,
  buffalo_stampede: 140,
  neon_special: 120
};

export function createSeededRng(seed = 19850819) {
  let s = (Number(seed) >>> 0) || 1;
  return function nextRandom() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Honest anticipation check: only flags reel `c` when previously stopped
 * reels ALREADY keep a top-tier win, scatter/bonus trigger, or progressive alive.
 * Never modifies outcomes.
 */
export function computeBanditAnticipation(stops, heldReels = [false, false, false]) {
  if (!Array.isArray(stops) || stops.length < 3 || heldReels[2]) return [];
  const s0 = BANDIT_REEL_STRIP[wrapBanditStop(stops[0])];
  const s1 = BANDIT_REEL_STRIP[wrapBanditStop(stops[1])];
  if (s0 === s1 && ['777', 'diamond', 'bar', 'bell'].includes(s0)) {
    return [2];
  }
  return [];
}

export function computeVideoAnticipation(machineId, grid, activeLines = 25) {
  if (!Array.isArray(grid) || grid.length < 5) return [];
  const anticipation = [];

  if (machineId === 'lightning_vault') {
    let boltsBefore = 0;
    for (let c = 0; c < 5; c += 1) {
      if (c >= 2 && boltsBefore === 2) anticipation.push(c);
      for (let r = 0; r < (grid[c]?.length || 0); r += 1) {
        if (grid[c][r] === 'bolt') boltsBefore += 1;
      }
    }
    if (!anticipation.includes(4)) {
      const colMatch = PAYLINES_25.slice(0, activeLines).some((line) => {
        const prefix = [0, 1, 2, 3].map((col) => grid[col]?.[line[col]]);
        return prefix.every((s) => s === 'volt7' || s === 'wildchip');
      });
      if (colMatch) anticipation.push(4);
    }
    return anticipation;
  }

  if (machineId === 'buffalo_stampede') {
    let wheelsBefore = 0;
    for (let c = 0; c < 5; c += 1) {
      if (c >= 2 && wheelsBefore === 2) anticipation.push(c);
      for (let r = 0; r < (grid[c]?.length || 0); r += 1) {
        if (grid[c][r] === 'wheel') wheelsBefore += 1;
      }
    }
    const fourBuff = [0, 1, 2, 3].every((c) =>
      grid[c]?.some((s) => s === 'buffalo' || s === 'wild2x')
    );
    if (fourBuff && !anticipation.includes(4)) anticipation.push(4);
    return anticipation;
  }

  if (machineId === 'neon_special') {
    let orbsBefore = 0;
    for (let c = 0; c < 5; c += 1) {
      if (c >= 2 && orbsBefore === 2) anticipation.push(c);
      for (let r = 0; r < (grid[c]?.length || 0); r += 1) {
        if (grid[c][r] === 'ns_orb') orbsBefore += 1;
      }
    }
    if (!anticipation.includes(4)) {
      const fourAirwolf = PAYLINES_25.slice(0, 25).some((line) =>
        [0, 1, 2, 3].every((col) => {
          const s = grid[col]?.[line[col]];
          return s === 'ns_airwolf' || s === 'ns_wild';
        })
      );
      if (fourAirwolf) anticipation.push(4);
    }
    return anticipation;
  }

  if (machineId === 'silver_mustang') {
    let orbsBefore = 0;
    for (let c = 0; c < 5; c += 1) {
      if (c >= 3 && orbsBefore >= c) anticipation.push(c);
      for (let r = 0; r < (grid[c]?.length || 0); r += 1) {
        if (grid[c][r] === 'orb') orbsBefore += 1;
      }
    }
    if (!anticipation.includes(4)) {
      const fourDougie = PAYLINES_25.slice(0, activeLines).some((line) =>
        [0, 1, 2, 3].every((col) => {
          const s = grid[col]?.[line[col]];
          return s === 'dougie' || s === 'orb';
        })
      );
      if (fourDougie) anticipation.push(4);
    }
    return anticipation;
  }

  return anticipation;
}

export function evaluateBanditOutcome(
  { finalStops, activeBet = 0, fromNudge = false, feverBoost = false },
  rng = Math.random
) {
  const paylineSyms = finalStops.map((idx) => BANDIT_REEL_STRIP[wrapBanditStop(idx)]);
  const result = evaluateBanditPayline(paylineSyms);
  const rawMult = result.mult > 0 && feverBoost ? result.mult * 2 : result.mult;
  const maxMultiplier = SLOT_PAYOUT_CAPS.bandit85;
  const totalMult = Math.min(maxMultiplier, rawMult);

  const rawPayout = activeBet > 0 ? Math.round(activeBet * totalMult) : 0;
  const payout = validateStakedGamePayout({
    stakedTokens: activeBet,
    rawPayout,
    maxMultiplier
  });

  const features = [];
  if (feverBoost) features.push('fever_2x');

  let holdAllowed = false;
  let nudgesLeft = 0;
  let statusBanner = result.headline;

  if (totalMult <= 0) {
    if (!fromNudge) {
      const roll = rng();
      if (roll < 0.11) {
        holdAllowed = true;
        statusBanner = 'Lucky Hold! Lock up to 2 reels for next spin.';
        features.push('lucky_hold');
      } else if (roll < 0.20) {
        nudgesLeft = 1;
        statusBanner = 'Lucky Nudge! Tap ⏫ NUDGE under any reel.';
        features.push('lucky_nudge');
      }
    } else {
      statusBanner = 'Nudge complete — pull again.';
    }
  }

  const wins =
    totalMult > 0
      ? [{ line: 1, cells: ['0,1', '1,1', '2,1'], mult: totalMult, sym: paylineSyms[0] }]
      : [];

  return {
    machineId: 'bandit85',
    stops: [...finalStops],
    paylineSyms,
    evalResult: result,
    wins,
    totalMult,
    effectiveMult: totalMult,
    payout,
    maxMultiplier,
    catalogMaxMult: SLOT_MACHINE_BY_ID.bandit85?.maxMult || 75,
    tier: result.tier,
    headline: feverBoost && totalMult > 0 ? `🔥 FEVER 2× ${result.headline}` : result.headline,
    detail: `${totalMult}× Mechanical Payline!`,
    dougiePhrase: totalMult >= 10 ? 'HELLOOOOO-O-O!!' : '',
    feverBoost: Boolean(feverBoost),
    holdAllowed,
    nudgesLeft,
    statusBanner,
    features,
    anticipation: fromNudge ? [] : computeBanditAnticipation(finalStops)
  };
}

export function spinBandit(
  {
    bet = 0,
    currentStops = [0, 3, 6],
    heldReels = [false, false, false],
    useFever = false
  } = {},
  rng = Math.random
) {
  const stops = currentStops.map((currStop, idx) => {
    if (heldReels[idx]) return currStop;
    if (useFever && idx === 0) return rng() < 0.35 ? 0 : 7;
    return Math.floor(rng() * BANDIT_REEL_STRIP.length);
  });

  const outcome = evaluateBanditOutcome(
    { finalStops: stops, activeBet: bet, fromNudge: false, feverBoost: useFever },
    rng
  );
  outcome.anticipation = computeBanditAnticipation(stops, heldReels);
  return outcome;
}

export function nudgeBandit({ currentStops, reelIdx, bet = 0 }, rng = Math.random) {
  const stops = currentStops.map((s, idx) => (idx === reelIdx ? wrapBanditStop(s - 1) : s));
  return evaluateBanditOutcome(
    { finalStops: stops, activeBet: bet, fromNudge: true, feverBoost: false },
    rng
  );
}

export function evaluateVideoSpinOutcome(
  {
    machineId,
    finalGrid,
    activeBet = 0,
    spinWildMults = {},
    isFreeSpinRound = false,
    coffeeRushUsed = false,
    wasSurge = false,
    usedSecondChance = false,
    neonUsedPowerups = null,
    neonSpontaneousLabel = '',
    mustangLines = 25,
    mustangPot = 60,
    coffeePot = 0,
    stampedeMeter = 0
  },
  rng = Math.random
) {
  const maxMultiplier = SLOT_PAYOUT_CAPS[machineId] || 120;
  const features = [];

  if (machineId === 'neon_special') {
    const hasSynth3x = Boolean(neonUsedPowerups?.synth_3x);
    const spinMult = hasSynth3x ? 3 : isFreeSpinRound ? 1.5 : 1;
    const evalRes = evaluate5x3Paylines('neon_special', finalGrid, 25, spinMult);

    let orbCount = 0;
    let airwolfCount = 0;
    const orbCells = [];
    finalGrid.forEach((col, c) =>
      col.forEach((sym, r) => {
        if (sym === 'ns_orb') {
          orbCount += 1;
          orbCells.push(`${c},${r}`);
        }
        if (sym === 'ns_airwolf') {
          airwolfCount += 1;
        }
      })
    );

    const nextWinCells = new Set(evalRes.winningCells);
    let scatterMult = 0;
    let awardedFreeSpins = 0;
    if (orbCount >= 3) {
      orbCells.forEach((cellKey) => nextWinCells.add(cellKey));
      scatterMult = orbCount >= 5 ? 10 : orbCount === 4 ? 4 : 1.5;
      if (!isFreeSpinRound) {
        awardedFreeSpins = 4;
        features.push('free_spins');
      }
    }
    if (neonSpontaneousLabel) features.push('spontaneous_surge');

    const totalMult = Math.min(maxMultiplier, Number((evalRes.totalBetMult + scatterMult).toFixed(2)));
    const rawPayout = activeBet > 0 ? Math.round(activeBet * totalMult) : 0;
    const payout = validateStakedGamePayout({ stakedTokens: activeBet, rawPayout, maxMultiplier });

    const powerNames = Object.entries(neonUsedPowerups || {})
      .filter(([, on]) => Boolean(on))
      .map(([id]) => NEON_SPECIAL_POWERUPS.find((p) => p.id === id)?.short || id);

    const wins = evalRes.winningLines.map((wl) => ({
      line: wl.lineIdx,
      cells: PAYLINES_25[wl.lineIdx - 1].slice(0, wl.matchLen).map((row, col) => `${col},${row}`),
      mult: wl.linePay,
      sym: wl.sym,
      matchLen: wl.matchLen
    }));
    if (scatterMult > 0) {
      wins.push({ line: 0, cells: orbCells, mult: scatterMult, sym: 'ns_orb', matchLen: orbCount });
    }

    const isMega = totalMult >= 18 || orbCount >= 4;
    const isBig = isMega || totalMult >= 6 || airwolfCount >= 4 || Boolean(neonUsedPowerups?.chopper_siren);

    return {
      machineId,
      grid: finalGrid,
      wildMultipliers: spinWildMults,
      evalRes,
      wins,
      winningCells: nextWinCells,
      totalMult,
      payout,
      maxMultiplier,
      features,
      anticipation: computeVideoAnticipation(machineId, finalGrid, 25),
      meta: {
        orbCount,
        airwolfCount,
        awardedFreeSpins,
        chargeGain: 1 + (orbCount > 0 ? 1 : 0),
        powerNames,
        hasSynth3x,
        isMega,
        isBig,
        neonSpontaneousLabel
      }
    };
  }

  if (machineId === 'silver_mustang') {
    const spinMult = coffeeRushUsed ? 1.5 : isFreeSpinRound ? 1.25 : 1;
    const evalRes = evaluate5x3Paylines('silver_mustang', finalGrid, mustangLines, spinMult);

    let coffeeHits = 0;
    let orbHits = 0;
    let dougieHits = 0;
    finalGrid.forEach((col) =>
      col.forEach((sym) => {
        if (sym === 'coffee') coffeeHits += 1;
        if (sym === 'orb') orbHits += 1;
        if (sym === 'dougie') dougieHits += 1;
      })
    );

    let triggeredBonus = false;
    let nextCoffeePot = coffeePot;
    let awardedFreeSpins = 0;
    if (!isFreeSpinRound && coffeeHits > 0) {
      const candidate = coffeePot + 1;
      if (candidate >= 10) {
        triggeredBonus = true;
        nextCoffeePot = 0;
        awardedFreeSpins = 4;
        features.push('coffee_free_spins');
      } else {
        nextCoffeePot = candidate;
      }
    }

    let rawTotalMult = evalRes.totalBetMult;
    let bonusHeadline = '';
    let resetPot = false;
    if (orbHits >= 5 || (evalRes.bestSym === 'dougie' && evalRes.bestCount === 5)) {
      const potBonusMult = Math.min(45, Math.round(mustangPot / 8));
      rawTotalMult += potBonusMult;
      resetPot = true;
      bonusHeadline = '🚨 MR. JACKPOTS PROGRESSIVE POT! HELLOOOOO-O-O!!';
      features.push('progressive_pot');
    }

    const totalMult = Math.min(maxMultiplier, Number(rawTotalMult.toFixed(2)));
    const rawPayout = activeBet > 0 ? Math.round(activeBet * totalMult) : 0;
    const payout = validateStakedGamePayout({ stakedTokens: activeBet, rawPayout, maxMultiplier });

    const wins = evalRes.winningLines.map((wl) => ({
      line: wl.lineIdx,
      cells: PAYLINES_25[wl.lineIdx - 1].slice(0, wl.matchLen).map((row, col) => `${col},${row}`),
      mult: wl.linePay,
      sym: wl.sym,
      matchLen: wl.matchLen
    }));

    return {
      machineId,
      grid: finalGrid,
      wildMultipliers: spinWildMults,
      evalRes,
      wins,
      winningCells: new Set(evalRes.winningCells),
      totalMult,
      payout,
      maxMultiplier,
      features,
      anticipation: computeVideoAnticipation(machineId, finalGrid, mustangLines),
      meta: {
        coffeeHits,
        orbHits,
        dougieHits,
        chargeGain: 4 + (coffeeHits > 0 ? 2 : 0) + orbHits * 3 + dougieHits,
        potGain: activeBet > 0 ? 0.5 : 0.25,
        nextCoffeePot,
        triggeredBonus,
        awardedFreeSpins,
        bonusHeadline,
        resetPot
      }
    };
  }

  if (machineId === 'lightning_vault') {
    const spinMult = wasSurge ? 1.5 : 1;
    const evalRes = evaluate5x3Paylines('lightning_vault', finalGrid, 20, spinMult);

    const orbEntries = {};
    let orbCount = 0;
    finalGrid.forEach((col, c) =>
      col.forEach((sym, r) => {
        if (sym === 'bolt') {
          orbCount += 1;
          orbEntries[`${c},${r}`] = rollLightningOrbValue(rng);
        }
      })
    );

    const triggeredLockIt = orbCount >= 3;
    if (triggeredLockIt) features.push('hold_and_spin');

    const totalMult = triggeredLockIt
      ? 0
      : Math.min(maxMultiplier, Number(evalRes.totalBetMult.toFixed(2)));
    const rawPayout = activeBet > 0 ? Math.round(activeBet * totalMult) : 0;
    const payout = validateStakedGamePayout({ stakedTokens: activeBet, rawPayout, maxMultiplier });

    const wins = triggeredLockIt
      ? []
      : evalRes.winningLines.map((wl) => ({
          line: wl.lineIdx,
          cells: PAYLINES_25[wl.lineIdx - 1].slice(0, wl.matchLen).map((row, col) => `${col},${row}`),
          mult: wl.linePay,
          sym: wl.sym,
          matchLen: wl.matchLen
        }));

    return {
      machineId,
      grid: finalGrid,
      wildMultipliers: spinWildMults,
      evalRes,
      wins,
      winningCells: new Set(evalRes.winningCells),
      totalMult,
      payout,
      maxMultiplier,
      features,
      anticipation: computeVideoAnticipation(machineId, finalGrid, 20),
      meta: {
        orbCount,
        orbEntries,
        triggeredLockIt,
        voltageGain: 5 + orbCount * 4
      }
    };
  }

  // buffalo_stampede (1,024 Ways)
  const evalRes = evaluateBuffalo1024Ways(finalGrid, spinWildMults, 1);
  let wheelCount = 0;
  let buffaloCount = 0;
  finalGrid.forEach((col) =>
    col.forEach((sym) => {
      if (sym === 'wheel') wheelCount += 1;
      if (sym === 'buffalo' || sym === 'goldcoin') buffaloCount += 1;
    })
  );

  const nextStampede = Math.min(100, stampedeMeter + 2 + (buffaloCount >= 3 ? 1 : 0));
  const triggeredWheel = wheelCount >= 3 || nextStampede >= 100;
  if (triggeredWheel) features.push('bonus_wheel');

  const totalMult = Math.min(maxMultiplier, Number(evalRes.totalBetMult.toFixed(2)));
  const rawPayout = activeBet > 0 ? Math.round(activeBet * totalMult) : 0;
  const payout = validateStakedGamePayout({ stakedTokens: activeBet, rawPayout, maxMultiplier });

  const wins = evalRes.matchedWays.map((mw, idx) => ({
    line: idx + 1,
    cells: [],
    mult: mw.symMult,
    sym: mw.sym,
    matchLen: mw.matchLen,
    ways: mw.ways
  }));

  return {
    machineId: 'buffalo_stampede',
    grid: finalGrid,
    wildMultipliers: spinWildMults,
    evalRes,
    wins,
    winningCells: new Set(evalRes.winningCells),
    totalMult,
    payout,
    maxMultiplier,
    features,
    anticipation: computeVideoAnticipation('buffalo_stampede', finalGrid, 25),
    meta: {
      wheelCount,
      buffaloCount,
      chargeGain: 5 + Math.min(3, buffaloCount),
      nextStampede: nextStampede >= 100 ? 0 : nextStampede,
      triggeredWheel,
      usedSecondChance
    }
  };
}

export function spinVideoSlot(
  {
    machineId,
    bet = 0,
    isFreeSpinRound = false,
    mustangLines = 25,
    mustangPot = 60,
    coffeePot = 0,
    stampedeMeter = 0,
    anteBetOn = false,
    coffeeRushUsed = false,
    pieWildUsed = false,
    owlLockUsed = false,
    wasSurge = false,
    goldUpgrade = false,
    wasSecondChance = false,
    prevGrid = null,
    armedNeonPowerups = null
  } = {},
  rng = Math.random
) {
  let neonUsedPowerups = null;
  let neonSpontaneousLabel = '';
  if (machineId === 'neon_special') {
    neonUsedPowerups = { ...(armedNeonPowerups || {}) };
    const anyArmed = Object.values(neonUsedPowerups).some(Boolean);
    if (!anyArmed && rng() < 0.14) {
      const pool = ['hyper_wilds', 'low_zapper', 'twin_sync'];
      const pick = pool[Math.floor(rng() * pool.length)];
      neonUsedPowerups[pick] = true;
      neonSpontaneousLabel =
        NEON_SPECIAL_POWERUPS.find((p) => p.id === pick)?.name || 'NEON SURGE';
    }
  }

  let lockedCols = null;
  if (owlLockUsed) {
    lockedCols = Array.isArray(prevGrid)
      ? prevGrid.map((col) => Array.isArray(col) && (col.includes('orb') || col.includes('dougie')))
      : null;
  }

  const rows = machineId === 'buffalo_stampede' ? 4 : 3;
  const generated = generateVideoGrid(
    machineId,
    {
      cols: 5,
      rows,
      anteOrbBoost: machineId === 'lightning_vault' && anteBetOn,
      goldUpgrade,
      pieWildReel: pieWildUsed || wasSurge,
      lockedCols,
      prevGrid,
      neonPowerups: neonUsedPowerups
    },
    rng
  );

  if (machineId === 'silver_mustang' && isFreeSpinRound) {
    const orbCol = rng() < 0.5 ? 1 : 3;
    const orbRow = Math.floor(rng() * 3);
    generated[orbCol][orbRow] = 'orb';
  }
  if (machineId === 'neon_special' && isFreeSpinRound) {
    const wc = 1 + Math.floor(rng() * 3);
    const wr = Math.floor(rng() * 3);
    generated[wc][wr] = 'ns_wild';
  }

  let nudged = false;
  if (wasSecondChance) {
    let wheels = 0;
    generated.forEach((col) =>
      col.forEach((s) => {
        if (s === 'wheel') wheels += 1;
      })
    );
    if (wheels === 2 && !generated[4].includes('wheel')) {
      nudged = true;
      if (rng() < 0.28) {
        generated[4][1] = 'wheel';
      }
    }
  }

  const spinWildMults = {};
  if (machineId === 'buffalo_stampede') {
    generated.forEach((col, c) =>
      col.forEach((sym, r) => {
        if (sym === 'wild2x') {
          spinWildMults[`${c},${r}`] = rng() < 0.15 ? 3 : 2;
        }
      })
    );
  }

  const evaluated = evaluateVideoSpinOutcome(
    {
      machineId,
      finalGrid: generated,
      activeBet: bet,
      spinWildMults,
      isFreeSpinRound,
      coffeeRushUsed,
      wasSurge,
      usedSecondChance: nudged,
      neonUsedPowerups,
      neonSpontaneousLabel,
      mustangLines,
      mustangPot,
      coffeePot,
      stampedeMeter
    },
    rng
  );

  evaluated.lockedCols = lockedCols;
  evaluated.neonUsedPowerups = neonUsedPowerups;
  evaluated.neonSpontaneousLabel = neonSpontaneousLabel;
  evaluated.usedSecondChance = nudged;
  return evaluated;
}

export function stepLockItRespin(
  {
    lockedMap = {},
    respinsLeft = 3,
    stake = 0,
    anteBetOn = false,
    grandProgressive = 110
  } = {},
  rng = Math.random
) {
  const nextLocked = { ...lockedMap };
  let newOrbFound = false;
  const orbChance = anteBetOn ? 0.037 : 0.036;

  for (let c = 0; c < 5; c += 1) {
    for (let r = 0; r < 3; r += 1) {
      const key = `${c},${r}`;
      if (!nextLocked[key] && rng() < orbChance) {
        nextLocked[key] = rollLightningOrbValue(rng);
        newOrbFound = true;
      }
    }
  }

  const totalOrbs = Object.keys(nextLocked).length;
  const nextRespins = totalOrbs >= 15 ? 0 : newOrbFound ? 3 : respinsLeft - 1;
  const maxMultiplier = SLOT_PAYOUT_CAPS.lightning_vault;
  const hitGrand = totalOrbs >= 15;

  let rawMult = 0;
  let payout = 0;
  if (nextRespins <= 0) {
    rawMult = Object.values(nextLocked).reduce((sum, item) => sum + item.mult, 0);
    if (hitGrand) {
      rawMult += Math.round(grandProgressive);
    }
    const cappedMult = Math.min(maxMultiplier, rawMult);
    const rawPayout = stake > 0 ? Math.round(stake * cappedMult) : 0;
    payout = validateStakedGamePayout({
      stakedTokens: stake,
      rawPayout,
      maxMultiplier
    });
    rawMult = cappedMult;
  }

  return {
    lockedMap: nextLocked,
    newOrbFound,
    totalOrbs,
    nextRespins,
    finished: nextRespins <= 0,
    hitGrand,
    totalMult: rawMult,
    payout,
    maxMultiplier
  };
}

export function spinBonusWheel({ stake = 0 } = {}, rng = Math.random) {
  const { index, segment } = spinBuffaloWheelSegment(rng);
  const sliceAngle = 360 / BUFFALO_WHEEL_SEGMENTS.length;
  const targetDeg = 360 * 5 + (360 - (index * sliceAngle + sliceAngle / 2));
  const maxMultiplier = SLOT_PAYOUT_CAPS.buffalo_stampede;
  const cappedMult = Math.min(maxMultiplier, segment.mult);
  const rawPayout = stake > 0 ? Math.round(stake * cappedMult) : 0;
  const payout = validateStakedGamePayout({
    stakedTokens: stake,
    rawPayout,
    maxMultiplier
  });

  return {
    index,
    segment,
    targetDeg,
    totalMult: cappedMult,
    payout,
    maxMultiplier
  };
}

export { SLOT_SYMBOLS };
