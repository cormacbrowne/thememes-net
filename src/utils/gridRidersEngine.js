// ============================================================================
// Grid Riders Engine — Pure 60fps light-trail arena duel (1P vs AI & 2P local)
// Zero DOM dependencies for deterministic unit testing and cabinet playback.
// ============================================================================

export const RIDERS_GRID_SIZE = 44;
export const RIDERS_CELL_PX = 10;
export const RIDERS_CANVAS_SIZE = RIDERS_GRID_SIZE * RIDERS_CELL_PX; // 440x440
export const RIDERS_BEST_SCORE_KEY = 'tm_grid_riders_best_v1';

export const RIDER_DIRECTIONS = {
  UP: { dx: 0, dy: -1, name: 'UP', opposite: 'DOWN' },
  DOWN: { dx: 0, dy: 1, name: 'DOWN', opposite: 'UP' },
  LEFT: { dx: -1, dy: 0, name: 'LEFT', opposite: 'RIGHT' },
  RIGHT: { dx: 1, dy: 0, name: 'RIGHT', opposite: 'LEFT' }
};

export function cellKey(x, y) {
  return `${x},${y}`;
}

function buildObstaclePylons(round) {
  const obstacles = new Set();
  if (round < 2) return obstacles;

  // Symmetry-preserving tactical pylons starting Round 2+
  const mid = Math.floor(RIDERS_GRID_SIZE / 2);
  const pylonOffsets = [
    [mid - 9, mid - 9],
    [mid - 9, mid - 8],
    [mid + 8, mid + 8],
    [mid + 8, mid + 9],
    [mid + 8, mid - 9],
    [mid + 8, mid - 8],
    [mid - 9, mid + 8],
    [mid - 9, mid + 9]
  ];
  for (const [px, py] of pylonOffsets) {
    obstacles.add(cellKey(px, py));
  }
  if (round >= 4) {
    for (let d = -2; d <= 2; d += 1) {
      if (d !== 0) {
        obstacles.add(cellKey(mid, mid + d));
      }
    }
  }
  return obstacles;
}

export function spawnGridPickup({ p1Trail, p2Trail, obstacles, rng = Math.random }) {
  const occupied = new Set([...obstacles]);
  for (const pt of p1Trail) occupied.add(cellKey(pt.x, pt.y));
  for (const pt of p2Trail) occupied.add(cellKey(pt.x, pt.y));

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const x = 4 + Math.floor(rng() * (RIDERS_GRID_SIZE - 8));
    const y = 4 + Math.floor(rng() * (RIDERS_GRID_SIZE - 8));
    if (!occupied.has(cellKey(x, y))) {
      return { x, y, points: 180 };
    }
  }
  return null;
}

function createRider({ id, label, color, trailColor, x, y, dir }) {
  return {
    id,
    label,
    color,
    trailColor,
    x,
    y,
    dir,
    turnQueue: [],
    trail: [{ x, y }],
    trailSet: new Set([cellKey(x, y)]),
    turboTimer: 0,
    alive: true
  };
}

export function createGridRidersRound({
  mode = '1p',
  round = 1,
  score = 0,
  p1Wins = 0,
  p2Wins = 0,
  bestScore = 0,
  status = 'playing',
  rng = Math.random
} = {}) {
  const midY = Math.floor(RIDERS_GRID_SIZE / 2);
  const obstacles = buildObstaclePylons(round);

  const p1 = createRider({
    id: 'p1',
    label: 'P1',
    color: '#00f3ff',
    trailColor: 'rgba(0, 243, 255, 0.85)',
    x: 8,
    y: midY,
    dir: 'RIGHT'
  });

  const p2 = createRider({
    id: 'p2',
    label: mode === '2p' ? 'P2' : 'AI',
    color: '#ff2a85',
    trailColor: 'rgba(255, 42, 133, 0.85)',
    x: RIDERS_GRID_SIZE - 9,
    y: midY,
    dir: 'LEFT'
  });

  const pickup = spawnGridPickup({
    p1Trail: p1.trail,
    p2Trail: p2.trail,
    obstacles,
    rng
  });

  return {
    mode, // '1p' | '2p'
    status, // 'title' | 'playing' | 'paused' | 'round_over' | 'gameover'
    round,
    score,
    bestScore: Math.max(bestScore, score),
    p1Wins,
    p2Wins,
    roundWinner: null, // 'p1' | 'p2' | 'draw' | null
    roundMessage: '',
    tickAccum: 0,
    animClock: 0,
    stepsInRound: 0,
    obstacles,
    pickup,
    pickupRespawnTimer: 0,
    sparks: [],
    p1,
    p2
  };
}

