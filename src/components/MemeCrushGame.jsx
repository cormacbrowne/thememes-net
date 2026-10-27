import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { formatWindowCountdown } from '../data/starterMemes';

const GRID_SIZE = 8;

const CANDY_TYPES = [
  { id: 0, emoji: '🐸', name: 'Pepe Lime', bg: 'rgba(34, 197, 94, 0.26)', border: '#4ade80' },
  { id: 1, emoji: '🔥', name: 'Spicy Drop', bg: 'rgba(249, 115, 22, 0.28)', border: '#fb923c' },
  { id: 2, emoji: '💎', name: 'Cyber Gem', bg: 'rgba(0, 243, 255, 0.24)', border: '#00f3ff' },
  { id: 3, emoji: '🦆', name: 'Quack Gold', bg: 'rgba(250, 204, 21, 0.27)', border: '#facc15' },
  { id: 4, emoji: '💀', name: 'Skull Fizz', bg: 'rgba(168, 85, 247, 0.28)', border: '#c084fc' },
  { id: 5, emoji: '🍕', name: 'Pizza Pop', bg: 'rgba(236, 72, 153, 0.27)', border: '#f472b6' }
];

// Official Candy Crush Escalation — THE MEMES.net Edition!
const ANNOUNCER_TIERS = [
  { tier: 1, title: 'SWEET! 🍬', sub: 'CERTIFIED DANK MATCH!', color: '#4ade80' },
  { tier: 2, title: 'TASTY!! 🔥', sub: '2X CASCADE COMBO!', color: '#fb923c' },
  { tier: 3, title: 'DELICIOUS BRAINROT! 💀', sub: '3X DOPAMINE OVERLOAD!', color: '#c084fc' },
  { tier: 4, title: 'DIVINE GIGA-CRUSH!! 🗿', sub: '4X ULTRA COMBO!', color: '#00f3ff' },
  { tier: 5, title: 'UNHINGED SUPERNOVA!! 🌈👑', sub: 'EMOTIONAL DAMAGE!!', color: '#facc15' }
];

const FEVER_LOOT_PERKS = [
  { id: 'moves', label: '🎁 FEVER LOOT: +2 BONUS MOVES & +600 PTS!', emoji: '⏱️' },
  { id: 'hammer', label: '🎁 FEVER LOOT: +1 FREE MEME HAMMER & +600 PTS!', emoji: '🔨' },
  { id: 'ufo', label: '🎁 FEVER LOOT: +1 FREE UFO BOMB DROPPER & +600 PTS!', emoji: '🛸' },
  { id: 'colorbomb', label: '🎁 FEVER LOOT: SUPERNOVA COLOR BOMB BEAMED ONTO BOARD!', emoji: '🌈' }
];

let tileUidCounter = 1;

function makeTile(typeId, special = null) {
  return {
    uid: `c-${tileUidCounter++}`,
    type: typeId ?? Math.floor(Math.random() * CANDY_TYPES.length),
    special // null | 'striped-h' | 'striped-v' | 'packet-bomb' | 'color-bomb'
  };
}

/**
 * Generates an initial 8x8 board with zero pre-existing 3-in-a-row matches.
 */
function createInitialBoard() {
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
      board[r][c] = makeTile(candidate, null);
    }
  }
  return board;
}

/**
 * Finds all horizontal and vertical match groups of length >= 3.
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

  return groups;
}

/**
 * Finds the first valid swap [ [r1,c1], [r2,c2] ] on the board for the Hint button.
 */
