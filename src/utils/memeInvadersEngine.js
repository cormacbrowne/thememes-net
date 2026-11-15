import { getTrendingMemes } from './memeFeedBridge';

// ==========================================
// PHASE 33.19: "MEME INVADERS '86" PURE ENGINE
// Deterministic 60fps wave shooter engine:
//   - 5 rows x 8 columns descending emoji/meme sprites
//   - 4 crumbling pixel-block shields
//   - Mystery bonus saucer
//   - Every 5th wave: Boss built from the day's top APPROVED meme
// ==========================================

export const INVADERS_WIDTH = 480;
export const INVADERS_HEIGHT = 600;
export const INVADER_BEST_SCORE_KEY = 'tm_invaders_highscore_v1';
export const BOSS_WAVE_INTERVAL = 5;

export const PLAYER_WIDTH = 44;
export const PLAYER_HEIGHT = 20;
export const PLAYER_Y = 554;
export const PLAYER_SPEED = 320;
export const PLAYER_FIRE_COOLDOWN = 0.24;
export const PLAYER_RAPID_COOLDOWN = 0.13;

export const SHIELD_COLS = 8;
export const SHIELD_ROWS = 5;
export const SHIELD_CELL_W = 6;
export const SHIELD_CELL_H = 6;
export const SHIELD_WIDTH = SHIELD_COLS * SHIELD_CELL_W; // 48
export const SHIELD_HEIGHT = SHIELD_ROWS * SHIELD_CELL_H; // 30
export const SHIELD_Y = 472;

export const INVADER_ROW_TIERS = [
  { id: 'alien', glyph: '👾', points: 50, color: '#00f3ff', label: 'Synth Invader' },
  { id: 'frog', glyph: '🐸', points: 40, color: '#4ade80', label: 'Pepoid Scout' },
  { id: 'moai', glyph: '🗿', points: 30, color: '#c084fc', label: 'Sigma Monolith' },
  { id: 'fire', glyph: '🔥', points: 20, color: '#fb923c', label: 'Hot Take Drone' },
  { id: 'laugh', glyph: '😂', points: 10, color: '#facc15', label: 'Ratio Grunt' }
];

// Arch-shaped 5x8 shield template (1 = intact block, 0 = arch cutout)
const SHIELD_TEMPLATE = [
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 0, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 1, 1]
];

export function isBossWave(wave) {
  const n = Math.floor(Number(wave));
  return Number.isFinite(n) && n >= BOSS_WAVE_INTERVAL && n % BOSS_WAVE_INTERVAL === 0;
}

/**
 * Strictly select ONLY approved memes via memeFeedBridge.getTrendingMemes()
 * so rejected/pending uploads never appear on the wave-5n Boss Sprite.
 */
export function selectDailyTopApprovedMeme(memes = []) {
  if (!Array.isArray(memes) || memes.length === 0) return null;
  const approvedOnly = memes.filter(
    (m) =>
      m &&
      (!m.status || m.status === 'approved') &&
      typeof (m.image_url || m.poster_url) === 'string' &&
      String(m.image_url || m.poster_url).trim().length > 0
  );
  if (approvedOnly.length === 0) return null;
  const top = getTrendingMemes(approvedOnly, 1)[0];
  if (!top) return null;
  return {
    id: top.id,
    title: String(top.title || 'Top Daily Meme').slice(0, 48),
    authorName: String(top.author_name || 'TheMemesHQ').replace(/^@+/, ''),
    imageUrl: top.image_url || top.poster_url,
    score: Number(top.score || 0)
  };
}

export function createCrumblingShields() {
  const xs = [54, 158, 274, 378];
  return xs.map((x, idx) => ({
    id: `shield-${idx}`,
    x,
    y: SHIELD_Y,
    cells: SHIELD_TEMPLATE.map((row) => [...row])
  }));
}

