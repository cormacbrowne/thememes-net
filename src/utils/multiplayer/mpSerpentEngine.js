/**
 * Multiplayer Neon Serpent (2–4 worms in one arena). The host ticks the world and broadcasts it.
 * Last worm alive wins the round; first to `target` round wins takes the match.
 * Bodies are flat [x0, y0, x1, y1, …] arrays (head first) to keep broadcasts small.
 */
import { MP_COLORS } from './roomCore';

export const MP_SERPENT = {
  minPlayers: 2,
  maxPlayers: 4,
  cols: 26,
  rows: 26,
  tickMs: 135,
  startLen: 4,
  countdownMs: 3000,
  roundOverMs: 3500,
  target: 3,
  maxQueue: 3
};

export const MP_FOODS = [
  { t: 'lol', emoji: '😂', grow: 1, weight: 70 },
  { t: 'pizza', emoji: '🍕', grow: 2, weight: 22 },
  { t: 'crown', emoji: '👑', grow: 4, weight: 8 }
];

const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0]
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const clone = (s) => JSON.parse(JSON.stringify(s));

function spawnPoints() {
  const { cols, rows, startLen } = MP_SERPENT;
  const midY = Math.floor(rows / 2);
  const midX = Math.floor(cols / 2);
  const line = (x, y, dir) => {
    const [dx, dy] = DIRS[dir];
    const body = [];
    for (let i = 0; i < startLen; i += 1) body.push(x - dx * i, y - dy * i);
    return { body, dir };
  };
  return [
    line(4, midY - 3, 'right'),
    line(cols - 5, midY + 3, 'left'),
    line(midX + 3, 4, 'down'),
    line(midX - 3, rows - 5, 'up')
  ];
}

function pickFood(rng) {
  const total = MP_FOODS.reduce((a, f) => a + f.weight, 0);
  let roll = rng() * total;
  for (const f of MP_FOODS) {
    roll -= f.weight;
    if (roll <= 0) return f.t;
  }
  return 'lol';
}

function occupiedSet(s) {
  const occ = new Set();
  s.snakes.forEach((sn) => {
    for (let i = 0; i < sn.body.length; i += 2) occ.add(`${sn.body[i]},${sn.body[i + 1]}`);
  });
  s.foods.forEach((f) => occ.add(`${f.x},${f.y}`));
  return occ;
}

function spawnFood(s, rng, type = null) {
  const occ = occupiedSet(s);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const x = Math.floor(rng() * MP_SERPENT.cols);
    const y = Math.floor(rng() * MP_SERPENT.rows);
    if (!occ.has(`${x},${y}`)) {
      s.foods.push({ x, y, t: type || pickFood(rng) });
      return true;
    }
  }
  // Crowded board (or an unlucky rng): take the first free cell so this always ends.
  for (let y = 0; y < MP_SERPENT.rows; y += 1) {
    for (let x = 0; x < MP_SERPENT.cols; x += 1) {
      if (!occ.has(`${x},${y}`)) {
        s.foods.push({ x, y, t: type || pickFood(rng) });
        return true;
      }
    }
  }
  return false;
}

function foodTarget(s) {
  return 3 + s.snakes.length;
}

function resetRound(s, now, rng) {
  const spawns = spawnPoints();
  s.snakes.forEach((sn, i) => {
    sn.body = [...spawns[i].body];
    sn.dir = spawns[i].dir;
    sn.queue = [];
    sn.alive = !sn.away;
    sn.grow = 0;
    sn.diedAt = 0;
  });
  s.foods = [];
  while (s.foods.length < foodTarget(s) && spawnFood(s, rng));
  s.phase = 'countdown';
  s.startAt = now + MP_SERPENT.countdownMs;
  s.round += 1;
  s.roundWinnerId = null;
  s.tick = 0;
  return s;
}

export function serpentStart(players, now = Date.now(), rng = Math.random) {
  const s = {
    game: 'serpent',
    phase: 'countdown',
    round: 0,
    target: MP_SERPENT.target,
    cols: MP_SERPENT.cols,
    rows: MP_SERPENT.rows,
    snakes: players.slice(0, MP_SERPENT.maxPlayers).map((p, i) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: MP_COLORS[i % MP_COLORS.length],
      body: [],
      dir: 'right',
      queue: [],
      alive: true,
      grow: 0,
      wins: 0,
      away: false
    })),
    foods: [],
    startAt: 0,
    nextAt: 0,
    winnerId: null,
    tick: 0
  };
  return resetRound(s, now, rng);
}

export function serpentReduce(prev, { from, type, data }) {
  if (type !== 'dir') return null;
  const d = data?.d;
  if (!DIRS[d]) return null;
  const sn = prev.snakes.find((x) => x.id === from);
  if (!sn || !sn.alive) return null;
  const last = sn.queue.length ? sn.queue[sn.queue.length - 1] : sn.dir;
  if (d === last || d === OPPOSITE[last] || sn.queue.length >= MP_SERPENT.maxQueue) return null;
  // Mutating the queue in place is fine: it is consumed on the next host tick and
  // avoids cloning the whole arena for every key press.
  sn.queue.push(d);
  return prev;
}