export function enqueueRiderTurn(rider, nextDir) {
  if (!rider || !RIDER_DIRECTIONS[nextDir]) return false;
  const effectiveLast =
    rider.turnQueue.length > 0 ? rider.turnQueue[rider.turnQueue.length - 1] : rider.dir;
  if (nextDir === effectiveLast) return false;
  if (RIDER_DIRECTIONS[effectiveLast].opposite === nextDir) return false;
  if (rider.turnQueue.length >= 2) return false;
  rider.turnQueue.push(nextDir);
  return true;
}

function isBlockedCell(x, y, state) {
  if (x < 0 || x >= RIDERS_GRID_SIZE || y < 0 || y >= RIDERS_GRID_SIZE) return true;
  const key = cellKey(x, y);
  if (state.obstacles.has(key)) return true;
  if (state.p1.trailSet.has(key)) return true;
  if (state.p2.trailSet.has(key)) return true;
  return false;
}

function countOpenFlood(startX, startY, state, limit = 160) {
  if (isBlockedCell(startX, startY, state)) return 0;
  const seen = new Set([cellKey(startX, startY)]);
  const queue = [[startX, startY]];
  let head = 0;

  while (head < queue.length && seen.size < limit) {
    const [cx, cy] = queue[head++];
    for (const vec of Object.values(RIDER_DIRECTIONS)) {
      const nx = cx + vec.dx;
      const ny = cy + vec.dy;
      const key = cellKey(nx, ny);
      if (seen.has(key) || isBlockedCell(nx, ny, state)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen.size;
}

/**
 * Deterministic arena AI selecting a legal non-reversing turn maximizing
 * flood-fill survival space, aggressive cut-off positioning, and pickup grabs.
 */
export function chooseAiRiderDirection(state, rng = Math.random) {
  const ai = state.p2;
  const foe = state.p1;
  const currentVec = RIDER_DIRECTIONS[ai.dir];
  const candidates = Object.keys(RIDER_DIRECTIONS).filter((d) => d !== currentVec.opposite);

  let bestDir = ai.dir;
  let bestUtility = -Infinity;

  for (const dirName of candidates) {
    const vec = RIDER_DIRECTIONS[dirName];
    const nx = ai.x + vec.dx;
    const ny = ai.y + vec.dy;

    if (isBlockedCell(nx, ny, state)) {
      continue;
    }

    const openArea = countOpenFlood(nx, ny, state, 140);
    // Count how many immediate exits remain next step to avoid dead-end corridors
    let exits = 0;
    for (const ev of Object.values(RIDER_DIRECTIONS)) {
      if (!isBlockedCell(nx + ev.dx, ny + ev.dy, state)) exits += 1;
    }

    let utility = openArea * 3.2 + exits * 18;
    // Slight preference to continue straight unless cornering helps
    if (dirName === ai.dir) utility += 4;

    // Head-to-head distance avoidance (don't willingly collide into opponent head)
    const foeDist = Math.abs(nx - foe.x) + Math.abs(ny - foe.y);
    if (foeDist <= 1) utility -= 90;
    else if (foeDist <= 5) utility += 14;

    // Seek hyper-cell pickup if open space is healthy
    if (state.pickup && openArea > 35) {
      const pDist = Math.abs(nx - state.pickup.x) + Math.abs(ny - state.pickup.y);
      utility += Math.max(0, 28 - pDist * 1.1);
    }

    utility += (rng() - 0.5) * 2.5;

    if (utility > bestUtility) {
      bestUtility = utility;
      bestDir = dirName;
    }
  }

  return bestDir;
}

function addCrashSparks(state, gridX, gridY, color) {
  const cx = (gridX + 0.5) * RIDERS_CELL_PX;
  const cy = (gridY + 0.5) * RIDERS_CELL_PX;
  for (let i = 0; i < 16; i += 1) {
    const angle = (Math.PI * 2 * i) / 16;
    const speed = 55 + (i % 3) * 45;
    state.sparks.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.45
    });
  }
}

export function stepGridRidersState(state, dt = 0.016, rng = Math.random) {
  if (!state) return { events: [] };
  const clampedDt = Math.min(0.05, Math.max(0, dt));
  state.animClock += clampedDt;

  // Update visual sparks even briefly after crash
  for (let i = state.sparks.length - 1; i >= 0; i -= 1) {
    const sp = state.sparks[i];
    sp.x += sp.vx * clampedDt;
    sp.y += sp.vy * clampedDt;
    sp.life -= clampedDt;
    if (sp.life <= 0) state.sparks.splice(i, 1);
  }

  if (state.status !== 'playing') {
    return { events: [] };
  }

  const events = [];

  if (state.p1.turboTimer > 0) state.p1.turboTimer = Math.max(0, state.p1.turboTimer - clampedDt);
  if (state.p2.turboTimer > 0) state.p2.turboTimer = Math.max(0, state.p2.turboTimer - clampedDt);

  if (!state.pickup) {
    state.pickupRespawnTimer -= clampedDt;
    if (state.pickupRespawnTimer <= 0) {
      state.pickup = spawnGridPickup({
        p1Trail: state.p1.trail,
        p2Trail: state.p2.trail,
        obstacles: state.obstacles,
        rng
      });
      state.pickupRespawnTimer = 4.5;
    }
  }

  // Round escalation speeds up grid step rate cleanly
  const stepInterval = Math.max(0.055, 0.105 - (state.round - 1) * 0.008);
  state.tickAccum += clampedDt;

  while (state.tickAccum >= stepInterval && state.status === 'playing') {
    state.tickAccum -= stepInterval;
    state.stepsInRound += 1;

    // Pop player turn queues
    if (state.p1.turnQueue.length > 0) {
      state.p1.dir = state.p1.turnQueue.shift();
    }
    if (state.mode === '2p') {
      if (state.p2.turnQueue.length > 0) {
        state.p2.dir = state.p2.turnQueue.shift();
      }
    } else {
      state.p2.dir = chooseAiRiderDirection(state, rng);
    }

    const v1 = RIDER_DIRECTIONS[state.p1.dir];
    const v2 = RIDER_DIRECTIONS[state.p2.dir];
    const nx1 = state.p1.x + v1.dx;
    const ny1 = state.p1.y + v1.dy;
    const nx2 = state.p2.x + v2.dx;
    const ny2 = state.p2.y + v2.dy;

    const headOnSameCell = nx1 === nx2 && ny1 === ny2;
    const swapCollision = nx1 === state.p2.x && ny1 === state.p2.y && nx2 === state.p1.x && ny2 === state.p1.y;
    const p1Crash = headOnSameCell || swapCollision || isBlockedCell(nx1, ny1, state);
    const p2Crash = headOnSameCell || swapCollision || isBlockedCell(nx2, ny2, state);

    if (p1Crash || p2Crash) {
      if (p1Crash) {
        state.p1.alive = false;
        addCrashSparks(state, nx1, ny1, state.p1.color);
      }
      if (p2Crash) {
        state.p2.alive = false;
        addCrashSparks(state, nx2, ny2, state.p2.color);
      }

      if (p1Crash && p2Crash) {
        state.roundWinner = 'draw';
        state.roundMessage = 'DOUBLE DEREZ! DRAW ROUND';
        state.status = 'round_over';
      } else if (p2Crash && !p1Crash) {
        state.p1.x = nx1;
        state.p1.y = ny1;
        state.p1Wins += 1;
        state.roundWinner = 'p1';
        if (state.mode === '1p') {
          const roundBonus = 500 + (state.round - 1) * 200;
          state.score += roundBonus;
          state.bestScore = Math.max(state.bestScore, state.score);
          state.roundMessage = `AI DEREZZED! +${roundBonus} PTS`;
        } else {
          state.roundMessage = 'PLAYER 1 WINS THE GRID!';
        }
        state.status = 'round_over';
        events.push({ type: 'round_win', winner: 'p1' });
      } else {
        state.p2.x = nx2;
        state.p2.y = ny2;
        state.p2Wins += 1;
        state.roundWinner = 'p2';
        if (state.mode === '1p') {
          state.roundMessage = 'GRID OVERLOAD — DEREZZED BY AI';
          state.status = 'gameover';
          state.bestScore = Math.max(state.bestScore, state.score);
          events.push({ type: 'gameover', finalScore: state.score });
        } else {
          state.roundMessage = 'PLAYER 2 WINS THE GRID!';
          state.status = 'round_over';
          events.push({ type: 'round_win', winner: 'p2' });
        }
      }

      events.push({ type: 'crash' });
      break;
    }

    // Advance both riders safely
    state.p1.x = nx1;
    state.p1.y = ny1;
    state.p1.trail.push({ x: nx1, y: ny1 });
    state.p1.trailSet.add(cellKey(nx1, ny1));

    state.p2.x = nx2;
    state.p2.y = ny2;
    state.p2.trail.push({ x: nx2, y: ny2 });
    state.p2.trailSet.add(cellKey(nx2, ny2));

    // Survival score ticks in 1P mode
    if (state.mode === '1p') {
      const survivalTick = state.p1.turboTimer > 0 ? 15 : 8;
      state.score += survivalTick;
      state.bestScore = Math.max(state.bestScore, state.score);
    }

    // Hyper-cell pickup check
    if (state.pickup) {
      if (nx1 === state.pickup.x && ny1 === state.pickup.y) {
        state.p1.turboTimer = 4.0;
        if (state.mode === '1p') {
          state.score += state.pickup.points;
          state.bestScore = Math.max(state.bestScore, state.score);
        }
        state.pickup = null;
        state.pickupRespawnTimer = 4.5;
        events.push({ type: 'pickup', rider: 'p1' });
      } else if (nx2 === state.pickup.x && ny2 === state.pickup.y) {
        state.p2.turboTimer = 4.0;
        state.pickup = null;
        state.pickupRespawnTimer = 4.5;
        events.push({ type: 'pickup', rider: 'p2' });
      }
    }
  }

  return { events };
}
