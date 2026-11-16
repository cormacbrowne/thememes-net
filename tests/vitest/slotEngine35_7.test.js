import { describe, expect, it } from 'vitest';
import { SLOT_MACHINE_BY_ID } from '../../src/data/slotMachinesCatalog';
import {
  SLOT_PAYOUT_CAPS,
  computeBanditAnticipation,
  createSeededRng,
  nudgeBandit,
  spinBandit,
  spinBonusWheel,
  spinVideoSlot,
  stepLockItRespin
} from '../../src/utils/slotEngine';

const SPINS_PER_MACHINE = 200_000;
const BENCHMARK_BET = 100;

// Measured directly over 200,000 seeded base-play spins per machine before Phase 35.7 animations.
const BASELINE_RTP_PCT = {
  bandit85: 71.63,
  neon_special: 47.49,
  silver_mustang: 33.14,
  lightning_vault: 83.96,
  buffalo_stampede: 66.94
};

function simulateMachineRtp(machineId, spins = SPINS_PER_MACHINE) {
  const rng = createSeededRng(19850819 + machineId.length * 997);
  const maxMult = SLOT_MACHINE_BY_ID[machineId]?.maxMult || SLOT_PAYOUT_CAPS[machineId];
  let totalWagered = 0;
  let totalReturned = 0;
  let maxObservedPayout = 0;
  let anticipationCount = 0;

  for (let i = 0; i < spins; i += 1) {
    totalWagered += BENCHMARK_BET;
    const res =
      machineId === 'bandit85'
        ? spinBandit({ bet: BENCHMARK_BET }, rng)
        : spinVideoSlot({ machineId, bet: BENCHMARK_BET }, rng);

    if (res.anticipation.length > 0) anticipationCount += 1;
    if (res.payout > maxObservedPayout) maxObservedPayout = res.payout;
    expect(res.payout).toBeLessThanOrEqual(BENCHMARK_BET * maxMult);
    totalReturned += res.payout;

    if (machineId === 'lightning_vault' && res.meta?.triggeredLockIt) {
      let lockedMap = res.meta.orbEntries;
      let respinsLeft = 3;
      let finished = false;
      while (!finished) {
        const step = stepLockItRespin({ lockedMap, respinsLeft, stake: BENCHMARK_BET }, rng);
        lockedMap = step.lockedMap;
        respinsLeft = step.nextRespins;
        finished = step.finished;
        if (finished) {
          expect(step.payout).toBeLessThanOrEqual(BENCHMARK_BET * maxMult);
          if (step.payout > maxObservedPayout) maxObservedPayout = step.payout;
          totalReturned += step.payout;
        }
      }
    }

    if (machineId === 'buffalo_stampede' && res.meta?.triggeredWheel) {
      const wheelRes = spinBonusWheel({ stake: BENCHMARK_BET }, rng);
      expect(wheelRes.payout).toBeLessThanOrEqual(BENCHMARK_BET * maxMult);
      if (wheelRes.payout > maxObservedPayout) maxObservedPayout = wheelRes.payout;
      totalReturned += wheelRes.payout;
    }

    const freeCount = res.meta?.awardedFreeSpins || 0;
    for (let f = 0; f < freeCount; f += 1) {
      const fs = spinVideoSlot({ machineId, bet: BENCHMARK_BET, isFreeSpinRound: true }, rng);
      expect(fs.payout).toBeLessThanOrEqual(BENCHMARK_BET * maxMult);
      if (fs.payout > maxObservedPayout) maxObservedPayout = fs.payout;
      totalReturned += fs.payout;
    }
  }

  return {
    rtpPct: Number(((totalReturned / totalWagered) * 100).toFixed(2)),
    maxObservedPayout,
    anticipationCount
  };
}

describe('Phase 35.7a pure slot engine', () => {
  it('produces identical outcomes for identical RNG seeds and nudges deterministically', () => {
    const r1 = createSeededRng(424242);
    const r2 = createSeededRng(424242);
    const s1 = spinBandit({ bet: 4 }, r1);
    const s2 = spinBandit({ bet: 4 }, r2);
    expect(s1.stops).toEqual(s2.stops);
    expect(s1.payout).toBe(s2.payout);

    const n1 = nudgeBandit({ currentStops: [1, 0, 0], reelIdx: 0, bet: 4 }, createSeededRng(7));
    expect(n1.stops).toEqual([0, 0, 0]);
    expect(n1.totalMult).toBe(75);
    expect(n1.payout).toBe(300);

    expect(computeBanditAnticipation([0, 0, 5])).toEqual([2]);
    expect(computeBanditAnticipation([1, 2, 0])).toEqual([]);

    expect(spinVideoSlot({ machineId: 'neon_special', bet: 4 }, r1).grid).toEqual(
      spinVideoSlot({ machineId: 'neon_special', bet: 4 }, r2).grid
    );
  });

  for (const machineId of Object.keys(BASELINE_RTP_PCT)) {
    it(
      `${machineId}: 200,000-spin RTP stays within 1pp of baseline (${BASELINE_RTP_PCT[machineId]}%) and never exceeds maxMult`,
      () => {
        const measured = simulateMachineRtp(machineId);
        expect(Math.abs(measured.rtpPct - BASELINE_RTP_PCT[machineId])).toBeLessThanOrEqual(1.0);
        expect(measured.anticipationCount).toBeGreaterThan(0);
      },
      30_000
    );
  }
});
