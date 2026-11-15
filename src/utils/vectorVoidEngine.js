export const VOID_WIDTH = 480;
export const VOID_HEIGHT = 480;
export const VOID_BEST_SCORE_KEY = 'thememes_void_best_v1';

const ROCK_RADIUS_BY_SIZE = { 3: 36, 2: 21, 1: 12 };
const ROCK_SCORE_BY_SIZE = { 3: 100, 2: 180, 1: 250 };
const ROCK_COLORS_BY_SIZE = { 3: '#00f3ff', 2: '#c084fc', 1: '#f472b6' };

export function wrapCoord(value, max) {
  if (value < 0) return value + max;
  if (value >= max) return value - max;
  return value;
}

function buildRockPolygon(radius, rng, vertexCount = 9) {
  const verts = [];
  for (let i = 0; i < vertexCount; i += 1) {
    const ang = (Math.PI * 2 * i) / vertexCount;
    const jitter = radius * (0.72 + rng() * 0.45);
    verts.push({ x: Math.cos(ang) * jitter, y: Math.sin(ang) * jitter });
  }
  return verts;
}

export function createRock({ x, y, vx, vy, size = 3, rng = Math.random }) {
  const radius = ROCK_RADIUS_BY_SIZE[size] || 36;
  return {
    x: wrapCoord(x, VOID_WIDTH),
    y: wrapCoord(y, VOID_HEIGHT),
    vx,
    vy,
    size,
    radius,
    color: ROCK_COLORS_BY_SIZE[size] || '#00f3ff',
    angle: rng() * Math.PI * 2,
    rotSpeed: (rng() - 0.5) * 2.2,
    vertices: buildRockPolygon(radius, rng)
  };
}

export function spawnWaveRocks(wave = 1, safeCenter = { x: VOID_WIDTH / 2, y: VOID_HEIGHT / 2 }, rng = Math.random) {
  const count = Math.min(9, 3 + wave);
  const rocks = [];
  const baseSpeed = 46 + wave * 9;

  for (let i = 0; i < count; i += 1) {
    let x = rng() * VOID_WIDTH;
    let y = rng() * VOID_HEIGHT;
    // Keep asteroids safely clear of ship spawn radius
    let guard = 0;
    while (Math.hypot(x - safeCenter.x, y - safeCenter.y) < 120 && guard < 12) {
      x = rng() * VOID_WIDTH;
      y = rng() * VOID_HEIGHT;
      guard += 1;
    }
    const ang = rng() * Math.PI * 2;
    const spd = baseSpeed * (0.75 + rng() * 0.55);
    rocks.push(
      createRock({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3,
        rng
      })
    );
  }
  return rocks;
}

export function createInitialVectorVoidState({ wave = 1, rng = Math.random } = {}) {
  const center = { x: VOID_WIDTH / 2, y: VOID_HEIGHT / 2 };
  return {
    status: 'playing', // 'playing' | 'paused' | 'gameover'
    score: 0,
    lives: 3,
    wave,
    ship: {
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      aimAngle: -Math.PI / 2,
      radius: 13,
      invulnTimer: 1.8,
      thrusting: false
    },
    bullets: [],
    rocks: spawnWaveRocks(wave, center, rng),
    sparks: [],
    sfxEvents: [],
    fireCooldown: 0,
    animClock: 0,
    rng
  };
}

function emitVectorSparks(state, x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const ang = (Math.PI * 2 * i) / count;
    const spd = 75 + (i % 3) * 55;
    state.sparks.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      color,
      life: 0.48,
      maxLife: 0.48
    });
  }
}

export function splitVectorRock(rock, rng = Math.random) {
  if (!rock || rock.size <= 1) return [];
  const nextSize = rock.size - 1;
  const baseSpeed = Math.hypot(rock.vx, rock.vy) || 60;
  const baseAng = Math.atan2(rock.vy, rock.vx);
  const children = [];
  for (const offset of [-0.65, 0.65]) {
    const ang = baseAng + offset + (rng() - 0.5) * 0.25;
    const spd = Math.min(210, baseSpeed * 1.32);
    children.push(
      createRock({
        x: rock.x + Math.cos(ang) * 8,
        y: rock.y + Math.sin(ang) * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: nextSize,
        rng
      })
    );
  }
  return children;
}

