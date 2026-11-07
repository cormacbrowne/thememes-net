import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { checkDailyPerk, consumeDailyPerk } from '../utils/memeFeedBridge';

// ==========================================
// 80s HYPER-NEON CYBER-PINBALL — CENTER-STAGE WIDESCREEN ARCADE SHOWCASE
// 5 Distinct Synthwave Tables • Guaranteed One-Way Shooter Arch • 4x Substep Physics
// True Neon Bloom Tubes, Laser Bumper Zaps, Tapered Plasma Flippers & Free/Prize Modes
// ==========================================

const W = 440;
const H = 620;
const LANE_WALL_X = 388; // Divider between main playfield (20..388) and shooter lane (388..424)
const SHOOTER_X = 406;
const PLAY_CENTER_X = 204; // Center of main playfield (between x=20 and x=388)
const BALL_R = 9;
const GRAVITY = 0.20;
const MAX_SPEED = 20.5;

const PINBALL_TABLES = [
  {
    id: 1,
    short: "T1: Vegas '85",
    name: "Vegas Strip '85",
    badge: '🎰 NEON JACKPOT ROULETTE',
    accent: '#ff007f',
    secondary: '#00f3ff',
    tertiary: '#facc15',
    bgTop: '#19052e',
    bgBot: '#050312',
    lanesWord: ['L', 'U', 'C', 'K'],
    targetWord: ['M', 'E', 'M', 'E'],
    bumpers: [
      { x: 204, y: 168, r: 25, label: '777', color: '#ff0055', pts: 280 },
      { x: 134, y: 232, r: 22, label: '💎', color: '#00f3ff', pts: 220 },
      { x: 274, y: 232, r: 22, label: '🍒', color: '#ff007f', pts: 220 },
      { x: 204, y: 292, r: 21, label: '🔔', color: '#facc15', pts: 250 }
    ],
    sinkhole: { x: 204, y: 112, r: 16, label: 'JACKPOT' },
    boostPads: [{ x: 74, y: 340, w: 26, h: 68 }],
    portals: null,
    movingBumper: null,
    gravityWell: null,
    oscillateBumpers: false,
    spinners: [
      { x: 96, y: 315 },
      { x: 312, y: 315 }
    ]
  },
  {
    id: 2,
    short: 'T2: Outrun',
    name: 'Outrun Turbo Highway',
    badge: '🏎️ NITRO BOOSTERS & DELOREAN',
    accent: '#ff6b00',
    secondary: '#00f3ff',
    tertiary: '#ff0055',
    bgTop: '#280624',
    bgBot: '#070316',
    lanesWord: ['N', 'I', 'T', 'R'],
    targetWord: ['F', 'A', 'S', 'T'],
    bumpers: [
      { x: 142, y: 168, r: 22, label: '🔥', color: '#ff6b00', pts: 240 },
      { x: 266, y: 168, r: 22, label: '⚡', color: '#facc15', pts: 240 },
      { x: 204, y: 225, r: 25, label: '88', color: '#00f3ff', pts: 300 }
    ],
    sinkhole: null,
    boostPads: [
      { x: 76, y: 348, w: 28, h: 72 },
      { x: 304, y: 348, w: 28, h: 72 }
    ],
    portals: null,
    movingBumper: {
      y: 308,
      minX: 112,
      maxX: 296,
      speed: 2.1,
      r: 20,
      label: '🏎️',
      color: '#ff0055',
      pts: 360
    },
    gravityWell: null,
    oscillateBumpers: false,
    spinners: [{ x: 204, y: 112 }]
  },
  {
    id: 3,
    short: 'T3: Invaders',
    name: 'Invader Cyber-Grid',
    badge: '👾 MARCHING ALIENS & WARP GATE',
    accent: '#00ff88',
    secondary: '#c084fc',
    tertiary: '#00f3ff',
    bgTop: '#042222',
    bgBot: '#040614',
    lanesWord: ['Z', 'A', 'P', '!'],
    targetWord: ['W', 'A', 'R', 'P'],
    bumpers: [
      { x: 132, y: 168, r: 20, label: '👾', color: '#00ff88', pts: 230 },
      { x: 204, y: 154, r: 23, label: '🛸', color: '#c084fc', pts: 290 },
      { x: 276, y: 168, r: 20, label: '👾', color: '#00ff88', pts: 230 },
      { x: 164, y: 238, r: 20, label: '👽', color: '#00f3ff', pts: 240 },
      { x: 244, y: 238, r: 20, label: '👽', color: '#00f3ff', pts: 240 }
    ],
    sinkhole: null,
    boostPads: [],
    portals: {
      entry: { x: 82, y: 308, r: 17 },
      exit: { x: 326, y: 138, vx: -5.8, vy: 3.6 }
    },
    movingBumper: null,
    gravityWell: null,
    oscillateBumpers: true,
    spinners: [{ x: 310, y: 318 }]
  },
  {
    id: 4,
    short: 'T4: Miami',
    name: 'Miami Vice Lagoon',
    badge: '🦈 NEON SHARK PIT & DUAL SPINNERS',
    accent: '#00f3ff',
    secondary: '#ff00aa',
    tertiary: '#facc15',
    bgTop: '#052638',
    bgBot: '#120422',
    lanesWord: ['P', 'A', 'L', 'M'],
    targetWord: ['V', 'I', 'B', 'E'],
    bumpers: [
      { x: 204, y: 168, r: 23, label: '🦩', color: '#ff00aa', pts: 250 },
      { x: 146, y: 232, r: 21, label: '🌴', color: '#00f3ff', pts: 230 },
      { x: 262, y: 232, r: 21, label: '🍹', color: '#facc15', pts: 230 },
      { x: 204, y: 292, r: 21, label: '☀️', color: '#ff6b00', pts: 260 }
    ],
    sinkhole: { x: 96, y: 196, r: 17, label: 'SHARK' },
    boostPads: [{ x: 308, y: 336, w: 26, h: 68 }],
    portals: null,
    movingBumper: null,
    gravityWell: null,
    oscillateBumpers: false,
    spinners: [
      { x: 98, y: 332 },
      { x: 298, y: 268 }
    ]
  },
  {
    id: 5,
    short: 'T5: Reactor',
    name: 'Cosmic Reactor Boss',
    badge: '👑 GRAVITY CORE & PLASMA SHIELD',
    accent: '#facc15',
    secondary: '#ff0055',
    tertiary: '#00f3ff',
    bgTop: '#290710',
    bgBot: '#050310',
    lanesWord: ['C', 'O', 'R', 'E'],
    targetWord: ['B', 'O', 'S', 'S'],
    bumpers: [
      { x: 134, y: 158, r: 21, label: '⚛️', color: '#00f3ff', pts: 260 },
      { x: 204, y: 138, r: 24, label: '👑', color: '#facc15', pts: 380 },
      { x: 274, y: 158, r: 21, label: '⚛️', color: '#00f3ff', pts: 260 },
      { x: 118, y: 262, r: 19, label: '⚡', color: '#ff0055', pts: 250 },
      { x: 290, y: 262, r: 19, label: '⚡', color: '#ff0055', pts: 250 }
    ],
    sinkhole: { x: 204, y: 204, r: 15, label: 'REACTOR' },
    boostPads: [],
    portals: {
      entry: { x: 78, y: 356, r: 16 },
      exit: { x: 326, y: 122, vx: -5.4, vy: 2.8 }
    },
    movingBumper: {
      y: 244,
      minX: 144,
      maxX: 264,
      speed: 2.5,
      r: 17,
      label: '🛡️',
      color: '#ff0055',
      pts: 340
    },
    gravityWell: { x: 204, y: 336, r: 68, pull: 0.13 },
    oscillateBumpers: false,
    spinners: [{ x: 204, y: 392 }]
  }
];

function computePinballTokenPayout(finalScore, stakedTokens) {
  if (stakedTokens <= 0) return 0;
  let raw = 0;
  if (finalScore >= 40000) raw = 35;
  else if (finalScore >= 25000) raw = 24;
  else if (finalScore >= 15000) raw = 16;
  else if (finalScore >= 8000) raw = 10;
  return validateStakedGamePayout({
    stakedTokens,
    rawPayout: raw,
    maxMultiplier: 4
  });
}

// Fast distance from point P to line segment AB
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const distX = px - cx;
  const distY = py - cy;
  return {
    dist: Math.hypot(distX, distY),
    cx,
    cy,
    nx: distX,
    ny: distY,
    t
  };
}

function buildInitialEngineState(tbl) {
  return {
    table: tbl,
    score: 0,
    ballsLeft: 3,
    multiplier: 1,
    drainShield: true, // Start every game with Ball Save Shield lit so Free Mode feels awesome!
    ballSaveTicks: 720, // 12 seconds of automatic Ball Save on launch
    gameOver: false,
    tick: 0,
    leftDown: false,
    rightDown: false,
    leftAngle: 0.40, // Resting downward angle (radians)
    rightAngle: Math.PI - 0.40,
    leftAngVel: 0,
    rightAngVel: 0,
    lanesLit: [false, false, false, false],
    targetsLit: [false, false, false, false],
    bumperFlashes: new Array(tbl.bumpers.length).fill(0),
    leftSlingFlash: 0,
    rightSlingFlash: 0,
    laserBeams: [], // { x1, y1, x2, y2, color, life }
    neonWaves: [], // { x, y, r, maxR, color, life, maxLife }
    sparks: [], // { x, y, vx, vy, color, life }
    movingX: tbl.movingBumper ? (tbl.movingBumper.minX + tbl.movingBumper.maxX) / 2 : PLAY_CENTER_X,
    movingDir: 1,
    portalCooldown: 0,
    sinkCooldown: 0,
    floatTexts: [], // { x, y, text, color, life }
    skillGauge: 75,
    plungerPull: 0,
    comboCount: 0,
    comboTimer: 0,
    feverTicks: 0,
    missionProgress: 0,
    missionGoal: tbl.id === 5 ? 10 : 8,
    missionsCleared: 0,
    nudgeHeat: 0,
    tiltTicks: 0,
    shakeTicks: 0,
    mysteryText: '',
    mysteryTicks: 0,
    balls: [
      {
        id: 1,
        x: SHOOTER_X,
        y: 542,
        vx: 0,
        vy: 0,
        inShooter: true,
        trail: []
      }
    ]
  };
}

