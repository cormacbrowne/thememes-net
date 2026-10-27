import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { formatWindowCountdown } from '../data/starterMemes';

const GRID_SIZE = 8;

const CANDY_TYPES = [
  { id: 0, emoji: '🐸', name: 'Pepe Lime', bg: 'rgba(34, 197, 94, 0.24)', border: '#4ade80' },
  { id: 1, emoji: '🔥', name: 'Fire Drop', bg: 'rgba(249, 115, 22, 0.26)', border: '#fb923c' },
  { id: 2, emoji: '💎', name: 'Cyber Gem', bg: 'rgba(0, 243, 255, 0.22)', border: '#00f3ff' },
  { id: 3, emoji: '🦆', name: 'Quack Gold', bg: 'rgba(250, 204, 21, 0.25)', border: '#facc15' },
  { id: 4, emoji: '💀', name: 'Skull Fizz', bg: 'rgba(168, 85, 247, 0.26)', border: '#c084fc' },
  { id: 5, emoji: '🍕', name: 'Pizza Pop', bg: 'rgba(236, 72, 153, 0.25)', border: '#f472b6' }
];

const CASCADE_CALLOUTS = [
  'SWEET! 🍬',
  'TASTY! 🔥',
  'JUICY COMBO! ⚡',
  'DIVINE CRUSH! 🌟',
  'SUPERNOVA CASCADE!! 🌈👑'
];

let tileUidCounter = 1;