export function stepVectorVoidState(state, input = {}, dt = 0.016, rngOverride = null) {
  if (!state) return state;
  state.sfxEvents = [];

  if (state.status !== 'playing') {
    return state;
  }

  const rng = rngOverride || state.rng || Math.random;
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  state.animClock += clampedDt;
  state.fireCooldown = Math.max(0, state.fireCooldown - clampedDt);

  const ship = state.ship;
  if (ship.invulnTimer > 0) {
    ship.invulnTimer = Math.max(0, ship.invulnTimer - clampedDt);
  }

  // Twin-stick Left Stick / WASD translational thrust + zero-G inertia damping
  const mx = Number(input.moveX || 0);
  const my = Number(input.moveY || 0);
  const moveMag = Math.hypot(mx, my);
  ship.thrusting = moveMag > 0.12;

  if (ship.thrusting) {
    const nx = mx / Math.max(1, moveMag);
    const ny = my / Math.max(1, moveMag);
    const thrustAccel = 490;
    ship.vx += nx * thrustAccel * Math.min(1, moveMag) * clampedDt;
    ship.vy += ny * thrustAccel * Math.min(1, moveMag) * clampedDt;
    if (Math.hypot(input.aimX || 0, input.aimY || 0) <= 0.15) {
      ship.aimAngle = Math.atan2(ny, nx);
    }
  }

  // Gentle space damping so ship feels agile on touch & desktop
  const damping = Math.pow(0.28, clampedDt);
  ship.vx *= damping;
  ship.vy *= damping;

  const maxSpeed = 270;
  const curSpd = Math.hypot(ship.vx, ship.vy);
  if (curSpd > maxSpeed) {
    ship.vx = (ship.vx / curSpd) * maxSpeed;
    ship.vy = (ship.vy / curSpd) * maxSpeed;
  }

  ship.x = wrapCoord(ship.x + ship.vx * clampedDt, VOID_WIDTH);
  ship.y = wrapCoord(ship.y + ship.vy * clampedDt, VOID_HEIGHT);

  // Right Stick / Arrow / Mouse Aiming & Fire
  const ax = Number(input.aimX || 0);
  const ay = Number(input.aimY || 0);
  const aimMag = Math.hypot(ax, ay);
  if (aimMag > 0.15) {
    ship.aimAngle = Math.atan2(ay, ax);
  }

  const wantsFire = Boolean(input.fire) || aimMag > 0.28;
  if (wantsFire && state.fireCooldown <= 0) {
    const bulletSpeed = 480;
    state.bullets.push({
      x: wrapCoord(ship.x + Math.cos(ship.aimAngle) * 16, VOID_WIDTH),
      y: wrapCoord(ship.y + Math.sin(ship.aimAngle) * 16, VOID_HEIGHT),
      vx: Math.cos(ship.aimAngle) * bulletSpeed + ship.vx * 0.25,
      vy: Math.sin(ship.aimAngle) * bulletSpeed + ship.vy * 0.25,
      life: 0.92,
      radius: 3
    });
    state.fireCooldown = 0.15;
    state.sfxEvents.push('shoot');
  }

  // Advance & wrap bullets
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x = wrapCoord(b.x + b.vx * clampedDt, VOID_WIDTH);
    b.y = wrapCoord(b.y + b.vy * clampedDt, VOID_HEIGHT);
    b.life -= clampedDt;
    if (b.life <= 0) state.bullets.splice(i, 1);
  }

  // Advance & wrap rocks + bullet collision / splitting
  for (let r = state.rocks.length - 1; r >= 0; r -= 1) {
    const rock = state.rocks[r];
    rock.x = wrapCoord(rock.x + rock.vx * clampedDt, VOID_WIDTH);
    rock.y = wrapCoord(rock.y + rock.vy * clampedDt, VOID_HEIGHT);
    rock.angle += rock.rotSpeed * clampedDt;

    let destroyed = false;
    for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
      const b = state.bullets[bi];
      const dist = Math.hypot(b.x - rock.x, b.y - rock.y);
      if (dist <= rock.radius + b.radius) {
        state.bullets.splice(bi, 1);
        state.rocks.splice(r, 1);
        state.score += ROCK_SCORE_BY_SIZE[rock.size] || 100;
        emitVectorSparks(state, rock.x, rock.y, rock.color, 10);
        const kids = splitVectorRock(rock, rng);
        for (let k = 0; k < kids.length; k += 1) {
          state.rocks.push(kids[k]);
        }
        state.sfxEvents.push(kids.length > 0 ? 'split' : 'shatter');
        destroyed = true;
        break;
      }
    }
    if (destroyed) continue;

    // Ship collision
    if (ship.invulnTimer <= 0) {
      const shipDist = Math.hypot(ship.x - rock.x, ship.y - rock.y);
      if (shipDist <= ship.radius + rock.radius * 0.85) {
        emitVectorSparks(state, ship.x, ship.y, '#ef4444', 16);
        state.lives -= 1;
        if (state.lives <= 0) {
          state.status = 'gameover';
          state.sfxEvents.push('gameOver');
          return state;
        }
        ship.x = VOID_WIDTH / 2;
        ship.y = VOID_HEIGHT / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.invulnTimer = 2.4;
        state.sfxEvents.push('shipHit');
      }
    }
  }

  // Wave clear -> advance sector
  if (state.rocks.length === 0 && state.status === 'playing') {
    state.score += 300 * state.wave;
    state.wave += 1;
    ship.invulnTimer = Math.max(ship.invulnTimer, 2.0);
    state.rocks = spawnWaveRocks(state.wave, { x: ship.x, y: ship.y }, rng);
    state.sfxEvents.push('waveClear');
  }

  // Sparks
  for (let i = state.sparks.length - 1; i >= 0; i -= 1) {
    const sp = state.sparks[i];
    sp.x = wrapCoord(sp.x + sp.vx * clampedDt, VOID_WIDTH);
    sp.y = wrapCoord(sp.y + sp.vy * clampedDt, VOID_HEIGHT);
    sp.life -= clampedDt;
    if (sp.life <= 0) state.sparks.splice(i, 1);
  }

  return state;
}
