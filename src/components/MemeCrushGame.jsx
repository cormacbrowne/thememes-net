import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { formatWindowCountdown } from '../data/starterMemes';

const GRID_SIZE = 8;

const CANDY_TYPES = [
  {
    id: 0,
    emoji: '🐸',
    name: 'Pepe Lime Jelly',
    bg: 'radial-gradient(circle at 32% 26%, #bbf7d0 0%, #4ade80 35%, #16a34a 78%, #14532d 100%)',
    border: '#86efac',
    shadow: '#15803d',
    glow: 'rgba(74, 222, 128, 0.55)',
    shapeClass: 'candy-shape-gumdrop'
  },
  {
    id: 1,
    emoji: '🔥',
    name: 'Spicy Tangerine Drop',
    bg: 'radial-gradient(circle at 32% 26%, #fed7aa 0%, #fb923c 35%, #ea580c 78%, #7c2d12 100%)',
    border: '#fdba74',
    shadow: '#c2410c',
    glow: 'rgba(251, 146, 60, 0.55)',
    shapeClass: 'candy-shape-teardrop'
  },
  {
    id: 2,
    emoji: '💎',
    name: 'Cyber Blue Lozenge',
    bg: 'radial-gradient(circle at 32% 26%, #e0f2fe 0%, #38bdf8 35%, #0284c7 78%, #0c4a6e 100%)',
    border: '#7dd3fc',
    shadow: '#0369a1',
    glow: 'rgba(0, 243, 255, 0.6)',
    shapeClass: 'candy-shape-diamond'
  },
  {
    id: 3,
    emoji: '🦆',
    name: 'Golden Lemon Cluster',
    bg: 'radial-gradient(circle at 32% 26%, #fef9c3 0%, #facc15 35%, #ca8a04 78%, #713f12 100%)',
    border: '#fde047',
    shadow: '#a16207',
    glow: 'rgba(250, 204, 21, 0.58)',
    shapeClass: 'candy-shape-pillow'
  },
  {
    id: 4,
    emoji: '💀',
    name: 'Grape Brainrot Fizz',
    bg: 'radial-gradient(circle at 32% 26%, #f3e8ff 0%, #c084fc 35%, #9333ea 78%, #4c1d95 100%)',
    border: '#d8b4fe',
    shadow: '#7e22ce',
    glow: 'rgba(192, 132, 252, 0.58)',
    shapeClass: 'candy-shape-star'
  },
  {
    id: 5,
    emoji: '🍕',
    name: 'Strawberry Sugar Pop',
    bg: 'radial-gradient(circle at 32% 26%, #fce7f3 0%, #f472b6 35%, #db2777 78%, #831843 100%)',
    border: '#f9a8d4',
    shadow: '#be185d',
    glow: 'rgba(244, 114, 182, 0.58)',
    shapeClass: 'candy-shape-heart'
  }
];

// Official Candy Crush Escalation — THE MEMES.net Edition!
const ANNOUNCER_TIERS = [
  { tier: 1, title: 'SWEET! 🍬', sub: 'JUICY SUGAR MATCH!', color: '#4ade80', mascot: '🐸 "Sweet match!"' },
  { tier: 2, title: 'TASTY!! 🔥', sub: '2X CASCADE COMBO!', color: '#fb923c', mascot: '🦆 "Ooh, tasty cascade!"' },
  { tier: 3, title: 'DELICIOUS!! 💀', sub: '3X DOPAMINE OVERLOAD!', color: '#c084fc', mascot: '🗿 "Delicious combo energy!"' },
  { tier: 4, title: 'DIVINE CRUSH!! 💎', sub: '4X ULTRA SUGAR SURGE!', color: '#00f3ff', mascot: '👑 "DIVINE! Keep crushing!"' },
  { tier: 5, title: 'SUGAR SUPERNOVA!! 🌈👑', sub: 'UNHINGED CANDY FRENZY!!', color: '#facc15', mascot: '🚀 "SUPERNOVA!! Pure perfection!"' }
];

const FEVER_LOOT_PERKS = [
  { id: 'moves', label: '🎁 SUGAR RUSH LOOT: +2 BONUS MOVES & +600 PTS!', emoji: '⏱️' },
  { id: 'hammer', label: '🎁 SUGAR RUSH LOOT: +1 FREE LOLLIPOP HAMMER & +600 PTS!', emoji: '🔨' },
  { id: 'ufo', label: '🎁 SUGAR RUSH LOOT: +1 FREE UFO BOMB DROPPER & +600 PTS!', emoji: '🛸' },
  { id: 'colorbomb', label: '🎁 SUGAR RUSH LOOT: SUPERNOVA COLOR BOMB BEAMED ONTO BOARD!', emoji: '🌈' }
];

let tileUidCounter = 1;

function makeTile(typeId, special = null, dropDist = 0) {
  return {
    uid: `c-${tileUidCounter++}`,
    type: typeId ?? Math.floor(Math.random() * CANDY_TYPES.length),
    special, // null | 'striped-h' | 'striped-v' | 'packet-bomb' | 'color-bomb' | 'seeking-rocket'
    dropDist
  };
}

/**
 * Generates an initial 8x8 board with zero pre-existing 3-in-a-row matches.
 */
function createInitialBoard(withDropAnimation = true) {
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let candidate = Math.floor(Math.random() * CANDY_TYPES.length);
      let tries = 0;
      while (
        tries < 20 &&
        ((c >= 2 &&
          board[r][c - 1]?.type === candidate &&
          board[r][c - 2]?.type === candidate) ||
          (r >= 2 &&
            board[r - 1][c]?.type === candidate &&
            board[r - 2][c]?.type === candidate))
      ) {
        candidate = (candidate + 1) % CANDY_TYPES.length;
        tries++;
      }
      board[r][c] = makeTile(candidate, null, withDropAnimation ? r + 2 : 0);
    }
  }
  return board;
}

/**
 * Generates the glowing Frosted Crystal Jelly pattern under the 8x8 board.
 * Value 1 = Crystal Jelly, Value 2 = Double Crystal Frosting (on higher levels).
 */
function createInitialJellyGrid(levelNum = 1) {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  for (let r = 1; r < GRID_SIZE - 1; r++) {
    for (let c = 1; c < GRID_SIZE - 1; c++) {
      if (levelNum === 1) {
        // Diamond ring pattern in center 6x6
        if (Math.abs(r - 3.5) + Math.abs(c - 3.5) <= 3.2) {
          grid[r][c] = 1;
        }
      } else if (levelNum % 2 === 0) {
        // Checkerboard + center double frost
        if ((r + c) % 2 === 0) {
          grid[r][c] = r >= 3 && r <= 4 && c >= 3 && c <= 4 ? 2 : 1;
        }
      } else {
        // Full inner 6x6 crystal vault with corners double frosted
        grid[r][c] = (r === 2 || r === 5) && (c === 2 || c === 5) ? 2 : 1;
      }
    }
  }
  return grid;
}

/**
 * Finds all horizontal/vertical match groups of length >= 3 AND 2x2 square matches (for Seeking Meme Rockets).
 */
function findMatchGroups(board) {
  const groups = [];

  // Horizontal runs
  for (let r = 0; r < GRID_SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= GRID_SIZE; c++) {
      const prevTile = board[r][c - 1];
      const currTile = c < GRID_SIZE ? board[r][c] : null;
      if (currTile && prevTile && currTile.type === prevTile.type) {
        continue;
      }
      const runLen = c - runStart;
      if (prevTile && runLen >= 3) {
        const coords = [];
        for (let k = runStart; k < c; k++) {
          coords.push([r, k]);
        }
        groups.push({ dir: 'h', length: runLen, coords, type: prevTile.type });
      }
      runStart = c;
    }
  }

  // Vertical runs
  for (let c = 0; c < GRID_SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= GRID_SIZE; r++) {
      const prevTile = board[r - 1][c];
      const currTile = r < GRID_SIZE ? board[r][c] : null;
      if (currTile && prevTile && currTile.type === prevTile.type) {
        continue;
      }
      const runLen = r - runStart;
      if (prevTile && runLen >= 3) {
        const coords = [];
        for (let k = runStart; k < r; k++) {
          coords.push([k, c]);
        }
        groups.push({ dir: 'v', length: runLen, coords, type: prevTile.type });
      }
      runStart = r;
    }
  }

  // 2x2 Square Matches (spawns 🚀 Seeking Meme Rocket, like iPhone Candy Crush Jelly Fish!)
  for (let r = 0; r < GRID_SIZE - 1; r++) {
    for (let c = 0; c < GRID_SIZE - 1; c++) {
      const t0 = board[r][c];
      if (!t0) continue;
      if (
        board[r][c + 1]?.type === t0.type &&
        board[r + 1][c]?.type === t0.type &&
        board[r + 1][c + 1]?.type === t0.type
      ) {
        groups.push({
          dir: 'sq',
          length: 4,
          coords: [
            [r, c],
            [r, c + 1],
            [r + 1, c],
            [r + 1, c + 1]
          ],
          type: t0.type
        });
      }
    }
  }

  return groups;
}

