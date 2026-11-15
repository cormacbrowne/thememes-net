export const BLASTER_WIDTH = 480;
export const BLASTER_HEIGHT = 600;
export const BLASTER_BEST_SCORE_KEY = 'thememes_blaster_best_v1';

export const PADDLE_BASE_WIDTH = 92;
export const PADDLE_WIDE_WIDTH = 144;
export const PADDLE_HEIGHT = 16;
export const PADDLE_Y = BLASTER_HEIGHT - 44;
export const PADDLE_SPEED = 460;
export const BALL_RADIUS = 8;

export const BLASTER_POWERUPS = {
  multiball: { id: 'multiball', label: 'MULTI-BALL', emoji: '⚡', color: '#facc15' },
  laser: { id: 'laser', label: 'TWIN LASER', emoji: '🔫', color: '#f472b6' },
  wide: { id: 'wide', label: 'WIDE PADDLE', emoji: '↔️', color: '#38bdf8' }
};

const POWERUP_KEYS = ['multiball', 'laser', 'wide'];

/**
 * Each level blueprint spells a word or draws an 80s pixel face across a 13-col grid:
 * - '1': 1-HP neon brick (100 pts)
 * - '2': 2-HP armored gold brick (150 pts)
 * - '3': 3-HP synthwave core brick (250 pts)
 * - '*': 1-HP mystery brick (guaranteed power-up drop)
 */
export const BLASTER_LEVELS = [
  {
    name: 'LOL WORD',
    kind: 'word',
    rows: [
      '.1...111.1...',
      '.1...1.1.1...',
      '.1...1*1.1...',
      '.1...1.1.1...',
      '.111.111.111.',
      '...2.....2...'
    ]
  },
  {
    name: 'NEON SMILEY FACE',
    kind: 'face',
    rows: [
      '...2222222...',
      '..211111112..',
      '.21*11111*12.',
      '.21311111312.',
      '.21111111112.',
      '.21121112112.',
      '..211222112..',
      '...2222222...'
    ]
  },
  {
    name: 'MEME WORD',
    kind: 'word',
    rows: [
      '1...1.111.1..',
      '11.11.1...11.',
      '1.1.1.11*..1.',
      '1...1.1...1.1',
      '1...1.111.1.1',
      '22.22.222.222'
    ]
  },
  {
    name: 'CYBER FROG FACE',
    kind: 'face',
    rows: [
      '..33.....33..',
      '.3*13...31*3.',
      '.21112221112.',
      '.21111111112.',
      '..212222212..',
      '...2211122...'
    ]
  }
];

function createBricksForLevel(levelNumber) {
  const blueprint = BLASTER_LEVELS[(levelNumber - 1) % BLASTER_LEVELS.length];
  const rows = blueprint.rows;
  const cols = rows[0].length;
  const marginX = 18;
  const gap = 3;
  const usableW = BLASTER_WIDTH - marginX * 2 - gap * (cols - 1);
  const brickW = Math.floor(usableW / cols);
  const offsetX = Math.floor((BLASTER_WIDTH - (cols * brickW + (cols - 1) * gap)) / 2);
  const startY = 74;
  const brickH = 20;

  const palette = ['#00f3ff', '#4ade80', '#f472b6', '#c084fc', '#fb923c', '#38bdf8'];
  const bricks = [];

  for (let r = 0; r < rows.length; r += 1) {
    const line = rows[r];
    for (let c = 0; c < line.length; c += 1) {
      const ch = line[c];
      if (ch === '.') continue;
      const isMystery = ch === '*';
      const hp = ch === '3' ? 3 : ch === '2' ? 2 : 1;
      const color =
        ch === '3'
          ? '#f43f5e'
          : ch === '2'
            ? '#facc15'
            : isMystery
              ? '#e879f9'
              : palette[(r + c) % palette.length];

      bricks.push({
        id: `${levelNumber}-${r}-${c}`,
        x: offsetX + c * (brickW + gap),
        y: startY + r * (brickH + gap),
        w: brickW,
        h: brickH,
        hp,
        maxHp: hp,
        color,
        isMystery,
        points: ch === '3' ? 250 : ch === '2' ? 150 : 100
      });
    }
  }

  return {
    levelName: blueprint.name,
    levelKind: blueprint.kind,
    bricks
  };
}

function createBall(x, y, vx, vy, attached = false) {
  return { x, y, vx, vy, radius: BALL_RADIUS, attached };
}

