export const SERPENT_GRID_COLS = 20;
export const SERPENT_GRID_ROWS = 20;
export const SERPENT_CELL_PX = 24;
export const SERPENT_CANVAS_SIZE = SERPENT_GRID_COLS * SERPENT_CELL_PX; // 480
export const SERPENT_BEST_SCORE_KEY = 'thememes_serpent_best_v1';
export const SERPENT_MIN_LENGTH = 3;
export const SERPENT_MAX_FOODS = 3;

export const SERPENT_DIRS = {
  up: { x: 0, y: -1, opposite: 'down' },
  down: { x: 0, y: 1, opposite: 'up' },
  left: { x: -1, y: 0, opposite: 'right' },
  right: { x: 1, y: 0, opposite: 'left' }
};

export const SERPENT_REACTIONS = {
  classic: {
    id: 'classic',
    emoji: '😂',
    label: 'LOL BITE',
    effect: 'classic',
    points: 100,
    grow: 1,
    shrink: 0,
    duration: 0,
    color: '#4ade80'
  },
  speed: {
    id: 'speed',
    emoji: '🔥',
    label: 'FIRE SPEED',
    effect: 'speed',
    points: 150,
    grow: 1,
    shrink: 0,
    duration: 6.5,
    color: '#fb923c'
  },
  slowmo: {
    id: 'slowmo',
    emoji: '🗿',
    label: 'MOAI SLOW-MO',
    effect: 'slowmo',
    points: 120,
    grow: 1,
    shrink: 0,
    duration: 7.5,
    color: '#38bdf8'
  },
  shrink: {
    id: 'shrink',
    emoji: '💀',
    label: 'SKULL SHRINK',
    effect: 'shrink',
    points: 180,
    grow: 0,
    shrink: 3,
    duration: 2.2,
    color: '#c084fc'
  },
  crown: {
    id: 'crown',
    emoji: '👑',
    label: 'VIRAL BONUS',
    effect: 'crown',
    points: 300,
    grow: 2,
    shrink: 0,
    duration: 0,
    color: '#facc15'
  }
};

const EFFECT_ROTATION = ['speed', 'slowmo', 'shrink'];

function pickFoodType(state, rng) {
  const existingTypes = new Set(state.foods.map((f) => f.type));
  // Ensure at least one special tactical reaction is present when possible
  if (!existingTypes.has('speed') && !existingTypes.has('slowmo') && !existingTypes.has('shrink')) {
    const roll = rng();
    if (roll < 0.36) return 'speed';
    if (roll < 0.72) return 'slowmo';
    return 'shrink';
  }
  const roll = rng();
  if (roll < 0.44) return 'classic';
  if (roll < 0.6) return 'speed';
  if (roll < 0.76) return 'slowmo';
  if (roll < 0.9) return 'shrink';
  return 'crown';
}

export function spawnReactionFood(state, preferredType = null, rng = Math.random) {
  const occupied = new Set();
  for (let i = 0; i < state.snake.length; i += 1) {
    occupied.add(`${state.snake[i].x},${state.snake[i].y}`);
  }
  for (let i = 0; i < state.foods.length; i += 1) {
    occupied.add(`${state.foods[i].x},${state.foods[i].y}`);
  }

  const freeCells = [];
  for (let y = 0; y < SERPENT_GRID_ROWS; y += 1) {
    for (let x = 0; x < SERPENT_GRID_COLS; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }
  if (freeCells.length === 0) return null;

  const cellIdx = Math.min(freeCells.length - 1, Math.floor(rng() * freeCells.length));
  const cell = freeCells[cellIdx];
  const type =
    preferredType && SERPENT_REACTIONS[preferredType] ? preferredType : pickFoodType(state, rng);

  const food = {
    x: cell.x,
    y: cell.y,
    type,
    emoji: SERPENT_REACTIONS[type].emoji,
    spawnClock: state.animClock || 0
  };
  state.foods.push(food);
  return food;
}

export function createInitialSerpentState({ rng = Math.random } = {}) {
  const startY = Math.floor(SERPENT_GRID_ROWS / 2);
  const startX = 6;
  const snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
    { x: startX - 3, y: startY }
  ];

  const state = {
    status: 'playing', // 'playing' | 'paused' | 'gameover'
    score: 0,
    eatenCount: 0,
    pendingGrowth: 0,
    dir: 'right',
    dirQueue: [],
    snake,
    prevSnake: snake.map((seg) => ({ ...seg })),
    foods: [],
    effects: {
      speedTimer: 0,
      slowmoTimer: 0,
      shrinkFlashTimer: 0
    },
    effectCounts: {
      classic: 0,
      speed: 0,
      slowmo: 0,
      shrink: 0,
      crown: 0
    },
    particles: [],
    popups: [],
    sfxEvents: [],
    stepTimer: 0,
    stepProgress: 1,
    animClock: 0,
    lastEffectText: ''
  };

  // Seed initial board with 1 classic food + 2 tactical effect emojis so players immediately see choices
  spawnReactionFood(state, 'classic', rng);
  const firstEffect = EFFECT_ROTATION[Math.floor(rng() * EFFECT_ROTATION.length)] || 'speed';
  const secondEffect =
    EFFECT_ROTATION[(EFFECT_ROTATION.indexOf(firstEffect) + 1) % EFFECT_ROTATION.length];
  spawnReactionFood(state, firstEffect, rng);
  spawnReactionFood(state, secondEffect, rng);

  return state;
}