/**
 * Finds the first valid swap [ [r1,c1], [r2,c2] ] on the board for the Hint button & idle shimmer.
 */
function findFirstValidMove(board) {
  const cloneSwap = (r1, c1, r2, c2) => {
    const tA = board[r1]?.[c1];
    const tB = board[r2]?.[c2];
    if (!tA || !tB) return false;
    if (tA.special === 'color-bomb' || tB.special === 'color-bomb') return true;
    if (tA.special === 'seeking-rocket' || tB.special === 'seeking-rocket') return true;
    if (tA.special && tB.special) return true;
    const copy = board.map((row) => [...row]);
    copy[r1][c1] = tB;
    copy[r2][c2] = tA;
    return findMatchGroups(copy).length > 0;
  };

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (c + 1 < GRID_SIZE && cloneSwap(r, c, r, c + 1)) {
        return [
          [r, c],
          [r, c + 1]
        ];
      }
      if (r + 1 < GRID_SIZE && cloneSwap(r, c, r + 1, c)) {
        return [
          [r, c],
          [r + 1, c]
        ];
      }
    }
  }
  return null;
}

function pickRocketTargets(jellyGrid, strikeCount = 2) {
  const jellyCandidates = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (jellyGrid?.[r]?.[c] > 0) jellyCandidates.push([r, c]);
    }
  }
  const chosen = [];
  for (let i = 0; i < strikeCount; i++) {
    const pick =
      jellyCandidates.length > 0
        ? jellyCandidates.splice(Math.floor(Math.random() * jellyCandidates.length), 1)[0]
        : [Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE)];
    chosen.push(pick);
  }
  return chosen;
}