export function createInitialBrickBlasterState({ level = 1, rng = Math.random } = {}) {
  const { levelName, levelKind, bricks } = createBricksForLevel(level);
  const paddle = {
    x: (BLASTER_WIDTH - PADDLE_BASE_WIDTH) / 2,
    y: PADDLE_Y,
    w: PADDLE_BASE_WIDTH,
    h: PADDLE_HEIGHT
  };

  return {
    status: 'playing', // 'playing' | 'paused' | 'gameover'
    score: 0,
    lives: 3,
    level,
    levelName,
    levelKind,
    paddle,
    balls: [createBall(BLASTER_WIDTH / 2, PADDLE_Y - BALL_RADIUS - 2, 185, -340, false)],
    bricks,
    powerups: [],
    lasers: [],
    particles: [],
    sfxEvents: [],
    effects: {
      wideTimer: 0,
      laserTimer: 0
    },
    laserCooldown: 0,
    comboCount: 0,
    animClock: 0,
    rng
  };
}

export function applyBrickPowerup(state, powerupId) {
  if (!state) return;
  if (powerupId === 'wide') {
    const center = state.paddle.x + state.paddle.w / 2;
    state.paddle.w = PADDLE_WIDE_WIDTH;
    state.paddle.x = Math.max(8, Math.min(BLASTER_WIDTH - state.paddle.w - 8, center - state.paddle.w / 2));
    state.effects.wideTimer = 12;
  } else if (powerupId === 'laser') {
    state.effects.laserTimer = 10;
    state.laserCooldown = 0;
  } else if (powerupId === 'multiball') {
    const seedBall = state.balls[0] || createBall(state.paddle.x + state.paddle.w / 2, PADDLE_Y - BALL_RADIUS - 2, 160, -340, false);
    seedBall.attached = false;
    if (state.balls.length === 0) state.balls.push(seedBall);

    const speed = Math.hypot(seedBall.vx, seedBall.vy) || 375;
    const angles = [-0.62, 0.62, -0.28];
    for (let i = 0; i < angles.length && state.balls.length < 4; i += 1) {
      const ang = angles[i];
      state.balls.push(
        createBall(
          seedBall.x,
          seedBall.y,
          Math.sin(ang) * speed,
          -Math.abs(Math.cos(ang) * speed),
          false
        )
      );
    }
  }
  state.score += 100;
  state.sfxEvents.push('powerup');
}

function maybeSpawnPowerup(state, brick, rng) {
  const dropChance = brick.isMystery ? 1 : 0.24;
  if (rng() > dropChance) return;
  const pickKey = POWERUP_KEYS[Math.floor(rng() * POWERUP_KEYS.length)] || 'multiball';
  const def = BLASTER_POWERUPS[pickKey];
  state.powerups.push({
    x: brick.x + brick.w / 2,
    y: brick.y + brick.h / 2,
    vy: 155,
    type: def.id,
    emoji: def.emoji,
    color: def.color,
    label: def.label,
    radius: 13
  });
}

function spawnBrickSparks(state, x, y, color, count = 8) {
  for (let i = 0; i < count; i += 1) {
    const ang = (Math.PI * 2 * i) / count;
    const spd = 65 + (i % 3) * 45;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      color,
      life: 0.42,
      maxLife: 0.42,
      size: 4
    });
  }
}

function damageBrickAtIndex(state, index, rng) {
  const brick = state.bricks[index];
  if (!brick) return;
  brick.hp -= 1;
  if (brick.hp <= 0) {
    state.bricks.splice(index, 1);
    state.comboCount += 1;
    state.score += brick.points + Math.min(150, (state.comboCount - 1) * 15);
    spawnBrickSparks(state, brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 9);
    maybeSpawnPowerup(state, brick, rng);
    state.sfxEvents.push('brickBreak');
  } else {
    state.score += 25;
    spawnBrickSparks(state, brick.x + brick.w / 2, brick.y + brick.h / 2, '#fde047', 4);
    state.sfxEvents.push('brickHit');
  }
}

export function launchAttachedBalls(state) {
  if (!state) return false;
  let launched = false;
  for (let i = 0; i < state.balls.length; i += 1) {
    if (state.balls[i].attached) {
      state.balls[i].attached = false;
      state.balls[i].vx = i % 2 === 0 ? 175 : -175;
      state.balls[i].vy = -360;
      launched = true;
    }
  }
  return launched;
}

