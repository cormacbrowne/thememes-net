import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { getLevelBackdropMeme } from '../utils/memeFeedBridge';

const GRID_SIZE = 8;

const CANDY_TYPES = [
  {
    id: 0,
    emoji: '🐸',
    name: 'Neon Frog',
    bg: 'radial-gradient(circle at 32% 28%, #bbf7d0 0%, #4ade80 38%, #15803d 100%)',
    border: '#86efac'
  },
  {
    id: 1,
    emoji: '🔥',
    name: 'Outrun Flame',
    bg: 'radial-gradient(circle at 32% 28%, #fed7aa 0%, #fb923c 38%, #c2410c 100%)',
    border: '#fdba74'
  },
  {
    id: 2,
    emoji: '💎',
    name: 'Cyber Diamond',
    bg: 'radial-gradient(circle at 32% 28%, #e0f2fe 0%, #38bdf8 38%, #0369a1 100%)',
    border: '#7dd3fc'
  },
  {
    id: 3,
    emoji: '🦆',
    name: 'Laser Duck',
    bg: 'radial-gradient(circle at 32% 28%, #fef9c3 0%, #facc15 38%, #a16207 100%)',
    border: '#fde047'
  },
  {
    id: 4,
    emoji: '💀',
    name: 'Synth Skull',
    bg: 'radial-gradient(circle at 32% 28%, #f3e8ff 0%, #c084fc 38%, #6b21a8 100%)',
    border: '#d8b4fe'
  },
  {
    id: 5,
    emoji: '🍕',
    name: 'Arcade Pizza',
    bg: 'radial-gradient(circle at 32% 28%, #fce7f3 0%, #f472b6 38%, #9d174d 100%)',
    border: '#f9a8d4'
  }
];

// ==========================================
// 10 DISTINCT 80s NEON CAMPAIGN LEVELS
// Each level features its own carved board geometry, palette & unique objectives!
// ==========================================
const CRUSH_LEVELS = [
  {
    id: 1,
    name: 'Miami Sunset Strip',
    badge: '🧊 JELLY CLEAR',
    accent: '#ec4899',
    moves: 20,
    starScores: [2200, 4200, 6800],
    desc: 'Shatter all 16 Pink Neon Jellies across the Sunset Board!',
    isVoid: () => false,
    initJelly: (r, c) => (r >= 2 && r <= 5 && c >= 2 && c <= 5 ? 1 : 0),
    initLock: () => false,
    goals: { jelly: true, cassettes: 0, locks: 0, orders: null, minScore: 0 }
  },
  {
    id: 2,
    name: "Mall Arcade '84",
    badge: '🎯 CANDY ORDER',
    accent: '#00f3ff',
    moves: 20,
    starScores: [2500, 4600, 7200],
    desc: 'Octagon Cabinet: Collect 15 🐸 Frogs & 15 💎 Diamonds!',
    isVoid: (r, c) =>
      (r === 0 && (c === 0 || c === 7)) ||
      (r === 7 && (c === 0 || c === 7)) ||
      (r === 1 && (c === 0 || c === 7) && false),
    initJelly: () => 0,
    initLock: () => false,
    goals: { jelly: false, cassettes: 0, locks: 0, orders: { 0: 15, 2: 15 }, minScore: 0 }
  },
  {
    id: 3,
    name: 'Synth Mixtape Drop',
    badge: '📼 CASSETTE DROP',
    accent: '#facc15',
    moves: 22,
    starScores: [2800, 5000, 7800],
    desc: 'Twin Channels: Drop 3 📼 80s Mixtapes to the bottom Neon Exit Row!',
    isVoid: (r, c) => (r >= 2 && r <= 4 && (c === 2 || c === 5)),
    initJelly: () => 0,
    initLock: () => false,
    goals: { jelly: false, cassettes: 3, locks: 0, orders: null, minScore: 0 }
  },
  {
    id: 4,
    name: 'Cryo-Vault Lasers',
    badge: '🔒 LASER LOCKS',
    accent: '#38bdf8',
    moves: 22,
    starScores: [3000, 5400, 8200],
    desc: 'Hourglass Grid: Break all 10 🔒 Locked Tiles & Clear 12 Jellies!',
    isVoid: (r, c) => (r === 3 || r === 4) && (c === 0 || c === 7),
    initJelly: (r, c) => (r >= 2 && r <= 5 && c >= 2 && c <= 4 ? 1 : 0),
    initLock: (r, c) => (r === 3 || r === 4) && c >= 1 && c <= 5,
    goals: { jelly: true, cassettes: 0, locks: 10, orders: null, minScore: 0 }
  },
  {
    id: 5,
    name: 'Flamingo Lagoon',
    badge: '🦩 ISLAND ORDER',
    accent: '#f472b6',
    moves: 21,
    starScores: [3200, 5800, 8800],
    desc: 'Donut Lagoon: Collect 16 🦆 Ducks, 16 🍕 Pizzas & 12 🔥 Flames!',
    isVoid: (r, c) => r >= 3 && r <= 4 && c >= 3 && c <= 4,
    initJelly: () => 0,
    initLock: () => false,
    goals: { jelly: false, cassettes: 0, locks: 0, orders: { 3: 16, 5: 16, 1: 12 }, minScore: 0 }
  },
  {
    id: 6,
    name: 'Outrun Laser Bridge',
    badge: '🧊 DOUBLE FROST',
    accent: '#a855f7',
    moves: 23,
    starScores: [3500, 6200, 9400],
    desc: 'Twin Bridges: Shatter 20 Heavy Double-Layer Crystal Jellies!',
    isVoid: (r, c) => (r === 3 || r === 4) && (c === 3 || c === 4 || c === 0 || c === 7),
    initJelly: (r, c) => ((r <= 2 || r >= 5) && c >= 2 && c <= 5 ? (r === 1 || r === 6 ? 2 : 1) : 0),
    initLock: () => false,
    goals: { jelly: true, cassettes: 0, locks: 0, orders: null, minScore: 0 }
  },
  {
    id: 7,
    name: 'DeLorean Time Funnel',
    badge: '📼+🔒 DROP & UNLOCK',
    accent: '#fb923c',
    moves: 24,
    starScores: [3800, 6600, 9800],
    desc: 'Time Funnel: Unlock the bottom gate & drop 4 📼 Mixtapes!',
    isVoid: (r, c) => (r >= 5 && (c === 0 || c === 7)) || (r === 7 && (c === 1 || c === 6)),
    initJelly: () => 0,
    initLock: (r, c) => r === 5 && c >= 2 && c <= 5,
    goals: { jelly: false, cassettes: 4, locks: 4, orders: null, minScore: 0 }
  },
  {
    id: 8,
    name: 'VHS Glitch Citadel',
    badge: '⚡ SCORE & LOCKS',
    accent: '#4ade80',
    moves: 22,
    starScores: [5500, 7500, 10500],
    desc: 'Citadel Cross: Break 12 🔒 Cyber Locks & Score 5,500+ Points!',
    isVoid: (r, c) =>
      (r <= 1 && (c <= 1 || c >= 6)) || (r >= 6 && (c <= 1 || c >= 6)),
    initJelly: () => 0,
    initLock: (r, c) => (r === 2 || r === 5) && c >= 1 && c <= 6,
    goals: { jelly: false, cassettes: 0, locks: 12, orders: null, minScore: 5500 }
  },
  {
    id: 9,
    name: 'Neon Tokyo Spire',
    badge: '💀 JELLY + SKULLS',
    accent: '#e879f9',
    moves: 24,
    starScores: [4200, 7200, 11000],
    desc: 'Tokyo Diamond: Clear all Double Jellies & Collect 18 💀 Skulls!',
    isVoid: (r, c) =>
      (r === 0 && (c <= 1 || c >= 6)) ||
      (r === 1 && (c === 0 || c === 7)) ||
      (r === 6 && (c === 0 || c === 7)) ||
      (r === 7 && (c <= 1 || c >= 6)),
    initJelly: (r, c) => (r >= 2 && r <= 5 && c >= 2 && c <= 5 ? 2 : 0),
    initLock: () => false,
    goals: { jelly: true, cassettes: 0, locks: 0, orders: { 4: 18 }, minScore: 0 }
  },
  {
    id: 10,
    name: 'Cosmic Synth Overlord',
    badge: '👑 FINAL BOSS',
    accent: '#facc15',
    moves: 26,
    starScores: [5000, 8500, 12500],
    desc: 'BOSS STAGE: Drop 3 📼 Tapes, Break 8 🔒 Locks & Clear All Jellies!',
    isVoid: (r, c) => (r === 2 || r === 5) && (c === 2 || c === 5),
    initJelly: (r, c) => (r >= 3 && r <= 6 && (c === 1 || c === 3 || c === 4 || c === 6) ? 1 : 0),
    initLock: (r, c) => (r === 4 || r === 6) && (c === 1 || c === 3 || c === 4 || c === 6),
    goals: { jelly: true, cassettes: 3, locks: 8, orders: null, minScore: 0 }
  }
];