export default function MemeCrushGame({
  tokens = 0,
  tokenLedger = null,
  playsLeft,
  playsLeftInWindow,
  resetMs,
  windowResetMs,
  gameTokensRemainingToday,
  onCompleteRound,
  onCompleteGameRound,
  onSpendTokensForPlay,
  onBackToFeed
}) {
  const effectivePlaysLeft =
    playsLeft ?? playsLeftInWindow ?? ARCADE_ECONOMY_RULES.SUB_GAMES.CRUSH_PLAYS_PER_WINDOW;
  const effectiveResetMs = resetMs ?? windowResetMs ?? 0;
  const effectiveGameTokensLeft =
    gameTokensRemainingToday ??
    Math.max(
      0,
      ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.games -
        (tokenLedger?.byCategory?.games || 0)
    );
  const completeRoundHandler = onCompleteRound || onCompleteGameRound;

  const [board, setBoard] = useState(() => createInitialBoard(true));
  const [jellyGrid, setJellyGrid] = useState(() => createInitialJellyGrid(1));
  const [jellyAllClearedLevel, setJellyAllClearedLevel] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [storedHighScore, setStoredHighScore] = useState(() =>
    Number(localStorage.getItem('tm_crush_highscore') || 0)
  );
  const highScore = Math.max(storedHighScore, score);
  const [movesLeft, setMovesLeft] = useState(20);
  const [selectedCell, setSelectedCell] = useState(null);
  const [hintCells, setHintCells] = useState([]);
  const [poppingKeys, setPoppingKeys] = useState(new Set());
  const [invalidSwapPair, setInvalidSwapPair] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [boardShake, setBoardShake] = useState(false);

  // iPhone Candy Crush Visual Effects Overlays
  const [announceSplash, setAnnounceSplash] = useState(null);
  const [mascotCallout, setMascotCallout] = useState('🐸 Match 3, 2×2 Squares, or 4/5 in a row to crush Crystal Jelly!');
  const [activeLasers, setActiveLasers] = useState([]);
  const [activeLightnings, setActiveLightnings] = useState([]);
  const [shockwaves, setShockwaves] = useState([]);
  const [tilePopups, setTilePopups] = useState([]);
  const [candyParticles, setCandyParticles] = useState([]);
  const [lootToast, setLootToast] = useState('');

  // Meme Fever Meter & Multipliers
  const [feverPct, setFeverPct] = useState(0);
  const [feverMovesLeft, setFeverMovesLeft] = useState(0);
  const [comboCount, setComboCount] = useState(0);

  // Boosters
  const [hammerMode, setHammerMode] = useState(false);
  const [hammersLeft, setHammersLeft] = useState(2);
  const [ufoDropsLeft, setUfoDropsLeft] = useState(1);
  const [shufflesLeft, setShufflesLeft] = useState(2);

  const [roundFinished, setRoundFinished] = useState(false);
  const [roundSummary, setRoundSummary] = useState(null);
  const [copiedChallenge, setCopiedChallenge] = useState(false);

  const dragStartRef = useRef(null);
  const roundRewardedRef = useRef(false);
  const cascadeRunnerRef = useRef(null);
  const movesLeftRef = useRef(20);
  const scoreRef = useRef(0);
  const feverPctRef = useRef(0);
  const feverMovesRef = useRef(0);
  const jellyGridRef = useRef(jellyGrid);
  const levelRef = useRef(1);
  const jellyClearedLevelRef = useRef(0);

  const targetScore = level === 1 ? 1500 : level === 2 ? 3400 : 3400 + (level - 2) * 2200;

  // Count remaining Frosted Crystal Jelly tiles
  const remainingJellyCount = jellyGrid.reduce(
    (sum, row) => sum + row.reduce((rSum, cell) => rSum + (cell > 0 ? 1 : 0), 0),
    0
  );

  useEffect(() => {
    movesLeftRef.current = movesLeft;
    scoreRef.current = score;
    feverPctRef.current = feverPct;
    feverMovesRef.current = feverMovesLeft;
    jellyGridRef.current = jellyGrid;
    levelRef.current = level;
    jellyClearedLevelRef.current = jellyAllClearedLevel;
  }, [movesLeft, score, feverPct, feverMovesLeft, jellyGrid, level, jellyAllClearedLevel]);

  useEffect(() => {
    if (score > storedHighScore) {
      localStorage.setItem('tm_crush_highscore', String(score));
    }
  }, [score, storedHighScore]);

  // Automatic 4.8-second iPhone-style idle hint shimmer when player hasn't moved
  useEffect(() => {
    if (isAnimating || roundFinished || hintCells.length > 0) return undefined;
    const timer = setTimeout(() => {
      const move = findFirstValidMove(board);
      if (move) {
        setHintCells(move.map(([r, c]) => `${r},${c}`));
      }
    }, 4800);
    return () => clearTimeout(timer);
  }, [board, isAnimating, roundFinished, hintCells]);

  const triggerAnnounceSplash = useCallback((tierIdx, customTitle = null, customSub = null) => {
    const base =
      ANNOUNCER_TIERS[Math.min(ANNOUNCER_TIERS.length - 1, Math.max(0, tierIdx - 1))];
    const payload = {
      id: `sp-${Date.now()}-${Math.random()}`,
      tier: base.tier,
      title: customTitle || base.title,
      sub: customSub || base.sub,
      color: base.color
    };
    setAnnounceSplash(payload);
    if (base.mascot) {
      setMascotCallout(base.mascot);
    }
    setTimeout(() => {
      setAnnounceSplash((prev) => (prev?.id === payload.id ? null : prev));
    }, 1150);
  }, []);

  const spawnShockwave = useCallback((r, c, color = '#00f3ff') => {
    const id = `sw-${Date.now()}-${Math.random()}`;
    setShockwaves((prev) => [...prev.slice(-6), { id, r, c, color }]);
    setTimeout(() => {
      setShockwaves((prev) => prev.filter((item) => item.id !== id));
    }, 620);
  }, []);

  const spawnLightningArcs = useCallback((originCoord, targetCoords) => {
    if (!originCoord || !targetCoords?.length) return;
    const now = Date.now();
    const arcs = targetCoords.slice(0, 14).map(([tr, tc], idx) => {
      const x1 = (originCoord[1] + 0.5) * 12.5;
      const y1 = (originCoord[0] + 0.5) * 12.5;
      const x2 = (tc + 0.5) * 12.5;
      const y2 = (tr + 0.5) * 12.5;
      return {
        id: `lt-${now}-${idx}-${Math.random()}`,
        x1,
        y1,
        x2,
        y2,
        midX: (x1 + x2) / 2 + (Math.random() - 0.5) * 8,
        midY: (y1 + y2) / 2 + (Math.random() - 0.5) * 8,
        color: ['#00f3ff', '#facc15', '#ec4899', '#4ade80', '#c084fc'][idx % 5]
      };
    });
    setActiveLightnings(arcs);
    setTimeout(() => {
      setActiveLightnings([]);
    }, 480);
  }, []);

  const spawnGridEffects = useCallback((coordsList, points, customTag = null, lasers = [], extraEmoji = null) => {
    const now = Date.now();
    if (coordsList.length > 0) {
      const mid = coordsList[Math.floor(coordsList.length / 2)];
      const popup = {
        id: `tp-${now}-${Math.random()}`,
        r: mid[0],
        c: mid[1],
        text: customTag ? `${customTag} +${points}` : `+${points}`,
        color: points >= 400 ? '#facc15' : '#00f3ff'
      };
      setTilePopups((prev) => [...prev.slice(-10), popup]);
      setTimeout(() => {
        setTilePopups((prev) => prev.filter((p) => p.id !== popup.id));
      }, 950);

      // Spawn glossy candy splash droplets & emoji shards from matched cells
      const palette = extraEmoji || ['🍬', '✨', '🍓', '💎', '⚡', '🌟', '🍭', '❄️'];
      const shards = coordsList.slice(0, 14).map(([r, c], idx) => ({
        id: `sh-${now}-${idx}-${Math.random()}`,
        r,
        c,
        dx: Math.round((Math.random() - 0.5) * 105),
        dy: Math.round(-40 - Math.random() * 65),
        emoji: palette[idx % palette.length]
      }));
      setCandyParticles((prev) => [...prev.slice(-22), ...shards]);
      setTimeout(() => {
        setCandyParticles((prev) => prev.filter((s) => !shards.some((sh) => sh.id === s.id)));
      }, 720);
    }

    if (lasers.length > 0) {
      const laserItems = lasers.map((l, idx) => ({
        ...l,
        id: `lz-${now}-${idx}-${Math.random()}`
      }));
      setActiveLasers((prev) => [...prev, ...laserItems]);
      setTimeout(() => {
        setActiveLasers((prev) => prev.filter((item) => !laserItems.some((l) => l.id === item.id)));
      }, 440);
    }
  }, []);

  const showLootToast = useCallback((msg) => {
    setLootToast(msg);
    setTimeout(() => {
      setLootToast((prev) => (prev === msg ? '' : prev));
    }, 3200);
  }, []);

  /**
   * Shatters Frosted Crystal Jelly on any coordinates cleared during a match or bomb blast!
   */
  const damageJellyAtCoords = useCallback(
    (coordsList) => {
      const currentJelly = jellyGridRef.current;
      if (!currentJelly) return 0;

      let shatteredCount = 0;
      let remainingAfter = 0;
      const nextJelly = currentJelly.map((row) => [...row]);

      coordsList.forEach(([r, c]) => {
        if (nextJelly[r]?.[c] > 0) {
          nextJelly[r][c] = Math.max(0, nextJelly[r][c] - 1);
          shatteredCount++;
        }
      });

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextJelly[r][c] > 0) remainingAfter++;
        }
      }

      if (shatteredCount > 0) {
        sfx.playJellyShatter();
        setJellyGrid(nextJelly);
        jellyGridRef.current = nextJelly;

        if (remainingAfter === 0 && jellyClearedLevelRef.current < levelRef.current) {
          setJellyAllClearedLevel(levelRef.current);
          jellyClearedLevelRef.current = levelRef.current;
          setScore((s) => s + 1500);
          sfx.playJackpot();
          showLootToast('🧊✨ ALL CRYSTAL JELLY SHATTERED! +1,500 BONUS PTS!');
          setMascotCallout('👑 "ALL CRYSTAL JELLY CLEARED! +1,500 SUGAR BONUS!"');
        } else if (remainingAfter > 0 && remainingAfter <= 4) {
          setMascotCallout(`🧊 "Almost there! Only ${remainingAfter} Crystal Jelly tile${remainingAfter === 1 ? '' : 's'} left!"`);
        }
      }

      return shatteredCount;
    },
    [showLootToast]
  );

  const finishRound = useCallback(
    (clearedTarget, finalScoreVal = scoreRef.current, bonusMovesConverted = 0) => {
      if (roundRewardedRef.current) return;
      roundRewardedRef.current = true;
      setRoundFinished(true);

      const moveConversionPts = bonusMovesConverted * 300;
      const totalScore = finalScoreVal + moveConversionPts;
      if (moveConversionPts > 0) {
        setScore(totalScore);
      }
      if (totalScore > storedHighScore) {
        setStoredHighScore(totalScore);
      }

      // Compute 1-3 Star Trophy Rating
      const stars =
        totalScore >= targetScore * 1.8
          ? 3
          : totalScore >= targetScore
          ? 2
          : totalScore >= targetScore * 0.5
          ? 1
          : 0;

      // Turbo-charged fair token calculation: 1 token per 95 score + Star Chest Bonus, up to 50 tokens/round!
      const starBonusTokens = stars === 3 ? 14 : stars === 2 ? 10 : stars === 1 ? 4 : 2;
      const baseTokens = Math.floor(totalScore / 95) + starBonusTokens + (level - 1) * 4;
      const requestedTokens = Math.min(
        ARCADE_ECONOMY_RULES.SUB_GAMES.MAX_TOKENS_PER_ROUND,
        Math.max(totalScore >= 250 ? 4 : 0, baseTokens)
      );
      const xpEarned = Math.min(350, Math.max(35, Math.floor(totalScore / 18) + stars * 35));

      let actualTokensWon = requestedTokens;
      let capNote = '';
      if (completeRoundHandler) {
        const res = completeRoundHandler({
          gameId: 'crush',
          score: totalScore,
          requestedTokens,
          xpEarned
        });
        if (res && typeof res.awardedTokens === 'number') {
          actualTokensWon = res.awardedTokens;
          if (res.reason === 'daily_cap_reached' || res.reason === 'category_cap_reached') {
            capNote = ' (Daily Arcade Token Cap reached — high score still recorded!)';
          }
        }
      }

      if (clearedTarget || stars >= 2) {
        sfx.playJackpot();
        setTimeout(() => sfx.playAirhorn(), 160);
      } else {
        sfx.playBoing(2);
      }

      setRoundSummary({
        clearedTarget: totalScore >= targetScore,
        stars,
        score: totalScore,
        moveConversionPts,
        tokensWon: actualTokensWon,
        xpEarned,
        capNote
      });
    },
    [storedHighScore, targetScore, level, completeRoundHandler]
  );

  /**
   * Triggers the official Candy Crush style "SUGAR CRUSH FINALE" converting remaining moves into bombs/lasers!
   */
  const handleTriggerMemeCrushFinale = () => {
    if (roundFinished || isAnimating) return;
    const remMoves = movesLeft;
    setMovesLeft(0);
    sfx.playSpecialBomb();
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 550);

    spawnShockwave(3, 3, '#facc15');
    spawnShockwave(4, 4, '#00f3ff');

    // Fire cross-board finale lasers visually
    spawnGridEffects(
      [
        [2, 2],
        [3, 4],
        [5, 3],
        [4, 6]
      ],
      remMoves * 300,
      '🎆 SUGAR CRUSH FINALE!',
      [
        { dir: 'h', index: 2, color: '#facc15' },
        { dir: 'h', index: 5, color: '#ec4899' },
        { dir: 'v', index: 3, color: '#00f3ff' },
        { dir: 'v', index: 6, color: '#4ade80' }
      ]
    );
    triggerAnnounceSplash(
      5,
      '🎆 SUGAR CRUSH FINALE!!',
      `+${(remMoves * 300).toLocaleString()} MOVE BONUS!`
    );

    setTimeout(() => {
      finishRound(true, scoreRef.current, remMoves);
    }, 620);
  };

  /**
   * Resolves all cascades on a board state until stable, spawning Striped Lasers,
   * 2x2 Seeking Meme Rockets, L/T-Shape 3x3 Packet Bombs, 5-in-a-row Supernova Color Bombs,
   * shattering Frosted Crystal Jelly, and animating smooth gravity drop-ins!
   */
  const resolveBoardCascades = useCallback(
    (workingBoard, cascadeStep = 1, swappedCoord = null) => {
      const groups = findMatchGroups(workingBoard);
      if (groups.length === 0) {
        setIsAnimating(false);
        setComboCount(0);
        if (movesLeftRef.current <= 0 && !roundRewardedRef.current) {
          finishRound(scoreRef.current >= targetScore, scoreRef.current, 0);
        }
        return;
      }

      setIsAnimating(true);
      setComboCount(cascadeStep);
      const toRemove = new Set();
      const specialsToSpawn = [];
      const spawnedKeySet = new Set();

      // Detect intersecting L-shape or T-shape matches to spawn 3x3 Wrapped Packet Bombs!
      const cellGroupCount = new Map();
      groups.forEach((g) => {
        g.coords.forEach(([r, c]) => {
          const k = `${r},${c}`;
          toRemove.add(k);
          if (g.dir !== 'sq') {
            cellGroupCount.set(k, (cellGroupCount.get(k) || 0) + 1);
          }
        });
      });

      groups.forEach((g) => {
        const intersectCoord =
          g.dir !== 'sq'
            ? g.coords.find(([r, c]) => (cellGroupCount.get(`${r},${c}`) || 0) >= 2)
            : null;

        if (g.dir === 'sq') {
          // 2x2 Square Match -> Spawn 🚀 Seeking Meme Rocket (like Candy Crush Jelly Fish!)
          const spawnCoord =
            (swappedCoord &&
              g.coords.find(([r, c]) => r === swappedCoord[0] && c === swappedCoord[1])) ||
            g.coords[0];
          const spKey = `${spawnCoord[0]},${spawnCoord[1]}`;
          if (!spawnedKeySet.has(spKey)) {
            spawnedKeySet.add(spKey);
            specialsToSpawn.push({
              r: spawnCoord[0],
              c: spawnCoord[1],
              type: g.type,
              special: 'seeking-rocket'
            });
          }
        } else if (g.length >= 5) {
          const spawnCoord =
            (swappedCoord &&
              g.coords.find(([r, c]) => r === swappedCoord[0] && c === swappedCoord[1])) ||
            g.coords[Math.floor(g.coords.length / 2)];
          const spKey = `${spawnCoord[0]},${spawnCoord[1]}`;
          if (!spawnedKeySet.has(spKey)) {
            spawnedKeySet.add(spKey);
            specialsToSpawn.push({
              r: spawnCoord[0],
              c: spawnCoord[1],
              type: g.type,
              special: 'color-bomb'
            });
          }
        } else if (intersectCoord) {
          const spKey = `${intersectCoord[0]},${intersectCoord[1]}`;
          if (!spawnedKeySet.has(spKey)) {
            spawnedKeySet.add(spKey);
            specialsToSpawn.push({
              r: intersectCoord[0],
              c: intersectCoord[1],
              type: g.type,
              special: 'packet-bomb'
            });
          }
        } else if (g.length === 4) {
          const spawnCoord =
            (swappedCoord &&
              g.coords.find(([r, c]) => r === swappedCoord[0] && c === swappedCoord[1])) ||
            g.coords[1];
          const spKey = `${spawnCoord[0]},${spawnCoord[1]}`;
          if (!spawnedKeySet.has(spKey)) {
            spawnedKeySet.add(spKey);
            specialsToSpawn.push({
              r: spawnCoord[0],
              c: spawnCoord[1],
              type: g.type,
              special: g.dir === 'h' ? 'striped-v' : 'striped-h'
            });
          }
        }
      });

      // Chain-detonate any existing special candies caught in the match!
      let triggeredSpecial = false;
      const lasersToFire = [];
      const queue = Array.from(toRemove);
      const processedSpecials = new Set();

      while (queue.length > 0) {
        const key = queue.shift();
        if (processedSpecials.has(key)) continue;
        const [r, c] = key.split(',').map(Number);
        const tile = workingBoard[r]?.[c];
        if (!tile?.special) continue;

        processedSpecials.add(key);
        triggeredSpecial = true;

        if (tile.special === 'striped-h') {
          lasersToFire.push({ dir: 'h', index: r, color: '#00f3ff' });
          for (let col = 0; col < GRID_SIZE; col++) {
            const k = `${r},${col}`;
            if (!toRemove.has(k)) {
              toRemove.add(k);
              queue.push(k);
            }
          }
        } else if (tile.special === 'striped-v') {
          lasersToFire.push({ dir: 'v', index: c, color: '#ec4899' });
          for (let row = 0; row < GRID_SIZE; row++) {
            const k = `${row},${c}`;
            if (!toRemove.has(k)) {
              toRemove.add(k);
              queue.push(k);
            }
          }
        } else if (tile.special === 'packet-bomb') {
          spawnShockwave(r, c, '#facc15');
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                const k = `${nr},${nc}`;
                if (!toRemove.has(k)) {
                  toRemove.add(k);
                  queue.push(k);
                }
              }
            }
          }
        } else if (tile.special === 'seeking-rocket') {
          // 🚀 Seeking Meme Rocket seeks out Frosted Jelly cells (or random targets) and blasts them!
          const jellyTargets = [];
          const currJelly = jellyGridRef.current;
          for (let jr = 0; jr < GRID_SIZE; jr++) {
            for (let jc = 0; jc < GRID_SIZE; jc++) {
              if (currJelly?.[jr]?.[jc] > 0 && !toRemove.has(`${jr},${jc}`)) {
                jellyTargets.push([jr, jc]);
              }
            }
          }
          const chosenTarget =
            jellyTargets.length > 0
              ? jellyTargets[Math.floor(Math.random() * jellyTargets.length)]
              : [Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE)];
          spawnLightningArcs([r, c], [chosenTarget]);
          spawnShockwave(chosenTarget[0], chosenTarget[1], '#4ade80');
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (Math.abs(dr) + Math.abs(dc) <= 1) {
                const nr = chosenTarget[0] + dr;
                const nc = chosenTarget[1] + dc;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                  const k = `${nr},${nc}`;
                  if (!toRemove.has(k)) {
                    toRemove.add(k);
                    queue.push(k);
                  }
                }
              }
            }
          }
        } else if (tile.special === 'color-bomb') {
          const zappedCoords = [];
          for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
              if (workingBoard[row][col]?.type === tile.type) {
                const k = `${row},${col}`;
                zappedCoords.push([row, col]);
                if (!toRemove.has(k)) {
                  toRemove.add(k);
                  queue.push(k);
                }
              }
            }
          }
          spawnLightningArcs([r, c], zappedCoords);
        }
      }

      const allCoords = Array.from(toRemove).map((k) => k.split(',').map(Number));
      const jellyShattered = damageJellyAtCoords(allCoords);

      const clearedCount = toRemove.size;
      const feverMultiplier = feverMovesRef.current > 0 ? 2 : 1;
      const pointsEarned =
        (clearedCount * 45 * cascadeStep + jellyShattered * 120) * feverMultiplier;
      setScore((prev) => prev + pointsEarned);

      // Charge Meme Fever Meter
      const nextFever = Math.min(
        100,
        feverPctRef.current + clearedCount * 4 + cascadeStep * 6 + jellyShattered * 3
      );
      let triggerFeverNow = false;
      if (nextFever >= 100) {
        triggerFeverNow = true;
        setFeverPct(0);
        feverPctRef.current = 0;
        setFeverMovesLeft((m) => m + 3);
      } else {
        setFeverPct(nextFever);
        feverPctRef.current = nextFever;
      }

      // Audio & Screen Shake
      if (triggeredSpecial || clearedCount >= 7 || cascadeStep >= 3) {
        setBoardShake(true);
        setTimeout(() => setBoardShake(false), 360);
      }
      if (lasersToFire.length > 0) {
        sfx.playLaserZap();
      }
      if (triggeredSpecial || specialsToSpawn.length > 0 || cascadeStep >= 2) {
        sfx.playCrushComboFanfare(Math.min(5, Math.max(cascadeStep, clearedCount >= 8 ? 4 : 2)));
      } else {
        sfx.playCandyMatch(cascadeStep);
      }

      spawnGridEffects(
        allCoords,
        pointsEarned,
        triggeredSpecial
          ? '💥 MEGA BLAST!'
          : jellyShattered > 0
          ? `🧊 ${jellyShattered} JELLY!`
          : cascadeStep >= 2
          ? `🔥 ${cascadeStep}x`
          : null,
        lasersToFire,
        jellyShattered > 0 ? ['❄️', '💎', '✨', '🍬', '🌟'] : null
      );

      if (cascadeStep >= 2 || clearedCount >= 4 || triggeredSpecial) {
        const effectiveTier = Math.min(
          5,
          Math.max(cascadeStep, clearedCount >= 10 ? 5 : clearedCount >= 6 ? 3 : 1)
        );
        triggerAnnounceSplash(effectiveTier);
      }

      setPoppingKeys(toRemove);

      setTimeout(() => {
        const nextBoard = workingBoard.map((row) => [...row]);

        // Clear matched cells
        toRemove.forEach((key) => {
          const [r, c] = key.split(',').map(Number);
          nextBoard[r][c] = null;
        });

        // Place newly earned special candies
        specialsToSpawn.forEach((sp) => {
          nextBoard[sp.r][sp.c] = makeTile(sp.type, sp.special, 0);
        });

        // Apply downward gravity column by column AND compute exact drop distance for elastic bounce!
        for (let c = 0; c < GRID_SIZE; c++) {
          const surviving = [];
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            if (nextBoard[r][c] !== null) {
              surviving.push({ tile: nextBoard[r][c], origRow: r });
            }
          }
          const missingCount = GRID_SIZE - surviving.length;
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            const idxFromBottom = GRID_SIZE - 1 - r;
            if (idxFromBottom < surviving.length) {
              const { tile, origRow } = surviving[idxFromBottom];
              const dropRows = Math.max(0, r - origRow);
              nextBoard[r][c] = {
                ...tile,
                dropDist: dropRows
              };
            } else {
              nextBoard[r][c] = makeTile(null, null, missingCount + 1);
            }
          }
        }

        // If Meme Fever Meter hit 100%, drop bonus special candies & award a Turbo Loot Drop!
        if (triggerFeverNow) {
          sfx.playPowerUpCollect();
          const perk = FEVER_LOOT_PERKS[Math.floor(Math.random() * FEVER_LOOT_PERKS.length)];
          setScore((s) => s + 600);
          if (perk.id === 'moves') setMovesLeft((m) => m + 2);
          else if (perk.id === 'hammer') setHammersLeft((h) => h + 1);
          else if (perk.id === 'ufo') setUfoDropsLeft((u) => u + 1);

          // Spawn 2 bonus special candies on random tiles
          const r1 = Math.floor(Math.random() * GRID_SIZE);
          const c1 = Math.floor(Math.random() * GRID_SIZE);
          const r2 = (r1 + 3) % GRID_SIZE;
          const c2 = (c1 + 4) % GRID_SIZE;
          if (nextBoard[r1][c1]) {
            nextBoard[r1][c1] = makeTile(
              nextBoard[r1][c1].type,
              perk.id === 'colorbomb' ? 'color-bomb' : 'packet-bomb',
              1
            );
          }
          if (nextBoard[r2][c2]) {
            nextBoard[r2][c2] = makeTile(nextBoard[r2][c2].type, 'seeking-rocket', 1);
          }
          showLootToast(`🔥 SUGAR RUSH ERUPTION (2X SCORE)! ${perk.label}`);
        }

        setPoppingKeys(new Set());
        setBoard(nextBoard);

        setTimeout(() => {
          if (cascadeRunnerRef.current) {
            cascadeRunnerRef.current(nextBoard, cascadeStep + 1, null);
          }
        }, 240);
      }, 240);
    },
    [
      spawnGridEffects,
      triggerAnnounceSplash,
      showLootToast,
      finishRound,
      targetScore,
      damageJellyAtCoords,
      spawnShockwave,
      spawnLightningArcs
    ]
  );

  useEffect(() => {
    cascadeRunnerRef.current = resolveBoardCascades;
  }, [resolveBoardCascades]);

  const handleAdvanceNextLevel = () => {
    sfx.playLevelUp();
    const nextLv = level + 1;
    setLevel(nextLv);
    setJellyGrid(createInitialJellyGrid(nextLv));
    setMovesLeft((m) => Math.min(25, m + 12));
    setHammersLeft((h) => h + 1);
    setUfoDropsLeft((u) => u + 1);
    setShufflesLeft((s) => s + 1);
    triggerAnnounceSplash(4, `🚀 LEVEL ${nextLv} UNLOCKED!`, '+12 MOVES, FRESH CRYSTAL JELLY & BOOSTERS!');
  };

  const handleStartNewRound = (useTokensIfEmpty = false) => {
    if (effectivePlaysLeft <= 0) {
      if (useTokensIfEmpty && onSpendTokensForPlay) {
        const ok = onSpendTokensForPlay('crush', ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST);
        if (!ok) return;
      } else {
        sfx.playSadTrombone();
        return;
      }
    }
    sfx.playMutate();
    roundRewardedRef.current = false;
    setRoundFinished(false);
    setRoundSummary(null);
    setLevel(1);
    setJellyAllClearedLevel(0);
    setJellyGrid(createInitialJellyGrid(1));
    setScore(0);
    setMovesLeft(20);
    setFeverPct(0);
    setFeverMovesLeft(0);
    setHammersLeft(2);
    setUfoDropsLeft(1);
    setShufflesLeft(2);
    setSelectedCell(null);
    setHintCells([]);
    setBoard(createInitialBoard(true));
  };

  /**
   * Executes a Special + Special Swap or standard swap on the 8x8 Candy Board.
   */
  const attemptSwap = (r1, c1, r2, c2) => {
    if (isAnimating || roundFinished || movesLeft <= 0) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    setHintCells([]);
    setSelectedCell(null);

    const tileA = board[r1][c1];
    const tileB = board[r2][c2];
    if (!tileA || !tileB) return;

    const consumeMove = () => {
      setMovesLeft((m) => Math.max(0, m - 1));
      if (feverMovesLeft > 0) {
        setFeverMovesLeft((f) => Math.max(0, f - 1));
      }
    };

    const executeCustomBlast = (toBlastSet, bonusPts, bannerTitle, bannerSub, lasers = []) => {
      consumeMove();
      setIsAnimating(true);
      setBoardShake(true);
      setTimeout(() => setBoardShake(false), 450);
      sfx.playSpecialBomb();
      if (lasers.length > 0) sfx.playLaserZap();

      const coords = Array.from(toBlastSet).map((k) => k.split(',').map(Number));
      const jellyHits = damageJellyAtCoords(coords);

      const feverMult = feverMovesLeft > 0 ? 2 : 1;
      const totalPts = (bonusPts + jellyHits * 120) * feverMult;
      setScore((s) => s + totalPts);

      spawnGridEffects(coords, totalPts, bannerTitle, lasers);
      triggerAnnounceSplash(5, bannerTitle, `${bannerSub} (+${totalPts.toLocaleString()} PTS!)`);
      setPoppingKeys(toBlastSet);

      setTimeout(() => {
        const nextBoard = board.map((row) => [...row]);
        toBlastSet.forEach((key) => {
          const [br, bc] = key.split(',').map(Number);
          nextBoard[br][bc] = null;
        });
        for (let c = 0; c < GRID_SIZE; c++) {
          const surviving = [];
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            if (nextBoard[r][c] !== null) surviving.push({ tile: nextBoard[r][c], origRow: r });
          }
          const missing = GRID_SIZE - surviving.length;
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            const idx = GRID_SIZE - 1 - r;
            if (idx < surviving.length) {
              const { tile, origRow } = surviving[idx];
              nextBoard[r][c] = { ...tile, dropDist: Math.max(0, r - origRow) };
            } else {
              nextBoard[r][c] = makeTile(null, null, missing + 1);
            }
          }
        }
        setPoppingKeys(new Set());
        setBoard(nextBoard);
        setTimeout(() => resolveBoardCascades(nextBoard, 2, null), 230);
      }, 260);
    };

    // 1. 🌈 COLOR BOMB + 🌈 COLOR BOMB = NUCLEAR 64-TILE BOARD WIPE!
    if (tileA.special === 'color-bomb' && tileB.special === 'color-bomb') {
      const allKeys = new Set();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          allKeys.add(`${r},${c}`);
        }
      }
      spawnShockwave(r2, c2, '#facc15');
      executeCustomBlast(
        allKeys,
        5000,
        '🌌 NUCLEAR BOARD WIPE!!',
        'DOUBLE COLOR BOMB SUPERNOVA!',
        [
          { dir: 'h', index: r1, color: '#facc15' },
          { dir: 'h', index: r2, color: '#00f3ff' },
          { dir: 'v', index: c1, color: '#ec4899' },
          { dir: 'v', index: c2, color: '#4ade80' }
        ]
      );
      return;
    }

    // 2. 🌈 COLOR BOMB + ANY CANDY (OR STRIPED / PACKET BOMB / SEEKING ROCKET)
    if (tileA.special === 'color-bomb' || tileB.special === 'color-bomb') {
      const bombCoords = tileA.special === 'color-bomb' ? [r1, c1] : [r2, c2];
      const otherTile = tileA.special === 'color-bomb' ? tileB : tileA;
      const targetType = otherTile.type;
      const toBlast = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      const lasers = [];
      const arcTargets = [];

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (board[r][c]?.type === targetType) {
            toBlast.add(`${r},${c}`);
            arcTargets.push([r, c]);
            if (otherTile.special === 'striped-h' || otherTile.special === 'striped-v') {
              if ((r + c) % 2 === 0) {
                lasers.push({ dir: 'h', index: r, color: '#00f3ff' });
                for (let k = 0; k < GRID_SIZE; k++) toBlast.add(`${r},${k}`);
              } else {
                lasers.push({ dir: 'v', index: c, color: '#ec4899' });
                for (let k = 0; k < GRID_SIZE; k++) toBlast.add(`${k},${c}`);
              }
            } else if (otherTile.special === 'packet-bomb' || otherTile.special === 'seeking-rocket') {
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  if (r + dr >= 0 && r + dr < GRID_SIZE && c + dc >= 0 && c + dc < GRID_SIZE) {
                    toBlast.add(`${r + dr},${c + dc}`);
                  }
                }
              }
            }
          }
        }
      }

      spawnLightningArcs(bombCoords, arcTargets);
      spawnShockwave(bombCoords[0], bombCoords[1], '#00f3ff');
      executeCustomBlast(
        toBlast,
        toBlast.size * 75,
        otherTile.special ? '🌈⚡ HYPER COMBO STORM!!' : '🌈 SUPERNOVA COLOR BLAST!',
        `${toBlast.size} CANDIES VAPORIZED!`,
        lasers
      );
      return;
    }

    // 3. 🚀 SEEKING ROCKET SWAPPED WITH ANY CANDY -> Launches Homing Rockets at Crystal Jelly!
    if (tileA.special === 'seeking-rocket' || tileB.special === 'seeking-rocket') {
      const origin = tileA.special === 'seeking-rocket' ? [r1, c1] : [r2, c2];
      const toBlast = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      const strikeCount = tileA.special && tileB.special ? 3 : 2;
      const chosenTargets = pickRocketTargets(jellyGrid, strikeCount);
      for (const pick of chosenTargets) {
        spawnShockwave(pick[0], pick[1], '#4ade80');
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (Math.abs(dr) + Math.abs(dc) <= 1) {
              const nr = pick[0] + dr;
              const nc = pick[1] + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                toBlast.add(`${nr},${nc}`);
              }
            }
          }
        }
      }
      spawnLightningArcs(origin, chosenTargets);
      executeCustomBlast(
        toBlast,
        950 * strikeCount,
        '🚀 SEEKING ROCKET BARRAGE!',
        'HOMING JELLY STRIKE COMPLETE!'
      );
      return;
    }

    // 4. ⚡/💥 TWO SPECIAL CANDIES SWAPPED TOGETHER (Striped+Striped, Striped+Packet, Packet+Packet)
    if (tileA.special && tileB.special) {
      const toBlast = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      const lasers = [];
      const hasPacket = tileA.special === 'packet-bomb' || tileB.special === 'packet-bomb';
      const hasStriped =
        tileA.special?.startsWith('striped') || tileB.special?.startsWith('striped');

      if (hasPacket && hasStriped) {
        for (let d = -1; d <= 1; d++) {
          const rr = r2 + d;
          const cc = c2 + d;
          if (rr >= 0 && rr < GRID_SIZE) {
            lasers.push({ dir: 'h', index: rr, color: '#facc15' });
            for (let k = 0; k < GRID_SIZE; k++) toBlast.add(`${rr},${k}`);
          }
          if (cc >= 0 && cc < GRID_SIZE) {
            lasers.push({ dir: 'v', index: cc, color: '#ec4899' });
            for (let k = 0; k < GRID_SIZE; k++) toBlast.add(`${k},${cc}`);
          }
        }
        spawnShockwave(r2, c2, '#facc15');
        executeCustomBlast(
          toBlast,
          2400,
          '⚡💥 GIANT 3×3 MEGA LASER!!',
          '3 ROWS + 3 COLUMNS OBLITERATED!',
          lasers
        );
        return;
      }

      if (tileA.special === 'packet-bomb' && tileB.special === 'packet-bomb') {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r2 + dr;
            const nc = c2 + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              toBlast.add(`${nr},${nc}`);
            }
          }
        }
        spawnShockwave(r2, c2, '#ec4899');
        executeCustomBlast(toBlast, 2000, '💥💥 5×5 GIGA-CRATER!!', 'DOUBLE PACKET DETONATION!');
        return;
      }

      // Striped + Striped = Cross Laser (Full Row + Full Column)
      lasers.push({ dir: 'h', index: r2, color: '#00f3ff' });
      lasers.push({ dir: 'v', index: c2, color: '#ec4899' });
      for (let k = 0; k < GRID_SIZE; k++) {
        toBlast.add(`${r2},${k}`);
        toBlast.add(`${k},${c2}`);
      }
      executeCustomBlast(toBlast, 1400, '⚡╋ CROSS-LASER OVERDRIVE!', 'ROW & COLUMN CLEARED!', lasers);
      return;
    }

    // 5. Standard Swap Check
    const swapped = board.map((row) =>
      row.map((cell) => (cell ? { ...cell, dropDist: 0 } : null))
    );
    swapped[r1][c1] = { ...tileB, dropDist: 0 };
    swapped[r2][c2] = { ...tileA, dropDist: 0 };

    const matches = findMatchGroups(swapped);
    if (matches.length === 0) {
      // iPhone Candy Crush elastic spring-back invalid swap animation!
      sfx.playClownHonk();
      setInvalidSwapPair([`${r1},${c1}`, `${r2},${c2}`]);
      setTimeout(() => setInvalidSwapPair(null), 420);
      setMascotCallout('🐸 "No match there! Tap 💡 Hint for a glowing move!"');
      return;
    }

    consumeMove();
    setBoard(swapped);
    resolveBoardCascades(swapped, 1, [r2, c2]);
  };

  const handleCellClick = (r, c) => {
    if (isAnimating || roundFinished || movesLeft <= 0) return;

    // 🔨 Lollipop Meme Hammer Booster Mode: smash a 3x3 cross & shatter Crystal Jelly!
    if (hammerMode && hammersLeft > 0) {
      setHammerMode(false);
      setHammersLeft((h) => h - 1);
      setIsAnimating(true);
      setBoardShake(true);
      setTimeout(() => setBoardShake(false), 380);
      sfx.playMetalPipe();
      spawnShockwave(r, c, '#facc15');
      const toSmash = new Set([`${r},${c}`]);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (Math.abs(dr) + Math.abs(dc) <= 1) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              toSmash.add(`${nr},${nc}`);
            }
          }
        }
      }
      const coords = Array.from(toSmash).map((k) => k.split(',').map(Number));
      const jellyHit = damageJellyAtCoords(coords);
      const pts = 350 + jellyHit * 120;
      setPoppingKeys(toSmash);
      setScore((s) => s + pts);
      spawnGridEffects([[r, c]], pts, '🔨 LOLLIPOP SMASH!');
      triggerAnnounceSplash(3, '🔨 LOLLIPOP HAMMER SMASH!', `+${pts} BONUS PTS!`);

      setTimeout(() => {
        const nextBoard = board.map((row) => [...row]);
        toSmash.forEach((key) => {
          const [sr, sc] = key.split(',').map(Number);
          nextBoard[sr][sc] = null;
        });
        for (let col = 0; col < GRID_SIZE; col++) {
          const surviving = [];
          for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (nextBoard[row][col] !== null) surviving.push({ tile: nextBoard[row][col], origRow: row });
          }
          const missing = GRID_SIZE - surviving.length;
          for (let row = GRID_SIZE - 1; row >= 0; row--) {
            const idx = GRID_SIZE - 1 - row;
            if (idx < surviving.length) {
              const { tile, origRow } = surviving[idx];
              nextBoard[row][col] = { ...tile, dropDist: Math.max(0, row - origRow) };
            } else {
              nextBoard[row][col] = makeTile(null, null, missing + 1);
            }
          }
        }
        setPoppingKeys(new Set());
        setBoard(nextBoard);
        setTimeout(() => resolveBoardCascades(nextBoard, 1, null), 200);
      }, 220);
      return;
    }

    if (!selectedCell) {
      sfx.playToggle();
      setSelectedCell([r, c]);
      return;
    }

    const [sr, sc] = selectedCell;
    if (sr === r && sc === c) {
      setSelectedCell(null);
      return;
    }

    if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
      attemptSwap(sr, sc, r, c);
    } else {
      sfx.playToggle();
      setSelectedCell([r, c]);
    }
  };

  // 🛸 UFO Special Bomb Dropper Booster
  const handleDeployUfoDrop = () => {
    if (isAnimating || roundFinished || ufoDropsLeft <= 0) return;
    setUfoDropsLeft((u) => u - 1);
    sfx.playAlienBeam();
    setTimeout(() => sfx.playPowerUpCollect(), 200);

    const nextBoard = board.map((row) => [...row]);
    const r1 = 2 + Math.floor(Math.random() * 4);
    const c1 = 1 + Math.floor(Math.random() * 3);
    const r2 = 2 + Math.floor(Math.random() * 4);
    const c2 = 4 + Math.floor(Math.random() * 3);

    nextBoard[r1][c1] = makeTile(nextBoard[r1][c1]?.type ?? 0, 'color-bomb', 2);
    nextBoard[r2][c2] = makeTile(nextBoard[r2][c2]?.type ?? 1, 'seeking-rocket', 2);
    spawnShockwave(r1, c1, '#00f3ff');
    spawnShockwave(r2, c2, '#4ade80');
    setBoard(nextBoard);
    setScore((s) => s + 400);
    triggerAnnounceSplash(4, '🛸 UFO CANDY DROP!!', '🌈 COLOR BOMB + 🚀 SEEKING ROCKET BEAMED IN!');
  };

  const handlePointerDown = (r, c, e) => {
    dragStartRef.current = { r, c, x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (r, c, e) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);

    if (dist >= 22) {
      if (Math.abs(dx) > Math.abs(dy)) {
        const targetC = start.c + (dx > 0 ? 1 : -1);
        if (targetC >= 0 && targetC < GRID_SIZE) {
          attemptSwap(start.r, start.c, start.r, targetC);
        }
      } else {
        const targetR = start.r + (dy > 0 ? 1 : -1);
        if (targetR >= 0 && targetR < GRID_SIZE) {
          attemptSwap(start.r, start.c, targetR, start.c);
        }
      }
    }
  };

  const handleShowHint = () => {
    if (isAnimating) return;
    const move = findFirstValidMove(board);
    if (move) {
      sfx.playBubblePop(3);
      setHintCells(move.map(([r, c]) => `${r},${c}`));
    } else {
      handleShuffleBoard(true);
    }
  };

  const handleShuffleBoard = (freeAuto = false) => {
    if (isAnimating) return;
    if (!freeAuto && shufflesLeft <= 0) return;
    if (!freeAuto) setShufflesLeft((s) => s - 1);
    sfx.playBoing(3);
    triggerAnnounceSplash(2, '🔀 BOARD SHUFFLED!', 'FRESH GLOSSY JELLY CANDIES DROPPED!');
    setHintCells([]);
    setSelectedCell(null);
    setBoard(createInitialBoard(true));
  };

  const handleShareChallenge = () => {
    const shareUrl = `${window.location.origin}/?mode=crush`;
    const shareText = `🍬 I just scored ${score.toLocaleString()} pts (Level ${level}) in MEME CRUSH SAGA on THE MEMES.net! Can you beat my high score?`;
    navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(() => {});
    if (typeof navigator.share === 'function') {
      navigator
        .share({
          title: '🍬 Meme Crush Saga — THE MEMES.net',
          text: shareText,
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop(3);
    setCopiedChallenge(true);
    setTimeout(() => setCopiedChallenge(false), 2500);
  };

  // 3-Star Progress Tube scaling (3 stars = 180% of targetScore)
  const threeStarGoal = Math.round(targetScore * 1.8);
  const starTubePct = Math.min(100, Math.round((score / threeStarGoal) * 100));
  const currentStars =
    score >= targetScore * 1.8 ? 3 : score >= targetScore ? 2 : score >= targetScore * 0.5 ? 1 : 0;

  return (
    <section className="tm-subgame-wrap" aria-label="Meme Crush Saga Puzzle Game">
      <div
        className={`tm-subgame-card tm-crush-cabinet ${boardShake ? 'tm-shake' : ''} ${
          feverMovesLeft > 0 || comboCount >= 3 ? 'tm-crush-fever-cabinet' : ''
        }`}
      >
        {/* Top Header */}
        <div className="tm-subgame-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onBackToFeed}>
              ← Back to Memes
            </button>
            <div>
              <h2 className="tm-subgame-title">
                🍬 MEME CRUSH SAGA{' '}
                <span className="tm-subgame-badge">
                  LEVEL {level} {feverMovesLeft > 0 ? '• 🔥 2X SUGAR RUSH!' : ''}
                </span>
              </h2>
              <div className="tm-subgame-subtitle">
                2×2 Square = 🚀 Seeking Rocket • Match 4 = ⚡ Laser • L/T = 💥 3×3 Bomb • Match 5 = 🌈
                Supernova!
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              className="tm-spin-counter-pill"
              style={{ borderColor: '#facc15', color: '#facc15' }}
            >
              🪙 {effectiveGameTokensLeft} Game Tokens Left Today
            </span>
            <button type="button" className="tm-btn" onClick={handleShareChallenge}>
              {copiedChallenge ? '✅ Challenge Link Copied!' : '🔗 Challenge Friends'}
            </button>
          </div>
        </div>

        {/* iPhone Candy Crush Style 3-Star Candy Progress Tube & Mascot Strip */}
        <div className="tm-crush-star-tube-shell">
          <div className="tm-crush-mascot-pill">
            <span className="tm-crush-mascot-avatar">🍬</span>
            <span className="tm-crush-mascot-text">{mascotCallout}</span>
            <span className="tm-crush-jelly-badge">
              🧊 {remainingJellyCount > 0 ? `${remainingJellyCount} Crystal Jelly Left` : '✅ All Jelly Cleared!'}
            </span>
          </div>

          <div className="tm-crush-star-tube-wrap">
            <div className="tm-crush-star-tube-track">
              <div
                className="tm-crush-star-tube-fill"
                style={{ width: `${starTubePct}%` }}
              />
              {/* 1-Star Milestone Marker (~28% of 1.8x tube) */}
              <div
                className={`tm-crush-star-marker ${currentStars >= 1 ? 'lit' : ''}`}
                style={{ left: '28%' }}
                title={`1 Star: ${Math.round(targetScore * 0.5).toLocaleString()} pts`}
              >
                ⭐
              </div>
              {/* 2-Star Milestone Marker (~56% of 1.8x tube = targetScore) */}
              <div
                className={`tm-crush-star-marker ${currentStars >= 2 ? 'lit' : ''}`}
                style={{ left: '56%' }}
                title={`2 Stars (Level Clear): ${targetScore.toLocaleString()} pts`}
              >
                ⭐⭐
              </div>
              {/* 3-Star Milestone Marker (96% of tube = 1.8x targetScore) */}
              <div
                className={`tm-crush-star-marker ${currentStars >= 3 ? 'lit' : ''}`}
                style={{ left: '95%' }}
                title={`3 Stars (Mastery): ${threeStarGoal.toLocaleString()} pts`}
              >
                ⭐⭐⭐
              </div>
            </div>
          </div>
        </div>

        {/* Score, Moves, Fever Meter & Star Trophy HUD */}
        <div className="tm-crush-hud-grid">
          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">
              SCORE / TARGET ({'⭐'.repeat(currentStars) || '☆'})
            </span>
            <strong className="tm-crush-stat-val" style={{ color: '#00f3ff' }}>
              {score.toLocaleString()} <small>/ {targetScore.toLocaleString()}</small>
            </strong>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">🔥 SUGAR FEVER METER</span>
            <strong
              className="tm-crush-stat-val"
              style={{ color: feverMovesLeft > 0 ? '#ec4899' : '#facc15' }}
            >
              {feverMovesLeft > 0 ? `🔥 2X RUSH (${feverMovesLeft} Moves)` : `${feverPct}%`}
            </strong>
            <div className="tm-xp-track" style={{ marginTop: '4px' }}>
              <div
                className="tm-xp-bar"
                style={{
                  width: `${feverMovesLeft > 0 ? 100 : feverPct}%`,
                  background: 'linear-gradient(90deg, #facc15, #f97316, #ec4899)'
                }}
              />
            </div>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">MOVES LEFT</span>
            <strong
              className="tm-crush-stat-val"
              style={{ color: movesLeft <= 4 ? '#f87171' : '#facc15' }}
            >
              {movesLeft}
            </strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {score >= targetScore
                ? '🎉 Target Crushed! Finale Ready!'
                : `${(targetScore - score).toLocaleString()} pts to clear`}
            </span>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">BEST SCORE &amp; PLAYS</span>
            <strong className="tm-crush-stat-val" style={{ color: '#f472b6' }}>
              🏆 {highScore.toLocaleString()}
            </strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {effectivePlaysLeft > 0
                ? `🎟️ ${effectivePlaysLeft}/${ARCADE_ECONOMY_RULES.SUB_GAMES.CRUSH_PLAYS_PER_WINDOW} Free Plays`
                : `⏳ Refills in ${formatWindowCountdown(effectiveResetMs)}`}
            </span>
          </div>
        </div>

        {/* Turbo Loot Drop Toast */}
        {lootToast && <div className="tm-subgame-toast">{lootToast}</div>}

        {/* Level Cleared Early Advance & Official "Sugar Crush Finale" Strip */}
        {score >= targetScore && !roundFinished && movesLeft > 0 && (
          <div className="tm-crush-levelup-strip">
            <span>
              🎉 <strong>LEVEL {level} TARGET CRUSHED!</strong> Advance for +12 Moves or trigger the{' '}
              <strong>🎆 SUGAR CRUSH FINALE</strong> (+{(movesLeft * 300).toLocaleString()} Move Bonus
              + Star Chest)!
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={handleAdvanceNextLevel}
              >
                🚀 Next Level (+12 Moves &amp; Boosters)
              </button>
              <button
                type="button"
                className="tm-btn"
                style={{ borderColor: '#facc15', color: '#facc15', fontWeight: 900 }}
                onClick={handleTriggerMemeCrushFinale}
              >
                🎆 Trigger Sugar Crush Finale &amp; Claim Tokens!
              </button>
            </div>
          </div>
        )}

        {/* Power Boosters Bar */}
        <div className="tm-crush-boosters-bar">
          <button
            type="button"
            className="tm-crush-booster-btn"
            onClick={handleShowHint}
            disabled={isAnimating || roundFinished}
          >
            💡 Hint (Free)
          </button>

          <button
            type="button"
            className={`tm-crush-booster-btn ${hammerMode ? 'active' : ''}`}
            disabled={hammersLeft <= 0 || isAnimating || roundFinished}
            onClick={() => {
              sfx.playToggle();
              setHammerMode((prev) => !prev);
            }}
          >
            🍭 Lollipop Hammer ({hammersLeft}) {hammerMode ? '— Tap any tile!' : ''}
          </button>

          <button
            type="button"
            className="tm-crush-booster-btn"
            disabled={ufoDropsLeft <= 0 || isAnimating || roundFinished}
            onClick={handleDeployUfoDrop}
            title="Beam a Supernova Color Bomb + Seeking Rocket directly onto the board!"
          >
            🛸 UFO Candy Drop ({ufoDropsLeft})
          </button>

          <button
            type="button"
            className="tm-crush-booster-btn"
            disabled={shufflesLeft <= 0 || isAnimating || roundFinished}
            onClick={() => handleShuffleBoard(false)}
          >
            🔀 Shuffle ({shufflesLeft})
          </button>

          <button
            type="button"
            className="tm-crush-booster-btn"
            onClick={() => finishRound(score >= targetScore, score, 0)}
            disabled={roundFinished || score === 0}
            title="End current game and claim earned Arcade Tokens"
          >
            🏁 Cash Out ({score.toLocaleString()} pts)
          </button>
        </div>

        {/* 8x8 Candy Board Stage + Rainbow Lightning + Shockwaves + Lasers + 3D Announcer Splash */}
        <div className="tm-crush-board-stage" style={{ position: 'relative' }}>
          {/* Center-Board 3D Candy Crush Announcer Splash */}
          {announceSplash && (
            <div
              key={announceSplash.id}
              className="tm-crush-announcer-splash"
              style={{ '--splash-color': announceSplash.color }}
            >
              <div className="tm-crush-announcer-title">{announceSplash.title}</div>
              <div className="tm-crush-announcer-sub">{announceSplash.sub}</div>
            </div>
          )}

          {/* SVG Rainbow Lightning Beams (Color Bomb & Rocket Arcs) */}
          {activeLightnings.length > 0 && (
            <svg
              className="tm-crush-lightning-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {activeLightnings.map((arc) => (
                <g key={arc.id}>
                  <polyline
                    points={`${arc.x1},${arc.y1} ${arc.midX},${arc.midY} ${arc.x2},${arc.y2}`}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <polyline
                    points={`${arc.x1},${arc.y1} ${arc.midX},${arc.midY} ${arc.x2},${arc.y2}`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </svg>
          )}

          {/* Expanding Neon Shockwave Rings */}
          {shockwaves.map((sw) => (
            <div
              key={sw.id}
              className="tm-crush-shockwave-ring"
              style={{
                top: `${(sw.r + 0.5) * 12.5}%`,
                left: `${(sw.c + 0.5) * 12.5}%`,
                '--sw-color': sw.color
              }}
            />
          ))}

          {/* Row & Column Neon Laser Beams Overlay */}
          {activeLasers.map((lz) => (
            <div
              key={lz.id}
              className={`tm-crush-laser-beam ${lz.dir === 'h' ? 'horizontal' : 'vertical'}`}
              style={{
                '--laser-color': lz.color,
                top: lz.dir === 'h' ? `${(lz.index + 0.5) * 12.5}%` : 0,
                left: lz.dir === 'v' ? `${(lz.index + 0.5) * 12.5}%` : 0
              }}
            />
          ))}

          {/* Floating Per-Tile Score Popups */}
          {tilePopups.map((tp) => (
            <div
              key={tp.id}
              className="tm-crush-tile-popup"
              style={{
                top: `${(tp.r + 0.5) * 12.5}%`,
                left: `${(tp.c + 0.5) * 12.5}%`,
                color: tp.color
              }}
            >
              {tp.text}
            </div>
          ))}

          {/* Flying Candy Emoji Shards & Sugar Drops */}
          {candyParticles.map((sh) => (
            <div
              key={sh.id}
              className="tm-crush-candy-shard"
              style={{
                top: `${(sh.r + 0.5) * 12.5}%`,
                left: `${(sh.c + 0.5) * 12.5}%`,
                '--dx': `${sh.dx}px`,
                '--dy': `${sh.dy}px`
              }}
            >
              {sh.emoji}
            </div>
          ))}

          {/* 8x8 Glossy 3D Jelly Candy Grid */}
          <div
            className="tm-crush-grid"
            role="grid"
            aria-label="8 by 8 Meme Candy Puzzle Grid"
          >
            {board.map((row, rIdx) =>
              row.map((tile, cIdx) => {
                const candy = CANDY_TYPES[tile?.type || 0] || CANDY_TYPES[0];
                const cellKey = `${rIdx},${cIdx}`;
                const isSelected =
                  selectedCell && selectedCell[0] === rIdx && selectedCell[1] === cIdx;
                const isHint = hintCells.includes(cellKey);
                const isPopping = poppingKeys.has(cellKey);
                const isInvalidSwap = invalidSwapPair?.includes(cellKey);
                const jellyLayer = jellyGrid[rIdx]?.[cIdx] || 0;
                const dropRows = tile?.dropDist || 0;

                return (
                  <button
                    key={tile?.uid || `${rIdx}-${cIdx}`}
                    type="button"
                    className={`tm-crush-tile ${candy.shapeClass || ''} ${
                      isSelected ? 'selected' : ''
                    } ${isHint ? 'hint' : ''} ${isPopping ? 'popping' : ''} ${
                      isInvalidSwap ? 'invalid-swap' : ''
                    } ${dropRows > 0 ? 'dropping' : ''} ${
                      jellyLayer === 2
                        ? 'has-double-jelly'
                        : jellyLayer === 1
                        ? 'has-crystal-jelly'
                        : ''
                    } ${tile?.special ? `special-${tile.special}` : ''}`}
                    style={{
                      '--candy-bg': candy.bg,
                      '--candy-border': candy.border,
                      '--candy-shadow': candy.shadow,
                      '--candy-glow': candy.glow,
                      '--drop-rows': dropRows
                    }}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    onPointerDown={(e) => handlePointerDown(rIdx, cIdx, e)}
                    onPointerUp={(e) => handlePointerUp(rIdx, cIdx, e)}
                    aria-label={`${candy.name}${jellyLayer > 0 ? ' on Crystal Jelly' : ''} at row ${
                      rIdx + 1
                    } column ${cIdx + 1}`}
                  >
                    {/* 3D Specular Glossy Jelly Highlight */}
                    <span className="tm-crush-candy-shine" aria-hidden="true" />

                    {/* Frosted Crystal Jelly Indicator */}
                    {jellyLayer > 0 && (
                      <span className="tm-crush-jelly-frost" aria-hidden="true">
                        {jellyLayer === 2 ? '❄️' : '🧊'}
                      </span>
                    )}

                    {/* Main Candy Icon */}
                    <span className="tm-crush-emoji">
                      {tile?.special === 'color-bomb'
                        ? '🌈'
                        : tile?.special === 'seeking-rocket'
                        ? '🚀'
                        : candy.emoji}
                    </span>

                    {/* Special Candy Overlays */}
                    {tile?.special === 'striped-h' && (
                      <span className="tm-crush-special-badge">↔⚡</span>
                    )}
                    {tile?.special === 'striped-v' && (
                      <span className="tm-crush-special-badge">↕⚡</span>
                    )}
                    {tile?.special === 'packet-bomb' && (
                      <span className="tm-crush-special-badge">💥3×3</span>
                    )}
                    {tile?.special === 'seeking-rocket' && (
                      <span className="tm-crush-special-badge">🚀SEEK</span>
                    )}
                    {tile?.special === 'color-bomb' && (
                      <span className="tm-crush-special-badge">🌟BOMB</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Round Over Summary & Star Chest Overlay */}
          {roundFinished && roundSummary && (
            <div className="tm-subgame-gameover-overlay">
              <div className="tm-subgame-gameover-card">
                <div style={{ fontSize: '42px', letterSpacing: '4px' }}>
                  {roundSummary.stars > 0 ? '⭐'.repeat(roundSummary.stars) : '🍬🕹️'}
                </div>
                <h3 style={{ margin: '6px 0', fontSize: '22px', color: '#facc15' }}>
                  {roundSummary.clearedTarget
                    ? `🏆 LEVEL ${level} CRUSHED! (${roundSummary.stars}/3 STARS)`
                    : 'OUT OF MOVES — GREAT CRUSHING!'}
                </h3>
                <div className="tm-subgame-reward-summary" style={{ marginBottom: '14px' }}>
                  <div>
                    Final Score: <strong>{roundSummary.score.toLocaleString()} pts</strong>
                    {roundSummary.moveConversionPts > 0 && (
                      <span style={{ color: '#facc15', fontSize: '11px', marginLeft: '6px' }}>
                        (Includes +{roundSummary.moveConversionPts.toLocaleString()} Finale Bonus!)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '15px', marginTop: '4px' }}>
                    🎁 Chest Payout:{' '}
                    <strong style={{ color: '#4ade80' }}>
                      +{roundSummary.tokensWon} 🪙 Arcade Tokens
                    </strong>{' '}
                    &amp;{' '}
                    <strong style={{ color: '#00f3ff' }}>+{roundSummary.xpEarned} XP</strong>!
                  </div>
                  {roundSummary.capNote && (
                    <span style={{ fontSize: '11px', color: '#facc15', marginTop: '4px' }}>
                      {roundSummary.capNote}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}
                >
                  {effectivePlaysLeft > 0 ? (
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      onClick={() => handleStartNewRound(false)}
                    >
                      🍬 Play Again ({effectivePlaysLeft} Free Left)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      disabled={tokens < ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST}
                      onClick={() => handleStartNewRound(true)}
                    >
                      🪙 Spend {ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST} Tokens to Play
                      Now (or wait {formatWindowCountdown(effectiveResetMs)})
                    </button>
                  )}

                  <button type="button" className="tm-btn" onClick={handleShareChallenge}>
                    {copiedChallenge ? '✅ Link Copied!' : '🔗 Share Score'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Special Combos Legend */}
        <div className="tm-crush-legend">
          <span>🚀 <strong>2×2 Square:</strong> Seeking Jelly Rocket</span>
          <span>⚡ <strong>Match 4:</strong> Row/Col Laser</span>
          <span>💥 <strong>L/T Match:</strong> 3×3 Packet Bomb</span>
          <span>🌈 <strong>Match 5:</strong> Supernova Color Bomb</span>
          <span>🧊 <strong>Crystal Jelly:</strong> +120 pts (+1,500 Clear Bonus!)</span>
        </div>
      </div>
    </section>
  );
}