export function enqueueSerpentDirection(state, nextDir) {
  if (!state || !SERPENT_DIRS[nextDir]) return false;
  if (state.dirQueue.length >= 3) return false;
  const referenceDir =
    state.dirQueue.length > 0 ? state.dirQueue[state.dirQueue.length - 1] : state.dir;
  if (nextDir === referenceDir || SERPENT_DIRS[nextDir].opposite === referenceDir) {
    return false;
  }
  state.dirQueue.push(nextDir);
  return true;
}

export function getSerpentTickInterval(state) {
  const levelSteps = Math.floor((state.eatenCount || 0) / 5);
  let base = Math.max(0.068, 0.145 - levelSteps * 0.008);
  if (state.effects?.speedTimer > 0) {
    base = Math.max(0.045, base / 1.55);
  } else if (state.effects?.slowmoTimer > 0) {
    base = Math.min(0.32, base / 0.58);
  }
  return base;
}

export function applyReactionEffect(state, reactionType, originCell = null) {
  const def = SERPENT_REACTIONS[reactionType] || SERPENT_REACTIONS.classic;
  const speedBonusActive = state.effects.speedTimer > 0;
  const mult = speedBonusActive && reactionType !== 'speed' ? 2 : 1;
  const pointsAwarded = def.points * mult;

  state.score += pointsAwarded;
  state.eatenCount += 1;
  state.effectCounts[def.id] = (state.effectCounts[def.id] || 0) + 1;

  if (def.effect === 'speed') {
    state.effects.speedTimer = def.duration;
    state.effects.slowmoTimer = 0;
    state.pendingGrowth += def.grow;
    state.lastEffectText = `🔥 SPEED x2 (${def.duration.toFixed(1)}s)`;
  } else if (def.effect === 'slowmo') {
    state.effects.slowmoTimer = def.duration;
    state.effects.speedTimer = 0;
    state.pendingGrowth += def.grow;
    state.lastEffectText = `🗿 SLOW-MO (${def.duration.toFixed(1)}s)`;
  } else if (def.effect === 'shrink') {
    const removable = Math.max(0, state.snake.length - SERPENT_MIN_LENGTH);
    const trimmed = Math.min(def.shrink, removable);
    if (trimmed > 0) {
      state.snake.splice(state.snake.length - trimmed, trimmed);
      state.prevSnake.splice(Math.max(SERPENT_MIN_LENGTH, state.prevSnake.length - trimmed));
    }
    state.pendingGrowth = 0;
    state.effects.shrinkFlashTimer = def.duration;
    state.lastEffectText = trimmed > 0 ? `💀 SHRUNK -${trimmed}` : '💀 MIN LENGTH';
  } else {
    state.pendingGrowth += def.grow;
    state.lastEffectText = `${def.emoji} +${pointsAwarded}`;
  }

  const px = ((originCell?.x ?? state.snake[0].x) + 0.5) * SERPENT_CELL_PX;
  const py = ((originCell?.y ?? state.snake[0].y) + 0.5) * SERPENT_CELL_PX;
  state.popups.push({
    x: px,
    y: py,
    text:
      def.effect === 'shrink'
        ? `💀 -TAIL +${pointsAwarded}`
        : `${def.emoji} +${pointsAwarded}`,
    color: def.color,
    life: 0.95,
    maxLife: 0.95
  });

  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    const speed = 55 + (i % 3) * 35;
    state.particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: def.color,
      life: 0.45,
      maxLife: 0.45,
      size: 4
    });
  }

  state.sfxEvents.push(def.effect === 'crown' ? 'crown' : def.effect === 'shrink' ? 'shrink' : 'eat');
  return pointsAwarded;
}