const PROGRESS_STORAGE_KEY = 'tm_crush_levels_v2';

let uidSeq = 1;
function createCandyTile(typeId = null, special = null, isCassette = false) {
  if (isCassette) {
    return {
      uid: `tape-${uidSeq++}`,
      type: -1,
      special: null,
      isCassette: true
    };
  }
  return {
    uid: `tile-${uidSeq++}`,
    type: typeId !== null ? typeId : Math.floor(Math.random() * CANDY_TYPES.length),
    special, // null | 'striped-h' | 'striped-v' | 'packet-bomb' | 'color-bomb' | 'seeking-rocket'
    isCassette: false
  };
}

function loadLevelStars() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved;
  } catch {
    // Ignore parse error
  }
  return {};
}

function getBottomPlayableRow(levelDef, col) {
  for (let r = GRID_SIZE - 1; r >= 0; r--) {
    if (!levelDef.isVoid(r, col)) return r;
  }
  return -1;
}

function buildFreshLevelState(levelDef) {
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const jelly = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  const locks = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (levelDef.isVoid(r, c)) {
        board[r][c] = null;
        continue;
      }
      jelly[r][c] = levelDef.initJelly(r, c);
      locks[r][c] = Boolean(levelDef.initLock(r, c));

      // Prevent instant starting 3-matches
      let t = Math.floor(Math.random() * CANDY_TYPES.length);
      let guard = 0;
      while (
        guard < 15 &&
        ((c >= 2 &&
          board[r][c - 1]?.type === t &&
          board[r][c - 2]?.type === t) ||
          (r >= 2 &&
            board[r - 1][c]?.type === t &&
            board[r - 2][c]?.type === t))
      ) {
        t = (t + 1) % CANDY_TYPES.length;
        guard++;
      }
      board[r][c] = createCandyTile(t);
    }
  }

  // Spawn up to 2 starting cassettes near the top playable rows if level requires cassettes
  let spawnedCassettes = 0;
  if (levelDef.goals.cassettes > 0) {
    const candidateCols = [1, 3, 4, 6].filter((c) => !levelDef.isVoid(0, c));
    const toPlace = Math.min(2, levelDef.goals.cassettes);
    for (let i = 0; i < toPlace && i < candidateCols.length; i++) {
      const col = candidateCols[i];
      board[0][col] = createCandyTile(null, null, true);
      locks[0][col] = false;
      spawnedCassettes++;
    }
  }

  return { board, jelly, locks, spawnedCassettes };
}

/**
 * Finds all horizontal/vertical 3+ runs and 2x2 squares of matching regular candies.
 */
function findBoardMatches(board, levelDef) {
  const matchedSet = new Set();
  const specialsToSpawn = []; // { r, c, type, special }

  // 1. Horizontal runs
  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      const cell = board[r][c];
      if (!cell || cell.isCassette || cell.type < 0 || levelDef.isVoid(r, c)) {
        c++;
        continue;
      }
      let end = c + 1;
      while (
        end < GRID_SIZE &&
        !levelDef.isVoid(r, end) &&
        board[r][end] &&
        !board[r][end].isCassette &&
        board[r][end].type === cell.type
      ) {
        end++;
      }
      const len = end - c;
      if (len >= 3) {
        for (let k = c; k < end; k++) matchedSet.add(`${r},${k}`);
        if (len >= 5) {
          specialsToSpawn.push({ r, c: c + 2, type: cell.type, special: 'color-bomb' });
        } else if (len === 4) {
          specialsToSpawn.push({ r, c: c + 1, type: cell.type, special: 'striped-v' });
        }
      }
      c = end;
    }
  }

  // 2. Vertical runs
  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      const cell = board[r][c];
      if (!cell || cell.isCassette || cell.type < 0 || levelDef.isVoid(r, c)) {
        r++;
        continue;
      }
      let end = r + 1;
      while (
        end < GRID_SIZE &&
        !levelDef.isVoid(end, c) &&
        board[end][c] &&
        !board[end][c].isCassette &&
        board[end][c].type === cell.type
      ) {
        end++;
      }
      const len = end - r;
      if (len >= 3) {
        for (let k = r; k < end; k++) {
          const key = `${k},${c}`;
          if (matchedSet.has(key) && len >= 3) {
            // T or L intersection -> Packet Bomb!
            specialsToSpawn.push({ r: k, c, type: cell.type, special: 'packet-bomb' });
          }
          matchedSet.add(key);
        }
        if (len >= 5) {
          specialsToSpawn.push({ r: r + 2, c, type: cell.type, special: 'color-bomb' });
        } else if (len === 4) {
          specialsToSpawn.push({ r: r + 1, c, type: cell.type, special: 'striped-h' });
        }
      }
      r = end;
    }
  }

  // 3. 2x2 Seeking Rocket Squares
  for (let r = 0; r < GRID_SIZE - 1; r++) {
    for (let c = 0; c < GRID_SIZE - 1; c++) {
      const a = board[r][c];
      const b = board[r][c + 1];
      const d = board[r + 1][c];
      const e = board[r + 1][c + 1];
      if (
        a &&
        b &&
        d &&
        e &&
        !a.isCassette &&
        !b.isCassette &&
        !d.isCassette &&
        !e.isCassette &&
        a.type >= 0 &&
        a.type === b.type &&
        a.type === d.type &&
        a.type === e.type
      ) {
        matchedSet.add(`${r},${c}`);
        matchedSet.add(`${r},${c + 1}`);
        matchedSet.add(`${r + 1},${c}`);
        matchedSet.add(`${r + 1},${c + 1}`);
        specialsToSpawn.push({ r, c, type: a.type, special: 'seeking-rocket' });
      }
    }
  }

  return { matchedSet, specialsToSpawn };
}

function findHintMove(board, locks, levelDef) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (levelDef.isVoid(r, c) || locks[r][c] || !board[r][c]) continue;
      const dirs = [
        [0, 1],
        [1, 0]
      ];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= GRID_SIZE || nc >= GRID_SIZE) continue;
        if (levelDef.isVoid(nr, nc) || locks[nr][nc] || !board[nr][nc]) continue;

        const a = board[r][c];
        const b = board[nr][nc];
        if (a.special === 'color-bomb' && !b.isCassette) return [`${r},${c}`, `${nr},${nc}`];
        if (b.special === 'color-bomb' && !a.isCassette) return [`${r},${c}`, `${nr},${nc}`];
        if (a.special && b.special) return [`${r},${c}`, `${nr},${nc}`];

        const copy = board.map((row) => [...row]);
        copy[r][c] = b;
        copy[nr][nc] = a;
        const { matchedSet } = findBoardMatches(copy, levelDef);
        if (matchedSet.size > 0) return [`${r},${c}`, `${nr},${nc}`];
      }
    }
  }
  return null;
}