export function stepBrickBlasterState(state, input = {}, dt = 0.016, rngOverride = null) {
  if (!state) return state;
  state.sfxEvents = [];

  if (state.status !== 'playing') {
    return state;
  }

  const rng = rngOverride || state.rng || Math.random;
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  state.animClock += clampedDt;

  // Paddle timers
  if (state.effects.wideTimer > 0) {
    state.effects.wideTimer = Math.max(0, state.effects.wideTimer - clampedDt);
    if (state.effects.wideTimer === 0 && state.paddle.w !== PADDLE_BASE_WIDTH) {
      const center = state.paddle.x + state.paddle.w / 2;
      state.paddle.w = PADDLE_BASE_WIDTH;
      state.paddle.x = Math.max(8, Math.min(BLASTER_WIDTH - state.paddle.w - 8, center - state.paddle.w / 2));
    }
  }

  if (state.effects.laserTimer > 0) {
    state.effects.laserTimer = Math.max(0, state.effects.laserTimer - clampedDt);
  }
  state.laserCooldown = Math.max(0, state.laserCooldown - clampedDt);

  // Move paddle cleanly by drag target or keyboard/gamepad axis
  if (typeof input.targetX === 'number' && !Number.isNaN(input.targetX)) {
    const desired = input.targetX - state.paddle.w / 2;
    const diff = desired - state.paddle.x;
    const maxStep = 980 * clampedDt;
    if (Math.abs(diff) <= maxStep) state.paddle.x = desired;
    else state.paddle.x += Math.sign(diff) * maxStep;
  } else {
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    if (typeof input.moveAxis === 'number' && Math.abs(input.moveAxis) > 0.15) {
      dir = input.moveAxis;
    }
    state.paddle.x += dir * PADDLE_SPEED * clampedDt;
  }
  state.paddle.x = Math.max(6, Math.min(BLASTER_WIDTH - state.paddle.w - 6, state.paddle.x));

  if (input.launch || input.fire) {
    launchAttachedBalls(state);
  }

  // Twin Laser cannon fire when laser power-up is active
  if (state.effects.laserTimer > 0 && state.laserCooldown <= 0 && (input.fire || input.autoLaser !== false)) {
    state.lasers.push(
      { x: state.paddle.x + 12, y: state.paddle.y - 8, vy: -560 },
      { x: state.paddle.x + state.paddle.w - 12, y: state.paddle.y - 8, vy: -560 }
    );
    state.laserCooldown = 0.24;
    state.sfxEvents.push('laser');
  }

  // Update lasers & brick hits
  for (let i = state.lasers.length - 1; i >= 0; i -= 1) {
    const l = state.lasers[i];
    l.y += l.vy * clampedDt;
    if (l.y < -16) {
      state.lasers.splice(i, 1);
      continue;
    }
    for (let b = state.bricks.length - 1; b >= 0; b -= 1) {
      const br = state.bricks[b];
      if (l.x >= br.x && l.x <= br.x + br.w && l.y >= br.y && l.y <= br.y + br.h) {
        damageBrickAtIndex(state, b, rng);
        state.lasers.splice(i, 1);
        break;
      }
    }
  }

  // Update falling powerup capsules & catch with paddle
  for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
    const cap = state.powerups[i];
    cap.y += cap.vy * clampedDt;
    if (
      cap.y + cap.radius >= state.paddle.y &&
      cap.y - cap.radius <= state.paddle.y + state.paddle.h &&
      cap.x + cap.radius >= state.paddle.x &&
      cap.x - cap.radius <= state.paddle.x + state.paddle.w
    ) {
      applyBrickPowerup(state, cap.type);
      state.powerups.splice(i, 1);
      continue;
    }
    if (cap.y - cap.radius > BLASTER_HEIGHT + 20) {
      state.powerups.splice(i, 1);
    }
  }

  // Sub-step balls for rock-solid brick & wall collisions
  const subSteps = 2;
  const subDt = clampedDt / subSteps;

  for (let bi = state.balls.length - 1; bi >= 0; bi -= 1) {
    const ball = state.balls[bi];
    if (ball.attached) {
      ball.x = state.paddle.x + state.paddle.w / 2;
      ball.y = state.paddle.y - ball.radius - 2;
      continue;
    }

    for (let step = 0; step < subSteps; step += 1) {
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;

      // Side & ceiling walls
      if (ball.x - ball.radius < 4) {
        ball.x = 4 + ball.radius;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + ball.radius > BLASTER_WIDTH - 4) {
        ball.x = BLASTER_WIDTH - 4 - ball.radius;
        ball.vx = -Math.abs(ball.vx);
      }

      if (ball.y - ball.radius < 4) {
        ball.y = 4 + ball.radius;
        ball.vy = Math.abs(ball.vy);
      }

      // Paddle bounce with controllable angle
      if (
        ball.vy > 0 &&
        ball.y + ball.radius >= state.paddle.y &&
        ball.y - ball.radius <= state.paddle.y + state.paddle.h &&
        ball.x + ball.radius >= state.paddle.x &&
        ball.x - ball.radius <= state.paddle.x + state.paddle.w
      ) {
        const paddleCenter = state.paddle.x + state.paddle.w / 2;
        const normOffset = Math.max(-1, Math.min(1, (ball.x - paddleCenter) / (state.paddle.w / 2)));
        const maxBounceAngle = 1.08;
        const bounceAngle = normOffset * maxBounceAngle;
        const levelSpeedBoost = Math.min(120, (state.level - 1) * 18);
        const speed = Math.min(540, Math.max(380 + levelSpeedBoost, Math.hypot(ball.vx, ball.vy)));

        ball.vx = Math.sin(bounceAngle) * speed;
        ball.vy = -Math.abs(Math.cos(bounceAngle) * speed);
        ball.y = state.paddle.y - ball.radius - 1;
        state.comboCount = 0;
        state.sfxEvents.push('paddle');
      }

      // Brick collision
      for (let k = state.bricks.length - 1; k >= 0; k -= 1) {
        const br = state.bricks[k];
        const closestX = Math.max(br.x, Math.min(ball.x, br.x + br.w));
        const closestY = Math.max(br.y, Math.min(ball.y, br.y + br.h));
        const dx = ball.x - closestX;
        const dy = ball.y - closestY;

        if (dx * dx + dy * dy <= ball.radius * ball.radius) {
          const overlapLeft = ball.x + ball.radius - br.x;
          const overlapRight = br.x + br.w - (ball.x - ball.radius);
          const overlapTop = ball.y + ball.radius - br.y;
          const overlapBottom = br.y + br.h - (ball.y - ball.radius);
          const minX = Math.min(overlapLeft, overlapRight);
          const minY = Math.min(overlapTop, overlapBottom);

          if (minX < minY) {
            ball.vx = -ball.vx;
          } else {
            ball.vy = -ball.vy;
          }
          // Avoid dead horizontal bounce loops
          if (Math.abs(ball.vy) < 95) {
            ball.vy = ball.vy >= 0 ? 110 : -110;
          }
          damageBrickAtIndex(state, k, rng);
          break;
        }
      }
    }

    if (ball.y - ball.radius > BLASTER_HEIGHT + 16) {
      state.balls.splice(bi, 1);
    }
  }

  // Drain check
  if (state.balls.length === 0) {
    state.lives -= 1;
    state.comboCount = 0;
    state.effects.wideTimer = 0;
    state.effects.laserTimer = 0;
    state.paddle.w = PADDLE_BASE_WIDTH;
    if (state.lives <= 0) {
      state.status = 'gameover';
      state.sfxEvents.push('gameOver');
    } else {
      state.balls.push(
        createBall(
          state.paddle.x + state.paddle.w / 2,
          state.paddle.y - BALL_RADIUS - 2,
          185,
          -355,
          true
        )
      );
      state.sfxEvents.push('lifeLost');
    }
  }

  // Level clear check
  if (state.bricks.length === 0 && state.status === 'playing') {
    state.score += 500 * state.level;
    state.level += 1;
    const nextMap = createBricksForLevel(state.level);
    state.levelName = nextMap.levelName;
    state.levelKind = nextMap.levelKind;
    state.bricks = nextMap.bricks;
    state.powerups = [];
    state.lasers = [];
    state.balls = [
      createBall(
        state.paddle.x + state.paddle.w / 2,
        state.paddle.y - BALL_RADIUS - 2,
        195,
        -370,
        false
      )
    ];
    state.sfxEvents.push('levelClear');
  }

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * clampedDt;
    p.y += p.vy * clampedDt;
    p.life -= clampedDt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  return state;
}