export function createWaveFormation(wave = 1, bossMeme = null) {
  const cleanWave = Math.max(1, Math.floor(Number(wave) || 1));

  if (isBossWave(cleanWave)) {
    const bossTier = Math.max(1, Math.floor(cleanWave / BOSS_WAVE_INTERVAL));
    const maxHp = 22 + (bossTier - 1) * 10;
    const boss = {
      id: `boss-w${cleanWave}`,
      wave: cleanWave,
      x: INVADERS_WIDTH / 2 - 58,
      y: 78,
      width: 116,
      height: 86,
      vx: 76 + bossTier * 12,
      hp: maxHp,
      maxHp,
      hitFlash: 0,
      fireTimer: 1.0,
      title: bossMeme?.title || `WAVE ${cleanWave} OVERLORD`,
      authorName: bossMeme?.authorName || 'TheMemesHQ',
      imageUrl: bossMeme?.imageUrl || null
    };
    const escorts = [
      {
        id: `escort-l-${cleanWave}`,
        row: 0,
        col: 0,
        x: 78,
        y: 184,
        width: 32,
        height: 28,
        glyph: '🛸',
        points: 120,
        color: '#00f3ff',
        alive: true
      },
      {
        id: `escort-r-${cleanWave}`,
        row: 0,
        col: 1,
        x: 370,
        y: 184,
        width: 32,
        height: 28,
        glyph: '🛸',
        points: 120,
        color: '#f472b6',
        alive: true
      }
    ];
    return { invaders: escorts, boss, speedX: 64 + bossTier * 8, dir: 1 };
  }

  const cols = 8;
  const rows = 5;
  const cellX = 46;
  const cellY = 38;
  const startX = 48;
  const startY = Math.min(130, 82 + Math.floor((cleanWave - 1) % 5) * 8);
  const invaders = [];

  for (let r = 0; r < rows; r += 1) {
    const tier = INVADER_ROW_TIERS[r % INVADER_ROW_TIERS.length];
    for (let c = 0; c < cols; c += 1) {
      invaders.push({
        id: `inv-${cleanWave}-${r}-${c}`,
        row: r,
        col: c,
        x: startX + c * cellX,
        y: startY + r * cellY,
        width: 32,
        height: 28,
        glyph: tier.glyph,
        points: tier.points,
        color: tier.color,
        alive: true
      });
    }
  }

  return {
    invaders,
    boss: null,
    speedX: 38 + Math.min(72, (cleanWave - 1) * 7),
    dir: 1
  };
}

export function createInitialInvadersState({ memes = [], topBossMeme: explicitBoss = null } = {}) {
  const topBossMeme = explicitBoss || selectDailyTopApprovedMeme(memes);
  const waveData = createWaveFormation(1, topBossMeme);
  return {
    status: 'playing', // 'ready' | 'playing' | 'paused' | 'gameover'
    score: 0,
    wave: 1,
    lives: 3,
    topBossMeme,
    player: {
      x: INVADERS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: PLAYER_Y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      cooldown: 0,
      invulnTimer: 0,
      rapidTimer: 0
    },
    invaders: waveData.invaders,
    invaderDir: waveData.dir,
    invaderSpeed: waveData.speedX,
    boss: waveData.boss,
    shields: createCrumblingShields(),
    playerBullets: [],
    enemyBullets: [],
    saucer: null,
    saucerTimer: 9.5,
    enemyFireTimer: 1.15,
    animClock: 0,
    bannerText: 'WAVE 1 — DEFEND THE MEME GRID!',
    bannerTimer: 2.0,
    particles: [],
    sfxEvents: []
  };
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function damageShieldAtBullet(shields, bx, by, bw, bh, splash = false) {
  for (let s = 0; s < shields.length; s += 1) {
    const sh = shields[s];
    if (!rectsOverlap(bx, by, bw, bh, sh.x, sh.y, SHIELD_WIDTH, SHIELD_HEIGHT)) {
      continue;
    }
    for (let r = 0; r < SHIELD_ROWS; r += 1) {
      for (let c = 0; c < SHIELD_COLS; c += 1) {
        if (!sh.cells[r][c]) continue;
        const cx = sh.x + c * SHIELD_CELL_W;
        const cy = sh.y + r * SHIELD_CELL_H;
        if (rectsOverlap(bx, by, bw, bh, cx, cy, SHIELD_CELL_W, SHIELD_CELL_H)) {
          sh.cells[r][c] = 0;
          if (splash) {
            if (r + 1 < SHIELD_ROWS) sh.cells[r + 1][c] = 0;
            if (c + 1 < SHIELD_COLS) sh.cells[r][c + 1] = 0;
          }
          return true;
        }
      }
    }
  }
  return false;
}

function erodeShieldsWithRect(shields, rx, ry, rw, rh) {
  for (let s = 0; s < shields.length; s += 1) {
    const sh = shields[s];
    if (!rectsOverlap(rx, ry, rw, rh, sh.x, sh.y, SHIELD_WIDTH, SHIELD_HEIGHT)) {
      continue;
    }
    for (let r = 0; r < SHIELD_ROWS; r += 1) {
      for (let c = 0; c < SHIELD_COLS; c += 1) {
        if (!sh.cells[r][c]) continue;
        const cx = sh.x + c * SHIELD_CELL_W;
        const cy = sh.y + r * SHIELD_CELL_H;
        if (rectsOverlap(rx, ry, rw, rh, cx, cy, SHIELD_CELL_W, SHIELD_CELL_H)) {
          sh.cells[r][c] = 0;
        }
      }
    }
  }
}

function spawnBurst(particles, x, y, color, count = 8) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 60 + (i % 3) * 45;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.42,
      maxLife: 0.42,
      color
    });
  }
}

