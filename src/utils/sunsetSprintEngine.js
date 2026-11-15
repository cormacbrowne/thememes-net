import { EIGHTIES_CARS } from '../data/deloreanEras';

export const SPRINT_WIDTH = 480;
export const SPRINT_HEIGHT = 600;
export const SPRINT_HORIZON_Y = 232;
export const SPRINT_BEST_SCORE_KEY = 'thememes_sunset_best_v1';
export const CHECKPOINT_DISTANCE_M = 1200;
export const CHECKPOINT_TIME_BONUS = 18;

export const SPRINT_LANES = [-0.64, 0, 0.64];

const TRAFFIC_COLORS = [
  { body: '#38bdf8', trim: '#bae6fd', plate: 'TURBO86' },
  { body: '#ec4899', trim: '#fbcfe8', plate: 'VICE-84' },
  { body: '#4ade80', trim: '#bbf7d0', plate: 'MEME-GT' },
  { body: '#facc15', trim: '#fef08a', plate: 'GOLD-91' }
];

export function resolveCarSpec(carId) {
  return EIGHTIES_CARS.find((c) => c.id === carId) || EIGHTIES_CARS[0];
}

export function pickNextRadioStation(stations = [], currentStationId = '') {
  if (!Array.isArray(stations) || stations.length === 0) return null;
  if (stations.length === 1) return stations[0];
  const idx = stations.findIndex((s) => s.id === currentStationId);
  const nextIdx = idx >= 0 ? (idx + 1) % stations.length : 0;
  return stations[nextIdx];
}

export function createInitialSunsetSprintState({ carId = 'delorean', rng = Math.random } = {}) {
  return {
    status: 'playing', // 'playing' | 'paused' | 'gameover'
    carId,
    score: 0,
    distance: 0,
    nextCheckpointM: CHECKPOINT_DISTANCE_M,
    stage: 1,
    timerSeconds: 35,
    speedMph: 88,
    playerX: 0,
    steerVel: 0,
    curveOffset: 0,
    cassettesCollected: 0,
    carsDodged: 0,
    turboTimer: 0,
    invulnTimer: 0,
    crashShake: 0,
    checkpointBannerTimer: 0,
    traffic: [
      { id: 't-init-1', laneX: -0.64, z: 0.72, speedFactor: 0.42, style: TRAFFIC_COLORS[0] },
      { id: 't-init-2', laneX: 0.64, z: 0.96, speedFactor: 0.36, style: TRAFFIC_COLORS[1] }
    ],
    cassettes: [{ id: 'c-init-1', laneX: 0, z: 0.56 }],
    trafficSpawnTimer: 0.95,
    cassetteSpawnTimer: 2.8,
    particles: [],
    sfxEvents: [],
    animClock: 0,
    nextEntityId: 10,
    rng
  };
}

