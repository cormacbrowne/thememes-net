// ==========================================
// SLOT VISUAL STRIP & DAILY MISSIONS HELPERS (Phase 35.7b-g)
// ==========================================

export const VIDEO_STRIP_LEN = 18;

export const VIDEO_SYMBOL_POOLS = {
  neon_special: ['ns_wild', 'ns_airwolf', 'ns_orb', 'ns_arcade', 'ns_synth', 'ns_shades', 'ns_cassette', 'ns_quarter'],
  silver_mustang: ['dougie', 'coffee', 'pie', 'orb', 'owlring', 'redshoes', '777', 'cherry'],
  lightning_vault: ['bolt', 'volt7', 'vault', 'wildchip', 'diamond', 'bar', 'bell', 'cherry'],
  buffalo_stampede: ['buffalo', 'eagle', 'wolf', 'goldcoin', 'wild2x', 'wheel']
};

export function buildVideoColumnStrip(machineId, colIdx, gridCol = [], stopIndex = 1, prevStrip = null, prevStopIndex = 1, prevGridCol = null) {
  const pool = VIDEO_SYMBOL_POOLS[machineId] || VIDEO_SYMBOL_POOLS.neon_special;
  const rowCount = machineId === 'buffalo_stampede' ? 4 : 3;
  const strip = new Array(VIDEO_STRIP_LEN);

  // Fill entire strip with varied symbols from this machine's pool
  for (let i = 0; i < VIDEO_STRIP_LEN; i += 1) {
    const sym = pool[(i * 3 + colIdx * 2 + i % 2) % pool.length];
    strip[i] = sym;
  }

  // Preserve previous visible cells at prevStopIndex so spin start has zero visual jump
  if (Array.isArray(prevStrip) && prevStrip.length === VIDEO_STRIP_LEN) {
    for (let r = 0; r < rowCount; r += 1) {
      const idx = (prevStopIndex + r) % VIDEO_STRIP_LEN;
      strip[idx] = prevGridCol?.[r] || prevStrip[idx] || strip[idx];
    }
  }

  // Stamp target landing cells at stopIndex..stopIndex+rowCount-1
  for (let r = 0; r < rowCount; r += 1) {
    const idx = (stopIndex + r) % VIDEO_STRIP_LEN;
    strip[idx] = gridCol?.[r] || strip[idx];
  }

  return strip;
}

export function buildInitialVideoStrips(machineId, grid = []) {
  return [0, 1, 2, 3, 4].map((colIdx) =>
    buildVideoColumnStrip(machineId, colIdx, grid?.[colIdx] || [], 1)
  );
}

const MISSIONS_KEY = 'tm_slot_daily_missions_v1';

function utcDateStr() {
  return new Date().toISOString().slice(0, 10);
}

export const SLOT_DAILY_MISSION_DEFS = [
  { id: 'spins10', label: 'Spin 10×', target: 10, rewardTokens: 1 },
  { id: 'win3x', label: 'Hit 3×+ Win', target: 1, rewardTokens: 2 },
  { id: 'powerup', label: 'Use Power / Bonus', target: 1, rewardTokens: 2 }
];

export function loadSlotDailyMissions() {
  const today = utcDateStr();
  const base = {
    date: today,
    progress: { spins10: 0, win3x: 0, powerup: 0 },
    claimed: { spins10: false, win3x: false, powerup: false }
  };
  try {
    if (typeof localStorage === 'undefined') return base;
    const raw = JSON.parse(localStorage.getItem(MISSIONS_KEY) || 'null');
    if (!raw || raw.date !== today) {
      localStorage.setItem(MISSIONS_KEY, JSON.stringify(base));
      return base;
    }
    return {
      date: today,
      progress: { ...base.progress, ...(raw.progress || {}) },
      claimed: { ...base.claimed, ...(raw.claimed || {}) }
    };
  } catch {
    return base;
  }
}

export function saveSlotDailyMissions(state) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MISSIONS_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore storage errors
  }
}