/**
 * Pure 60fps simulation tick. Never mutates external React objects directly except
 * returning updated next-frame state for mutable ref or unit assertions.
 */
export function stepInvadersState(state, input = {}, rawDt = 1 / 60) {
  if (!state || state.status !== 'playing') {
    if (state && state.sfxEvents?.length) {
      state.sfxEvents = [];
    }
    return state;
  }

  const dt = Math.max(0.001, Math.min(0.05, Number(rawDt) || 1 / 60));
  state.sfxEvents = [];
  state.animClock += dt;
  if (state.bannerTimer > 0) {
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  }

  const p = state.player;
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.rapidTimer = Math.max(0, p.rapidTimer - dt);

  // Player horizontal movement (keyboard, gamepad axis, or direct pointer X)
  if (typeof input.targetX === 'number' && Number.isFinite(input.targetX)) {
    const clampedTarget = Math.max(
      12,
      Math.min(INVADERS_WIDTH - PLAYER_WIDTH - 12, input.targetX - PLAYER_WIDTH / 2)
    );
    const diff = clampedTarget - p.x;
    const maxStep = PLAYER_SPEED * 1.6 * dt;
    p.x += Math.abs(diff) <= maxStep ? diff : Math.sign(diff) * maxStep;
  } else {
    const moveAxis =
      typeof input.moveAxis === 'number' && Math.abs(input.moveAxis) > 0.15
        ? Math.max(-1, Math.min(1, input.moveAxis))
        : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.x = Math.max(
      12,
      Math.min(INVADERS_WIDTH - PLAYER_WIDTH - 12, p.x + moveAxis * PLAYER_SPEED * dt)
    );
  }

  // Player fire
  const maxBolts = p.rapidTimer > 0 ? 4 : 2;
  const fireRate = p.rapidTimer > 0 ? PLAYER_RAPID_COOLDOWN : PLAYER_FIRE_COOLDOWN;
  if (input.fire && p.cooldown <= 0 && state.playerBullets.length < maxBolts) {
    state.playerBullets.push({
      x: p.x + PLAYER_WIDTH / 2 - 2,
      y: p.y - 10,
      width: 4,
      height: 12,
      vy: -510
    });
    p.cooldown = fireRate;
    state.sfxEvents.push('shoot');
  }

  // Update player bullets
  const nextPlayerBullets = [];
  for (let i = 0; i < state.playerBullets.length; i += 1) {
    const b = state.playerBullets[i];
    b.y += b.vy * dt;
    if (b.y + b.height < 0) continue;

    if (damageShieldAtBullet(state.shields, b.x, b.y, b.width, b.height, false)) {
      state.sfxEvents.push('shield');
      continue;
    }

    // Bonus Saucer hit
    if (
      state.saucer &&
      rectsOverlap(b.x, b.y, b.width, b.height, state.saucer.x, state.saucer.y, 46, 20)
    ) {
      const pts = state.saucer.points;
      state.score += pts;
      p.rapidTimer = 7.0;
      spawnBurst(state.particles, state.saucer.x + 23, state.saucer.y + 10, '#f472b6', 12);
      state.bannerText = `🛸 MYSTERY SAUCER +${pts} PTS + RAPID LASER!`;
      state.bannerTimer = 2.2;
      state.saucer = null;
      state.sfxEvents.push('saucer');
      continue;
    }

    // Boss hit (Wave 5, 10, 15...)
    if (
      state.boss &&
      state.boss.hp > 0 &&
      rectsOverlap(
        b.x,
        b.y,
        b.width,
        b.height,
        state.boss.x,
        state.boss.y,
        state.boss.width,
        state.boss.height
      )
    ) {
      state.boss.hp -= 1;
      state.boss.hitFlash = 0.14;
      state.score += 35;
      spawnBurst(state.particles, b.x + 2, b.y, '#00f3ff', 5);
      if (state.boss.hp <= 0) {
        const bonus = 1500 + state.wave * 120;
        state.score += bonus;
        spawnBurst(
          state.particles,
          state.boss.x + state.boss.width / 2,
          state.boss.y + state.boss.height / 2,
          '#facc15',
          18
        );
        state.bannerText = `💥 TOP MEME BOSS DEFEATED! +${bonus} PTS`;
        state.bannerTimer = 2.6;
        state.sfxEvents.push('bossDefeated');
      } else {
        state.sfxEvents.push('hit');
      }
      continue;
    }

    // Standard Invader hit
    let hitInvader = false;
    for (let k = 0; k < state.invaders.length; k += 1) {
      const inv = state.invaders[k];
      if (!inv.alive) continue;
      if (rectsOverlap(b.x, b.y, b.width, b.height, inv.x, inv.y, inv.width, inv.height)) {
        inv.alive = false;
        hitInvader = true;
        state.score += inv.points;
        spawnBurst(state.particles, inv.x + inv.width / 2, inv.y + inv.height / 2, inv.color, 7);
        state.sfxEvents.push('hit');
        break;
      }
    }
    if (!hitInvader) {
      nextPlayerBullets.push(b);
    }
  }
  state.playerBullets = nextPlayerBullets;

  // Bonus saucer spawn & movement
  if (state.saucer) {
    state.saucer.x += state.saucer.vx * dt;
    if (state.saucer.x < -60 || state.saucer.x > INVADERS_WIDTH + 60) {
      state.saucer = null;
    }
  } else {
    state.saucerTimer -= dt;
    if (state.saucerTimer <= 0) {
      const fromLeft = Math.random() < 0.5;
      const ptsPool = [100, 150, 250, 300];
      state.saucer = {
        x: fromLeft ? -48 : INVADERS_WIDTH + 4,
        y: 34,
        vx: fromLeft ? 128 : -128,
        points: ptsPool[Math.floor(Math.random() * ptsPool.length)]
      };
      state.saucerTimer = 11 + Math.random() * 6;
    }
  }

  // Boss movement & attack
  if (state.boss && state.boss.hp > 0) {
    const boss = state.boss;
    boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    boss.x += boss.vx * dt;
    if (boss.x <= 18) {
      boss.x = 18;
      boss.vx = Math.abs(boss.vx);
    } else if (boss.x + boss.width >= INVADERS_WIDTH - 18) {
      boss.x = INVADERS_WIDTH - 18 - boss.width;
      boss.vx = -Math.abs(boss.vx);
    }
    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      const cx = boss.x + boss.width / 2;
      const cy = boss.y + boss.height;
      state.enemyBullets.push(
        { x: cx - 3, y: cy, vx: -55, vy: 215, width: 6, height: 12, color: '#f43f5e' },
        { x: cx - 3, y: cy, vx: 0, vy: 245, width: 6, height: 12, color: '#facc15' },
        { x: cx - 3, y: cy, vx: 55, vy: 215, width: 6, height: 12, color: '#f43f5e' }
      );
      boss.fireTimer = Math.max(0.75, 1.45 - Math.floor(state.wave / 5) * 0.12);
    }
  }

  // Descending invaders step
  const aliveInvaders = state.invaders.filter((inv) => inv.alive);
  if (aliveInvaders.length > 0) {
    const swarmBoost = 1 + (40 - Math.min(40, aliveInvaders.length)) * 0.025;
    const dx = state.invaderDir * state.invaderSpeed * swarmBoost * dt;
    let hitWall = false;
    for (let i = 0; i < aliveInvaders.length; i += 1) {
      const nx = aliveInvaders[i].x + dx;
      if (nx <= 14 || nx + aliveInvaders[i].width >= INVADERS_WIDTH - 14) {
        hitWall = true;
        break;
      }
    }

    if (hitWall) {
      state.invaderDir *= -1;
      for (let i = 0; i < aliveInvaders.length; i += 1) {
        const inv = aliveInvaders[i];
        inv.y += 18;
        erodeShieldsWithRect(state.shields, inv.x, inv.y, inv.width, inv.height);
        if (inv.y + inv.height >= PLAYER_Y - 4) {
          state.lives = 0;
          state.status = 'gameover';
          state.bannerText = '👾 INVADERS BREACHED THE GRID!';
          state.sfxEvents.push('gameOver');
          return state;
        }
      }
    } else {
      for (let i = 0; i < aliveInvaders.length; i += 1) {
        aliveInvaders[i].x += dx;
      }
    }

    // Invader fire from front-most row sprites
    state.enemyFireTimer -= dt;
    if (state.enemyFireTimer <= 0) {
      const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
      if (shooter) {
        state.enemyBullets.push({
          x: shooter.x + shooter.width / 2 - 2,
          y: shooter.y + shooter.height,
          vx: 0,
          vy: 205 + Math.min(90, state.wave * 10),
          width: 4,
          height: 12,
          color: '#fb7185'
        });
      }
      state.enemyFireTimer = Math.max(0.45, 1.2 - state.wave * 0.06);
    }
  }

  // Update enemy bullets
  const nextEnemyBullets = [];
  for (let i = 0; i < state.enemyBullets.length; i += 1) {
    const eb = state.enemyBullets[i];
    eb.x += (eb.vx || 0) * dt;
    eb.y += eb.vy * dt;
    if (eb.y > INVADERS_HEIGHT + 16 || eb.x < -16 || eb.x > INVADERS_WIDTH + 16) continue;

    if (damageShieldAtBullet(state.shields, eb.x, eb.y, eb.width, eb.height, true)) {
      state.sfxEvents.push('shield');
      continue;
    }

    if (
      p.invulnTimer <= 0 &&
      rectsOverlap(eb.x, eb.y, eb.width, eb.height, p.x + 3, p.y + 3, p.width - 6, p.height - 4)
    ) {
      state.lives -= 1;
      p.invulnTimer = 1.6;
      p.rapidTimer = 0;
      spawnBurst(state.particles, p.x + PLAYER_WIDTH / 2, p.y + 8, '#ef4444', 12);
      if (state.lives <= 0) {
        state.status = 'gameover';
        state.bannerText = '💥 GAME OVER — SHIP DESTROYED';
        state.sfxEvents.push('gameOver');
      } else {
        state.bannerText = `⚠️ HULL HIT! ${state.lives} ${state.lives === 1 ? 'LIFE' : 'LIVES'} LEFT`;
        state.bannerTimer = 1.5;
        state.sfxEvents.push('playerHit');
      }
      continue;
    }

    nextEnemyBullets.push(eb);
  }
  state.enemyBullets = nextEnemyBullets;

  // Update particles
  const nextParticles = [];
  for (let i = 0; i < state.particles.length; i += 1) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life > 0) nextParticles.push(pt);
  }
  state.particles = nextParticles;

  // Wave cleared check
  const bossAlive = Boolean(state.boss && state.boss.hp > 0);
  if (!bossAlive && aliveInvaders.length === 0) {
    state.wave += 1;
    state.score += 250;
    const waveData = createWaveFormation(state.wave, state.topBossMeme);
    state.invaders = waveData.invaders;
    state.invaderDir = waveData.dir;
    state.invaderSpeed = waveData.speedX;
    state.boss = waveData.boss;
    state.playerBullets = [];
    state.enemyBullets = [];
    // Restore shields slightly after clearing a Boss wave
    if ((state.wave - 1) % BOSS_WAVE_INTERVAL === 0) {
      state.shields = createCrumblingShields();
    }
    if (isBossWave(state.wave)) {
      state.bannerText = `🚨 WAVE ${state.wave} BOSS: ${state.boss.title.toUpperCase()}!`;
      state.sfxEvents.push('bossAppear');
    } else {
      state.bannerText = `⚡ WAVE ${state.wave} — INCOMING!`;
      state.sfxEvents.push('waveClear');
    }
    state.bannerTimer = 2.4;
  }

  return state;
}
