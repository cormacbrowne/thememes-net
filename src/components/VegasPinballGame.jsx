import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { checkDailyPerk, consumeDailyPerk } from '../utils/memeFeedBridge';

// ==========================================
// 80s NEON CYBER-PINBALL — 5 DISTINCT TABLES & OLDER-IPAD 60FPS ENGINE
// Zero ctx.shadowBlur (uses fast layered alpha neon rings for silky iPad Safari 60fps!)
// ==========================================

const W = 400;
const H = 560;
const SHOOTER_X = 366; // Right-side plunger lane wall x = 350..388
const LANE_WALL_X = 348;
const BALL_R = 8.5;
const GRAVITY = 0.21;
const MAX_SPEED = 13.5;

const PINBALL_TABLES = [
  {
    id: 1,
    short: 'T1: Vegas 85',
    name: "Vegas Strip '85",
    badge: '🎰 JACKPOT ROULETTE',
    accent: '#ec4899',
    secondary: '#00f3ff',
    bgTop: '#160729',
    bgBot: '#070512',
    lanesWord: ['L', 'U', 'C', 'K'],
    targetWord: ['M', 'E', 'M', 'E'],
    bumpers: [
      { x: 174, y: 155, r: 23, label: '777', color: '#ef4444', pts: 250 },
      { x: 112, y: 215, r: 21, label: '💎', color: '#00f3ff', pts: 200 },
      { x: 236, y: 215, r: 21, label: '🍒', color: '#ec4899', pts: 200 },
      { x: 174, y: 270, r: 20, label: '🔔', color: '#facc15', pts: 220 }
    ],
    sinkhole: { x: 174, y: 105, r: 15, label: 'JACKPOT' },
    boostPads: [],
    portals: null,
    movingBumper: null,
    gravityWell: null,
    oscillateBumpers: false,
    spinners: [{ x: 86, y: 315 }]
  },
  {
    id: 2,
    short: 'T2: Outrun',
    name: 'Outrun Turbo Highway',
    badge: '🏎️ BOOST PADS & DELOREAN',
    accent: '#fb923c',
    secondary: '#f43f5e',
    bgTop: '#24081d',
    bgBot: '#090414',
    lanesWord: ['N', 'I', 'T', 'R'],
    targetWord: ['F', 'A', 'S', 'T'],
    bumpers: [
      { x: 120, y: 155, r: 21, label: '🔥', color: '#fb923c', pts: 220 },
      { x: 228, y: 155, r: 21, label: '⚡', color: '#facc15', pts: 220 },
      { x: 174, y: 210, r: 23, label: '88', color: '#00f3ff', pts: 260 }
    ],
    sinkhole: null,
    boostPads: [
      { x: 74, y: 330, w: 26, h: 66 },
      { x: 274, y: 330, w: 26, h: 66 }
    ],
    portals: null,
    movingBumper: { y: 286, minX: 96, maxX: 252, speed: 1.8, r: 19, label: '🏎️', color: '#f43f5e', pts: 340 },
    gravityWell: null,
    oscillateBumpers: false,
    spinners: [{ x: 174, y: 105 }]
  },
  {
    id: 3,
    short: 'T3: Invaders',
    name: 'Invader Cyber-Grid',
    badge: '👾 MARCHING ALIENS & WARP',
    accent: '#4ade80',
    secondary: '#a855f7',
    bgTop: '#061f1e',
    bgBot: '#050814',
    lanesWord: ['Z', 'A', 'P', '!'],
    targetWord: ['W', 'A', 'R', 'P'],
    bumpers: [
      { x: 108, y: 155, r: 18, label: '👾', color: '#4ade80', pts: 210 },
      { x: 174, y: 145, r: 20, label: '🛸', color: '#c084fc', pts: 260 },
      { x: 240, y: 155, r: 18, label: '👾', color: '#4ade80', pts: 210 },
      { x: 140, y: 220, r: 18, label: '👽', color: '#00f3ff', pts: 220 },
      { x: 208, y: 220, r: 18, label: '👽', color: '#00f3ff', pts: 220 }
    ],
    sinkhole: null,
    boostPads: [],
    portals: {
      entry: { x: 72, y: 285, r: 16 },
      exit: { x: 288, y: 130, vx: -5.2, vy: 3.5 }
    },
    movingBumper: null,
    gravityWell: null,
    oscillateBumpers: true,
    spinners: [{ x: 274, y: 295 }]
  },
  {
    id: 4,
    short: 'T4: Miami',
    name: 'Miami Vice Lagoon',
    badge: '🦈 SHARK PIT & DUAL SPINNERS',
    accent: '#2dd4bf',
    secondary: '#f472b6',
    bgTop: '#07222e',
    bgBot: '#10061e',
    lanesWord: ['P', 'A', 'L', 'M'],
    targetWord: ['V', 'I', 'B', 'E'],
    bumpers: [
      { x: 192, y: 155, r: 21, label: '🦩', color: '#f472b6', pts: 230 },
      { x: 152, y: 215, r: 20, label: '🌴', color: '#2dd4bf', pts: 210 },
      { x: 232, y: 215, r: 20, label: '🍹', color: '#facc15', pts: 210 },
      { x: 192, y: 268, r: 19, label: '☀️', color: '#fb923c', pts: 240 }
    ],
    sinkhole: { x: 86, y: 182, r: 16, label: 'SHARK' },
    boostPads: [{ x: 278, y: 315, w: 24, h: 64 }],
    portals: null,
    movingBumper: null,
    gravityWell: null,
    oscillateBumpers: false,
    spinners: [
      { x: 88, y: 310 },
      { x: 262, y: 250 }
    ]
  },
  {
    id: 5,
    short: 'T5: Reactor',
    name: 'Cosmic Reactor Boss',
    badge: '👑 GRAVITY CORE & SHIELD',
    accent: '#facc15',
    secondary: '#ef4444',
    bgTop: '#240b0b',
    bgBot: '#070510',
    lanesWord: ['C', 'O', 'R', 'E'],
    targetWord: ['B', 'O', 'S', 'S'],
    bumpers: [
      { x: 112, y: 145, r: 19, label: '⚛️', color: '#00f3ff', pts: 240 },
      { x: 174, y: 128, r: 22, label: '👑', color: '#facc15', pts: 350 },
      { x: 236, y: 145, r: 19, label: '⚛️', color: '#00f3ff', pts: 240 },
      { x: 98, y: 245, r: 18, label: '⚡', color: '#ef4444', pts: 230 },
      { x: 250, y: 245, r: 18, label: '⚡', color: '#ef4444', pts: 230 }
    ],
    sinkhole: { x: 174, y: 186, r: 14, label: 'REACTOR' },
    boostPads: [],
    portals: {
      entry: { x: 68, y: 335, r: 14 },
      exit: { x: 282, y: 112, vx: -4.8, vy: 2.5 }
    },
    movingBumper: { y: 222, minX: 124, maxX: 224, speed: 2.3, r: 16, label: '🛡️', color: '#ef4444', pts: 320 },
    gravityWell: { x: 174, y: 310, r: 62, pull: 0.14 },
    oscillateBumpers: false,
    spinners: [{ x: 174, y: 365 }]
  }
];