export function stepSunsetSprintState(state, input = {}, dt = 0.016, rngOverride = null) {
  if (!state) return state;
  state.sfxEvents = [];

  if (state.status !== 'playing') {
    return state;
  }

  const rng = rngOverride || state.rng || Math.random;
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  state.animClock += clampedDt;

  // Countdown checkpoint timer
  state.timerSeconds = Math.max(0, state.timerSeconds - clampedDt);
  if (state.timerSeconds <= 0) {
    state.status = 'gameover';
    state.speedMph = 0;
    state.sfxEvents.push('gameOver');
    return state;
  }

  // Timers
  if (state.turboTimer > 0) state.turboTimer = Math.max(0, state.turboTimer - clampedDt);
  if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - clampedDt);
  if (state.crashShake > 0) state.crashShake = Math.max(0, state.crashShake - clampedDt);
  if (state.checkpointBannerTimer > 0) {
    state.checkpointBannerTimer = Math.max(0, state.checkpointBannerTimer - clampedDt);
  }

  // Steering (direct drag target OR keyboard/gamepad lateral velocity)
  if (typeof input.targetRoadX === 'number' && !Number.isNaN(input.targetRoadX)) {
    const clampedTarget = Math.max(-1.05, Math.min(1.05, input.targetRoadX));
    const diff = clampedTarget - state.playerX;
    const step = 4.2 * clampedDt;
    if (Math.abs(diff) <= step) state.playerX = clampedTarget;
    else state.playerX += Math.sign(diff) * step;
    state.steerVel = Math.sign(diff);
  } else {
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    if (typeof input.moveAxis === 'number' && Math.abs(input.moveAxis) > 0.15) {
      dir = input.moveAxis;
    }
    state.steerVel = dir;
    state.playerX += dir * 2.15 * clampedDt;
    state.playerX = Math.max(-1.08, Math.min(1.08, state.playerX));
  }

  // Subtle winding synthwave road bends + centrifugal drift
  state.curveOffset = Math.sin(state.distance * 0.0042) * 0.85;
  state.playerX = Math.max(-1.12, Math.min(1.12, state.playerX - state.curveOffset * 0.14 * clampedDt));

  // Speed acceleration curve
  const carSpec = resolveCarSpec(state.carId);
  const offRoad = Math.abs(state.playerX) > 0.96;
  const boosting = Boolean(input.boost) || state.turboTimer > 0;
  const baseCruiseMph = Math.min(148, (carSpec.topSpeedMph || 120) * 0.82 + (state.stage - 1) * 5);
  const targetMph = offRoad ? 62 : boosting ? Math.max(158, (carSpec.topSpeedMph || 135) + 18) : baseCruiseMph;

  if (state.speedMph < targetMph) {
    state.speedMph = Math.min(targetMph, state.speedMph + (boosting ? 72 : 44) * clampedDt);
  } else {
    state.speedMph = Math.max(targetMph, state.speedMph - 55 * clampedDt);
  }

  // Advance distance & score proportionally to speed
  const metersPerSec = state.speedMph * 2.25;
  const deltaMeters = metersPerSec * clampedDt;
  state.distance += deltaMeters;
  state.score += Math.floor(deltaMeters * (boosting ? 1.5 : 1));

  // Checkpoint crossing check
  if (state.distance >= state.nextCheckpointM) {
    state.timerSeconds += CHECKPOINT_TIME_BONUS;
    state.score += 500 * state.stage;
    state.stage += 1;
    state.nextCheckpointM += CHECKPOINT_DISTANCE_M;
    state.checkpointBannerTimer = 2.2;
    state.sfxEvents.push('checkpoint');
  }

  // Spawn approaching traffic cars cleanly (leaving at least one open lane)
  state.trafficSpawnTimer -= clampedDt * (0.85 + state.stage * 0.08);
  if (state.trafficSpawnTimer <= 0 && state.traffic.length < 5) {
    state.trafficSpawnTimer = 0.72 + rng() * 0.65;
    const laneIdx = Math.floor(rng() * SPRINT_LANES.length);
    const laneX = SPRINT_LANES[laneIdx];
    const farCarsInLane = state.traffic.filter((t) => Math.abs(t.laneX - laneX) < 0.2 && t.z > 0.78);
    if (farCarsInLane.length === 0) {
      state.nextEntityId += 1;
      state.traffic.push({
        id: `t-${state.nextEntityId}`,
        laneX,
        z: 1.0,
        speedFactor: 0.34 + rng() * 0.22,
        style: TRAFFIC_COLORS[state.nextEntityId % TRAFFIC_COLORS.length]
      });
    }
  }

  // Spawn collectible FM radio cassette tapes
  state.cassetteSpawnTimer -= clampedDt;
  if (state.cassetteSpawnTimer <= 0 && state.cassettes.length < 2) {
    state.cassetteSpawnTimer = 3.2 + rng() * 2.4;
    const laneX = SPRINT_LANES[Math.floor(rng() * SPRINT_LANES.length)];
    state.nextEntityId += 1;
    state.cassettes.push({
      id: `c-${state.nextEntityId}`,
      laneX,
      z: 1.0
    });
  }

  // Update traffic positions & collisions
  for (let i = state.traffic.length - 1; i >= 0; i -= 1) {
    const t = state.traffic[i];
    const relSpeed = (state.speedMph / 110) * (1 - t.speedFactor);
    t.z -= Math.max(0.18, relSpeed) * 0.72 * clampedDt;

    if (t.z <= 0.14 && t.z >= 0.03) {
      if (Math.abs(t.laneX - state.playerX) < 0.34 && state.invulnTimer <= 0) {
        state.speedMph = Math.max(42, state.speedMph * 0.42);
        state.invulnTimer = 1.25;
        state.crashShake = 0.42;
        state.turboTimer = 0;
        for (let k = 0; k < 12; k += 1) {
          const ang = (Math.PI * 2 * k) / 12;
          state.particles.push({
            x: SPRINT_WIDTH / 2 + state.playerX * 145,
            y: SPRINT_HEIGHT - 92,
            vx: Math.cos(ang) * (80 + (k % 3) * 45),
            vy: Math.sin(ang) * (80 + (k % 3) * 45),
            color: k % 2 === 0 ? '#facc15' : '#ef4444',
            life: 0.45,
            maxLife: 0.45,
            size: 4
          });
        }
        state.sfxEvents.push('crash');
        state.traffic.splice(i, 1);
        continue;
      }
    }

    if (t.z < 0) {
      state.carsDodged += 1;
      state.score += 50;
      state.traffic.splice(i, 1);
    }
  }

  // Update cassette collectibles -> switch THE MEMES FM station + nitro boost
  for (let i = state.cassettes.length - 1; i >= 0; i -= 1) {
    const cas = state.cassettes[i];
    cas.z -= (state.speedMph / 110) * 0.76 * clampedDt;

    if (cas.z <= 0.16 && cas.z >= 0.02 && Math.abs(cas.laneX - state.playerX) < 0.38) {
      state.cassettesCollected += 1;
      state.score += 250;
      state.turboTimer = 2.8;
      state.sfxEvents.push('cassette');
      state.cassettes.splice(i, 1);
      continue;
    }

    if (cas.z < 0) {
      state.cassettes.splice(i, 1);
    }
  }

  // Update sparks
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * clampedDt;
    p.y += p.vy * clampedDt;
    p.life -= clampedDt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  return state;
}