/** One world step. Returns a new state (always changes while playing). */
export function serpentTick(prev, now = Date.now(), rng = Math.random) {
  if (prev.phase === 'over') return null;
  if (prev.phase === 'countdown') {
    if (now < prev.startAt) return null;
    const s = clone(prev);
    if (s.snakes.filter((sn) => !sn.away).length < 2) {
      // Not enough players connected: hold the countdown until someone is back.
      s.startAt = now + MP_SERPENT.countdownMs;
      s.waiting = true;
      return s;
    }
    s.waiting = false;
    s.snakes.forEach((sn) => {
      sn.alive = !sn.away;
    });
    s.phase = 'playing';
    return s;
  }
  if (prev.phase === 'roundover') {
    if (now < prev.nextAt) return null;
    return resetRound(clone(prev), now, rng);
  }

  const s = clone(prev);
  s.tick += 1;
  const { cols, rows } = s;
  const movers = s.snakes.filter((sn) => sn.alive);

  // 1) Pick each live worm's next head.
  const heads = new Map();
  movers.forEach((sn) => {
    if (sn.queue.length) sn.dir = sn.queue.shift();
    const [dx, dy] = DIRS[sn.dir];
    heads.set(sn.id, [sn.body[0] + dx, sn.body[1] + dy]);
  });

  // 2) Which worms eat (they keep their tail this tick).
  const eaten = new Map();
  movers.forEach((sn) => {
    const [hx, hy] = heads.get(sn.id);
    const fi = s.foods.findIndex((f) => f.x === hx && f.y === hy);
    if (fi >= 0) eaten.set(sn.id, fi);
  });

  // 3) Cells blocked after the move: every body, minus tails that move away.
  const blocked = new Set();
  s.snakes.forEach((sn) => {
    const len = sn.body.length / 2;
    const keepTail = !sn.alive || sn.grow > 0 || eaten.has(sn.id);
    const upto = keepTail ? len : len - 1;
    for (let i = 0; i < upto; i += 1) blocked.add(`${sn.body[i * 2]},${sn.body[i * 2 + 1]}`);
  });

  const headCount = new Map();
  heads.forEach(([x, y]) => {
    const k = `${x},${y}`;
    headCount.set(k, (headCount.get(k) || 0) + 1);
  });

  const dying = new Set();
  movers.forEach((sn) => {
    const [hx, hy] = heads.get(sn.id);
    const k = `${hx},${hy}`;
    if (hx < 0 || hy < 0 || hx >= cols || hy >= rows || blocked.has(k) || headCount.get(k) > 1) {
      dying.add(sn.id);
    }
  });

  // 4) Move survivors, feed, and turn the dead into snacks.
  const eatenIdx = new Set();
  movers.forEach((sn) => {
    if (dying.has(sn.id)) {
      sn.alive = false;
      sn.diedAt = now;
      for (let i = 2; i < sn.body.length && s.foods.length < 18; i += 6) {
        s.foods.push({ x: sn.body[i], y: sn.body[i + 1], t: 'lol' });
      }
      return;
    }
    const [hx, hy] = heads.get(sn.id);
    sn.body.unshift(hx, hy);
    if (eaten.has(sn.id)) {
      const fi = eaten.get(sn.id);
      const food = MP_FOODS.find((f) => f.t === s.foods[fi].t) || MP_FOODS[0];
      sn.grow += food.grow;
      eatenIdx.add(fi);
    }
    if (sn.grow > 0) sn.grow -= 1;
    else sn.body.splice(-2, 2);
  });
  if (eatenIdx.size) s.foods = s.foods.filter((_, i) => !eatenIdx.has(i));
  // Corpse snacks can land outside the arena edge cases; keep only valid cells.
  s.foods = s.foods.filter((f) => f.x >= 0 && f.y >= 0 && f.x < cols && f.y < rows);
  while (s.foods.length < foodTarget(s) && spawnFood(s, rng));

  // 5) Round over?
  const alive = s.snakes.filter((sn) => sn.alive);
  if (alive.length <= 1) {
    const w = alive[0] || null;
    s.roundWinnerId = w ? w.id : null;
    if (w) w.wins += 1;
    if (w && w.wins >= s.target) {
      s.phase = 'over';
      s.winnerId = w.id;
    } else {
      s.phase = 'roundover';
      s.nextAt = now + MP_SERPENT.roundOverMs;
    }
  }
  return s;
}

export function serpentSyncPlayers(prev, players) {
  const present = new Map(players.map((p) => [p.id, p]));
  let changed = false;
  const s = clone(prev);
  s.snakes.forEach((sn) => {
    const p = present.get(sn.id);
    const away = !p;
    if (sn.away !== away) {
      sn.away = away;
      if (away && sn.alive && s.phase === 'playing') {
        sn.alive = false; // a worm whose player left just fades out
      }
      changed = true;
    }
    if (p && (p.name !== sn.name || p.avatar !== sn.avatar)) {
      sn.name = p.name;
      sn.avatar = p.avatar;
      changed = true;
    }
  });
  return changed ? s : null;
}

export const SERPENT_FOOD_EMOJI = Object.fromEntries(MP_FOODS.map((f) => [f.t, f.emoji]));