function hasAnyValidMove(board, locks, levelDef) {
  return Boolean(findHintMove(board, locks, levelDef));
}

export default function MemeCrushGame({
  tokens = 0,
  memes = [],
  onOpenTheater,
  onSpendTokens,
  onPayoutTokens,
  onRecordHighScore,
  onOpenUpload,
  onBackToFeed
}) {
  const entryCost = ARCADE_ECONOMY_RULES.ARCADE_STAKES.CRUSH_ENTRY_COST; // 10 tokens
  const starPayouts = ARCADE_ECONOMY_RULES.ARCADE_STAKES.CRUSH_STAR_PAYOUTS; // { 1: 12, 2: 18, 3: 26 }

  const [levelStars, setLevelStars] = useState(loadLevelStars);
  const [levelId, setLevelId] = useState(1);
  const levelDef = useMemo(
    () => CRUSH_LEVELS.find((l) => l.id === levelId) || CRUSH_LEVELS[0],
    [levelId]
  );
  const backdropMeme = useMemo(() => getLevelBackdropMeme(memes, levelId), [memes, levelId]);

  // Stake tracking: 0 = Free Practice, >0 = 10-Token Prize Run staked upfront
  const [activeStakeTokens, setActiveStakeTokens] = useState(0);
  const [roundStarted, setRoundStarted] = useState(false);

  const [board, setBoard] = useState(() => buildFreshLevelState(CRUSH_LEVELS[0]).board);
  const [jellyGrid, setJellyGrid] = useState(() => buildFreshLevelState(CRUSH_LEVELS[0]).jelly);
  const [lockGrid, setLockGrid] = useState(() => buildFreshLevelState(CRUSH_LEVELS[0]).locks);

  const [movesLeft, setMovesLeft] = useState(CRUSH_LEVELS[0].moves);
  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState({});
  const [cassettesDropped, setCassettesDropped] = useState(0);
  const [locksBroken, setLocksBroken] = useState(0);

  const [selectedCell, setSelectedCell] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hammerCharges, setHammerCharges] = useState(0);
  const [hammerActive, setHammerActive] = useState(false);
  const [rainbowZapCharges, setRainbowZapCharges] = useState(1);
  const [feverPct, setFeverPct] = useState(0);
  const [feverTurnsLeft, setFeverTurnsLeft] = useState(0);
  const [poppingKeys, setPoppingKeys] = useState(() => new Set());
  const [blastFx, setBlastFx] = useState([]); // { id, type: 'laser-h'|'laser-v'|'bomb-ring', r, c }
  const [cellPopups, setCellPopups] = useState([]); // { id, r, c, text, color }
  const [centerCallout, setCenterCallout] = useState(null); // { id, text, sub, color }
  const [boardShake, setBoardShake] = useState(false);
  const [hintState, setHintState] = useState({ boardRef: null, selectedRef: null, cells: [] });
  const [comboBanner, setComboBanner] = useState('');
  const [roundResult, setRoundResult] = useState(null); // null | { won, stars, payout, score }

  const dragStartRef = useRef(null);
  const spawnedCassettesRef = useRef(0);
  const paidOutRef = useRef(false);
  const feverTurnsRef = useRef(0);

  useEffect(() => {
    feverTurnsRef.current = feverTurnsLeft;
  }, [feverTurnsLeft]);

  // Idle Smart-Hint Glow after 4.2s of inactivity
  useEffect(() => {
    if (busy || roundResult || movesLeft <= 0) return undefined;
    const t = setTimeout(() => {
      const pair = findHintMove(board, lockGrid, levelDef);
      if (pair) {
        setHintState({ boardRef: board, selectedRef: selectedCell, cells: pair });
      }
    }, 4200);
    return () => clearTimeout(t);
  }, [board, lockGrid, levelDef, busy, roundResult, movesLeft, selectedCell]);

  const hintCells =
    !busy &&
    !roundResult &&
    movesLeft > 0 &&
    hintState.boardRef === board &&
    hintState.selectedRef === selectedCell
      ? hintState.cells
      : [];

  const resetToLevel = useCallback((targetLevelId, stakedAmt = 0) => {
    const def = CRUSH_LEVELS.find((l) => l.id === targetLevelId) || CRUSH_LEVELS[0];
    const fresh = buildFreshLevelState(def);
    setLevelId(def.id);
    setBoard(fresh.board);
    setJellyGrid(fresh.jelly);
    setLockGrid(fresh.locks);
    setMovesLeft(def.moves);
    setScore(0);
    setCollected({});
    spawnedCassettesRef.current = fresh.spawnedCassettes;
    setCassettesDropped(0);
    setLocksBroken(0);
    setSelectedCell(null);
    setBusy(false);
    setHammerCharges(0);
    setHammerActive(false);
    setRainbowZapCharges(1);
    setFeverPct(0);
    setFeverTurnsLeft(0);
    feverTurnsRef.current = 0;
    setPoppingKeys(new Set());
    setBlastFx([]);
    setCellPopups([]);
    setCenterCallout(null);
    setHintState({ boardRef: null, selectedRef: null, cells: [] });
    setComboBanner(
      stakedAmt > 0
        ? `🪙 ${stakedAmt}-TOKEN PRIZE RUN ACTIVE — CLEAR OBJECTIVES TO WIN UP TO ${starPayouts[3]} 🪙!`
        : `🆓 PRACTICE MODE — Lv.${def.id} ${def.name}`
    );
    setActiveStakeTokens(stakedAmt);
    setRoundStarted(stakedAmt > 0);
    setRoundResult(null);
    paidOutRef.current = false;
  }, [starPayouts]);

  const handleSelectLevel = (nextId) => {
    if (busy) return;
    // Prevent accidental loss of active staked run unless round ended
    if (activeStakeTokens > 0 && !roundResult && roundStarted && movesLeft < levelDef.moves) {
      if (!window.confirm('Abandon your active 10-Token Prize Run and switch levels?')) {
        return;
      }
    }
    sfx.playToggle();
    resetToLevel(nextId, 0);
  };

  const handleStartPrizeRun = () => {
    if (busy) return;
    if (tokens < entryCost) {
      sfx.playClownHonk();
      setComboBanner(
        `⚠️ NEED ${entryCost} 🪙 FOR PRIZE MODE! UPLOAD A MEME (+45 🪙) OR PLAY FREE PRACTICE!`
      );
      return;
    }
    if (onSpendTokens) {
      const ok = onSpendTokens(entryCost, `Meme Crush Lv.${levelDef.id} Prize Entry`);
      if (!ok) return;
    }
    sfx.playCoinInsert();
    resetToLevel(levelDef.id, entryCost);
  };

  // Compute remaining objectives dynamically
  const remainingJelly = useMemo(() => {
    let count = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (jellyGrid[r][c] > 0) count += 1;
      }
    }
    return count;
  }, [jellyGrid]);

  const remainingLocksOnBoard = useMemo(() => {
    let count = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (lockGrid[r][c]) count += 1;
      }
    }
    return count;
  }, [lockGrid]);

  const isObjectiveComplete = useMemo(() => {
    const g = levelDef.goals;
    if (g.jelly && remainingJelly > 0) return false;
    if (g.cassettes > 0 && cassettesDropped < g.cassettes) return false;
    if (g.locks > 0 && remainingLocksOnBoard > 0 && locksBroken < g.locks) return false;
    if (g.minScore > 0 && score < g.minScore) return false;
    if (g.orders) {
      for (const [typeKey, reqCount] of Object.entries(g.orders)) {
        if ((collected[typeKey] || 0) < reqCount) return false;
      }
    }
    return true;
  }, [levelDef, remainingJelly, cassettesDropped, remainingLocksOnBoard, locksBroken, score, collected]);

  // Evaluate Victory or Out-of-Moves when board finishes cascading
  useEffect(() => {
    if (busy || roundResult) return undefined;
    if (!isObjectiveComplete && movesLeft > 0) return undefined;

    const timer = setTimeout(() => {
      if (isObjectiveComplete) {
        if (paidOutRef.current) return;
        paidOutRef.current = true;
        const bonusScore = movesLeft * 180;
        const finalScore = score + bonusScore;
        const [s1, s2, s3] = levelDef.starScores;
        const stars = finalScore >= s3 ? 3 : finalScore >= s2 ? 2 : s1 ? 1 : 1;

        // Save stars & high score
        setLevelStars((prev) => {
          const next = { ...prev, [levelDef.id]: Math.max(prev[levelDef.id] || 0, stars) };
          try {
            localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage error
          }
          return next;
        });

        const prevBest = Number(localStorage.getItem('tm_crush_highscore') || 0);
        if (finalScore > prevBest) {
          localStorage.setItem('tm_crush_highscore', String(finalScore));
          if (onRecordHighScore) onRecordHighScore('crush', finalScore);
        }

        const rawPrize = activeStakeTokens > 0 ? starPayouts[stars] || 12 : 0;
        const verifiedPayout = validateStakedGamePayout({
          stakedTokens: activeStakeTokens,
          rawPayout: rawPrize,
          maxMultiplier: 4
        });

        sfx.playCrushComboFanfare();
        if (verifiedPayout > 0 && onPayoutTokens) {
          onPayoutTokens(verifiedPayout, {
            stakedTokens: activeStakeTokens,
            xp: 45 + stars * 15,
            label: `🍬 Lv.${levelDef.id} ${levelDef.name} Cleared (${stars}⭐)!`,
            emoji: '🍬'
          });
        }

        setRoundResult({
          won: true,
          stars,
          payout: verifiedPayout,
          score: finalScore
        });
      } else if (movesLeft <= 0) {
        sfx.playSadTrombone();
        setRoundResult({
          won: false,
          stars: 0,
          payout: 0,
          score
        });
      }
    }, 45);

    return () => clearTimeout(timer);
  }, [
    busy,
    roundResult,
    isObjectiveComplete,
    movesLeft,
    score,
    levelDef,
    activeStakeTokens,
    starPayouts,
    onPayoutTokens,
    onRecordHighScore
  ]);

  /**
   * Expands special candy blasts recursively (Striped H/V, 3x3 Packet Bomb, Seeking Rocket)
   * and records visual laser/shockwave FX events for the board overlay!
   */
  const expandBlastSet = useCallback(
    (initialKeys, currBoard, currJelly, currLocks) => {
      const clearSet = new Set(initialKeys);
      const queue = [...initialKeys];
      const visitedSpecial = new Set();
      const fxEvents = [];

      while (queue.length > 0) {
        const key = queue.shift();
        if (visitedSpecial.has(key)) continue;
        const [r, c] = key.split(',').map(Number);
        const tile = currBoard[r]?.[c];
        if (!tile || !tile.special) continue;
        visitedSpecial.add(key);

        if (tile.special === 'striped-h') {
          sfx.playLaserZap();
          fxEvents.push({ id: `fx-${ uidSeq++ }`, type: 'laser-h', r, c });
          for (let cc = 0; cc < GRID_SIZE; cc++) {
            if (!levelDef.isVoid(r, cc)) {
              const nk = `${r},${cc}`;
              if (!clearSet.has(nk)) {
                clearSet.add(nk);
                queue.push(nk);
              }
            }
          }
        } else if (tile.special === 'striped-v') {
          sfx.playLaserZap();
          fxEvents.push({ id: `fx-${ uidSeq++ }`, type: 'laser-v', r, c });
          for (let rr = 0; rr < GRID_SIZE; rr++) {
            if (!levelDef.isVoid(rr, c)) {
              const nk = `${rr},${c}`;
              if (!clearSet.has(nk)) {
                clearSet.add(nk);
                queue.push(nk);
              }
            }
          }
        } else if (tile.special === 'packet-bomb') {
          sfx.playSpecialBomb();
          fxEvents.push({ id: `fx-${ uidSeq++ }`, type: 'bomb-ring', r, c });
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (
                nr >= 0 &&
                nr < GRID_SIZE &&
                nc >= 0 &&
                nc < GRID_SIZE &&
                !levelDef.isVoid(nr, nc)
              ) {
                const nk = `${nr},${nc}`;
                if (!clearSet.has(nk)) {
                  clearSet.add(nk);
                  queue.push(nk);
                }
              }
            }
          }
        } else if (tile.special === 'seeking-rocket') {
          sfx.playAlienBeam();
          // Target highest-priority objective cell (lock or jelly!)
          let targetKey = null;
          for (let rr = 0; rr < GRID_SIZE && !targetKey; rr++) {
            for (let cc = 0; cc < GRID_SIZE; cc++) {
              if (!levelDef.isVoid(rr, cc) && (currLocks[rr][cc] || currJelly[rr][cc] > 0)) {
                if (!clearSet.has(`${rr},${cc}`)) {
                  targetKey = `${rr},${cc}`;
                  break;
                }
              }
            }
          }
          if (targetKey) {
            const [tr, tc] = targetKey.split(',').map(Number);
            fxEvents.push({ id: `fx-${ uidSeq++ }`, type: 'bomb-ring', r: tr, c: tc });
            clearSet.add(targetKey);
            queue.push(targetKey);
          }
        }
      }

      return { clearSet, fxEvents };
    },
    [levelDef]
  );

  /**
   * Applies gravity through carved void tiles, ejects bottom-row 80s Cassettes, and cascades!
   */
  const resolveCascades = useCallback(
    async (startBoard, startJelly, startLocks, forcedClearKeys = null, forcedSpecials = []) => {
      setBusy(true);
      let currBoard = startBoard.map((row) => [...row]);
      let currJelly = startJelly.map((row) => [...row]);
      let currLocks = startLocks.map((row) => [...row]);

      let cascadeStep = 0;
      let pendingForced = forcedClearKeys;
      let pendingSpecials = forcedSpecials;
      const feverMult = feverTurnsRef.current > 0 ? 2 : 1;

      const wait = (ms) => new Promise((res) => setTimeout(res, ms));

      while (cascadeStep < 14) {
        let matchKeys;
        let spawnList;

        if (pendingForced) {
          matchKeys = pendingForced;
          spawnList = pendingSpecials;
          pendingForced = null;
          pendingSpecials = [];
        } else {
          const found = findBoardMatches(currBoard, levelDef);
          matchKeys = found.matchedSet;
          spawnList = found.specialsToSpawn;
        }

        // Check for cassettes already sitting on the bottom playable row
        let ejectedThisPass = 0;
        for (let c = 0; c < GRID_SIZE; c++) {
          const botR = getBottomPlayableRow(levelDef, c);
          if (botR >= 0 && currBoard[botR][c]?.isCassette && !currLocks[botR][c]) {
            currBoard[botR][c] = null;
            ejectedThisPass += 1;
          }
        }
        if (ejectedThisPass > 0) {
          sfx.playPowerUpCollect();
          setCassettesDropped((d) => d + ejectedThisPass);
          setScore((s) => s + ejectedThisPass * 600);
          setComboBanner(`📼 MIXTAPE EJECTED! (+${ejectedThisPass * 600} PTS)`);
          setCenterCallout({
            id: `call-${uidSeq++}`,
            text: '📼 MIXTAPE DROPPED!',
            sub: `+${ejectedThisPass * 600} PTS`,
            color: '#facc15'
          });
        }

        if (matchKeys.size === 0 && ejectedThisPass === 0) {
          break;
        }

        if (matchKeys.size > 0) {
          cascadeStep += 1;
          const { clearSet: expanded, fxEvents } = expandBlastSet(
            matchKeys,
            currBoard,
            currJelly,
            currLocks
          );

          // 1. Show Popping Scale/Flash & Laser/Bomb Visual FX on the board!
          setPoppingKeys(new Set(expanded));
          if (fxEvents.length > 0) {
            setBlastFx(fxEvents);
            setBoardShake(true);
            setTimeout(() => setBoardShake(false), 340);
          }

          // Compute center of matched cluster for floating score popup
          let sumR = 0;
          let sumC = 0;
          let countPts = 0;
          expanded.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            sumR += r;
            sumC += c;
            countPts += 1;
          });

          let ptsEarned = 0;
          let newlyBrokenLocks = 0;
          const newlyCollected = {};

          expanded.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const tile = currBoard[r]?.[c];
            if (!tile) return;

            if (currLocks[r][c]) {
              currLocks[r][c] = false;
              newlyBrokenLocks += 1;
              ptsEarned += 120 * feverMult;
            }
            if (currJelly[r][c] > 0) {
              currJelly[r][c] = Math.max(0, currJelly[r][c] - 1);
              sfx.playJellyShatter();
              ptsEarned += 110 * feverMult;
            }
            // Cassettes are indestructible!
            if (tile.isCassette) return;

            if (tile.type >= 0) {
              newlyCollected[tile.type] = (newlyCollected[tile.type] || 0) + 1;
            }
            ptsEarned += 45 * cascadeStep * feverMult;
          });

          // Spawn floating score popup over matched cells
          if (countPts > 0 && ptsEarned > 0) {
            const avgR = sumR / countPts;
            const avgC = sumC / countPts;
            const popId = `pop-${uidSeq++}`;
            setCellPopups((prev) => [
              ...prev.slice(-5),
              {
                id: popId,
                r: avgR,
                c: avgC,
                text:
                  feverMult > 1
                    ? `🔥 +${ptsEarned} (2× FEVER!)`
                    : cascadeStep >= 2
                    ? `⚡ +${ptsEarned} (${cascadeStep}×)`
                    : `+${ptsEarned}`,
                color:
                  feverMult > 1
                    ? '#facc15'
                    : cascadeStep >= 3
                    ? '#f472b6'
                    : '#00f3ff'
              }
            ]);
          }

          // Escalating Center Combo Callout Banner
          if (cascadeStep >= 2 || expanded.size >= 5 || fxEvents.length > 0) {
            const callouts = [
              { text: 'SWEET! 🍬', color: '#4ade80' },
              { text: 'ELECTRIC! ⚡', color: '#00f3ff' },
              { text: 'MEGA CASCADE! 🔥', color: '#f97316' },
              { text: 'SUPERNOVA! 🌈', color: '#f472b6' },
              { text: 'UNSTOPPABLE! 👑', color: '#facc15' }
            ];
            const pick =
              callouts[Math.min(callouts.length - 1, Math.max(1, cascadeStep - 1))];
            setCenterCallout({
              id: `call-${uidSeq++}`,
              text: fxEvents.length > 0 && cascadeStep === 1 ? 'LASER BLAST! ⚡' : pick.text,
              sub: `+${ptsEarned} PTS${feverMult > 1 ? ' • 2× FEVER' : ''}`,
              color: pick.color
            });
          }

          await wait(135);
          setPoppingKeys(new Set());
          setBlastFx([]);

          // Now clear matched cells
          expanded.forEach((key) => {
            const [r, c] = key.split(',').map(Number);
            const tile = currBoard[r]?.[c];
            if (!tile || tile.isCassette) return;
            currBoard[r][c] = null;
          });

          // Place newly created special candies
          spawnList.forEach((sp) => {
            if (!levelDef.isVoid(sp.r, sp.c) && !currBoard[sp.r][sp.c]) {
              currBoard[sp.r][sp.c] = createCandyTile(sp.type, sp.special);
            }
          });

          sfx.playCandyMatch(Math.min(6, cascadeStep + 2));
          if (newlyBrokenLocks > 0) {
            setLocksBroken((l) => l + newlyBrokenLocks);
          }
          if (Object.keys(newlyCollected).length > 0) {
            setCollected((prev) => {
              const next = { ...prev };
              for (const [k, v] of Object.entries(newlyCollected)) {
                next[k] = (next[k] || 0) + v;
              }
              return next;
            });
          }
          setScore((s) => s + ptsEarned);

          // Charge Neon Disco Fever Meter!
          setFeverPct((prevPct) => {
            const nextPct = prevPct + 16 + cascadeStep * 8 + (fxEvents.length > 0 ? 12 : 0);
            if (nextPct >= 100) {
              // Trigger 🕺 DISCO FEVER OVERDRIVE!
              sfx.playJackpot();
              setFeverTurnsLeft(3);
              feverTurnsRef.current = 3;
              setRainbowZapCharges((z) => Math.min(2, z + 1));
              setComboBanner('🕺 DISCO FEVER OVERDRIVE! 2× SCORE + BONUS SPECIAL CANDY ZAPPED!');
              setCenterCallout({
                id: `call-${uidSeq++}`,
                text: '🕺 DISCO FEVER!',
                sub: '2× SCORE + FREE SPECIAL CANDY!',
                color: '#facc15'
              });
              // Upgrade a random regular candy on the board into a Special Candy!
              const regularCoords = [];
              for (let rr = 0; rr < GRID_SIZE; rr++) {
                for (let cc = 0; cc < GRID_SIZE; cc++) {
                  const t = currBoard[rr]?.[cc];
                  if (t && !t.isCassette && !t.special && !levelDef.isVoid(rr, cc)) {
                    regularCoords.push([rr, cc]);
                  }
                }
              }
              if (regularCoords.length > 0) {
                const [zr, zc] =
                  regularCoords[Math.floor(Math.random() * regularCoords.length)];
                const specials = ['striped-h', 'striped-v', 'packet-bomb'];
                currBoard[zr][zc] = createCandyTile(
                  currBoard[zr][zc].type,
                  specials[Math.floor(Math.random() * specials.length)]
                );
              }
              return 0;
            }
            return nextPct;
          });

          // Award 1 pocket Cyber-Hammer if player hits a 3x+ natural cascade!
          if (cascadeStep === 3) {
            setHammerCharges((h) => Math.min(2, h + 1));
            setComboBanner('⚡ 3× SYNTH COMBO! +1 CYBER HAMMER EARNED!');
          } else if (cascadeStep >= 2) {
            setComboBanner(`🔥 ${cascadeStep}× NEON CASCADE! (+${ptsEarned} PTS)`);
          }

          setBoard(currBoard.map((row) => [...row]));
          setJellyGrid(currJelly.map((row) => [...row]));
          setLockGrid(currLocks.map((row) => [...row]));
          await wait(140);
        }

        // Gravity drop through playable cells in each column (locked tiles act as anchors; unlocked fall cleanly)
        for (let c = 0; c < GRID_SIZE; c++) {
          const playableRows = [];
          for (let r = 0; r < GRID_SIZE; r++) {
            if (!levelDef.isVoid(r, c)) playableRows.push(r);
          }
          if (playableRows.length === 0) continue;

          // Segment column between locked anchors so tiles don't phase through locked cages
          let segEndIdx = playableRows.length - 1;
          while (segEndIdx >= 0) {
            const rAtEnd = playableRows[segEndIdx];
            if (currLocks[rAtEnd][c]) {
              segEndIdx -= 1;
              continue;
            }
            let segStartIdx = segEndIdx;
            while (segStartIdx > 0 && !currLocks[playableRows[segStartIdx - 1]][c]) {
              segStartIdx -= 1;
            }

            const survivors = [];
            for (let idx = segEndIdx; idx >= segStartIdx; idx--) {
              const rr = playableRows[idx];
              if (currBoard[rr][c]) survivors.push(currBoard[rr][c]);
            }

            let writePtr = 0;
            for (let idx = segEndIdx; idx >= segStartIdx; idx--) {
              const rr = playableRows[idx];
              if (writePtr < survivors.length) {
                currBoard[rr][c] = survivors[writePtr++];
              } else if (segStartIdx === 0) {
                // Top segment refills from top dispenser
                const needTape =
                  levelDef.goals.cassettes > 0 &&
                  spawnedCassettesRef.current < levelDef.goals.cassettes &&
                  Math.random() < 0.28;
                if (needTape) {
                  spawnedCassettesRef.current += 1;
                  currBoard[rr][c] = createCandyTile(null, null, true);
                } else {
                  currBoard[rr][c] = createCandyTile();
                }
              } else {
                // Pocket underneath a locked cage refills cleanly too so no dead void forms
                currBoard[rr][c] = createCandyTile();
              }
            }

            segEndIdx = segStartIdx - 1;
          }
        }

        setBoard(currBoard.map((row) => [...row]));
        await wait(165);
      }

      // Auto-shuffle unlocked regular candies if no valid swap remains
      if (!hasAnyValidMove(currBoard, currLocks, levelDef)) {
        const pool = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (!levelDef.isVoid(r, c) && !currLocks[r][c] && currBoard[r][c] && !currBoard[r][c].isCassette) {
              pool.push(currBoard[r][c]);
            }
          }
        }
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        let ptr = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (!levelDef.isVoid(r, c) && !currLocks[r][c] && currBoard[r][c] && !currBoard[r][c].isCassette) {
              currBoard[r][c] = pool[ptr++];
            }
          }
        }
        setBoard(currBoard.map((row) => [...row]));
        setComboBanner('🔀 NO MOVES LEFT — NEON GRID AUTO-SHUFFLED!');
      }

      if (feverTurnsRef.current > 0) {
        const nextTurns = Math.max(0, feverTurnsRef.current - 1);
        feverTurnsRef.current = nextTurns;
        setFeverTurnsLeft(nextTurns);
      }

      setTimeout(() => {
        setCenterCallout(null);
        setCellPopups([]);
      }, 950);

      setBusy(false);
    },
    [levelDef, expandBlastSet]
  );

  // Rainbow Zap Booster: Zaps every candy of the most common color on the board!
  const handleRainbowZapBooster = async () => {
    if (busy || roundResult || rainbowZapCharges <= 0) return;
    const counts = {};
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const t = board[r][c];
        if (t && !t.isCassette && t.type >= 0 && !levelDef.isVoid(r, c)) {
          counts[t.type] = (counts[t.type] || 0) + 1;
        }
      }
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) return;
    entries.sort((a, b) => b[1] - a[1]);
    const targetType = Number(entries[0][0]);

    setRainbowZapCharges((z) => Math.max(0, z - 1));
    sfx.playAlienBeam();
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 420);

    const zapSet = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const t = board[r][c];
        if (t && !t.isCassette && t.type === targetType) {
          zapSet.add(`${r},${c}`);
        }
      }
    }

    setCenterCallout({
      id: `call-${uidSeq++}`,
      text: `🌈 RAINBOW ZAP!`,
      sub: `ZAPPED ${zapSet.size} ${CANDY_TYPES[targetType]?.emoji || '🍬'} TILES!`,
      color: '#00f3ff'
    });
    await resolveCascades(board, jellyGrid, lockGrid, zapSet, []);
  };

  const attemptSwap = async (r1, c1, r2, c2) => {
    if (busy || roundResult || movesLeft <= 0) return;
    if (
      r1 < 0 ||
      r1 >= GRID_SIZE ||
      c1 < 0 ||
      c1 >= GRID_SIZE ||
      r2 < 0 ||
      r2 >= GRID_SIZE ||
      c2 < 0 ||
      c2 >= GRID_SIZE
    ) {
      return;
    }
    if (levelDef.isVoid(r1, c1) || levelDef.isVoid(r2, c2)) return;

    // Cyber-Ice Locked tiles cannot be dragged!
    if (lockGrid[r1][c1] || lockGrid[r2][c2]) {
      sfx.playClownHonk();
      setComboBanner('🔒 LOCKED BY CYBER-ICE! MATCH ADJACENT CANDIES TO SHATTER LOCK!');
      setSelectedCell(null);
      return;
    }

    const tileA = board[r1][c1];
    const tileB = board[r2][c2];
    if (!tileA || !tileB) return;

    setRoundStarted(true);
    setSelectedCell(null);

    const swapped = board.map((row) => [...row]);
    swapped[r1][c1] = tileB;
    swapped[r2][c2] = tileA;

    // Special case 1: Color Bomb swapped with any non-cassette candy -> zaps all of that color!
    if (
      (tileA.special === 'color-bomb' && !tileB.isCassette) ||
      (tileB.special === 'color-bomb' && !tileA.isCassette)
    ) {
      sfx.playAlienBeam();
      setMovesLeft((m) => Math.max(0, m - 1));
      const targetColor = tileA.special === 'color-bomb' ? tileB.type : tileA.type;
      const zapSet = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      for (let rr = 0; rr < GRID_SIZE; rr++) {
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          const t = swapped[rr][cc];
          if (t && !t.isCassette && (targetColor < 0 || t.type === targetColor)) {
            zapSet.add(`${rr},${cc}`);
          }
        }
      }
      setBoard(swapped);
      await resolveCascades(swapped, jellyGrid, lockGrid, zapSet, []);
      return;
    }

    // Special case 2: Swapping any two Special Candies together triggers both immediately!
    if (tileA.special && tileB.special) {
      setMovesLeft((m) => Math.max(0, m - 1));
      setBoard(swapped);
      const comboSet = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      await resolveCascades(swapped, jellyGrid, lockGrid, comboSet, []);
      return;
    }

    // Normal match check
    const { matchedSet, specialsToSpawn } = findBoardMatches(swapped, levelDef);
    if (matchedSet.size === 0) {
      sfx.playBoing(1);
      return;
    }

    setMovesLeft((m) => Math.max(0, m - 1));
    setBoard(swapped);
    await resolveCascades(swapped, jellyGrid, lockGrid, matchedSet, specialsToSpawn);
  };

  const handleCellTap = async (r, c) => {
    if (busy || roundResult || levelDef.isVoid(r, c)) return;

    // Cyber Hammer Booster smash (works on locks & jellies too!)
    if (hammerActive && hammerCharges > 0) {
      const tile = board[r][c];
      if (!tile) return;
      setHammerActive(false);
      setHammerCharges((h) => Math.max(0, h - 1));
      sfx.playSpecialBomb();
      const smashSet = new Set([`${r},${c}`]);
      await resolveCascades(board, jellyGrid, lockGrid, smashSet, []);
      return;
    }

    if (lockGrid[r][c]) {
      sfx.playClownHonk();
      setComboBanner('🔒 TILE LOCKED! MATCH NEXT TO IT OR USE A 🔨 HAMMER!');
      return;
    }

    if (!selectedCell) {
      sfx.playFlipperClick();
      setSelectedCell({ r, c });
      return;
    }

    if (selectedCell.r === r && selectedCell.c === c) {
      setSelectedCell(null);
      return;
    }

    const dist = Math.abs(selectedCell.r - r) + Math.abs(selectedCell.c - c);
    if (dist === 1) {
      await attemptSwap(selectedCell.r, selectedCell.c, r, c);
    } else {
      sfx.playFlipperClick();
      setSelectedCell({ r, c });
    }
  };

  const handlePointerDown = (r, c, e) => {
    if (busy || roundResult || hammerActive || levelDef.isVoid(r, c)) return;
    dragStartRef.current = { r, c, x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!dragStartRef.current || busy || roundResult) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    const { r, c } = dragStartRef.current;
    dragStartRef.current = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      attemptSwap(r, c, r, c + (dx > 0 ? 1 : -1));
    } else {
      attemptSwap(r, c, r + (dy > 0 ? 1 : -1), c);
    }
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleBuyExtraMoves = () => {
    const cost = ARCADE_ECONOMY_RULES.ARCADE_STAKES.CRUSH_CONTINUE_COST; // 10 tokens
    if (tokens < cost) {
      sfx.playClownHonk();
      setComboBanner(`⚠️ NEED ${cost} 🪙 FOR +5 EXTRA MOVES!`);
      return;
    }
    if (onSpendTokens && onSpendTokens(cost, 'Meme Crush +5 Extra Moves')) {
      sfx.playPowerUpCollect();
      setMovesLeft(5);
      setRoundResult(null);
      setComboBanner('⚡ +5 EXTRA MOVES UNLOCKED — FINISH THE LEVEL!');
    }
  };

  return (
    <section
      className="tm-crush2-stage"
      style={{ '--crush-accent': levelDef.accent }}
      aria-label="Meme Crush 10-Level 80s Neon Puzzle"
    >
      <div className="tm-crush2-cabinet">
        {/* 1. COMPACT TOP HEADER + STAKE TOGGLE */}
        <header className="tm-crush2-header">
          <div className="tm-crush2-title-wrap">
            {onBackToFeed && (
              <button type="button" className="tm-bandit-back-btn" onClick={onBackToFeed}>
                ← Memes
              </button>
            )}
            <div>
              <div className="tm-crush2-eyebrow">
                🍬 10-LEVEL 80s NEON CAMPAIGN • {levelDef.badge}
              </div>
              <h2 className="tm-crush2-title">
                Lv.{levelDef.id}: {levelDef.name}
              </h2>
            </div>
          </div>

          <div className="tm-crush2-stake-bar">
            <span className="tm-crush2-wallet">🪙 {tokens}</span>
            {activeStakeTokens > 0 && !roundResult ? (
              <span className="tm-crush2-stake-active">
                🏆 PRIZE RUN ({starPayouts[1]}/{starPayouts[2]}/{starPayouts[3]} 🪙)
              </span>
            ) : (
              <button
                type="button"
                className="tm-crush2-prize-btn"
                onClick={handleStartPrizeRun}
                title={`Stake ${entryCost} Tokens to win ${starPayouts[1]}–${starPayouts[3]} Tokens on clearing this level!`}
              >
                🪙 Stake {entryCost} (Win up to {starPayouts[3]} 🪙)
              </button>
            )}
          </div>
        </header>

        {/* 2. 10-LEVEL SELECTOR STRIP */}
        <div className="tm-crush2-level-strip" role="tablist" aria-label="Select Meme Crush Level">
          {CRUSH_LEVELS.map((lv) => {
            const stars = levelStars[lv.id] || 0;
            const active = lv.id === levelDef.id;
            return (
              <button
                key={lv.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`tm-crush2-lvl-pill ${active ? 'active' : ''}`}
                style={{ '--lv-color': lv.accent }}
                onClick={() => handleSelectLevel(lv.id)}
              >
                <span>L{lv.id}</span>
                {stars > 0 && <small>{'⭐'.repeat(stars)}</small>}
              </button>
            );
          })}
        </div>

        {/* 3. LIVE OBJECTIVES, DISCO FEVER METER & MOVES HUD */}
        <div className="tm-crush2-hud">
          <div className="tm-crush2-stat">
            <span>MOVES</span>
            <strong style={{ color: movesLeft <= 4 ? '#f43f5e' : '#00f3ff' }}>{movesLeft}</strong>
          </div>
          <div className="tm-crush2-stat">
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>

          <div
            className={`tm-crush2-fever-pill ${feverTurnsLeft > 0 ? 'overdrive' : ''}`}
            title="Fill the Disco Fever meter to 100% for 2× Score Overdrive + a free Special Candy on the board!"
          >
            <div className="tm-crush2-fever-top">
              <span>{feverTurnsLeft > 0 ? `🕺 2× FEVER (${feverTurnsLeft} MV)` : '🔥 FEVER'}</span>
              <span>{feverTurnsLeft > 0 ? 'MAX!' : `${Math.min(100, feverPct)}%`}</span>
            </div>
            <div className="tm-crush2-fever-track">
              <div
                className="tm-crush2-fever-fill"
                style={{ width: `${feverTurnsLeft > 0 ? 100 : Math.min(100, feverPct)}%` }}
              />
            </div>
          </div>

          <div className="tm-crush2-goals">
            {levelDef.goals.jelly && (
              <span className={`tm-crush2-goal-chip ${remainingJelly === 0 ? 'done' : ''}`}>
                🧊 Jelly: {remainingJelly} left
              </span>
            )}
            {levelDef.goals.cassettes > 0 && (
              <span
                className={`tm-crush2-goal-chip ${
                  cassettesDropped >= levelDef.goals.cassettes ? 'done' : ''
                }`}
              >
                📼 Tapes: {cassettesDropped}/{levelDef.goals.cassettes}
              </span>
            )}
            {levelDef.goals.locks > 0 && (
              <span className={`tm-crush2-goal-chip ${remainingLocksOnBoard === 0 ? 'done' : ''}`}>
                🔒 Locks: {remainingLocksOnBoard} left
              </span>
            )}
            {levelDef.goals.minScore > 0 && (
              <span
                className={`tm-crush2-goal-chip ${
                  score >= levelDef.goals.minScore ? 'done' : ''
                }`}
              >
                ⚡ {Math.min(score, levelDef.goals.minScore)}/{levelDef.goals.minScore}
              </span>
            )}
            {levelDef.goals.orders &&
              Object.entries(levelDef.goals.orders).map(([typeKey, req]) => {
                const candy = CANDY_TYPES[Number(typeKey)];
                const cur = collected[typeKey] || 0;
                return (
                  <span
                    key={typeKey}
                    className={`tm-crush2-goal-chip ${cur >= req ? 'done' : ''}`}
                  >
                    {candy.emoji} {Math.min(cur, req)}/{req}
                  </span>
                );
              })}
          </div>
          {backdropMeme && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '4px 0', fontSize: '11px', color: '#94a3b8' }}>
              <span>🎨 Level Art: @{backdropMeme.author_name}</span>
              {onOpenTheater && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#00f3ff', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', padding: 0 }}
                  onClick={() => onOpenTheater(backdropMeme)}
                >
                  View Meme
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. NON-SCROLLING TOUCH-LOCKED 8x8 CARVED NEON BOARD */}
        <div
          className={`tm-crush2-board-wrap ${boardShake ? 'tm-crush2-board-shake' : ''} ${
            feverTurnsLeft > 0 ? 'tm-crush2-board-fever' : ''
          }`}
        >
          <div
            className="tm-crush2-grid"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {board.map((row, r) =>
              row.map((tile, c) => {
                const isVoid = levelDef.isVoid(r, c);
                if (isVoid) {
                  return <div key={`void-${r}-${c}`} className="tm-crush2-void-cell" />;
                }

                const cellKey = `${r},${c}`;
                const jellyLvl = jellyGrid[r][c];
                const isLocked = lockGrid[r][c];
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isPopping = poppingKeys.has(cellKey);
                const isHint = hintCells.includes(cellKey);
                const isExitCell =
                  levelDef.goals.cassettes > 0 && r === getBottomPlayableRow(levelDef, c);
                const candyInfo =
                  tile && !tile.isCassette && tile.type >= 0 ? CANDY_TYPES[tile.type] : null;

                return (
                  <button
                    key={cellKey}
                    type="button"
                    className={`tm-crush2-cell ${jellyLvl === 1 ? 'jelly-1' : ''} ${
                      jellyLvl >= 2 ? 'jelly-2' : ''
                    } ${isLocked ? 'locked' : ''} ${isSelected ? 'selected' : ''} ${
                      isPopping ? 'popping' : ''
                    } ${isHint ? 'hint-glow' : ''} ${isExitCell ? 'exit-row' : ''}`}
                    onPointerDown={(e) => handlePointerDown(r, c, e)}
                    onClick={() => handleCellTap(r, c)}
                  >
                    {tile && (
                      <div
                        className={`tm-crush2-candy ${
                          tile.isCassette ? 'cassette' : ''
                        } ${tile.special ? `sp-${tile.special}` : ''} ${
                          isPopping ? 'candy-pop' : ''
                        }`}
                        style={
                          tile.isCassette
                            ? undefined
                            : tile.special === 'color-bomb'
                            ? undefined
                            : {
                                background: candyInfo?.bg,
                                borderColor: candyInfo?.border
                              }
                        }
                      >
                        <span className="tm-crush2-emoji">
                          {tile.isCassette
                            ? '📼'
                            : tile.special === 'color-bomb'
                            ? '🌈'
                            : candyInfo?.emoji}
                        </span>
                        {tile.special && tile.special !== 'color-bomb' && (
                          <span className="tm-crush2-sp-badge">
                            {tile.special === 'striped-h'
                              ? '↔'
                              : tile.special === 'striped-v'
                              ? '↕'
                              : tile.special === 'packet-bomb'
                              ? '💥'
                              : '🚀'}
                          </span>
                        )}
                      </div>
                    )}
                    {isLocked && <span className="tm-crush2-lock-cage">🔒</span>}
                    {isExitCell && !tile?.isCassette && (
                      <span className="tm-crush2-exit-arrow">▼</span>
                    )}
                  </button>
                );
              })
            )}

            {/* LIVE SPECIAL CANDY LASER BEAMS & BOMB SHOCKWAVES OVERLAY */}
            {blastFx.map((fx) => {
              if (fx.type === 'laser-h') {
                return (
                  <div
                    key={fx.id}
                    className="tm-crush2-laser-h"
                    style={{ top: `${((fx.r + 0.5) / GRID_SIZE) * 100}%` }}
                  />
                );
              }
              if (fx.type === 'laser-v') {
                return (
                  <div
                    key={fx.id}
                    className="tm-crush2-laser-v"
                    style={{ left: `${((fx.c + 0.5) / GRID_SIZE) * 100}%` }}
                  />
                );
              }
              return (
                <div
                  key={fx.id}
                  className="tm-crush2-bomb-ring"
                  style={{
                    top: `${((fx.r + 0.5) / GRID_SIZE) * 100}%`,
                    left: `${((fx.c + 0.5) / GRID_SIZE) * 100}%`
                  }}
                />
              );
            })}

            {/* FLOATING SCORE POPUPS OVER MATCHED CELLS */}
            {cellPopups.map((pop) => (
              <div
                key={pop.id}
                className="tm-crush2-cell-popup"
                style={{
                  top: `${((pop.r + 0.5) / GRID_SIZE) * 100}%`,
                  left: `${((pop.c + 0.5) / GRID_SIZE) * 100}%`,
                  color: pop.color
                }}
              >
                {pop.text}
              </div>
            ))}

            {/* BIG CENTER ESCALATING COMBO CALLOUT BANNER */}
            {centerCallout && (
              <div
                key={centerCallout.id}
                className="tm-crush2-center-callout"
                style={{ '--callout-color': centerCallout.color }}
              >
                <div className="tm-crush2-callout-main">{centerCallout.text}</div>
                <div className="tm-crush2-callout-sub">{centerCallout.sub}</div>
              </div>
            )}
          </div>

          {/* VICTORY / OUT-OF-MOVES OVERLAY */}
          {roundResult && (
            <div className="tm-crush2-overlay" role="dialog">
              <div className="tm-crush2-modal">
                <div style={{ fontSize: '36px' }}>
                  {roundResult.won ? '⭐'.repeat(roundResult.stars) : '💔'}
                </div>
                <h3>
                  {roundResult.won
                    ? `LV.${levelDef.id} CLEARED!`
                    : `OUT OF MOVES ON LV.${levelDef.id}`}
                </h3>
                <p>
                  {roundResult.won
                    ? roundResult.payout > 0
                      ? `Final Score: ${roundResult.score.toLocaleString()} • Won +${roundResult.payout} 🪙 Prize!`
                      : `Final Score: ${roundResult.score.toLocaleString()} (Practice Clear — Stake ${entryCost} 🪙 to win token prizes!)`
                    : 'So close! Grab +5 Extra Moves or retry this board!'}
                </p>

                <div className="tm-crush2-modal-btns">
                  {!roundResult.won && (
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      onClick={handleBuyExtraMoves}
                    >
                      ⚡ +5 Extra Moves ({ARCADE_ECONOMY_RULES.ARCADE_STAKES.CRUSH_CONTINUE_COST} 🪙)
                    </button>
                  )}

                  {roundResult.won && levelDef.id < CRUSH_LEVELS.length && (
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      onClick={() => resetToLevel(levelDef.id + 1, 0)}
                    >
                      ▶ Next: Lv.{levelDef.id + 1} {CRUSH_LEVELS[levelDef.id].name}
                    </button>
                  )}

                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => resetToLevel(levelDef.id, 0)}
                  >
                    🔄 Replay Free
                  </button>

                  {tokens >= entryCost && (
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      onClick={handleStartPrizeRun}
                    >
                      🪙 Play Prize Run ({entryCost} 🪙)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. BOTTOM BOOSTER & STATUS BAR */}
        <footer className="tm-crush2-footer">
          <span className="tm-crush2-status">{comboBanner || levelDef.desc}</span>
          <div className="tm-crush2-tools">
            <button
              type="button"
              disabled={rainbowZapCharges <= 0 || busy}
              className="tm-crush2-tool-btn"
              onClick={handleRainbowZapBooster}
              title="Zaps all candies of the most frequent color on the board! (+1 earned on Disco Fever!)"
              style={{ borderColor: rainbowZapCharges > 0 ? '#00f3ff' : undefined, color: rainbowZapCharges > 0 ? '#00f3ff' : undefined }}
            >
              🌈 Zap ({rainbowZapCharges})
            </button>
            <button
              type="button"
              disabled={hammerCharges <= 0 || busy}
              className={`tm-crush2-tool-btn ${hammerActive ? 'active' : ''}`}
              onClick={() => setHammerActive((a) => !a)}
              title="Earned via 3x Cascades! Tap any tile or lock to smash it!"
            >
              🔨 Hammer ({hammerCharges})
            </button>
            <button
              type="button"
              disabled={busy}
              className="tm-crush2-tool-btn"
              onClick={() => resetToLevel(levelDef.id, 0)}
            >
              🔄 Reset
            </button>
            {tokens < entryCost && onOpenUpload && (
              <button
                type="button"
                className="tm-crush2-tool-btn upload"
                onClick={onOpenUpload}
              >
                📸 +45 🪙
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
}