function findFirstValidMove(board) {
  const cloneSwap = (r1, c1, r2, c2) => {
    const tA = board[r1]?.[c1];
    const tB = board[r2]?.[c2];
    if (!tA || !tB) return false;
    if (tA.special === 'color-bomb' || tB.special === 'color-bomb') return true;
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

  const [board, setBoard] = useState(() => createInitialBoard());
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [boardShake, setBoardShake] = useState(false);

  // Turbo-Charged Candy Crush Visual Overlays
  const [announceSplash, setAnnounceSplash] = useState(null);
  const [activeLasers, setActiveLasers] = useState([]);
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

  const targetScore = level === 1 ? 1500 : level === 2 ? 3400 : 3400 + (level - 2) * 2200;

  useEffect(() => {
    movesLeftRef.current = movesLeft;
    scoreRef.current = score;
    feverPctRef.current = feverPct;
    feverMovesRef.current = feverMovesLeft;
  }, [movesLeft, score, feverPct, feverMovesLeft]);

  useEffect(() => {
    if (score > storedHighScore) {
      localStorage.setItem('tm_crush_highscore', String(score));
    }
  }, [score, storedHighScore]);

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
    setTimeout(() => {
      setAnnounceSplash((prev) => (prev?.id === payload.id ? null : prev));
    }, 1150);
  }, []);

  const spawnGridEffects = useCallback((coordsList, points, customTag = null, lasers = []) => {
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
      }, 900);

      // Spawn flying candy emoji shards from matched cells
      const shards = coordsList.slice(0, 10).map(([r, c], idx) => ({
        id: `sh-${now}-${idx}-${Math.random()}`,
        r,
        c,
        dx: Math.round((Math.random() - 0.5) * 90),
        dy: Math.round(-35 - Math.random() * 55),
        emoji: ['🍬', '✨', '🔥', '💎', '⚡', '🪙'][idx % 6]
      }));
      setCandyParticles((prev) => [...prev.slice(-18), ...shards]);
      setTimeout(() => {
        setCandyParticles((prev) => prev.filter((s) => !shards.some((sh) => sh.id === s.id)));
      }, 700);
    }

    if (lasers.length > 0) {
      const laserItems = lasers.map((l, idx) => ({
        ...l,
        id: `lz-${now}-${idx}-${Math.random()}`
      }));
      setActiveLasers((prev) => [...prev, ...laserItems]);
      setTimeout(() => {
        setActiveLasers((prev) => prev.filter((item) => !laserItems.some((l) => l.id === item.id)));
      }, 420);
    }
  }, []);

  const showLootToast = useCallback((msg) => {
    setLootToast(msg);
    setTimeout(() => {
      setLootToast((prev) => (prev === msg ? '' : prev));
    }, 3200);
  }, []);

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
   * Triggers the official Candy Crush style "MEME CRUSH FINALE" converting remaining moves into bombs/lasers!
   */
  const handleTriggerMemeCrushFinale = () => {
    if (roundFinished || isAnimating) return;
    const remMoves = movesLeft;
    setMovesLeft(0);
    sfx.playSpecialBomb();
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 550);

    // Fire cross-board finale lasers visually
    spawnGridEffects(
      [
        [2, 2],
        [3, 4],
        [5, 3],
        [4, 6]
      ],
      remMoves * 300,
      '🎆 MEME CRUSH FINALE!',
      [
        { dir: 'h', index: 2, color: '#facc15' },
        { dir: 'h', index: 5, color: '#ec4899' },
        { dir: 'v', index: 3, color: '#00f3ff' },
        { dir: 'v', index: 6, color: '#4ade80' }
      ]
    );
    triggerAnnounceSplash(
      5,
      '🎆 MEME CRUSH FINALE!!',
      `+${(remMoves * 300).toLocaleString()} MOVE BONUS!`
    );

    setTimeout(() => {
      finishRound(true, scoreRef.current, remMoves);
    }, 620);
  };

  /**
   * Resolves all cascades on a board state until stable, spawning Striped Lasers,
   * L/T-Shape 3x3 Packet Bombs, 5-in-a-row Supernova Color Bombs, and charging Meme Fever!
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
          cellGroupCount.set(k, (cellGroupCount.get(k) || 0) + 1);
        });
      });

      groups.forEach((g) => {
        // Check if any cell in this group is an L/T intersection
        const intersectCoord = g.coords.find(([r, c]) => (cellGroupCount.get(`${r},${c}`) || 0) >= 2);

        if (g.length >= 5) {
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
        } else if (tile.special === 'color-bomb') {
          for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
              if (workingBoard[row][col]?.type === tile.type) {
                const k = `${row},${col}`;
                if (!toRemove.has(k)) {
                  toRemove.add(k);
                  queue.push(k);
                }
              }
            }
          }
        }
      }

      const clearedCount = toRemove.size;
      const feverMultiplier = feverMovesRef.current > 0 ? 2 : 1;
      const pointsEarned = clearedCount * 45 * cascadeStep * feverMultiplier;
      setScore((prev) => prev + pointsEarned);

      // Charge Meme Fever Meter
      const nextFever = Math.min(100, feverPctRef.current + clearedCount * 4 + cascadeStep * 6);
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

      const allCoords = Array.from(toRemove).map((k) => k.split(',').map(Number));
      spawnGridEffects(
        allCoords,
        pointsEarned,
        triggeredSpecial ? '💥 MEGA BLAST!' : cascadeStep >= 2 ? `🔥 ${cascadeStep}x` : null,
        lasersToFire
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
          nextBoard[sp.r][sp.c] = makeTile(sp.type, sp.special);
        });

        // Apply downward gravity column by column
        for (let c = 0; c < GRID_SIZE; c++) {
          const surviving = [];
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            if (nextBoard[r][c] !== null) {
              surviving.push(nextBoard[r][c]);
            }
          }
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            const item = surviving[GRID_SIZE - 1 - r];
            nextBoard[r][c] = item || makeTile(null, null);
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
              perk.id === 'colorbomb' ? 'color-bomb' : 'packet-bomb'
            );
          }
          if (nextBoard[r2][c2]) {
            nextBoard[r2][c2] = makeTile(nextBoard[r2][c2].type, 'striped-h');
          }
          showLootToast(`🔥 MEME FEVER ERUPTION (2X SCORE)! ${perk.label}`);
        }

        setPoppingKeys(new Set());
        setBoard(nextBoard);

        setTimeout(() => {
          if (cascadeRunnerRef.current) {
            cascadeRunnerRef.current(nextBoard, cascadeStep + 1, null);
          }
        }, 190);
      }, 230);
    },
    [spawnGridEffects, triggerAnnounceSplash, showLootToast, finishRound, targetScore]
  );

  useEffect(() => {
    cascadeRunnerRef.current = resolveBoardCascades;
  }, [resolveBoardCascades]);

  const handleAdvanceNextLevel = () => {
    sfx.playLevelUp();
    setLevel((lv) => lv + 1);
    setMovesLeft((m) => Math.min(25, m + 12));
    setHammersLeft((h) => h + 1);
    setUfoDropsLeft((u) => u + 1);
    setShufflesLeft((s) => s + 1);
    triggerAnnounceSplash(4, `🚀 LEVEL ${level + 1} UNLOCKED!`, '+12 MOVES & +1 HAMMER + UFO!');
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
    setScore(0);
    setMovesLeft(20);
    setFeverPct(0);
    setFeverMovesLeft(0);
    setHammersLeft(2);
    setUfoDropsLeft(1);
    setShufflesLeft(2);
    setSelectedCell(null);
    setHintCells([]);
    setBoard(createInitialBoard());
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

      const feverMult = feverMovesLeft > 0 ? 2 : 1;
      const totalPts = bonusPts * feverMult;
      setScore((s) => s + totalPts);

      const coords = Array.from(toBlastSet).map((k) => k.split(',').map(Number));
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
            if (nextBoard[r][c] !== null) surviving.push(nextBoard[r][c]);
          }
          for (let r = GRID_SIZE - 1; r >= 0; r--) {
            nextBoard[r][c] = surviving[GRID_SIZE - 1 - r] || makeTile(null, null);
          }
        }
        setPoppingKeys(new Set());
        setBoard(nextBoard);
        setTimeout(() => resolveBoardCascades(nextBoard, 2, null), 190);
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

    // 2. 🌈 COLOR BOMB + ANY CANDY (OR STRIPED / PACKET BOMB)
    if (tileA.special === 'color-bomb' || tileB.special === 'color-bomb') {
      const otherTile = tileA.special === 'color-bomb' ? tileB : tileA;
      const targetType = otherTile.type;
      const toBlast = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      const lasers = [];

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (board[r][c]?.type === targetType) {
            toBlast.add(`${r},${c}`);
            if (otherTile.special === 'striped-h' || otherTile.special === 'striped-v') {
              // Color Bomb + Striped = Every matching candy fires a Row or Column Laser!
              if ((r + c) % 2 === 0) {
                lasers.push({ dir: 'h', index: r, color: '#00f3ff' });
                for (let k = 0; k < GRID_SIZE; k++) toBlast.add(`${r},${k}`);
              } else {
                lasers.push({ dir: 'v', index: c, color: '#ec4899' });
                for (let k = 0; k < GRID_SIZE; k++) toBlast.add(`${k},${c}`);
              }
            } else if (otherTile.special === 'packet-bomb') {
              // Color Bomb + Packet Bomb = Every matching candy detonates a 3x3 crater!
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

      executeCustomBlast(
        toBlast,
        toBlast.size * 75,
        otherTile.special ? '🌈⚡ HYPER COMBO STORM!!' : '🌈 SUPERNOVA COLOR BLAST!',
        `${toBlast.size} CANDIES VAPORIZED!`,
        lasers
      );
      return;
    }

    // 3. ⚡/💥 TWO SPECIAL CANDIES SWAPPED TOGETHER (Striped+Striped, Striped+Packet, Packet+Packet)
    if (tileA.special && tileB.special) {
      const toBlast = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      const lasers = [];
      const hasPacket = tileA.special === 'packet-bomb' || tileB.special === 'packet-bomb';
      const hasStriped =
        tileA.special?.startsWith('striped') || tileB.special?.startsWith('striped');

      if (hasPacket && hasStriped) {
        // Giant 3-Row x 3-Column Mega Laser Sweep!
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
        // 5x5 Giga Crater!
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r2 + dr;
            const nc = c2 + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              toBlast.add(`${nr},${nc}`);
            }
          }
        }
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

    // 4. Standard Swap Check
    const swapped = board.map((row) => [...row]);
    swapped[r1][c1] = tileB;
    swapped[r2][c2] = tileA;

    const matches = findMatchGroups(swapped);
    if (matches.length === 0) {
      sfx.playClownHonk();
      showLootToast('🤡 No Match! Try another swap or tap 💡 Hint!');
      return;
    }

    consumeMove();
    setBoard(swapped);
    resolveBoardCascades(swapped, 1, [r2, c2]);
  };

  const handleCellClick = (r, c) => {
    if (isAnimating || roundFinished || movesLeft <= 0) return;

    // 🔨 Meme Hammer Booster Mode: smash a 3x3 cross & trigger any specials hit!
    if (hammerMode && hammersLeft > 0) {
      setHammerMode(false);
      setHammersLeft((h) => h - 1);
      setIsAnimating(true);
      setBoardShake(true);
      setTimeout(() => setBoardShake(false), 380);
      sfx.playMetalPipe();
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
      setPoppingKeys(toSmash);
      setScore((s) => s + 350);
      spawnGridEffects([[r, c]], 350, '🔨 HAMMER SMASH!');
      triggerAnnounceSplash(3, '🔨 MEME HAMMER SMASH!', '+350 BONUS PTS!');

      setTimeout(() => {
        const nextBoard = board.map((row) => [...row]);
        toSmash.forEach((key) => {
          const [sr, sc] = key.split(',').map(Number);
          nextBoard[sr][sc] = null;
        });
        for (let col = 0; col < GRID_SIZE; col++) {
          const surviving = [];
          for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (nextBoard[row][col] !== null) surviving.push(nextBoard[row][col]);
          }
          for (let row = GRID_SIZE - 1; row >= 0; row--) {
            nextBoard[row][col] = surviving[GRID_SIZE - 1 - row] || makeTile(null, null);
          }
        }
        setPoppingKeys(new Set());
        setBoard(nextBoard);
        setTimeout(() => resolveBoardCascades(nextBoard, 1, null), 180);
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

    nextBoard[r1][c1] = makeTile(nextBoard[r1][c1]?.type ?? 0, 'color-bomb');
    nextBoard[r2][c2] = makeTile(nextBoard[r2][c2]?.type ?? 1, 'packet-bomb');
    setBoard(nextBoard);
    setScore((s) => s + 400);
    triggerAnnounceSplash(4, '🛸 UFO BOMB DROP!!', '🌈 COLOR BOMB + 💥 PACKET BOMB BEAMED IN!');
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

    if (dist >= 24) {
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
    triggerAnnounceSplash(2, '🔀 BOARD SHUFFLED!', 'FRESH MEME CANDIES DROPPED!');
    setHintCells([]);
    setSelectedCell(null);
    setBoard(createInitialBoard());
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

  const progressPct = Math.min(100, Math.round((score / targetScore) * 100));
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
                  LEVEL {level} {feverMovesLeft > 0 ? '• 🔥 2X FEVER!' : ''}
                </span>
              </h2>
              <div className="tm-subgame-subtitle">
                Match 4 = ⚡ Row/Col Laser • L/T Match = 💥 3×3 Packet Bomb • Match 5 = 🌈 Supernova
                Bomb! Swap 2 Specials for Mega Wipe!
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

        {/* Score, Moves, Fever Meter & Star Trophy HUD */}
        <div className="tm-crush-hud-grid">
          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">
              SCORE / TARGET ({'⭐'.repeat(currentStars) || '☆'})
            </span>
            <strong className="tm-crush-stat-val" style={{ color: '#00f3ff' }}>
              {score.toLocaleString()} <small>/ {targetScore.toLocaleString()}</small>
            </strong>
            <div className="tm-xp-track" style={{ marginTop: '6px' }}>
              <div className="tm-xp-bar" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">🔥 MEME FEVER METER</span>
            <strong
              className="tm-crush-stat-val"
              style={{ color: feverMovesLeft > 0 ? '#ec4899' : '#facc15' }}
            >
              {feverMovesLeft > 0 ? `🔥 2X FRENZY (${feverMovesLeft} Moves)` : `${feverPct}%`}
            </strong>
            <div className="tm-xp-track" style={{ marginTop: '6px' }}>
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

        {/* Level Cleared Early Advance & Official "Meme Crush Finale" Strip */}
        {score >= targetScore && !roundFinished && movesLeft > 0 && (
          <div className="tm-crush-levelup-strip">
            <span>
              🎉 <strong>LEVEL {level} TARGET CRUSHED!</strong> Advance for +12 Moves or trigger the{' '}
              <strong>🎆 MEME CRUSH FINALE</strong> (+{(movesLeft * 300).toLocaleString()} Move Bonus
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
                🎆 Trigger Meme Crush Finale &amp; Claim Tokens!
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
            🔨 Meme Hammer ({hammersLeft}) {hammerMode ? '— Tap any tile!' : ''}
          </button>

          <button
            type="button"
            className="tm-crush-booster-btn"
            disabled={ufoDropsLeft <= 0 || isAnimating || roundFinished}
            onClick={handleDeployUfoDrop}
            title="Beam a Supernova Color Bomb + 3x3 Packet Bomb directly onto the board!"
          >
            🛸 UFO Bomb Drop ({ufoDropsLeft})
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

        {/* 8x8 Candy Board Stage + Laser Beams + 3D Announcer Splash */}
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

          {/* Flying Candy Emoji Shards */}
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

          {/* 8x8 Candy Grid */}
          <div
            className="tm-crush-grid"
            role="grid"
            aria-label="8 by 8 Meme Candy Puzzle Grid"
          >
            {board.map((row, rIdx) =>
              row.map((tile, cIdx) => {
                const candy = CANDY_TYPES[tile?.type || 0] || CANDY_TYPES[0];
                const isSelected =
                  selectedCell && selectedCell[0] === rIdx && selectedCell[1] === cIdx;
                const isHint = hintCells.includes(`${rIdx},${cIdx}`);
                const isPopping = poppingKeys.has(`${rIdx},${cIdx}`);

                return (
                  <button
                    key={tile?.uid || `${rIdx}-${cIdx}`}
                    type="button"
                    className={`tm-crush-tile ${isSelected ? 'selected' : ''} ${
                      isHint ? 'hint' : ''
                    } ${isPopping ? 'popping' : ''} ${
                      tile?.special ? `special-${tile.special}` : ''
                    }`}
                    style={{
                      '--candy-bg': candy.bg,
                      '--candy-border': candy.border
                    }}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    onPointerDown={(e) => handlePointerDown(rIdx, cIdx, e)}
                    onPointerUp={(e) => handlePointerUp(rIdx, cIdx, e)}
                    aria-label={`${candy.name} at row ${rIdx + 1} column ${cIdx + 1}`}
                  >
                    <span className="tm-crush-emoji">
                      {tile?.special === 'color-bomb' ? '🌈' : candy.emoji}
                    </span>
                    {tile?.special === 'striped-h' && (
                      <span className="tm-crush-special-badge">↔⚡</span>
                    )}
                    {tile?.special === 'striped-v' && (
                      <span className="tm-crush-special-badge">↕⚡</span>
                    )}
                    {tile?.special === 'packet-bomb' && (
                      <span className="tm-crush-special-badge">💥3×3</span>
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
          <span>⚡ <strong>Match 4:</strong> Row/Col Laser</span>
          <span>💥 <strong>L/T Match:</strong> 3×3 Packet Bomb</span>
          <span>🌈 <strong>Match 5:</strong> Supernova Color Bomb</span>
          <span>🌌 <strong>🌈 + 🌈 Swap:</strong> 64-Tile Board Wipe!</span>
          <span>🔥 <strong>100% Fever:</strong> 2x Score + Free Loot!</span>
        </div>
      </div>
    </section>
  );
}