function makeTile(typeId, special = null) {
  return {
    uid: `c-${tileUidCounter++}`,
    type: typeId ?? Math.floor(Math.random() * CANDY_TYPES.length),
    special // null | 'striped-h' | 'striped-v' | 'color-bomb'
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
    const copy = board.map((row) => [...row]);
    const tmp = copy[r1][c1];
    copy[r1][c1] = copy[r2][c2];
    copy[r2][c2] = tmp;
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
  const [movesLeft, setMovesLeft] = useState(18);
  const [selectedCell, setSelectedCell] = useState(null);
  const [hintCells, setHintCells] = useState([]);
  const [poppingKeys, setPoppingKeys] = useState(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [calloutText, setCalloutText] = useState('');
  const [hammerMode, setHammerMode] = useState(false);
  const [hammersLeft, setHammersLeft] = useState(1);
  const [shufflesLeft, setShufflesLeft] = useState(1);
  const [roundFinished, setRoundFinished] = useState(false);
  const [roundSummary, setRoundSummary] = useState(null);
  const [copiedChallenge, setCopiedChallenge] = useState(false);

  const dragStartRef = useRef(null);
  const roundRewardedRef = useRef(false);
  const cascadeRunnerRef = useRef(null);
  const movesLeftRef = useRef(18);
  const scoreRef = useRef(0);

  const targetScore = level === 1 ? 1200 : level === 2 ? 2600 : 2600 + (level - 2) * 1600;

  useEffect(() => {
    movesLeftRef.current = movesLeft;
    scoreRef.current = score;
  }, [movesLeft, score]);

  useEffect(() => {
    if (score > storedHighScore) {
      localStorage.setItem('tm_crush_highscore', String(score));
    }
  }, [score, storedHighScore]);

  const showFloatingCallout = useCallback((text) => {
    setCalloutText(text);
    setTimeout(() => {
      setCalloutText((prev) => (prev === text ? '' : prev));
    }, 950);
  }, []);

  const finishRound = useCallback(
    (clearedTarget, finalScoreVal = score) => {
      if (roundRewardedRef.current) return;
      roundRewardedRef.current = true;
      setRoundFinished(true);
      if (finalScoreVal > storedHighScore) {
        setStoredHighScore(finalScoreVal);
      }

      // Logical, fair token calculation: 1 token per 120 score + 8 bonus for target clear, capped at 35
      const baseTokens = Math.floor(finalScoreVal / 120) + (clearedTarget ? 8 : 2);
      const requestedTokens = Math.min(
        ARCADE_ECONOMY_RULES.SUB_GAMES.MAX_TOKENS_PER_ROUND,
        Math.max(finalScoreVal >= 300 ? 3 : 0, baseTokens)
      );
      const xpEarned = Math.min(250, Math.max(25, Math.floor(finalScoreVal / 25)));

      let actualTokensWon = requestedTokens;
      let capNote = '';
      if (completeRoundHandler) {
        const res = completeRoundHandler({
          gameId: 'crush',
          score: finalScoreVal,
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

      if (clearedTarget) {
        sfx.playJackpot();
      } else {
        sfx.playBoing(2);
      }

      setRoundSummary({
        clearedTarget,
        score: finalScoreVal,
        tokensWon: actualTokensWon,
        xpEarned,
        capNote
      });
    },
    [score, storedHighScore, completeRoundHandler]
  );

  /**
   * Resolves all cascades on a board state until stable.
   */
  const resolveBoardCascades = useCallback(
    (workingBoard, cascadeStep = 1, swappedCoord = null) => {
      const groups = findMatchGroups(workingBoard);
      if (groups.length === 0) {
        setIsAnimating(false);
        if (movesLeftRef.current <= 0 && !roundRewardedRef.current) {
          finishRound(scoreRef.current >= targetScore, scoreRef.current);
        }
        return;
      }

      setIsAnimating(true);
      const toRemove = new Set();
      const specialsToSpawn = [];

      groups.forEach((g) => {
        g.coords.forEach(([r, c]) => toRemove.add(`${r},${c}`));
        if (g.length >= 5) {
          const spawnCoord =
            (swappedCoord &&
              g.coords.find(([r, c]) => r === swappedCoord[0] && c === swappedCoord[1])) ||
            g.coords[Math.floor(g.coords.length / 2)];
          specialsToSpawn.push({
            r: spawnCoord[0],
            c: spawnCoord[1],
            type: g.type,
            special: 'color-bomb'
          });
        } else if (g.length === 4) {
          const spawnCoord =
            (swappedCoord &&
              g.coords.find(([r, c]) => r === swappedCoord[0] && c === swappedCoord[1])) ||
            g.coords[1];
          specialsToSpawn.push({
            r: spawnCoord[0],
            c: spawnCoord[1],
            type: g.type,
            special: g.dir === 'h' ? 'striped-v' : 'striped-h'
          });
        }
      });

      // Trigger any existing striped/color-bomb tiles caught in the match
      let triggeredSpecial = false;
      Array.from(toRemove).forEach((key) => {
        const [r, c] = key.split(',').map(Number);
        const tile = workingBoard[r]?.[c];
        if (!tile?.special) return;
        triggeredSpecial = true;
        if (tile.special === 'striped-h') {
          for (let col = 0; col < GRID_SIZE; col++) toRemove.add(`${r},${col}`);
        } else if (tile.special === 'striped-v') {
          for (let row = 0; row < GRID_SIZE; row++) toRemove.add(`${row},${c}`);
        } else if (tile.special === 'color-bomb') {
          for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
              if (workingBoard[row][col]?.type === tile.type) {
                toRemove.add(`${row},${col}`);
              }
            }
          }
        }
      });

      const clearedCount = toRemove.size;
      const pointsEarned = clearedCount * 35 * cascadeStep;
      setScore((prev) => prev + pointsEarned);

      if (triggeredSpecial || specialsToSpawn.length > 0) {
        sfx.playSpecialBomb();
      } else {
        sfx.playCandyMatch(cascadeStep);
      }

      if (cascadeStep >= 2 || clearedCount >= 5) {
        const word =
          CASCADE_CALLOUTS[Math.min(CASCADE_CALLOUTS.length - 1, cascadeStep - 1)];
        showFloatingCallout(`${word} +${pointsEarned}`);
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

        setPoppingKeys(new Set());
        setBoard(nextBoard);

        setTimeout(() => {
          if (cascadeRunnerRef.current) {
            cascadeRunnerRef.current(nextBoard, cascadeStep + 1, null);
          }
        }, 190);
      }, 220);
    },
    [showFloatingCallout, finishRound, targetScore]
  );

  useEffect(() => {
    cascadeRunnerRef.current = resolveBoardCascades;
  }, [resolveBoardCascades]);

  const handleAdvanceNextLevel = () => {
    sfx.playLevelUp();
    setLevel((lv) => lv + 1);
    setMovesLeft((m) => Math.min(22, m + 10));
    setHammersLeft(1);
    setShufflesLeft(1);
    showFloatingCallout(`🚀 LEVEL ${level + 1} UNLOCKED! +10 MOVES!`);
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
    setMovesLeft(18);
    setHammersLeft(1);
    setShufflesLeft(1);
    setSelectedCell(null);
    setHintCells([]);
    setBoard(createInitialBoard());
  };

  const attemptSwap = (r1, c1, r2, c2) => {
    if (isAnimating || roundFinished || movesLeft <= 0) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    setHintCells([]);
    setSelectedCell(null);

    const tileA = board[r1][c1];
    const tileB = board[r2][c2];
    if (!tileA || !tileB) return;

    // Special case: swapping a Color Bomb with any adjacent candy blasts all candies of that type!
    if (tileA.special === 'color-bomb' || tileB.special === 'color-bomb') {
      const targetType = tileA.special === 'color-bomb' ? tileB.type : tileA.type;
      const toBlast = new Set([`${r1},${c1}`, `${r2},${c2}`]);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (board[r][c]?.type === targetType) {
            toBlast.add(`${r},${c}`);
          }
        }
      }
      setMovesLeft((m) => Math.max(0, m - 1));
      setIsAnimating(true);
      sfx.playSpecialBomb();
      const bonus = toBlast.size * 60;
      setScore((s) => s + bonus);
      showFloatingCallout(`🌈 SUPERNOVA COLOR BLAST! +${bonus}`);
      setPoppingKeys(toBlast);

      setTimeout(() => {
        const nextBoard = board.map((row) => [...row]);
        toBlast.forEach((key) => {
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
        setTimeout(() => resolveBoardCascades(nextBoard, 2, null), 180);
      }, 240);
      return;
    }

    const swapped = board.map((row) => [...row]);
    swapped[r1][c1] = tileB;
    swapped[r2][c2] = tileA;

    const matches = findMatchGroups(swapped);
    if (matches.length === 0) {
      // Invalid swap — play goofy honk without deducting a move
      sfx.playClownHonk();
      showFloatingCallout('🤡 No Match! Try another swap!');
      return;
    }

    setMovesLeft((m) => Math.max(0, m - 1));
    setBoard(swapped);
    resolveBoardCascades(swapped, 1, [r2, c2]);
  };

  const handleCellClick = (r, c) => {
    if (isAnimating || roundFinished || movesLeft <= 0) return;

    // Hammer Booster Mode: smash any single tile + its 4 neighbors!
    if (hammerMode && hammersLeft > 0) {
      setHammerMode(false);
      setHammersLeft((h) => h - 1);
      setIsAnimating(true);
      sfx.playMetalPipe();
      const toSmash = new Set([`${r},${c}`]);
      [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1]
      ].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          toSmash.add(`${nr},${nc}`);
        }
      });
      setPoppingKeys(toSmash);
      setScore((s) => s + 180);
      showFloatingCallout('🔨 MEME HAMMER SMASH! +180');

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
    showFloatingCallout('🔀 BOARD SHUFFLED!');
    setHintCells([]);
    setSelectedCell(null);
    setBoard(createInitialBoard());
  };

  const handleShareChallenge = () => {
    const shareUrl = `${window.location.origin}/?mode=crush`;
    const shareText = `🍬 I just scored ${score} pts (Level ${level}) in MEME CRUSH SAGA on THE MEMES.net! Can you beat my score?`;
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

  return (
    <section className="tm-subgame-wrap" aria-label="Meme Crush Saga Puzzle Game">
      <div className="tm-subgame-card tm-crush-cabinet">
        {/* Top Header */}
        <div className="tm-subgame-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onBackToFeed}>
              ← Back to Memes
            </button>
            <div>
              <h2 className="tm-subgame-title">
                🍬 MEME CRUSH SAGA <span className="tm-subgame-badge">LEVEL {level}</span>
              </h2>
              <div className="tm-subgame-subtitle">
                Swap 3+ Meme Candies! Match 4 for ⚡ Row/Col Laser • Match 5 for 🌈 Supernova Bomb!
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tm-spin-counter-pill" style={{ borderColor: '#facc15', color: '#facc15' }}>
              🪙 {effectiveGameTokensLeft} Game Tokens Left Today
            </span>
            <button type="button" className="tm-btn" onClick={handleShareChallenge}>
              {copiedChallenge ? '✅ Challenge Link Copied!' : '🔗 Challenge Friends'}
            </button>
          </div>
        </div>

        {/* Score, Moves & Level Progress HUD */}
        <div className="tm-crush-hud-grid">
          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">SCORE / TARGET</span>
            <strong className="tm-crush-stat-val" style={{ color: '#00f3ff' }}>
              {score.toLocaleString()} <small>/ {targetScore.toLocaleString()}</small>
            </strong>
            <div className="tm-xp-track" style={{ marginTop: '6px' }}>
              <div className="tm-xp-bar" style={{ width: `${progressPct}%` }} />
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
              {score >= targetScore ? '🎉 Target Reached!' : `${targetScore - score} pts to clear`}
            </span>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">BEST SCORE &amp; PLAYS</span>
            <strong className="tm-crush-stat-val" style={{ color: '#f472b6' }}>
              🏆 {highScore.toLocaleString()}
            </strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {effectivePlaysLeft > 0
                ? `🎟️ ${effectivePlaysLeft}/${ARCADE_ECONOMY_RULES.SUB_GAMES.CRUSH_PLAYS_PER_WINDOW} Free Plays in Window`
                : `⏳ Refills in ${formatWindowCountdown(effectiveResetMs)}`}
            </span>
          </div>
        </div>

        {/* Level Cleared Early Advance Banner */}
        {score >= targetScore && !roundFinished && movesLeft > 0 && (
          <div className="tm-crush-levelup-strip">
            <span>
              🎉 <strong>LEVEL {level} TARGET CRUSHED!</strong> Keep playing with your remaining{' '}
              {movesLeft} moves or advance now for +10 Bonus Moves!
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={handleAdvanceNextLevel}
              >
                🚀 Next Level (+10 Moves)
              </button>
              <button
                type="button"
                className="tm-btn"
                onClick={() => finishRound(true)}
              >
                🪙 Bank Score &amp; Collect Tokens
              </button>
            </div>
          </div>
        )}

        {/* Power Boosters Bar */}
        <div className="tm-crush-boosters-bar">
          <button
            type="button"
            className="tm-btn"
            onClick={handleShowHint}
            disabled={isAnimating || roundFinished}
          >
            💡 Hint (Free)
          </button>

          <button
            type="button"
            className={`tm-btn ${hammerMode ? 'tm-btn-primary' : ''}`}
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
            className="tm-btn"
            disabled={shufflesLeft <= 0 || isAnimating || roundFinished}
            onClick={() => handleShuffleBoard(false)}
          >
            🔀 Shuffle ({shufflesLeft})
          </button>

          <button
            type="button"
            className="tm-btn"
            onClick={() => finishRound(score >= targetScore)}
            disabled={roundFinished || score === 0}
            title="End current game and claim earned tokens"
          >
            🏁 Cash Out Score
          </button>
        </div>

        {/* Floating Combo Callout Toast */}
        <div className="tm-crush-board-stage">
          {calloutText && <div className="tm-crush-callout-banner">{calloutText}</div>}

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
                      <span className="tm-crush-special-tag">↔⚡</span>
                    )}
                    {tile?.special === 'striped-v' && (
                      <span className="tm-crush-special-tag">↕⚡</span>
                    )}
                    {tile?.special === 'color-bomb' && (
                      <span className="tm-crush-special-tag">BOMB</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Round Over Summary Overlay */}
          {roundFinished && roundSummary && (
            <div className="tm-subgame-gameover-overlay">
              <div className="tm-subgame-gameover-card">
                <div style={{ fontSize: '46px' }}>
                  {roundSummary.clearedTarget ? '🏆🍬🎉' : '🍬🕹️'}
                </div>
                <h3 style={{ margin: '6px 0', fontSize: '22px', color: '#facc15' }}>
                  {roundSummary.clearedTarget
                    ? `LEVEL ${level} CRUSHED!`
                    : 'OUT OF MOVES — GOOD GAME!'}
                </h3>
                <p style={{ margin: '4px 0 12px', color: '#cbd5e1', fontSize: '14px' }}>
                  Final Score: <strong>{roundSummary.score.toLocaleString()} pts</strong> • Earned{' '}
                  <strong style={{ color: '#4ade80' }}>+{roundSummary.tokensWon} 🪙 Tokens</strong>{' '}
                  &amp; <strong style={{ color: '#00f3ff' }}>+{roundSummary.xpEarned} XP</strong>!
                  {roundSummary.capNote && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#facc15', marginTop: '4px' }}>
                      {roundSummary.capNote}
                    </span>
                  )}
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                      🪙 Spend {ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST} Tokens to Play Now (or wait{' '}
                      {formatWindowCountdown(effectiveResetMs)})
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
      </div>
    </section>
  );
}