function advanceSingleGridStep(state, rng) {
  if (state.dirQueue.length > 0) {
    state.dir = state.dirQueue.shift();
  }
  const vec = SERPENT_DIRS[state.dir] || SERPENT_DIRS.right;
  const head = state.snake[0];
  const nextHead = { x: head.x + vec.x, y: head.y + vec.y };

  // Wall collision check
  if (
    nextHead.x < 0 ||
    nextHead.x >= SERPENT_GRID_COLS ||
    nextHead.y < 0 ||
    nextHead.y >= SERPENT_GRID_ROWS
  ) {
    state.status = 'gameover';
    state.sfxEvents.push('gameOver');
    return;
  }

  // Check food at nextHead before body collision (so tail-vacate check knows whether snake grows)
  const foodIndex = state.foods.findIndex((f) => f.x === nextHead.x && f.y === nextHead.y);
  const eatingShrink = foodIndex >= 0 && state.foods[foodIndex].type === 'shrink';
  const willGrowThisStep = !eatingShrink && state.pendingGrowth > 0;
  const bodyCheckLimit = willGrowThisStep ? state.snake.length : state.snake.length - 1;

  for (let i = 0; i < bodyCheckLimit; i += 1) {
    if (state.snake[i].x === nextHead.x && state.snake[i].y === nextHead.y) {
      state.status = 'gameover';
      state.sfxEvents.push('gameOver');
      return;
    }
  }

  state.prevSnake = state.snake.map((seg) => ({ ...seg }));
  state.snake.unshift(nextHead);

  if (state.pendingGrowth > 0 && !eatingShrink) {
    state.pendingGrowth -= 1;
  } else {
    state.snake.pop();
  }

  if (foodIndex >= 0) {
    const [eaten] = state.foods.splice(foodIndex, 1);
    applyReactionEffect(state, eaten.type, nextHead);
    while (state.foods.length < SERPENT_MAX_FOODS) {
      if (!spawnReactionFood(state, null, rng)) break;
    }
  }
}

export function stepSerpentState(state, dt = 0.016, { rng = Math.random } = {}) {
  if (!state) return state;
  state.sfxEvents = [];

  if (state.status !== 'playing') {
    return state;
  }

  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  state.animClock += clampedDt;

  // Tick down active reaction status timers
  if (state.effects.speedTimer > 0) {
    state.effects.speedTimer = Math.max(0, state.effects.speedTimer - clampedDt);
  }
  if (state.effects.slowmoTimer > 0) {
    state.effects.slowmoTimer = Math.max(0, state.effects.slowmoTimer - clampedDt);
  }
  if (state.effects.shrinkFlashTimer > 0) {
    state.effects.shrinkFlashTimer = Math.max(0, state.effects.shrinkFlashTimer - clampedDt);
  }

  // Update particles & floating popups
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * clampedDt;
    p.y += p.vy * clampedDt;
    p.life -= clampedDt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.popups.length - 1; i >= 0; i -= 1) {
    const pop = state.popups[i];
    pop.y -= 28 * clampedDt;
    pop.life -= clampedDt;
    if (pop.life <= 0) state.popups.splice(i, 1);
  }

  const tickInterval = getSerpentTickInterval(state);
  state.stepTimer += clampedDt;

  while (state.stepTimer >= tickInterval && state.status === 'playing') {
    state.stepTimer -= tickInterval;
    advanceSingleGridStep(state, rng);
  }

  state.stepProgress =
    state.status === 'playing' ? Math.min(1, Math.max(0, state.stepTimer / tickInterval)) : 1;

  return state;
}