function computePinballTokenPayout(finalScore, stakedTokens) {
  if (stakedTokens <= 0) return 0;
  let raw = 0;
  if (finalScore >= 40000) raw = 32;
  else if (finalScore >= 25000) raw = 22;
  else if (finalScore >= 15000) raw = 15;
  else if (finalScore >= 8000) raw = 8;
  return validateStakedGamePayout({
    stakedTokens,
    rawPayout: raw,
    maxMultiplier: 4
  });
}

// Fast distance from point P to segment AB
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
    drainShield: false,
    gameOver: false,
    tick: 0,
    leftDown: false,
    rightDown: false,
    leftAngle: 0.42, // radians (resting downward)
    rightAngle: Math.PI - 0.42,
    leftAngVel: 0,
    rightAngVel: 0,
    lanesLit: [false, false, false, false],
    targetsLit: [false, false, false, false],
    bumperFlashes: new Array(tbl.bumpers.length).fill(0),
    movingX: tbl.movingBumper ? (tbl.movingBumper.minX + tbl.movingBumper.maxX) / 2 : 174,
    movingDir: 1,
    portalCooldown: 0,
    sinkCooldown: 0,
    floatTexts: [], // { x, y, text, color, life }
    balls: [
      {
        id: 1,
        x: SHOOTER_X,
        y: 495,
        vx: 0,
        vy: 0,
        inShooter: true
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
  const [hudShield, setHudShield] = useState(false);
  const [hudBanner, setHudBanner] = useState('PULL LAUNCH OR PRESS SPACE TO SHOOT!');
  const [gameOverInfo, setGameOverInfo] = useState(null); // null | { score, payout, staked }
  const [bestScore, setBestScore] = useState(() =>
    Number(localStorage.getItem('tm_pinball_highscore') || 0)
  );

  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const stakedRef = useRef(0);

  const resetTableGame = (nextTbl, stakeAmt = 0) => {
    stakedRef.current = stakeAmt;
    stateRef.current = buildInitialEngineState(nextTbl);
    setStakedTokens(stakeAmt);
    setHudScore(0);
    setHudBallsLeft(3);
    setHudMultiplier(1);
    setHudShield(false);
    setGameOverInfo(null);
    setHudBanner(
      stakeAmt > 0
        ? `🪙 ${stakeAmt}-TOKEN PRIZE GAME LIVE! SCORE 8K / 15K / 25K / 40K+ TO WIN UP TO 32 🪙!`
        : `🆓 PRACTICE TABLE: ${nextTbl.name.toUpperCase()} — TAP LAUNCH!`
    );
  };

  const handleSelectTable = (nextId) => {
    const tbl = PINBALL_TABLES.find((t) => t.id === nextId) || PINBALL_TABLES[0];
    if (
      stakedRef.current > 0 &&
      stateRef.current &&
      !stateRef.current.gameOver &&
      stateRef.current.score > 0
    ) {
      if (!window.confirm('Abandon your active 10-Token Prize Game and switch Pinball Tables?')) {
        return;
      }
    }
    sfx.playToggle();
    setTableId(tbl.id);
    resetTableGame(tbl, 0);
  };

  const handleStartPrizeRun = () => {
    const hasFreePerk = checkDailyPerk('pinball');
    if (hasFreePerk) {
      consumeDailyPerk('pinball');
      sfx.playLevelUp();
      setHudBanner('🎁 FREE DAILY PRIZE PINBALL (Meme Pioneer Upload Reward)!');
      resetTableGame(activeTable, entryCost);
      return;
    }
    if (tokens < entryCost) {
      sfx.playClownHonk();
      setHudBanner(`⚠️ NEED ${entryCost} 🪙 FOR PRIZE PINBALL! UPLOAD A MEME (+45 🪙) OR PLAY FREE!`);
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
    if (!st || st.gameOver) return;
    let launched = false;
    st.balls.forEach((b) => {
      if (b.inShooter || (b.x > LANE_WALL_X && b.y > 430 && Math.abs(b.vy) < 1.5)) {
        b.vy = -(12.2 + Math.random() * 1.1);
        b.vx = -0.6;
        launched = true;
      }
    });
    if (launched) {
      sfx.playPlungerLaunch();
      setHudBanner(`🚀 SILVER BALL LAUNCHED ON ${st.table.name.toUpperCase()}!`);
    }
  }, [setHudBanner]);

  const setFlipperState = useCallback((side, isDown) => {
    const st = stateRef.current;
    if (!st || st.gameOver) return;
    if (side === 'left') {
      if (isDown && !st.leftDown) sfx.playFlipperClick();
      st.leftDown = isDown;
    } else {
      if (isDown && !st.rightDown) sfx.playFlipperClick();
      st.rightDown = isDown;
    }
  }, []);

  // Keyboard bindings (Left/Right Arrows, A/D, Spacebar to Launch)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ShiftLeft') {
        e.preventDefault();
        setFlipperState('left', true);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ShiftRight') {
        e.preventDefault();
        setFlipperState('right', true);
      } else if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        launchPlunger();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ShiftLeft') {
        setFlipperState('left', false);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ShiftRight') {
        setFlipperState('right', false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setFlipperState, launchPlunger]);

  // Main 60fps Canvas Physics & Fast Layered-Alpha Neon Renderer
  useEffect(() => {
    if (!stateRef.current) {
      stateRef.current = buildInitialEngineState(PINBALL_TABLES[0]);
    }
    let rafId = null;

    const addPoints = (st, basePts, fxX, fxY, label = null, color = '#facc15') => {
      const pts = Math.round(basePts * st.multiplier);
      st.score += pts;
      setHudScore(st.score);
      if (fxX !== undefined && fxY !== undefined && st.floatTexts.length < 10) {
        st.floatTexts.push({
          x: fxX,
          y: fxY,
          text: label || `+${pts}`,
          color,
          life: 28
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

    // Static Wall Segments in main playfield
    const staticWalls = [
      // Left outer wall
      [18, 80, 18, 445],
      // Left inlane funnel to left flipper pivot (102, 488)
      [18, 445, 102, 488],
      // Right playfield divider wall (between main field and plunger shooter lane)
      [LANE_WALL_X, 96, LANE_WALL_X, 445],
      // Right inlane funnel to right flipper pivot (246, 488)
      [LANE_WALL_X, 445, 246, 488],
      // Rightmost outer cabinet wall (plunger lane outer edge)
      [386, 80, 386, 520],
      // Top-right curved deflector corner guiding plunged ball left into upper lanes
      [318, 18, 386, 84],
      [250, 14, 318, 18],
      // Top-left curved deflector corner
      [18, 80, 76, 18],
      [76, 18, 250, 14],
      // Left & Right Slingshot Triangles (kicker walls!)
      [48, 376, 48, 434],
      [48, 376, 94, 446],
      [48, 434, 94, 446],
      [300, 376, 300, 434],
      [300, 376, 254, 446],
      [300, 434, 254, 446]
    ];

    const leftPivot = { x: 102, y: 488 };
    const rightPivot = { x: 246, y: 488 };
    const FLIPPER_LEN = 58;

    const stepPhysics = (st) => {
      if (st.gameOver) return;
      st.tick += 1;
      if (st.portalCooldown > 0) st.portalCooldown -= 1;
      if (st.sinkCooldown > 0) st.sinkCooldown -= 1;

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

      // Update flipper angles smoothly with angular velocity tracking
      const targetLeft = st.leftDown ? -0.46 : 0.42;
      const prevLeft = st.leftAngle;
      st.leftAngle += (targetLeft - st.leftAngle) * 0.42;
      st.leftAngVel = st.leftAngle - prevLeft;

      const targetRight = st.rightDown ? Math.PI + 0.46 : Math.PI - 0.42;
      const prevRight = st.rightAngle;
      st.rightAngle += (targetRight - st.rightAngle) * 0.42;
      st.rightAngVel = st.rightAngle - prevRight;

      const oscOffset = tbl.oscillateBumpers ? Math.sin(st.tick * 0.045) * 24 : 0;

      // Sub-step physics 2x per frame to prevent fast ball tunneling!
      const SUBSTEPS = 2;
      const survivingBalls = [];
      const spawnedMultiballs = [];

      for (const b of st.balls) {
        let drained = false;

        for (let sub = 0; sub < SUBSTEPS; sub++) {
          b.vy += GRAVITY / SUBSTEPS;

          // Shooter lane containment & one-way exit at top
          if (b.inShooter) {
            if (b.x < LANE_WALL_X + BALL_R + 2 && b.y > 95) {
              b.x = LANE_WALL_X + BALL_R + 2;
              b.vx = Math.abs(b.vx) * 0.5;
            }
            if (b.y > 502) {
              b.y = 502;
              if (b.vy > 0) b.vy = 0;
            }
            if (b.x < LANE_WALL_X - 4) {
              b.inShooter = false;
            }
          } else {
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

          // Collide with static walls
          staticWalls.forEach((seg, segIdx) => {
            // Skip lane divider while high up in shooter exit arch (y < 96)
            if (segIdx === 2 && b.y < 96) return;
            const hit = distToSegment(b.x, b.y, seg[0], seg[1], seg[2], seg[3]);
            if (hit.dist < BALL_R && hit.dist > 0.001) {
              const ux = hit.nx / hit.dist;
              const uy = hit.ny / hit.dist;
              b.x = hit.cx + ux * (BALL_R + 0.4);
              b.y = hit.cy + uy * (BALL_R + 0.4);
              const dot = b.vx * ux + b.vy * uy;
              if (dot < 0) {
                const isSlingshot = segIdx === 10 || segIdx === 13;
                const bounce = isSlingshot ? 1.35 : 0.76;
                b.vx -= (1 + bounce) * dot * ux;
                b.vy -= (1 + bounce) * dot * uy;
                if (isSlingshot && sub === 0) {
                  sfx.playPinballBumper(1);
                  addPoints(st, 140, b.x, b.y, '+140', '#00f3ff');
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
              angVel: st.leftAngVel,
              upKick: st.leftAngVel < -0.02
            },
            {
              ax: rightPivot.x,
              ay: rightPivot.y,
              bx: rightPivot.x + Math.cos(st.rightAngle) * FLIPPER_LEN,
              by: rightPivot.y + Math.sin(st.rightAngle) * FLIPPER_LEN,
              angVel: st.rightAngVel,
              upKick: st.rightAngVel > 0.02
            }
          ];

          flippers.forEach((fl) => {
            const hit = distToSegment(b.x, b.y, fl.ax, fl.ay, fl.bx, fl.by);
            const effR = BALL_R + 4.5;
            if (hit.dist < effR && hit.dist > 0.001) {
              const ux = hit.nx / hit.dist;
              const uy = hit.ny / hit.dist;
              b.x = hit.cx + ux * (effR + 0.5);
              b.y = hit.cy + uy * (effR + 0.5);
              const dot = b.vx * ux + b.vy * uy;
              if (dot < 0) {
                b.vx -= 1.65 * dot * ux;
                b.vy -= 1.65 * dot * uy;
              }
              if (fl.upKick) {
                const leverBoost = 6.5 + hit.t * 5.2;
                b.vy = -Math.max(Math.abs(b.vy), leverBoost);
                b.vx += ux * 2.6;
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
              b.x = bx + ux * (minDist + 1);
              b.y = by + uy * (minDist + 1);
              const kick = 7.8;
              b.vx = ux * kick + (Math.random() - 0.5) * 0.8;
              b.vy = uy * kick;
              st.bumperFlashes[idx] = 10;
              sfx.playPinballBumper(idx % 4);
              addPoints(st, bmp.pts, bx, by - bmp.r, null, bmp.color);
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
              b.x = st.movingX + ux * (minDist + 1);
              b.y = mb.y + uy * (minDist + 1);
              b.vx = ux * 8.6;
              b.vy = uy * 8.6;
              sfx.playMetalPipe();
              addPoints(st, mb.pts, st.movingX, mb.y - 16, `+${mb.pts * st.multiplier}!`, mb.color);
            }
          }
        }

        // Non-substepped triggers (Lanes, Targets, Boost Pads, Portals, Sinkhole, Spinners)
        if (!b.inShooter) {
          // 1. Top 4 Rollover Lanes (y: 52..72)
          const laneXs = [95, 148, 200, 252];
          laneXs.forEach((lx, idx) => {
            if (!st.lanesLit[idx] && Math.abs(b.x - lx) < 16 && Math.abs(b.y - 64) < 14) {
              st.lanesLit[idx] = true;
              sfx.playSpinnerTick();
              addPoints(st, 200, lx, 54, tbl.lanesWord[idx], '#00f3ff');
              if (st.lanesLit.every(Boolean)) {
                st.lanesLit = [false, false, false, false];
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

          // 2. Side Word Targets (left bank x=30, right bank x=334)
          const targetCoords = [
            { x: 30, y: 180 },
            { x: 30, y: 235 },
            { x: 334, y: 180 },
            { x: 334, y: 235 }
          ];
          targetCoords.forEach((tc, idx) => {
            if (!st.targetsLit[idx] && Math.hypot(b.x - tc.x, b.y - tc.y) < 18) {
              st.targetsLit[idx] = true;
              b.vx = tc.x < 100 ? Math.abs(b.vx) + 3 : -Math.abs(b.vx) - 3;
              sfx.playLaserZap();
              addPoints(st, 300, tc.x, tc.y, tbl.targetWord[idx], '#4ade80');
              if (st.targetsLit.every(Boolean)) {
                st.targetsLit = [false, false, false, false];
                st.drainShield = true;
                setHudShield(true);
                sfx.playMultiballSiren();
                addPoints(st, 1500, 174, 240, 'WORD BONUS +1500!', '#facc15');
                if (st.balls.length + spawnedMultiballs.length < 3) {
                  spawnedMultiballs.push({
                    id: Date.now() + Math.random(),
                    x: 174,
                    y: 120,
                    vx: (Math.random() - 0.5) * 6,
                    vy: 3,
                    inShooter: false
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
              b.vy = -12.4;
              sfx.playSpinnerTick();
              addPoints(st, 150, pad.x + 12, pad.y, 'TURBO!', '#fb923c');
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
              sfx.playAlienBeam();
              addPoints(st, 850, ent.x, ent.y, '🌀 WARP +850!', '#c084fc');
              setHudBanner('🌀 WORMHOLE TELEPORT! +850 BONUS!');
            }
          }

          // 5. Jackpot / Shark / Reactor Sinkhole
          if (tbl.sinkhole && st.sinkCooldown <= 0) {
            const sk = tbl.sinkhole;
            if (Math.hypot(b.x - sk.x, b.y - sk.y) < sk.r + 4) {
              st.sinkCooldown = 70;
              const angle = Math.random() * Math.PI * 0.8 + 0.35;
              b.vx = Math.cos(angle) * 8.5 * (Math.random() < 0.5 ? 1 : -1);
              b.vy = Math.sin(angle) * 8.5;
              sfx.playJackpot();
              addPoints(st, 1100, sk.x, sk.y, `💥 ${sk.label} +1100!`, '#facc15');
              if (st.balls.length + spawnedMultiballs.length < 2) {
                spawnedMultiballs.push({
                  id: Date.now() + Math.random(),
                  x: sk.x,
                  y: sk.y + 18,
                  vx: -b.vx,
                  vy: 5.5,
                  inShooter: false
                });
                setHudBanner(`🎰 ${sk.label} 2-BALL FRENZY UNLOCKED!`);
              }
            }
          }

          // 6. Spinners
          tbl.spinners.forEach((sp) => {
            if (Math.hypot(b.x - sp.x, b.y - sp.y) < 16 && Math.abs(b.vy) > 3 && st.tick % 4 === 0) {
              sfx.playSpinnerTick();
              addPoints(st, 95, sp.x, sp.y, '+95', '#38bdf8');
            }
          });
        }

        // Check Bottom Drain
        if (b.y > H - 10) {
          if (st.drainShield && !b.inShooter) {
            // Plasma Drain Shield saves the ball!
            st.drainShield = false;
            setHudShield(false);
            b.y = H - 36;
            b.vy = -11.8;
            b.vx = (Math.random() - 0.5) * 4;
            sfx.playAlienBeam();
            setHudBanner('🛡️ PLASMA DRAIN SHIELD SAVED YOUR BALL!');
          } else {
            drained = true;
          }
        }

        if (!drained) {
          survivingBalls.push(b);
        }
      }

      st.balls = [...survivingBalls, ...spawnedMultiballs];

      // Decay bumper flashes & float texts
      for (let i = 0; i < st.bumperFlashes.length; i++) {
        if (st.bumperFlashes[i] > 0) st.bumperFlashes[i] -= 1;
      }
      st.floatTexts = st.floatTexts
        .map((ft) => ({ ...ft, y: ft.y - 0.9, life: ft.life - 1 }))
        .filter((ft) => ft.life > 0);

      // If all active balls drained, lose 1 ball or trigger Game Over
      if (st.balls.length === 0) {
        if (st.ballsLeft > 1) {
          st.ballsLeft -= 1;
          st.multiplier = 1;
          setHudBallsLeft(st.ballsLeft);
          setHudMultiplier(1);
          sfx.playDamageGong();
          st.balls = [
            {
              id: Date.now(),
              x: SHOOTER_X,
              y: 495,
              vx: 0,
              vy: 0,
              inShooter: true
            }
          ];
          setHudBanner(`🎱 BALL ${4 - st.ballsLeft} READY — TAP LAUNCH!`);
        } else {
          st.ballsLeft = 0;
          setHudBallsLeft(0);
          finishGame(st);
        }
      }
    };

    const drawPlayfield = (ctx, st) => {
      const tbl = st.table;

      // 1. 80s Synthwave Gradient Backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, tbl.bgTop);
      grad.addColorStop(1, tbl.bgBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle Retro Perspective Grid Lines (Zero blur shader!)
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.09)';
      ctx.lineWidth = 1;
      for (let gy = 80; gy < H; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(18, gy);
        ctx.lineTo(LANE_WALL_X, gy);
        ctx.stroke();
      }
      for (let gx = 58; gx < LANE_WALL_X; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 40);
        ctx.lineTo(gx, H - 60);
        ctx.stroke();
      }

      // Table Watermark Emblem
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.font = '900 22px Impact, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tbl.name.toUpperCase(), 182, 348);

      // 2. Gravity Well (Table 5)
      if (tbl.gravityWell) {
        const gw = tbl.gravityWell;
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gw.x, gw.y, gw.r * (0.65 + 0.3 * Math.sin(st.tick * 0.08)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gw.x, gw.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.fill();
      }

      // 3. Boost Pads (Table 2 & 4)
      tbl.boostPads.forEach((pad) => {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.22)';
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
        ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
        ctx.fillStyle = '#fde047';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲', pad.x + pad.w / 2, pad.y + 22);
        ctx.fillText('▲', pad.x + pad.w / 2, pad.y + 42);
        ctx.fillText('▲', pad.x + pad.w / 2, pad.y + 60);
      });

      // 4. Wormhole Portals (Table 3 & 5)
      if (tbl.portals) {
        const { entry, exit } = tbl.portals;
        [
          { p: entry, col: '#c084fc', tag: 'IN' },
          { p: exit, col: '#00f3ff', tag: 'OUT' }
        ].forEach(({ p, col, tag }) => {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 21, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = col;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = '900 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(tag, p.x, p.y + 3);
        });
      }

      // 5. Sinkhole Pocket (Table 1, 4, 5)
      if (tbl.sinkhole) {
        const sk = tbl.sinkhole;
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(sk.x, sk.y, sk.r + 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#090612';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sk.x, sk.y, sk.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = '900 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sk.label, sk.x, sk.y + 3);
      }

      // 6. Top 4 Rollover Lanes
      const laneXs = [95, 148, 200, 252];
      laneXs.forEach((lx, idx) => {
        const lit = st.lanesLit[idx];
        ctx.fillStyle = lit ? '#00f3ff' : 'rgba(148, 163, 184, 0.25)';
        ctx.beginPath();
        ctx.arc(lx, 64, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = lit ? '#04131d' : '#e2e8f0';
        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tbl.lanesWord[idx], lx, 68);
      });

      // 7. Side Word Drop Targets
      const targetCoords = [
        { x: 28, y: 180 },
        { x: 28, y: 235 },
        { x: 336, y: 180 },
        { x: 336, y: 235 }
      ];
      targetCoords.forEach((tc, idx) => {
        const lit = st.targetsLit[idx];
        ctx.fillStyle = lit ? '#4ade80' : 'rgba(236, 72, 153, 0.35)';
        ctx.fillRect(tc.x - 8, tc.y - 13, 16, 26);
        ctx.strokeStyle = lit ? '#bbf7d0' : '#f472b6';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(tc.x - 8, tc.y - 13, 16, 26);
        ctx.fillStyle = lit ? '#052e16' : '#fff';
        ctx.font = '900 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tbl.targetWord[idx], tc.x, tc.y + 4);
      });

      // 8. Spinners
      tbl.spinners.forEach((sp) => {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const w = Math.cos(st.tick * 0.22) * 13;
        ctx.moveTo(sp.x - w, sp.y);
        ctx.lineTo(sp.x + w, sp.y);
        ctx.stroke();
      });

      // 9. Pop Bumpers (Fast 2-Ring Alpha Neon Glow — Zero shadowBlur!)
      const oscOffset = tbl.oscillateBumpers ? Math.sin(st.tick * 0.045) * 24 : 0;
      tbl.bumpers.forEach((bmp, idx) => {
        const bx = bmp.x + oscOffset;
        const by = bmp.y;
        const flash = st.bumperFlashes[idx] > 0;
        const rad = flash ? bmp.r + 3.5 : bmp.r;

        ctx.globalAlpha = flash ? 0.45 : 0.2;
        ctx.fillStyle = bmp.color;
        ctx.beginPath();
        ctx.arc(bx, by, rad + 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = flash ? '#ffffff' : '#110c24';
        ctx.strokeStyle = bmp.color;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = flash ? '#090612' : '#ffffff';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bmp.label, bx, by + 5);
      });

      // 10. Moving Patrol Bumper
      if (tbl.movingBumper) {
        const mb = tbl.movingBumper;
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = mb.color;
        ctx.beginPath();
        ctx.arc(st.movingX, mb.y, mb.r + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#18091e';
        ctx.strokeStyle = mb.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(st.movingX, mb.y, mb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mb.label, st.movingX, mb.y + 5);
      }

      // 11. Neon Walls & Slingshots
      ctx.strokeStyle = tbl.accent;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      staticWalls.forEach((seg, idx) => {
        ctx.strokeStyle = idx >= 9 ? tbl.secondary : tbl.accent;
        ctx.beginPath();
        ctx.moveTo(seg[0], seg[1]);
        ctx.lineTo(seg[2], seg[3]);
        ctx.stroke();
      });

      // Plunger Spring Visual in Bottom-Right Shooter Lane
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(356, 512, 22, 34);
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.strokeRect(356, 512, 22, 34);

      // Plasma Drain Shield Laser across Bottom Gap
      if (st.drainShield) {
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(106, H - 22);
        ctx.lineTo(242, H - 22);
        ctx.stroke();
      }

      // 12. Left & Right Neon Chrome Flippers
      [
        { px: leftPivot.x, py: leftPivot.y, ang: st.leftAngle },
        { px: rightPivot.x, py: rightPivot.y, ang: st.rightAngle }
      ].forEach((fl) => {
        const tx = fl.px + Math.cos(fl.ang) * FLIPPER_LEN;
        const ty = fl.py + Math.sin(fl.ang) * FLIPPER_LEN;
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fl.px, fl.py);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fl.px, fl.py);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      });

      // 13. Chrome Pinballs
      st.balls.forEach((b) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x - 2.6, b.y - 2.6, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // 14. Floating Hit Popups
      st.floatTexts.forEach((ft) => {
        ctx.globalAlpha = Math.min(1, ft.life / 14);
        ctx.fillStyle = ft.color;
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
      });
      ctx.globalAlpha = 1;
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
      style={{ '--pin-accent': activeTable.accent }}
      aria-label="80s Neon Cyber-Pinball 5-Table Machine"
    >
      <div className="tm-pin2-cabinet">
        {/* 1. COMPACT TOP MARQUEE & STAKE BAR */}
        <header className="tm-pin2-header">
          <div className="tm-pin2-title-wrap">
            {onBackToFeed && (
              <button type="button" className="tm-bandit-back-btn" onClick={onBackToFeed}>
                ← Memes
              </button>
            )}
            <div>
              <div className="tm-pin2-eyebrow">{activeTable.badge}</div>
              <h2 className="tm-pin2-title">{activeTable.name}</h2>
            </div>
          </div>

          <div className="tm-pin2-stake-wrap">
            <span className="tm-crush2-wallet">🪙 {tokens}</span>
            {stakedTokens > 0 && !gameOverInfo ? (
              <span className="tm-crush2-stake-active">🏆 10-🪙 PRIZE GAME</span>
            ) : (
              <button
                type="button"
                className="tm-crush2-prize-btn"
                onClick={handleStartPrizeRun}
                title="Insert 10 Tokens to play for 8–32 Token high-score payouts!"
              >
                🪙 Insert {entryCost} (Win up to 32 🪙)
              </button>
            )}
          </div>
        </header>

        {/* 2. 5-TABLE SELECTOR STRIP */}
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

        {/* 3. DIGITAL VFD SCOREBOARD */}
        <div className="tm-pin2-hud">
          <div className="tm-pin2-stat">
            <span>SCORE</span>
            <strong>{hudScore.toLocaleString()}</strong>
          </div>
          <div className="tm-pin2-stat">
            <span>BALLS</span>
            <strong>{'🎱'.repeat(Math.max(0, hudBallsLeft)) || '0'}</strong>
          </div>
          <div className="tm-pin2-stat">
            <span>MULT</span>
            <strong style={{ color: '#facc15' }}>{hudMultiplier}×</strong>
          </div>
          <div className="tm-pin2-stat">
            <span>SHIELD</span>
            <strong style={{ color: hudShield ? '#00f3ff' : '#64748b' }}>
              {hudShield ? '🛡️ ON' : 'OFF'}
            </strong>
          </div>
          <div className="tm-pin2-stat">
            <span>BEST</span>
            <strong style={{ color: '#4ade80' }}>{bestScore.toLocaleString()}</strong>
          </div>
        </div>

        {/* 4. RESPONSIVE FIXED-FIT 60FPS PLAYFIELD CANVAS */}
        <div className="tm-pin2-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="tm-pin2-canvas"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = e.clientX - rect.left;
              const relY = e.clientY - rect.top;
              // Tapping right shooter lane launches ball; left/right half flips!
              if (relX > rect.width * 0.84 && relY > rect.height * 0.65) {
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
                <div style={{ fontSize: '36px' }}>
                  {gameOverInfo.payout > 0 ? '🏆🪙' : '🎱'}
                </div>
                <h3>GAME OVER — {gameOverInfo.score.toLocaleString()} PTS</h3>
                <p>
                  {gameOverInfo.staked > 0
                    ? gameOverInfo.payout > 0
                      ? `Awesome run! You won +${gameOverInfo.payout} 🪙 Arcade Tokens!`
                      : 'Needed 8,000+ pts to cash on a 10-🪙 coin-op run. Try again!'
                    : `Free Practice Complete! (Insert ${entryCost} 🪙 & score 8k/15k/25k/40k+ to win up to 32 🪙!)`}
                </p>
                <div className="tm-crush2-modal-btns">
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => resetTableGame(activeTable, 0)}
                  >
                    🆓 Play Free Practice
                  </button>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    onClick={handleStartPrizeRun}
                  >
                    🪙 Play Prize Run ({entryCost} 🪙)
                  </button>
                  {tokens < entryCost && onOpenUpload && (
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
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

        {/* 5. DEDICATED THUMB-FRIENDLY IPAD / IPHONE FLIPPER & PLUNGER DECK */}
        <div className="tm-pin2-controls">
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
            ◀ LEFT FLIP
          </button>

          <button
            type="button"
            className="tm-pin2-launch-btn"
            onClick={launchPlunger}
          >
            🚀 LAUNCH
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
            onPointerCancel={() => setFlipperState('right', false)}
          >
            RIGHT FLIP ▶
          </button>
        </div>

        <div className="tm-pin2-banner">{hudBanner}</div>
      </div>
    </section>
  );
}