export default function VegasPinballGame({
  tokens = 0,
  onSpendTokens,
  onPayoutTokens,
  onRecordHighScore,
  onOpenUpload,
  onBackToFeed
}) {
  const entryCost = ARCADE_ECONOMY_RULES.ARCADE_STAKES.PINBALL_ENTRY_COST; // 10 tokens

  const [tableId, setTableId] = useState(1);
  const activeTable = PINBALL_TABLES.find((t) => t.id === tableId) || PINBALL_TABLES[0];

  const [stakedTokens, setStakedTokens] = useState(0);
  const [hudScore, setHudScore] = useState(0);
  const [hudBallsLeft, setHudBallsLeft] = useState(3);
  const [hudMultiplier, setHudMultiplier] = useState(1);
  const [hudShield, setHudShield] = useState(true);
  const [hudCombo, setHudCombo] = useState(0);
  const [hudFever, setHudFever] = useState(false);
  const [hudMission, setHudMission] = useState({ cur: 0, goal: 8 });
  const [hudLanes, setHudLanes] = useState([false, false, false, false]);
  const [hudTargets, setHudTargets] = useState([false, false, false, false]);
  const [ballWaitingInShooter, setBallWaitingInShooter] = useState(true);
  const [hudBanner, setHudBanner] = useState(
    '🆓 FREE PLAY READY! CLICK 🚀 LAUNCH, TAP THE TABLE, OR PRESS [SPACE] TO SHOOT!'
  );
  const [gameOverInfo, setGameOverInfo] = useState(null); // null | { score, payout, staked }
  const [bestScore, setBestScore] = useState(() =>
    Number(localStorage.getItem('tm_pinball_highscore') || 0)
  );

  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const stakedRef = useRef(0);

  const resetTableGame = useCallback((nextTbl, stakeAmt = 0) => {
    stakedRef.current = stakeAmt;
    const initSt = buildInitialEngineState(nextTbl);
    stateRef.current = initSt;
    setStakedTokens(stakeAmt);
    setHudScore(0);
    setHudBallsLeft(3);
    setHudMultiplier(1);
    setHudShield(true);
    setHudCombo(0);
    setHudFever(false);
    setHudMission({ cur: 0, goal: initSt.missionGoal });
    setHudLanes([false, false, false, false]);
    setHudTargets([false, false, false, false]);
    setBallWaitingInShooter(true);
    setGameOverInfo(null);
    setHudBanner(
      stakeAmt > 0
        ? `🪙 ${stakeAmt}-TOKEN PRIZE GAME LIVE! PRESS [SPACE] OR CLICK 🚀 LAUNCH BALL!`
        : `🆓 FREE PLAY ACTIVE ON ${nextTbl.name.toUpperCase()} — PRESS [SPACE] OR CLICK 🚀 LAUNCH!`
    );
  }, []);

  const handleSelectTable = (nextId) => {
    const tbl = PINBALL_TABLES.find((t) => t.id === nextId) || PINBALL_TABLES[0];
    if (
      stakedRef.current > 0 &&
      stateRef.current &&
      !stateRef.current.gameOver &&
      stateRef.current.score > 0
    ) {
      if (!window.confirm('Switch Pinball Tables and start a new Free Play run on the selected table?')) {
        return;
      }
    }
    sfx.playToggle();
    setTableId(tbl.id);
    resetTableGame(tbl, 0);
  };

  const handleStartFreePlay = () => {
    sfx.playToggle();
    resetTableGame(activeTable, 0);
  };

  const handleStartPrizeRun = () => {
    const hasFreePerk = checkDailyPerk('pinball');
    if (hasFreePerk) {
      consumeDailyPerk('pinball');
      sfx.playLevelUp();
      resetTableGame(activeTable, entryCost);
      setHudBanner('🎁 FREE DAILY PRIZE PINBALL UNLOCKED! PRESS [SPACE] OR 🚀 LAUNCH!');
      return;
    }
    if (tokens < entryCost) {
      sfx.playClownHonk();
      resetTableGame(activeTable, 0);
      setHudBanner(
        `🆓 PLAYING IN FREE PRACTICE MODE! (Need ${entryCost} 🪙 for Prize Run — Upload a Meme for +45 🪙!)`
      );
      return;
    }
    if (onSpendTokens) {
      const ok = onSpendTokens(entryCost, `Pinball ${activeTable.name} Prize Entry`);
      if (!ok) return;
    }
    sfx.playCoinInsert();
    resetTableGame(activeTable, entryCost);
  };

  const launchPlunger = useCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    if (st.gameOver) {
      resetTableGame(st.table, 0);
      return;
    }

    let launched = false;
    const isGoldSkillShot = st.skillGauge >= 62 && st.skillGauge <= 96;

    st.balls.forEach((b) => {
      if (b.inShooter || (b.x >= LANE_WALL_X - 4 && b.y > 420 && Math.abs(b.vy) < 3.5)) {
        b.inShooter = true;
        b.x = SHOOTER_X;
        // High-powered launch velocity that ALWAYS clears the full 540px shooter tube!
        b.vy = isGoldSkillShot ? -19.8 : -(17.6 + (st.skillGauge / 100) * 1.8);
        b.vx = 0;
        launched = true;
      }
    });

    if (launched) {
      setBallWaitingInShooter(false);
      st.ballSaveTicks = Math.max(st.ballSaveTicks, 720); // 12s Ball Save on launch
      st.drainShield = true;
      setHudShield(true);
      sfx.playPlungerLaunch();

      if (isGoldSkillShot) {
        sfx.playLightningStrike?.();
        st.score += 1500 * st.multiplier;
        st.multiplier = Math.min(5, st.multiplier + 1);
        setHudScore(st.score);
        setHudMultiplier(st.multiplier);
        st.floatTexts.push({
          x: PLAY_CENTER_X,
          y: 135,
          text: '🎯 GOLD SKILL SHOT +1,500!',
          color: '#facc15',
          life: 48
        });
        setHudBanner('🎯 PERFECT GOLD SKILL SHOT! +1,500 PTS + MULTIPLIER UP + BALL SAVER LIT!');
      } else {
        st.score += 300;
        setHudScore(st.score);
        setHudBanner(`🚀 HYPER-NEON BALL LAUNCHED ON ${st.table.name.toUpperCase()}!`);
      }
    }
  }, [resetTableGame]);

  const nudgeTable = useCallback(() => {
    const st = stateRef.current;
    if (!st || st.gameOver || st.tiltTicks > 0) return;
    const activePlayBalls = st.balls.filter((b) => !b.inShooter);
    if (activePlayBalls.length === 0) {
      launchPlunger();
      return;
    }

    sfx.playPinballNudge?.();
    st.shakeTicks = 12;
    st.nudgeHeat += 40;

    if (st.nudgeHeat >= 105) {
      st.tiltTicks = 120; // 2 sec flipper lock warning
      st.leftDown = false;
      st.rightDown = false;
      sfx.playDamageGong();
      setHudBanner('🚨 TILT OVERLOAD! FLIPPERS LOCKED FOR 2 SECONDS — EASY ON THE CABINET!');
      return;
    }

    activePlayBalls.forEach((b) => {
      b.vy -= 3.8;
      b.vx += (PLAY_CENTER_X - b.x) * 0.04 + (Math.random() - 0.5) * 2.0;
    });
    setHudBanner(
      st.nudgeHeat >= 65
        ? '⚠️ CABINET NUDGED! CAREFUL — ONE MORE NUDGE WILL TILT!'
        : '💥 CABINET NUDGE! BALL KICKED UPWARD AWAY FROM DRAIN!'
    );
  }, [launchPlunger]);

  const setFlipperState = useCallback((side, isDown) => {
    const st = stateRef.current;
    if (!st || st.gameOver) return;
    if (st.tiltTicks > 0 && isDown) return;
    if (side === 'left') {
      if (isDown && !st.leftDown) sfx.playFlipperClick();
      st.leftDown = isDown;
    } else {
      if (isDown && !st.rightDown) sfx.playFlipperClick();
      st.rightDown = isDown;
    }
  }, []);

  // Keyboard bindings (Left/Right Arrows, A/D, Spacebar/Enter/Up to Launch, Down/N/W to Nudge)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ShiftLeft' || e.code === 'KeyZ') {
        e.preventDefault();
        setFlipperState('left', true);
      } else if (
        e.code === 'ArrowRight' ||
        e.code === 'KeyD' ||
        e.code === 'ShiftRight' ||
        e.code === 'Slash'
      ) {
        e.preventDefault();
        setFlipperState('right', true);
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        e.preventDefault();
        launchPlunger();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyN' || e.code === 'KeyW') {
        e.preventDefault();
        nudgeTable();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ShiftLeft' || e.code === 'KeyZ') {
        setFlipperState('left', false);
      } else if (
        e.code === 'ArrowRight' ||
        e.code === 'KeyD' ||
        e.code === 'ShiftRight' ||
        e.code === 'Slash'
      ) {
        setFlipperState('right', false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setFlipperState, launchPlunger, nudgeTable]);

  // Main 60fps Canvas Physics & Hyper-Neon Synthwave Renderer
  useEffect(() => {
    if (!stateRef.current) {
      stateRef.current = buildInitialEngineState(PINBALL_TABLES[0]);
    }
    let rafId = null;

    const spawnNeonImpact = (st, x, y, color = '#00f3ff', maxR = 44, shootBeamToCenter = false) => {
      if (st.neonWaves.length < 12) {
        st.neonWaves.push({ x, y, r: 8, maxR, color, life: 18, maxLife: 18 });
      }
      if (shootBeamToCenter && st.laserBeams.length < 6) {
        st.laserBeams.push({
          x1: x,
          y1: y,
          x2: PLAY_CENTER_X,
          y2: 368,
          color,
          life: 10
        });
      }
      if (st.sparks.length < 40) {
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
          const spd = 2.4 + Math.random() * 3.4;
          st.sparks.push({
            x,
            y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color,
            life: 16
          });
        }
      }
    };

    const addPoints = (
      st,
      basePts,
      fxX,
      fxY,
      label = null,
      color = '#facc15',
      isMajorHit = false
    ) => {
      const feverMult = st.feverTicks > 0 ? 2 : 1;
      const pts = Math.round(basePts * st.multiplier * feverMult);
      st.score += pts;
      setHudScore(st.score);

      if (isMajorHit) {
        st.comboCount += 1;
        st.comboTimer = 240; // 4 seconds to keep combo chain alive
        setHudCombo(st.comboCount);

        if (st.comboCount > 0 && st.comboCount % 6 === 0 && st.feverTicks <= 0) {
          st.feverTicks = 660; // 11 seconds of 2x Fever Overdrive + Auto Ball Saver!
          st.drainShield = true;
          setHudShield(true);
          setHudFever(true);
          sfx.playLightningStrike?.();
          setHudBanner('🌈 6× COMBO! HYPER-NEON FEVER OVERDRIVE (2× POINTS + LASER BALL SAVER)!');
        }

        st.missionProgress += 1;
        if (st.missionProgress >= st.missionGoal) {
          st.missionProgress = 0;
          st.missionsCleared += 1;
          const missionBonus = 3500 * st.multiplier;
          st.score += missionBonus;
          st.drainShield = true;
          setHudScore(st.score);
          setHudShield(true);
          sfx.playJackpot();
          st.floatTexts.push({
            x: PLAY_CENTER_X,
            y: 225,
            text: `🏆 MISSION CLEAR +${missionBonus.toLocaleString()}!`,
            color: '#00ff88',
            life: 48
          });
          setHudBanner(
            `🏆 ${st.table.name.toUpperCase()} MISSION CLEARED! +${missionBonus.toLocaleString()} PTS + SHIELD!`
          );
        }
        setHudMission({ cur: st.missionProgress, goal: st.missionGoal });
      }

      if (fxX !== undefined && fxY !== undefined && st.floatTexts.length < 14) {
        st.floatTexts.push({
          x: fxX,
          y: fxY,
          text: label || `+${pts.toLocaleString()}${feverMult > 1 ? '🔥' : ''}`,
          color: feverMult > 1 ? '#facc15' : color,
          life: 30
        });
      }
    };

    const finishGame = (st) => {
      st.gameOver = true;
      const finalScore = st.score;
      const prevBest = Number(localStorage.getItem('tm_pinball_highscore') || 0);
      if (finalScore > prevBest) {
        localStorage.setItem('tm_pinball_highscore', String(finalScore));
        setBestScore(finalScore);
        if (onRecordHighScore) onRecordHighScore('pinball', finalScore);
      }

      const activeStake = stakedRef.current;
      const payout = computePinballTokenPayout(finalScore, activeStake);
      if (payout > 0 && onPayoutTokens) {
        sfx.playJackpot();
        onPayoutTokens(payout, {
          stakedTokens: activeStake,
          xp: 50,
          label: `🎱 Pinball ${st.table.name}: ${finalScore.toLocaleString()} pts!`,
          emoji: '🎱'
        });
      } else {
        sfx.playSadTrombone();
      }

      setGameOverInfo({
        score: finalScore,
        payout,
        staked: activeStake
      });
    };

    // Static Wall Segments in main playfield (W=440, H=620, Playfield x=20..388, Shooter x=388..424)
    const staticWalls = [
      // 0: Left outer wall
      [20, 82, 20, 492],
      // 1: Left inlane funnel to left flipper pivot (122, 540)
      [20, 492, 122, 540],
      // 2: Right playfield divider wall (one-way closed at top once ball exits shooter!)
      [LANE_WALL_X, 92, LANE_WALL_X, 492],
      // 3: Right inlane funnel to right flipper pivot (286, 540)
      [LANE_WALL_X, 492, 286, 540],
      // 4: Rightmost outer cabinet wall (plunger lane outer edge)
      [424, 82, 424, 576],
      // 5: Top-right curved deflector arch guiding plunged ball left into upper lanes
      [352, 20, 424, 84],
      // 6: Upper arch ceiling right
      [275, 14, 352, 20],
      // 7: Top-left curved deflector corner
      [20, 82, 86, 18],
      // 8: Upper arch ceiling left
      [86, 18, 275, 14],
      // 9, 10, 11: Left Slingshot Triangle (kicker wall is index 10!)
      [54, 412, 54, 476],
      [54, 412, 110, 490],
      [54, 476, 110, 490],
      // 12, 13, 14: Right Slingshot Triangle (kicker wall is index 13!)
      [354, 412, 354, 476],
      [354, 412, 298, 490],
      [354, 476, 298, 490],
      // 15: Upper-right one-way gate blocker (active only when ball is already in playfield)
      [LANE_WALL_X, 20, LANE_WALL_X, 92]
    ];

    const leftPivot = { x: 122, y: 540 };
    const rightPivot = { x: 286, y: 540 };
    const FLIPPER_LEN = 68; // Generous arcade flippers!

    const stepPhysics = (st) => {
      if (st.gameOver) return;
      st.tick += 1;
      if (st.portalCooldown > 0) st.portalCooldown -= 1;
      if (st.sinkCooldown > 0) st.sinkCooldown -= 1;
      if (st.shakeTicks > 0) st.shakeTicks -= 1;
      if (st.tiltTicks > 0) st.tiltTicks -= 1;
      if (st.nudgeHeat > 0) st.nudgeHeat = Math.max(0, st.nudgeHeat - 0.35);
      if (st.mysteryTicks > 0) st.mysteryTicks -= 1;
      if (st.ballSaveTicks > 0) {
        st.ballSaveTicks -= 1;
      }

      // Oscillate Skill Shot Plunger Gauge (0..100)
      st.skillGauge = Math.round(50 + Math.sin(st.tick * 0.085) * 50);

      // Update Combo Chain & Neon Fever Overdrive timers
      if (st.comboTimer > 0) {
        st.comboTimer -= 1;
        if (st.comboTimer === 0 && st.comboCount > 0) {
          st.comboCount = 0;
          setHudCombo(0);
        }
      }
      if (st.feverTicks > 0) {
        st.feverTicks -= 1;
        if (st.feverTicks === 0) {
          setHudFever(false);
        }
      }

      const tbl = st.table;

      // Update moving patrol bumper
      if (tbl.movingBumper) {
        st.movingX += tbl.movingBumper.speed * st.movingDir;
        if (st.movingX >= tbl.movingBumper.maxX) {
          st.movingX = tbl.movingBumper.maxX;
          st.movingDir = -1;
        } else if (st.movingX <= tbl.movingBumper.minX) {
          st.movingX = tbl.movingBumper.minX;
          st.movingDir = 1;
        }
      }

      const oscOffset = tbl.oscillateBumpers ? Math.sin(st.tick * 0.045) * 26 : 0;

      // Sub-step physics 4x per frame with swept flipper interpolation!
      const SUBSTEPS = 4;
      const survivingBalls = [];
      const spawnedMultiballs = [];

      const targetLeft = st.leftDown ? -0.48 : 0.40;
      const targetRight = st.rightDown ? Math.PI + 0.48 : Math.PI - 0.40;

      for (let sub = 0; sub < SUBSTEPS; sub++) {
        const prevLeft = st.leftAngle;
        st.leftAngle += (targetLeft - st.leftAngle) * 0.22;
        st.leftAngVel = st.leftAngle - prevLeft;

        const prevRight = st.rightAngle;
        st.rightAngle += (targetRight - st.rightAngle) * 0.22;
        st.rightAngVel = st.rightAngle - prevRight;

        for (const b of st.balls) {
          if (b.drained) continue;

          // Shooter lane containment & GUARANTEED one-way top arch exit!
          if (b.inShooter) {
            // Lighter gravity while ascending in polished shooter tube
            const effGrav = b.vy < 0 ? GRAVITY * 0.52 : GRAVITY;
            b.vy += effGrav / SUBSTEPS;

            // Keep centered in shooter tube while below top arch (y > 90)
            if (b.y > 90) {
              b.x = SHOOTER_X;
              b.vx = 0;
            }
            // Resting on plunger spring at bottom
            if (b.y > 544) {
              b.y = 544;
              if (b.vy > 0) b.vy = 0;
            }
            // Top of shooter lane reached! Curve smoothly around top-right arch into playfield!
            if (b.y <= 90) {
              b.inShooter = false;
              b.x = LANE_WALL_X - BALL_R - 5;
              b.y = 56;
              b.vx = -(6.8 + Math.random() * 2.4);
              b.vy = 1.4 + Math.random() * 1.2;
              spawnNeonImpact(st, LANE_WALL_X - 8, 56, '#00f3ff', 32, false);
            }
          } else {
            b.vy += GRAVITY / SUBSTEPS;

            // Table 5 Central Gravity Well
            if (tbl.gravityWell) {
              const gdx = tbl.gravityWell.x - b.x;
              const gdy = tbl.gravityWell.y - b.y;
              const gDist = Math.hypot(gdx, gdy);
              if (gDist > 12 && gDist < tbl.gravityWell.r) {
                b.vx += ((gdx / gDist) * tbl.gravityWell.pull) / SUBSTEPS;
                b.vy += ((gdy / gDist) * tbl.gravityWell.pull) / SUBSTEPS;
              }
            }
          }

          // Clamp max velocity
          const spd = Math.hypot(b.vx, b.vy);
          if (spd > MAX_SPEED) {
            b.vx = (b.vx / spd) * MAX_SPEED;
            b.vy = (b.vy / spd) * MAX_SPEED;
          }

          b.x += b.vx / SUBSTEPS;
          b.y += b.vy / SUBSTEPS;

          // Collide with static walls (only when outside shooter or at top arch)
          if (!b.inShooter) {
            staticWalls.forEach((seg, segIdx) => {
              const hit = distToSegment(b.x, b.y, seg[0], seg[1], seg[2], seg[3]);
              if (hit.dist < BALL_R && hit.dist > 0.001) {
                const ux = hit.nx / hit.dist;
                const uy = hit.ny / hit.dist;
                b.x = hit.cx + ux * (BALL_R + 0.5);
                b.y = hit.cy + uy * (BALL_R + 0.5);
                const dot = b.vx * ux + b.vy * uy;
                if (dot < 0) {
                  const isSlingshot = segIdx === 10 || segIdx === 13;
                  const bounce = isSlingshot ? 1.42 : 0.78;
                  b.vx -= (1 + bounce) * dot * ux;
                  b.vy -= (1 + bounce) * dot * uy;
                  if (isSlingshot && sub === 0) {
                    if (segIdx === 10) st.leftSlingFlash = 12;
                    if (segIdx === 13) st.rightSlingFlash = 12;
                    sfx.playPinballBumper(1);
                    spawnNeonImpact(st, b.x, b.y, st.table.secondary, 38, true);
                    addPoints(st, 160, b.x, b.y, '+160⚡', '#00f3ff');
                  }
                }
              }
            });

            // Collide with Left & Right Flippers
            const flippers = [
              {
                ax: leftPivot.x,
                ay: leftPivot.y,
                bx: leftPivot.x + Math.cos(st.leftAngle) * FLIPPER_LEN,
                by: leftPivot.y + Math.sin(st.leftAngle) * FLIPPER_LEN,
                upKick: st.leftAngVel < -0.005 || (st.leftDown && st.leftAngle > -0.42)
              },
              {
                ax: rightPivot.x,
                ay: rightPivot.y,
                bx: rightPivot.x + Math.cos(st.rightAngle) * FLIPPER_LEN,
                by: rightPivot.y + Math.sin(st.rightAngle) * FLIPPER_LEN,
                upKick: st.rightAngVel > 0.005 || (st.rightDown && st.rightAngle < Math.PI + 0.42)
              }
            ];

            flippers.forEach((fl) => {
              const hit = distToSegment(b.x, b.y, fl.ax, fl.ay, fl.bx, fl.by);
              const effR = BALL_R + 5.5;
              if (hit.dist < effR && hit.dist > 0.001) {
                const ux = hit.nx / hit.dist;
                const uy = hit.ny / hit.dist;
                b.x = hit.cx + ux * (effR + 0.6);
                b.y = hit.cy + uy * (effR + 0.6);
                const dot = b.vx * ux + b.vy * uy;
                if (dot < 0) {
                  b.vx -= 1.72 * dot * ux;
                  b.vy -= 1.72 * dot * uy;
                }
                if (fl.upKick) {
                  const leverBoost = 9.2 + hit.t * 6.4;
                  b.vy = -Math.max(Math.abs(b.vy), leverBoost);
                  b.vx += ux * 3.4 + (hit.t - 0.3) * (fl.ax < PLAY_CENTER_X ? 2.2 : -2.2);
                  spawnNeonImpact(st, hit.cx, hit.cy, '#00f3ff', 28, false);
                }
              }
            });

            // Collide with Pop Bumpers
            tbl.bumpers.forEach((bmp, idx) => {
              const bx = bmp.x + oscOffset;
              const by = bmp.y;
              const dx = b.x - bx;
              const dy = b.y - by;
              const dist = Math.hypot(dx, dy);
              const minDist = BALL_R + bmp.r;
              if (dist < minDist && dist > 0.01) {
                const ux = dx / dist;
                const uy = dy / dist;
                b.x = bx + ux * (minDist + 1.2);
                b.y = by + uy * (minDist + 1.2);
                const kick = 8.4;
                b.vx = ux * kick + (Math.random() - 0.5) * 0.9;
                b.vy = uy * kick;
                if (st.bumperFlashes[idx] <= 2) {
                  st.bumperFlashes[idx] = 12;
                  sfx.playPinballBumper(idx % 4);
                  spawnNeonImpact(st, bx, by, bmp.color, bmp.r + 28, true);
                  addPoints(st, bmp.pts, bx, by - bmp.r, null, bmp.color, true);
                }
              }
            });

            // Collide with Moving Patrol Bumper (DeLorean / Reactor Shield)
            if (tbl.movingBumper) {
              const mb = tbl.movingBumper;
              const dx = b.x - st.movingX;
              const dy = b.y - mb.y;
              const dist = Math.hypot(dx, dy);
              const minDist = BALL_R + mb.r;
              if (dist < minDist && dist > 0.01) {
                const ux = dx / dist;
                const uy = dy / dist;
                b.x = st.movingX + ux * (minDist + 1.2);
                b.y = mb.y + uy * (minDist + 1.2);
                b.vx = ux * 9.2;
                b.vy = uy * 9.2;
                sfx.playMetalPipe();
                spawnNeonImpact(st, st.movingX, mb.y, mb.color, mb.r + 26, true);
                addPoints(
                  st,
                  mb.pts,
                  st.movingX,
                  mb.y - 18,
                  `+${mb.pts * st.multiplier}!`,
                  mb.color,
                  true
                );
              }
            }
          }
        }
      }

      // Per-frame triggers & drain check for each ball
      for (const b of st.balls) {
        if (!b.trail) b.trail = [];
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 14) b.trail.shift();

        if (!b.inShooter) {
          // 1. Top 4 Rollover Lanes (y: 52..76)
          const laneXs = [110, 172, 236, 298];
          laneXs.forEach((lx, idx) => {
            if (!st.lanesLit[idx] && Math.abs(b.x - lx) < 18 && Math.abs(b.y - 66) < 16) {
              st.lanesLit[idx] = true;
              setHudLanes([...st.lanesLit]);
              sfx.playSpinnerTick();
              spawnNeonImpact(st, lx, 66, '#00f3ff', 32, false);
              addPoints(st, 250, lx, 54, tbl.lanesWord[idx], '#00f3ff');
              if (st.lanesLit.every(Boolean)) {
                st.lanesLit = [false, false, false, false];
                setHudLanes([false, false, false, false]);
                st.multiplier = Math.min(5, st.multiplier + 1);
                st.drainShield = true;
                setHudMultiplier(st.multiplier);
                setHudShield(true);
                sfx.playPowerUpCollect();
                setHudBanner(
                  `⚡ ${tbl.lanesWord.join('-')} COMPLETE! ${st.multiplier}× MULTIPLIER + DRAIN SHIELD LIT!`
                );
              }
            }
          });

          // 2. Side Word Drop Targets (left bank x=34, right bank x=374)
          const targetCoords = [
            { x: 34, y: 196 },
            { x: 34, y: 256 },
            { x: 374, y: 196 },
            { x: 374, y: 256 }
          ];
          targetCoords.forEach((tc, idx) => {
            if (!st.targetsLit[idx] && Math.hypot(b.x - tc.x, b.y - tc.y) < 20) {
              st.targetsLit[idx] = true;
              setHudTargets([...st.targetsLit]);
              b.vx = tc.x < 100 ? Math.abs(b.vx) + 3.5 : -Math.abs(b.vx) - 3.5;
              sfx.playLaserZap();
              spawnNeonImpact(st, tc.x, tc.y, '#00ff88', 34, true);
              addPoints(st, 350, tc.x, tc.y, tbl.targetWord[idx], '#00ff88', true);
              if (st.targetsLit.every(Boolean)) {
                st.targetsLit = [false, false, false, false];
                setHudTargets([false, false, false, false]);
                st.drainShield = true;
                setHudShield(true);
                sfx.playMultiballSiren();
                addPoints(st, 2000, PLAY_CENTER_X, 260, '🚨 MULTIBALL +2,000!', '#facc15', true);
                if (st.balls.length + spawnedMultiballs.length < 3) {
                  spawnedMultiballs.push({
                    id: Date.now() + Math.random(),
                    x: PLAY_CENTER_X,
                    y: 128,
                    vx: (Math.random() - 0.5) * 6.5,
                    vy: 3.2,
                    inShooter: false,
                    trail: []
                  });
                  setHudBanner(`🚨 ${tbl.targetWord.join('-')} MULTIBALL UNLEASHED + SHIELD LIT!`);
                }
              }
            }
          });

          // 3. Outrun Turbo Boost Pads
          tbl.boostPads.forEach((pad) => {
            if (
              b.x >= pad.x &&
              b.x <= pad.x + pad.w &&
              b.y >= pad.y &&
              b.y <= pad.y + pad.h &&
              st.tick % 6 === 0
            ) {
              b.vy = -14.2;
              sfx.playSpinnerTick();
              spawnNeonImpact(st, pad.x + pad.w / 2, pad.y + pad.h / 2, '#ff6b00', 36, false);
              addPoints(st, 180, pad.x + 14, pad.y, 'TURBO!🔥', '#ff6b00');
            }
          });

          // 4. Wormhole Teleport Portals (Table 3 & 5)
          if (tbl.portals && st.portalCooldown <= 0) {
            const ent = tbl.portals.entry;
            if (Math.hypot(b.x - ent.x, b.y - ent.y) < ent.r + BALL_R) {
              st.portalCooldown = 45;
              b.x = tbl.portals.exit.x;
              b.y = tbl.portals.exit.y;
              b.vx = tbl.portals.exit.vx;
              b.vy = tbl.portals.exit.vy;
              b.trail = [];
              sfx.playAlienBeam();
              spawnNeonImpact(st, ent.x, ent.y, '#c084fc', 42, true);
              spawnNeonImpact(st, tbl.portals.exit.x, tbl.portals.exit.y, '#00f3ff', 42, false);
              addPoints(st, 950, ent.x, ent.y, '🌀 WARP +950!', '#c084fc', true);
              setHudBanner('🌀 HYPER-WARP TELEPORT! +950 BONUS!');
            }
          }

          // 5. Jackpot / Shark / Reactor Sinkhole + Mystery Vault Bonus
          if (tbl.sinkhole && st.sinkCooldown <= 0) {
            const sk = tbl.sinkhole;
            if (Math.hypot(b.x - sk.x, b.y - sk.y) < sk.r + 5) {
              st.sinkCooldown = 70;
              const angle = Math.random() * Math.PI * 0.75 + 0.38;
              b.vx = Math.cos(angle) * 9.2 * (Math.random() < 0.5 ? 1 : -1);
              b.vy = Math.sin(angle) * 9.2;
              sfx.playJackpot();
              spawnNeonImpact(st, sk.x, sk.y, '#facc15', 48, true);
              addPoints(st, 1250, sk.x, sk.y, `💥 ${sk.label} +1,250!`, '#facc15', true);

              const mysteryPrizes = [
                '🌈 FEVER OVERDRIVE!',
                '⚡ +1× MULTIPLIER!',
                '💎 +2,500 MYSTERY JACKPOT!',
                '🚨 2-BALL FRENZY!'
              ];
              const pickPrize = mysteryPrizes[Math.floor(Math.random() * mysteryPrizes.length)];
              st.mysteryText = pickPrize;
              st.mysteryTicks = 140;
              if (pickPrize.includes('FEVER')) {
                st.feverTicks = 600;
                setHudFever(true);
              } else if (pickPrize.includes('MULTIPLIER')) {
                st.multiplier = Math.min(5, st.multiplier + 1);
                setHudMultiplier(st.multiplier);
              } else if (pickPrize.includes('2,500')) {
                st.score += 2500;
                setHudScore(st.score);
              }

              if (st.balls.length + spawnedMultiballs.length < 2) {
                spawnedMultiballs.push({
                  id: Date.now() + Math.random(),
                  x: sk.x,
                  y: sk.y + 20,
                  vx: -b.vx,
                  vy: 5.8,
                  inShooter: false,
                  trail: []
                });
                setHudBanner(`🎰 ${sk.label} MYSTERY VAULT: ${pickPrize} + MULTIBALL!`);
              } else {
                setHudBanner(`🎰 ${sk.label} MYSTERY VAULT AWARDED: ${pickPrize}`);
              }
            }
          }

          // 6. Spinners
          tbl.spinners.forEach((sp) => {
            if (Math.hypot(b.x - sp.x, b.y - sp.y) < 18 && Math.abs(b.vy) > 2.5 && st.tick % 4 === 0) {
              sfx.playSpinnerTick();
              addPoints(st, 110, sp.x, sp.y, '+110', '#38bdf8');
            }
          });
        }

        // Check Bottom Drain (Saved by Ball Save Timer, Plasma Drain Shield, OR Fever Overdrive!)
        if (b.y > H - 12) {
          if ((st.drainShield || st.ballSaveTicks > 0 || st.feverTicks > 0) && !b.inShooter) {
            if (st.feverTicks <= 0 && st.ballSaveTicks <= 0) {
              st.drainShield = false;
              setHudShield(false);
            }
            b.y = H - 44;
            b.vy = -14.8;
            b.vx = (PLAY_CENTER_X - b.x) * 0.05 + (Math.random() - 0.5) * 4.5;
            sfx.playAlienBeam();
            spawnNeonImpact(st, b.x, H - 30, st.feverTicks > 0 ? '#facc15' : '#00f3ff', 48, false);
            setHudBanner(
              st.feverTicks > 0
                ? '🌈 NEON FEVER LASER AUTO-SAVED YOUR BALL!'
                : st.ballSaveTicks > 0
                ? '🛡️ BALL SAVER REBOUNDED YOUR BALL BACK INTO PLAY!'
                : '🛡️ PLASMA DRAIN SHIELD SAVED YOUR BALL!'
            );
          } else {
            b.drained = true;
          }
        }

        if (!b.drained) {
          survivingBalls.push(b);
        }
      }

      st.balls = [...survivingBalls, ...spawnedMultiballs];

      // Decay bumper flashes, laser beams, slingshot flashes, neon ripples, sparks & float texts
      for (let i = 0; i < st.bumperFlashes.length; i++) {
        if (st.bumperFlashes[i] > 0) st.bumperFlashes[i] -= 1;
      }
      if (st.leftSlingFlash > 0) st.leftSlingFlash -= 1;
      if (st.rightSlingFlash > 0) st.rightSlingFlash -= 1;

      st.laserBeams = st.laserBeams
        .map((lb) => ({ ...lb, life: lb.life - 1 }))
        .filter((lb) => lb.life > 0);

      st.neonWaves = st.neonWaves
        .map((w) => ({
          ...w,
          r: w.r + (w.maxR - w.r) * 0.25,
          life: w.life - 1
        }))
        .filter((w) => w.life > 0);

      st.sparks = st.sparks
        .map((sp) => ({
          ...sp,
          x: sp.x + sp.vx,
          y: sp.y + sp.vy,
          life: sp.life - 1
        }))
        .filter((sp) => sp.life > 0);

      st.floatTexts = st.floatTexts
        .map((ft) => ({ ...ft, y: ft.y - 0.95, life: ft.life - 1 }))
        .filter((ft) => ft.life > 0);

      // If all active balls drained, lose 1 ball or trigger Game Over
      if (st.balls.length === 0) {
        if (st.ballsLeft > 1) {
          st.ballsLeft -= 1;
          st.multiplier = 1;
          st.drainShield = true;
          st.ballSaveTicks = 600; // 10s Ball Save on new ball
          setHudBallsLeft(st.ballsLeft);
          setHudMultiplier(1);
          setHudShield(true);
          setBallWaitingInShooter(true);
          sfx.playDamageGong();
          st.balls = [
            {
              id: Date.now(),
              x: SHOOTER_X,
              y: 542,
              vx: 0,
              vy: 0,
              inShooter: true,
              trail: []
            }
          ];
          setHudBanner(`🎱 BALL ${4 - st.ballsLeft} READY — PRESS [SPACE] OR CLICK 🚀 LAUNCH!`);
        } else {
          st.ballsLeft = 0;
          setHudBallsLeft(0);
          setBallWaitingInShooter(false);
          finishGame(st);
        }
      }
    };

    const drawPlayfield = (ctx, st) => {
      const tbl = st.table;
      ctx.save();

      // Apply cabinet nudge screen shake if active
      if (st.shakeTicks > 0) {
        const dx = (Math.random() - 0.5) * 6;
        const dy = (Math.random() - 0.5) * 6;
        ctx.translate(dx, dy);
      }

      // 1. Deep 1986 Synthwave Night Sky & Neon Horizon Backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, tbl.bgTop);
      grad.addColorStop(0.55, '#090418');
      grad.addColorStop(1, tbl.bgBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 1b. Glowing Segmented Synthwave Outrun Sun (x=204, y=148)
      const sunX = PLAY_CENTER_X;
      const sunY = 148;
      const sunR = 66;
      ctx.save();
      ctx.globalAlpha = 0.32;
      const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      sunGrad.addColorStop(0, '#fde047');
      sunGrad.addColorStop(0.5, tbl.accent);
      sunGrad.addColorStop(1, tbl.secondary);
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();
      // Retro horizontal scanline cutouts across lower half of sun
      ctx.fillStyle = tbl.bgTop;
      ctx.globalAlpha = 0.72;
      for (let sy = sunY + 4; sy < sunY + sunR; sy += 8) {
        ctx.fillRect(sunX - sunR, sy, sunR * 2, 3.4);
      }
      ctx.restore();

      // 1c. Perspective Synthwave Laser Grid & Circuit Traces on Playfield Floor
      ctx.save();
      ctx.strokeStyle = tbl.secondary;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1.2;
      // Radiating perspective lines from center sun toward bottom flippers
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(PLAY_CENTER_X + i * 16, 150);
        ctx.lineTo(PLAY_CENTER_X + i * 54, H);
        ctx.stroke();
      }
      // Animated scrolling horizontal laser grid lines
      const gridOffset = (st.tick * 0.6) % 38;
      for (let gy = 90 + gridOffset; gy < H - 30; gy += 38) {
        ctx.beginPath();
        ctx.moveTo(20, gy);
        ctx.lineTo(LANE_WALL_X, gy);
        ctx.stroke();
      }

      // Glowing Neon Circuit Traces from Bumpers to Center Reactor Core (PLAY_CENTER_X, 368)
      ctx.strokeStyle = tbl.accent;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1.8;
      const oscOffset = tbl.oscillateBumpers ? Math.sin(st.tick * 0.045) * 26 : 0;
      tbl.bumpers.forEach((bmp) => {
        ctx.beginPath();
        ctx.moveTo(bmp.x + oscOffset, bmp.y);
        ctx.lineTo(PLAY_CENTER_X, 368);
        ctx.stroke();
      });
      ctx.restore();

      // 1d. Table-Specific Rotating Cyber-Reactor Core Art (x=204, y=368)
      const cx = PLAY_CENTER_X;
      const cy = 368;
      ctx.save();
      ctx.shadowColor = st.feverTicks > 0 ? '#facc15' : tbl.accent;
      ctx.shadowBlur = 16;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = st.feverTicks > 0 ? '#facc15' : tbl.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 54, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = tbl.secondary;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 41, st.tick * 0.035, st.tick * 0.035 + Math.PI * 1.45);
      ctx.stroke();

      ctx.strokeStyle = tbl.tertiary || '#facc15';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, 29, -st.tick * 0.045, -st.tick * 0.045 + Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();

      // Center Ring Telemetry Readout
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = st.feverTicks > 0 ? '#fde047' : tbl.accent;
      ctx.globalAlpha = 0.72;
      ctx.font = '900 15px Impact, Arial Black, sans-serif';
      ctx.fillText(
        st.feverTicks > 0 ? '🌈 2× FEVER OVERDRIVE!' : tbl.name.toUpperCase(),
        cx,
        cy + 70
      );

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = st.feverTicks > 0 ? '#fde047' : st.multiplier > 1 ? '#facc15' : '#00f3ff';
      ctx.font = '900 15px sans-serif';
      ctx.fillText(
        st.comboCount > 1
          ? `🔥 ${st.comboCount}× COMBO • ${st.multiplier}×`
          : `${st.multiplier}× NEON MULT`,
        cx,
        cy - 3
      );
      ctx.font = '900 10.5px sans-serif';
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`🎯 MISSION: ${st.missionProgress}/${st.missionGoal}`, cx, cy + 15);

      if (st.mysteryTicks > 0 && st.mysteryText) {
        ctx.fillStyle = '#fde047';
        ctx.font = '900 12px sans-serif';
        ctx.fillText(st.mysteryText, cx, cy - 26);
      }
      if (st.tiltTicks > 0) {
        ctx.fillStyle = '#ff0055';
        ctx.font = '900 18px Impact, sans-serif';
        ctx.fillText('🚨 TILT! FLIPPERS LOCKED!', cx, 285);
      }
      ctx.restore();

      // 1e. Shooter Lane Skill Shot Power Meter & Neon Chase Chevrons
      const hasBallInShooter = st.balls.some((b) => b.inShooter && Math.abs(b.vy) < 2.0);
      if (hasBallInShooter) {
        const barX = 398;
        const barY = 405;
        const barW = 16;
        const barH = 104;
        ctx.fillStyle = 'rgba(5, 8, 20, 0.9)';
        ctx.fillRect(barX, barY, barW, barH);
        // Gold Sweet Spot Zone
        ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
        ctx.fillRect(barX + 1, barY + 4, barW - 2, 34);
        const fillH = Math.round((st.skillGauge / 100) * barH);
        const inGold = st.skillGauge >= 62 && st.skillGauge <= 96;
        ctx.fillStyle = inGold ? '#facc15' : '#00f3ff';
        ctx.fillRect(barX + 2, barY + barH - fillH, barW - 4, fillH);
        ctx.strokeStyle = inGold ? '#ffffff' : '#ff007f';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.fillStyle = '#fde047';
        ctx.font = '900 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SKILL', SHOOTER_X, barY - 6);

        // Glowing Center Callout when Ball is waiting to launch!
        const pulse = 0.72 + Math.sin(st.tick * 0.12) * 0.28;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(6, 10, 26, 0.88)';
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(48, 434, 312, 38, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.font = '900 12.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚀 PRESS [SPACE] OR CLICK HERE TO LAUNCH BALL!', PLAY_CENTER_X, 457);
        ctx.restore();
      }

      // Shooter lane upward neon chase chevrons
      const chasePhase = Math.floor(st.tick / 5) % 7;
      for (let i = 0; i < 7; i++) {
        const lit = i === 6 - chasePhase;
        const ay = 120 + i * 44;
        if (!hasBallInShooter || ay < 390) {
          ctx.fillStyle = lit ? '#00f3ff' : 'rgba(255, 0, 127, 0.34)';
          ctx.font = '900 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('▲', SHOOTER_X, ay);
        }
      }

      // Center jackpot directional neon chevrons
      for (let i = 0; i < 3; i++) {
        const lit = (Math.floor(st.tick / 7) + i) % 3 === 0;
        ctx.fillStyle = lit ? '#facc15' : 'rgba(0, 243, 255, 0.25)';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲', cx, 306 - i * 14);
      }

      // 2. Gravity Well (Table 5)
      if (tbl.gravityWell) {
        const gw = tbl.gravityWell;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.42)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(gw.x, gw.y, gw.r * (0.65 + 0.3 * Math.sin(st.tick * 0.08)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gw.x, gw.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
        ctx.fill();
        ctx.restore();
      }

      // 3. Boost Pads (Table 1, 2 & 4)
      tbl.boostPads.forEach((pad) => {
        ctx.save();
        ctx.shadowColor = '#ff6b00';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 107, 0, 0.26)';
        ctx.strokeStyle = '#ff6b00';
        ctx.lineWidth = 2.2;
        ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
        ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
        ctx.fillStyle = '#fde047';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲', pad.x + pad.w / 2, pad.y + 22);
        ctx.fillText('▲', pad.x + pad.w / 2, pad.y + 42);
        ctx.fillText('▲', pad.x + pad.w / 2, pad.y + 62);
        ctx.restore();
      });

      // 4. Wormhole Portals (Table 3 & 5)
      if (tbl.portals) {
        const { entry, exit } = tbl.portals;
        [
          { p: entry, col: '#c084fc', tag: 'WARP' },
          { p: exit, col: '#00f3ff', tag: 'OUT' }
        ].forEach(({ p, col, tag }) => {
          ctx.save();
          ctx.shadowColor = col;
          ctx.shadowBlur = 14;
          ctx.globalAlpha = 0.32;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 23, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = col;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, st.tick * 0.08, st.tick * 0.08 + Math.PI * 1.6);
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = '900 8.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(tag, p.x, p.y + 3);
          ctx.restore();
        });
      }

      // 5. Sinkhole Pocket (Table 1, 4, 5)
      if (tbl.sinkhole) {
        const sk = tbl.sinkhole;
        ctx.save();
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(sk.x, sk.y, sk.r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#070412';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sk.x, sk.y, sk.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = '900 8.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sk.label, sk.x, sk.y + 3);
        ctx.restore();
      }

      // 6. Top 4 Neon Rollover Lanes
      const laneXs = [110, 172, 236, 298];
      laneXs.forEach((lx, idx) => {
        const lit = st.lanesLit[idx];
        ctx.save();
        if (lit) {
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 14;
        }
        // Rollover lane divider fins
        ctx.strokeStyle = tbl.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lx - 26, 48);
        ctx.lineTo(lx - 26, 80);
        ctx.stroke();

        ctx.fillStyle = lit ? '#00f3ff' : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = lit ? '#ffffff' : '#00f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lx, 66, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = lit ? '#020617' : '#f8fafc';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tbl.lanesWord[idx], lx, 70);
        ctx.restore();
      });

      // 7. Side Word Neon Drop Targets
      const targetCoords = [
        { x: 32, y: 196 },
        { x: 32, y: 256 },
        { x: 376, y: 196 },
        { x: 376, y: 256 }
      ];
      targetCoords.forEach((tc, idx) => {
        const lit = st.targetsLit[idx];
        ctx.save();
        ctx.shadowColor = lit ? '#00ff88' : '#ff007f';
        ctx.shadowBlur = lit ? 14 : 8;
        ctx.fillStyle = lit ? '#00ff88' : 'rgba(255, 0, 127, 0.32)';
        ctx.fillRect(tc.x - 9, tc.y - 15, 18, 30);
        ctx.strokeStyle = lit ? '#ffffff' : '#ff66b2';
        ctx.lineWidth = 2;
        ctx.strokeRect(tc.x - 9, tc.y - 15, 18, 30);
        ctx.fillStyle = lit ? '#022c22' : '#ffffff';
        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tbl.targetWord[idx], tc.x, tc.y + 4);
        ctx.restore();
      });

      // 8. Spinners
      tbl.spinners.forEach((sp) => {
        ctx.save();
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const w = Math.cos(st.tick * 0.24) * 15;
        ctx.moveTo(sp.x - w, sp.y);
        ctx.lineTo(sp.x + w, sp.y);
        ctx.stroke();
        ctx.restore();
      });

      // 8b. Laser Beams Shot From Bumpers on Hit
      st.laserBeams.forEach((lb) => {
        ctx.save();
        ctx.globalAlpha = lb.life / 10;
        ctx.shadowColor = lb.color;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = lb.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(lb.x1, lb.y1);
        ctx.lineTo(lb.x2, lb.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lb.x1, lb.y1);
        ctx.lineTo(lb.x2, lb.y2);
        ctx.stroke();
        ctx.restore();
      });

      // 9. Hyper-Neon 3D Pop Bumpers
      tbl.bumpers.forEach((bmp, idx) => {
        const bx = bmp.x + oscOffset;
        const by = bmp.y;
        const flash = st.bumperFlashes[idx] > 0;
        const rad = flash ? bmp.r + 4.5 : bmp.r;

        ctx.save();
        ctx.shadowColor = bmp.color;
        ctx.shadowBlur = flash ? 26 : 16;

        // Outer neon plasma aura
        ctx.globalAlpha = flash ? 0.65 : 0.28;
        ctx.fillStyle = bmp.color;
        ctx.beginPath();
        ctx.arc(bx, by, rad + 8, 0, Math.PI * 2);
        ctx.fill();

        // Main bumper cap
        ctx.globalAlpha = 1;
        ctx.fillStyle = flash ? '#ffffff' : '#100726';
        ctx.strokeStyle = flash ? '#ffffff' : bmp.color;
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner neon ring
        ctx.strokeStyle = flash ? bmp.color : '#ffffff';
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, rad * 0.68, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = flash ? '#090612' : '#ffffff';
        ctx.font = '900 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bmp.label, bx, by + 5);
        ctx.restore();
      });

      // 10. Moving Patrol Bumper
      if (tbl.movingBumper) {
        const mb = tbl.movingBumper;
        ctx.save();
        ctx.shadowColor = mb.color;
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = mb.color;
        ctx.beginPath();
        ctx.arc(st.movingX, mb.y, mb.r + 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#180824';
        ctx.strokeStyle = mb.color;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(st.movingX, mb.y, mb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mb.label, st.movingX, mb.y + 5);
        ctx.restore();
      }

      // 11. Illuminated Neon Slingshot Kicker Triangles & Triple-Layer Neon Glass Tube Walls
      // Left Slingshot Fill (54,412 -> 54,476 -> 110,490)
      ctx.save();
      ctx.globalAlpha = st.leftSlingFlash > 0 ? 0.65 : 0.22;
      ctx.fillStyle = st.leftSlingFlash > 0 ? '#ffffff' : tbl.secondary;
      ctx.beginPath();
      ctx.moveTo(54, 412);
      ctx.lineTo(54, 476);
      ctx.lineTo(110, 490);
      ctx.closePath();
      ctx.fill();

      // Right Slingshot Fill (354,412 -> 354,476 -> 298,490)
      ctx.globalAlpha = st.rightSlingFlash > 0 ? 0.65 : 0.22;
      ctx.fillStyle = st.rightSlingFlash > 0 ? '#ffffff' : tbl.secondary;
      ctx.beginPath();
      ctx.moveTo(354, 412);
      ctx.lineTo(354, 476);
      ctx.lineTo(298, 490);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Triple-Layer Neon Glass Tube Walls
      ctx.save();
      ctx.lineCap = 'round';
      staticWalls.forEach((seg, idx) => {
        // Hide one-way gate segment (idx 15) while ball is in shooter
        if (idx === 15 && hasBallInShooter) return;
        const isSling = idx >= 9 && idx <= 14;
        const tubeCol = isSling ? tbl.secondary : tbl.accent;

        // Pass 1: Outer Neon Halo
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = tubeCol;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(seg[0], seg[1]);
        ctx.lineTo(seg[2], seg[3]);
        ctx.stroke();

        // Pass 2: Mid Vibrant Neon Tube
        ctx.globalAlpha = 0.96;
        ctx.strokeStyle = tubeCol;
        ctx.lineWidth = 4.4;
        ctx.beginPath();
        ctx.moveTo(seg[0], seg[1]);
        ctx.lineTo(seg[2], seg[3]);
        ctx.stroke();

        // Pass 3: White-Hot Inner Filament
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(seg[0], seg[1]);
        ctx.lineTo(seg[2], seg[3]);
        ctx.stroke();
      });
      ctx.restore();

      // 11b. Expanding Neon Shockwave Ripples & Flying Neon Sparks on Hits
      st.neonWaves.forEach((w) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, (w.life / w.maxLife) * 0.78);
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
      st.sparks.forEach((sp) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.life / 16);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Plunger Spring Visual in Bottom-Right Shooter Lane
      ctx.save();
      const springCompress = hasBallInShooter ? Math.round((st.skillGauge / 100) * 14) : 0;
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(394, 556 + springCompress, 24, 42 - springCompress);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.strokeRect(394, 556 + springCompress, 24, 42 - springCompress);
      ctx.restore();

      // Plasma Drain Shield OR Ball Save Laser across Bottom Gap
      if (st.drainShield || st.ballSaveTicks > 0 || st.feverTicks > 0) {
        const laserCol =
          st.feverTicks > 0 ? '#facc15' : st.ballSaveTicks > 0 ? '#00ff88' : '#00f3ff';
        ctx.save();
        ctx.shadowColor = laserCol;
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.42 + Math.sin(st.tick * 0.2) * 0.15;
        ctx.strokeStyle = laserCol;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(124, H - 24);
        ctx.lineTo(284, H - 24);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(124, H - 24);
        ctx.lineTo(284, H - 24);
        ctx.stroke();
        ctx.fillStyle = laserCol;
        ctx.font = '900 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          st.feverTicks > 0
            ? '🌈 FEVER LASER SAVER ACTIVE'
            : st.ballSaveTicks > 0
            ? `🛡️ BALL SAVE ACTIVE (${Math.ceil(st.ballSaveTicks / 60)}s)`
            : '🛡️ PLASMA DRAIN SHIELD LIT',
          PLAY_CENTER_X,
          H - 8
        );
        ctx.restore();
      }

      // 12. Left & Right Tapered Neon Plasma Flippers
      [
        { px: leftPivot.x, py: leftPivot.y, ang: st.leftAngle, col: '#00f3ff' },
        { px: rightPivot.x, py: rightPivot.y, ang: st.rightAngle, col: '#ff007f' }
      ].forEach((fl) => {
        const tx = fl.px + Math.cos(fl.ang) * FLIPPER_LEN;
        const ty = fl.py + Math.sin(fl.ang) * FLIPPER_LEN;
        ctx.save();
        ctx.shadowColor = fl.col;
        ctx.shadowBlur = 18;
        ctx.lineCap = 'round';

        // Outer Neon Flipper Glow
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = fl.col;
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(fl.px, fl.py);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Main Flipper Body
        ctx.globalAlpha = 1;
        ctx.strokeStyle = fl.col;
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.moveTo(fl.px, fl.py);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // White-Hot Core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(fl.px, fl.py);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Pivot Axle Hub
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(fl.px, fl.py, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 13. Hyper-Neon Comet Ball Trails & Glowing Chrome Pinballs
      const trailColors = ['#00f3ff', '#ff007f', '#facc15', '#00ff88', '#c084fc'];
      const activeTrailCol =
        st.feverTicks > 0
          ? trailColors[Math.floor(st.tick / 3) % trailColors.length]
          : trailColors[(st.multiplier - 1) % trailColors.length];

      st.balls.forEach((b) => {
        ctx.save();
        if (b.trail && b.trail.length > 1) {
          for (let i = 0; i < b.trail.length - 1; i++) {
            const pt = b.trail[i];
            const ratio = (i + 1) / b.trail.length;
            ctx.globalAlpha = ratio * 0.52;
            ctx.fillStyle = activeTrailCol;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, BALL_R * ratio * 0.95, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        // Outer Neon Ball Halo
        ctx.shadowColor = activeTrailCol;
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = activeTrailCol;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R + 5, 0, Math.PI * 2);
        ctx.fill();

        // Chrome Sphere Core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();

        // Specular Highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x - 2.8, b.y - 2.8, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 14. Floating Hit Popups
      st.floatTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / 14);
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.fillStyle = ft.color;
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();
    };

    const loop = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        const st = stateRef.current;
        const canvas = canvasRef.current;
        if (st && canvas) {
          stepPhysics(st);
          const ctx = canvas.getContext('2d');
          if (ctx) drawPlayfield(ctx, st);
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [onPayoutTokens, onRecordHighScore]);

  return (
    <section
      className="tm-pin2-stage"
      style={{ '--pin-accent': activeTable.accent, '--pin-sec': activeTable.secondary }}
      aria-label="80s Hyper-Neon Cyber-Pinball Widescreen Arcade Machine"
    >
      <div className="tm-pin2-cabinet tm-pin2-widescreen-showcase">
        {/* 1. ULTRA-COMPACT SINGLE-LINE TOP BAR (Table Switcher + Live Scoreboard + Mode Toggle) */}
        <header className="tm-pin2-slim-topbar">
          <div className="tm-pin2-slim-left">
            {onBackToFeed && (
              <button type="button" className="tm-bandit-back-btn" onClick={onBackToFeed}>
                ←
              </button>
            )}
            <div className="tm-pin2-table-strip" role="tablist" aria-label="Select Pinball Table">
              {PINBALL_TABLES.map((tbl) => (
                <button
                  key={tbl.id}
                  type="button"
                  role="tab"
                  aria-selected={tbl.id === activeTable.id}
                  className={`tm-pin2-tbl-pill ${tbl.id === activeTable.id ? 'active' : ''}`}
                  style={{ '--tbl-col': tbl.accent }}
                  onClick={() => handleSelectTable(tbl.id)}
                >
                  {tbl.short}
                </button>
              ))}
            </div>
          </div>

          <div className="tm-pin2-slim-hud">
            <span className="tm-pin2-mini-stat">
              SCORE <strong>{hudScore.toLocaleString()}</strong>
            </span>
            <span className="tm-pin2-mini-stat">
              BALLS <strong>{'🎱'.repeat(Math.max(0, hudBallsLeft)) || '0'}</strong>
            </span>
            <span className="tm-pin2-mini-stat">
              MULT <strong style={{ color: '#facc15' }}>{hudMultiplier}×{hudFever ? '🔥' : hudCombo > 1 ? ` (${hudCombo}c)` : ''}</strong>
            </span>
            <span className="tm-pin2-mini-stat hide-xs">
              SHIELD{' '}
              <strong style={{ color: hudShield || hudFever ? '#00f3ff' : '#64748b' }}>
                {hudShield || hudFever ? '🛡️ON' : 'OFF'}
              </strong>
            </span>
            <span className="tm-pin2-mini-stat hide-xs">
              BEST <strong style={{ color: '#facc15' }}>{bestScore.toLocaleString()}</strong>
            </span>
          </div>

          <div className="tm-pin2-slim-right">
            <button
              type="button"
              className={`tm-bj-mode-pill ${stakedTokens === 0 ? 'active' : ''}`}
              onClick={handleStartFreePlay}
              title="Play Unlimited Free Practice Pinball"
            >
              🆓 Free
            </button>
            <button
              type="button"
              className={`tm-bj-mode-pill ${stakedTokens > 0 ? 'active' : ''}`}
              onClick={handleStartPrizeRun}
              title="Insert 10 Tokens to play for 10–35 Token high-score payouts!"
            >
              {stakedTokens > 0 && !gameOverInfo ? '🏆 10🪙 LIVE' : `🪙 ${entryCost}🪙 Prize`}
            </button>
            <button
              type="button"
              className="tm-bj-mode-pill"
              onClick={handleStartFreePlay}
              title="Reset table and launch a fresh 3-ball game"
            >
              🔄
            </button>
          </div>
        </header>

        {/* 2. CENTER-STAGE MAIN SHOW: HUGE FULL-HEIGHT PINBALL PLAYFIELD + COMPACT SIDE WINGS (PC) */}
        <div className="tm-pin2-main-arena">
          {/* PC LEFT WING: LIVE ROLLOVER & DROP TARGET TELEMETRY */}
          <aside className="tm-pin2-side-wing left-wing">
            <div className="tm-pin2-wing-card">
              <div className="tm-pin2-wing-label">🎱 {activeTable.name.toUpperCase()}</div>
              <div className="tm-pin2-wing-sub" style={{ color: '#67e8f9', fontWeight: 800 }}>
                {hudBanner}
              </div>
            </div>

            <div className="tm-pin2-wing-card">
              <div className="tm-pin2-wing-label">⚡ TOP ROLLOVER LANES (2×–5× MULT)</div>
              <div className="tm-pin2-word-row">
                {activeTable.lanesWord.map((ch, idx) => (
                  <span
                    key={idx}
                    className={`tm-pin2-letter-orb ${hudLanes[idx] ? 'lit' : ''}`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>

            <div className="tm-pin2-wing-card">
              <div className="tm-pin2-wing-label">🎯 MULTIBALL DROP TARGETS</div>
              <div className="tm-pin2-word-row">
                {activeTable.targetWord.map((ch, idx) => (
                  <span
                    key={idx}
                    className={`tm-pin2-letter-orb target ${hudTargets[idx] ? 'lit' : ''}`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>

            <div className="tm-pin2-wing-card">
              <div className="tm-pin2-wing-label">🏆 TABLE BOSS MISSION ({hudMission.cur}/{hudMission.goal})</div>
              <div className="tm-pin2-mission-bar">
                <div
                  className="tm-pin2-mission-fill"
                  style={{
                    width: `${Math.min(100, (hudMission.cur / Math.max(1, hudMission.goal)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </aside>

          {/* CENTER PLAYFIELD — MAXIMIZED TO FILL SCREEN REAL ESTATE! */}
          <div className="tm-pin2-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="tm-pin2-canvas"
              onPointerDown={(e) => {
                const st = stateRef.current;
                const allInShooter =
                  st && st.balls.every((b) => b.inShooter && Math.abs(b.vy) < 2.5);
                if (allInShooter) {
                  launchPlunger();
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = e.clientX - rect.left;
                const relY = e.clientY - rect.top;
                if (relX > rect.width * 0.82 && relY > rect.height * 0.6) {
                  launchPlunger();
                } else if (relX < rect.width * 0.5) {
                  setFlipperState('left', true);
                } else {
                  setFlipperState('right', true);
                }
              }}
              onPointerUp={() => {
                setFlipperState('left', false);
                setFlipperState('right', false);
              }}
              onPointerCancel={() => {
                setFlipperState('left', false);
                setFlipperState('right', false);
              }}
            />

            {/* GAME OVER OVERLAY */}
            {gameOverInfo && (
              <div className="tm-crush2-overlay" role="dialog">
                <div className="tm-crush2-modal">
                  <div style={{ fontSize: '38px' }}>
                    {gameOverInfo.payout > 0 ? '🏆🪙' : '🎱'}
                  </div>
                  <h3>GAME OVER — {gameOverInfo.score.toLocaleString()} PTS</h3>
                  <p>
                    {gameOverInfo.staked > 0
                      ? gameOverInfo.payout > 0
                        ? `Awesome run! You won +${gameOverInfo.payout} 🪙 Arcade Tokens!`
                        : 'Needed 8,000+ pts to cash on a 10-🪙 coin-op run. Try again!'
                      : `Free Play Complete! Play Free again anytime or insert ${entryCost} 🪙 to win up to 35 🪙!`}
                  </p>
                  <div className="tm-crush2-modal-btns">
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      onClick={() => resetTableGame(activeTable, 0)}
                    >
                      🆓 Play Free Again
                    </button>
                    <button
                      type="button"
                      className="tm-btn"
                      onClick={handleStartPrizeRun}
                    >
                      🪙 Play Prize Run ({entryCost} 🪙)
                    </button>
                    {tokens < entryCost && onOpenUpload && (
                      <button
                        type="button"
                        className="tm-btn"
                        onClick={onOpenUpload}
                      >
                        📸 Upload Meme (+45 🪙)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PC RIGHT WING: ARCADE ACTION BUTTONS & PC KEYBOARD CONTROLS */}
          <aside className="tm-pin2-side-wing right-wing">
            <div className="tm-pin2-wing-card">
              <div className="tm-pin2-wing-label">🚀 PLUNGER &amp; FLIPPER DECK</div>
              <button
                type="button"
                className={`tm-pin2-big-launch-btn ${ballWaitingInShooter ? 'pulse-ready' : ''}`}
                onClick={launchPlunger}
              >
                {ballWaitingInShooter ? '🚀 LAUNCH BALL NOW [SPACE]' : '🚀 PLUNGER [SPACE]'}
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="tm-pin2-flip-btn left"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setFlipperState('left', true);
                  }}
                  onPointerUp={() => setFlipperState('left', false)}
                  onPointerLeave={() => setFlipperState('left', false)}
                >
                  ◀ LEFT [A]
                </button>
                <button
                  type="button"
                  className="tm-pin2-flip-btn right"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setFlipperState('right', true);
                  }}
                  onPointerUp={() => setFlipperState('right', false)}
                  onPointerLeave={() => setFlipperState('right', false)}
                >
                  RIGHT [D] ▶
                </button>
              </div>
              <button
                type="button"
                className="tm-pin2-nudge-btn"
                style={{ width: '100%', marginTop: '4px' }}
                onClick={nudgeTable}
              >
                💥 NUDGE CABINET [N / ↓]
              </button>
            </div>

            <div className="tm-pin2-wing-card">
              <div className="tm-pin2-wing-label">💰 10-🪙 PRIZE PAYOUTS</div>
              <div className="tm-pin2-key-list">
                <div>
                  <strong>8,000+ pts</strong> <span>10 🪙</span>
                </div>
                <div>
                  <strong>15,000+ pts</strong> <span>16 🪙</span>
                </div>
                <div>
                  <strong>25,000+ pts</strong> <span>24 🪙</span>
                </div>
                <div>
                  <strong>40,000+ pts</strong> <span>35 🪙 Jackpot!</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* 3. MOBILE / TABLET THUMB FLIPPER BAR (Hidden on Desktop where controls are in Right Wing!) */}
        <div className="tm-pin2-controls tm-pin2-mobile-controls">
          <button
            type="button"
            className="tm-pin2-flip-btn left"
            onPointerDown={(e) => {
              e.preventDefault();
              setFlipperState('left', true);
            }}
            onPointerUp={() => setFlipperState('left', false)}
            onPointerLeave={() => setFlipperState('left', false)}
            onPointerCancel={() => setFlipperState('left', false)}
          >
            ◀ FLIP
          </button>

          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              type="button"
              className={`tm-pin2-launch-btn ${ballWaitingInShooter ? 'pulse-ready' : ''}`}
              style={{ flex: 1 }}
              onClick={launchPlunger}
            >
              🚀 LAUNCH
            </button>
            <button
              type="button"
              className="tm-pin2-nudge-btn"
              onClick={nudgeTable}
            >
              💥 NUDGE
            </button>
          </div>

          <button
            type="button"
            className="tm-pin2-flip-btn right"
            onPointerDown={(e) => {
              e.preventDefault();
              setFlipperState('right', true);
            }}
            onPointerUp={() => setFlipperState('right', false)}
            onPointerLeave={() => setFlipperState('right', false)}
            onPointerCancel={() => setFlipperState('right', false)}
          >
            FLIP ▶
          </button>
        </div>
      </div>
    </section>
  );
}
