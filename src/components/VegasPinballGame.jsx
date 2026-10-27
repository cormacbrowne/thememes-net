import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { formatWindowCountdown } from '../data/starterMemes';

const TABLE_W = 460;
const TABLE_H = 620;
const SHOOTER_X = 412; // Wall separating main playfield (0..412) and shooter lane (412..460)
const BALL_R = 10;
const GRAVITY = 0.21;

const INITIAL_BUMPERS = [
  { id: 0, x: 206, y: 185, r: 30, pts: 300, emoji: '🎰', label: '777', color: '#facc15', glow: '#f97316' },
  { id: 1, x: 122, y: 248, r: 26, pts: 250, emoji: '🦆', label: 'QUACK', color: '#00f3ff', glow: '#38bdf8' },
  { id: 2, x: 290, y: 248, r: 26, pts: 250, emoji: '💀', label: 'BOOM', color: '#f472b6', glow: '#ec4899' },
  { id: 3, x: 206, y: 312, r: 25, pts: 350, emoji: '💎', label: 'VIP', color: '#4ade80', glow: '#22c55e' }
];

const ROLLOVER_LANES = [
  { id: 0, letter: 'L', x: 112, y: 74 },
  { id: 1, letter: 'U', x: 174, y: 74 },
  { id: 2, letter: 'C', x: 236, y: 74 },
  { id: 3, letter: 'K', x: 298, y: 74 }
];

// Slanted guide walls funneling the ball cleanly toward the flippers
const GUIDE_WALLS = [
  // Left upper & lower slingshot rails
  { x1: 18, y1: 390, x2: 114, y2: 548, bounce: 0.85, isKicker: false },
  { x1: 54, y1: 420, x2: 116, y2: 506, bounce: 1.35, isKicker: true, label: 'BOING!' },
  // Right upper & lower slingshot rails
  { x1: 394, y1: 390, x2: 298, y2: 548, bounce: 0.85, isKicker: false },
  { x1: 358, y1: 420, x2: 296, y2: 506, bounce: 1.35, isKicker: true, label: 'BOING!' },
  // Top left deflector curve
  { x1: 18, y1: 95, x2: 95, y2: 24, bounce: 0.9, isKicker: false },
  // Top right shooter arch deflector
  { x1: 345, y1: 20, x2: 446, y2: 92, bounce: 0.92, isKicker: false }
];

/**
 * Closest point on segment (x1,y1)-(x2,y2) to point (px,py)
 */
function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1, t: 0 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy, t };
}

export default function VegasPinballGame({
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
    playsLeft ?? playsLeftInWindow ?? ARCADE_ECONOMY_RULES.SUB_GAMES.PINBALL_PLAYS_PER_WINDOW;
  const effectiveResetMs = resetMs ?? windowResetMs ?? 0;
  const effectiveGameTokensLeft =
    gameTokensRemainingToday ??
    Math.max(
      0,
      ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.games -
        (tokenLedger?.byCategory?.games || 0)
    );
  const completeRoundHandler = onCompleteRound || onCompleteGameRound;

  const canvasRef = useRef(null);

  const [score, setScore] = useState(0);
  const [storedHighScore, setStoredHighScore] = useState(() =>
    Number(localStorage.getItem('tm_pinball_highscore') || 0)
  );
  const highScore = Math.max(storedHighScore, score);
  const [ballsLeft, setBallsLeft] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [ballInShooter, setBallInShooter] = useState(true);
  const [isTilted, setIsTilted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roundSummary, setRoundSummary] = useState(null);
  const [statusBanner, setStatusBanner] = useState('🚀 Pull Plunger or Press SPACE to Launch Ball 1!');
  const [copiedShare, setCopiedShare] = useState(false);

  const roundRewardedRef = useRef(false);

  // Mutable 60fps physics state stored in ref to avoid React re-render overhead per frame
  const simRef = useRef({
    ball: { x: 434, y: 555, vx: 0, vy: 0, inShooter: true },
    leftFlipper: { pressed: false, angle: 0.42, prevAngle: 0.42 },
    rightFlipper: { pressed: false, angle: -0.42, prevAngle: -0.42 },
    plungerCharge: 0,
    plungerCharging: false,
    bumpers: INITIAL_BUMPERS.map((b) => ({ ...b, flash: 0 })),
    lanesLit: [false, false, false, false],
    jackpotLit: true,
    jackpotCooldown: 0,
    floatingTexts: [],
    nudgeTimestamps: [],
    tilted: false,
    score: 0,
    multiplier: 1,
    ballsLeft: 3,
    gameOver: false
  });

  useEffect(() => {
    if (score > storedHighScore) {
      localStorage.setItem('tm_pinball_highscore', String(score));
    }
  }, [score, storedHighScore]);

  const spawnCanvasText = (x, y, text, color = '#facc15') => {
    simRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.4
    });
  };

  const finalizePinballRound = useCallback(
    (finalScore) => {
      if (roundRewardedRef.current) return;
      roundRewardedRef.current = true;
      simRef.current.gameOver = true;
      setGameOver(true);
      if (finalScore > storedHighScore) {
        setStoredHighScore(finalScore);
      }

      // Logical, fair token payout: 1 token per 450 pts, max 35 tokens per game round
      const rawTokens = Math.floor(finalScore / 450) + (finalScore >= 1000 ? 4 : finalScore >= 400 ? 2 : 0);
      const requestedTokens = Math.min(
        ARCADE_ECONOMY_RULES.SUB_GAMES.MAX_TOKENS_PER_ROUND,
        Math.max(0, rawTokens)
      );
      const xpEarned = Math.min(250, Math.max(25, Math.floor(finalScore / 40)));

      let actualTokensWon = requestedTokens;
      let capNote = '';
      if (completeRoundHandler) {
        const res = completeRoundHandler({
          gameId: 'pinball',
          score: finalScore,
          requestedTokens,
          xpEarned
        });
        if (res && typeof res.awardedTokens === 'number') {
          actualTokensWon = res.awardedTokens;
          if (res.reason === 'daily_cap_reached' || res.reason === 'category_cap_reached') {
            capNote = ' (Daily Arcade Token Cap reached — high score saved!)';
          }
        }
      }

      sfx.playJackpot();
      setRoundSummary({
        score: finalScore,
        tokensWon: actualTokensWon,
        xpEarned,
        capNote
      });
    },
    [storedHighScore, completeRoundHandler]
  );

  const launchPlunger = useCallback((customPower = 16.5) => {
    const st = simRef.current;
    if (st.gameOver) return;
    if (st.ball.inShooter || (st.ball.x > SHOOTER_X && st.ball.y > 490)) {
      sfx.playPlungerLaunch();
      st.ball.vy = -(customPower + Math.random() * 2.2);
      st.ball.vx = -1.2;
      st.plungerCharge = 0;
      st.plungerCharging = false;
      setStatusBanner('🎱 BALL IN PLAY! Hit the 777 & Duck Bumpers!');
    }
  }, []);

  const handleNudgeTable = useCallback(() => {
    const st = simRef.current;
    if (st.gameOver || st.tilted || st.ball.inShooter) return;
    const now = Date.now();
    st.nudgeTimestamps = [...st.nudgeTimestamps.filter((t) => now - t < 4000), now];

    if (st.nudgeTimestamps.length >= 3) {
      st.tilted = true;
      setIsTilted(true);
      sfx.playSadTrombone();
      setStatusBanner('🚨 TILT! Too much shaking — Flippers locked for this ball!');
      spawnCanvasText(TABLE_W / 2 - 25, 340, '🚨 TILT!!', '#ef4444');
      return;
    }

    sfx.playBoing(2);
    st.ball.vx += (Math.random() - 0.5) * 5.5;
    st.ball.vy -= 2.6;
    spawnCanvasText(st.ball.x, st.ball.y - 14, '🫨 NUDGE!', '#38bdf8');
  }, []);

  const handleRestartPinball = (useTokensIfEmpty = false) => {
    if (effectivePlaysLeft <= 0) {
      if (useTokensIfEmpty && onSpendTokensForPlay) {
        const ok = onSpendTokensForPlay('pinball', ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST);
        if (!ok) return;
      } else {
        sfx.playSadTrombone();
        return;
      }
    }

    sfx.playMutate();
    roundRewardedRef.current = false;
    simRef.current = {
      ball: { x: 434, y: 555, vx: 0, vy: 0, inShooter: true },
      leftFlipper: { pressed: false, angle: 0.42, prevAngle: 0.42 },
      rightFlipper: { pressed: false, angle: -0.42, prevAngle: -0.42 },
      plungerCharge: 0,
      plungerCharging: false,
      bumpers: INITIAL_BUMPERS.map((b) => ({ ...b, flash: 0 })),
      lanesLit: [false, false, false, false],
      jackpotLit: true,
      jackpotCooldown: 0,
      floatingTexts: [],
      nudgeTimestamps: [],
      tilted: false,
      score: 0,
      multiplier: 1,
      ballsLeft: 3,
      gameOver: false
    };
    setScore(0);
    setBallsLeft(3);
    setMultiplier(1);
    setBallInShooter(true);
    setIsTilted(false);
    setGameOver(false);
    setRoundSummary(null);
    setStatusBanner('🚀 Pull Plunger or Press SPACE to Launch Ball 1!');
  };

  // Keyboard Controls for Left/Right Flippers, Plunger & Nudge
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      const st = simRef.current;
      if (st.gameOver) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (!st.leftFlipper.pressed && !st.tilted) {
          sfx.playFlipperClick(true);
        }
        st.leftFlipper.pressed = true;
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === '/'
      ) {
        e.preventDefault();
        if (!st.rightFlipper.pressed && !st.tilted) {
          sfx.playFlipperClick(true);
        }
        st.rightFlipper.pressed = true;
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        st.plungerCharging = true;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleNudgeTable();
      }
    };

    const onKeyUp = (e) => {
      const st = simRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'z' || e.key === 'Z') {
        st.leftFlipper.pressed = false;
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === '/'
      ) {
        st.rightFlipper.pressed = false;
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        if (st.plungerCharging) {
          const power = 14 + (st.plungerCharge / 100) * 6.5;
          launchPlunger(power);
        }
        st.plungerCharging = false;
        st.plungerCharge = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [launchPlunger, handleNudgeTable]);

  // 60FPS Pinball Physics & Neon Vegas Renderer Loop
  useEffect(() => {
    let animId = null;

    const stepPhysicsAndRender = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const st = simRef.current;

      // 1. Update Plunger Charge
      if (st.plungerCharging && st.ball.inShooter) {
        st.plungerCharge = Math.min(100, st.plungerCharge + 3.2);
      }

      // 2. Update Flippers (smooth angular interpolation)
      st.leftFlipper.prevAngle = st.leftFlipper.angle;
      st.rightFlipper.prevAngle = st.rightFlipper.angle;
      const targetLeft = st.leftFlipper.pressed && !st.tilted ? -0.46 : 0.42;
      const targetRight = st.rightFlipper.pressed && !st.tilted ? 0.46 : -0.42;
      st.leftFlipper.angle += (targetLeft - st.leftFlipper.angle) * 0.42;
      st.rightFlipper.angle += (targetRight - st.rightFlipper.angle) * 0.42;

      if (st.jackpotCooldown > 0) st.jackpotCooldown -= 1;

      // 3. Update Ball Physics (2 sub-steps per frame for crisp collision accuracy)
      if (!st.gameOver) {
        for (let sub = 0; sub < 2; sub++) {
          const b = st.ball;

          if (b.inShooter && b.x > SHOOTER_X && b.y >= 554 && b.vy >= 0) {
            b.x = 434;
            b.y = 555;
            b.vx = 0;
            b.vy = 0;
          } else {
            b.vy += GRAVITY * 0.5;
            b.x += b.vx * 0.5;
            b.y += b.vy * 0.5;

            // Once ball curves out of top shooter lane into playfield, close one-way gate
            if (b.inShooter && b.x < SHOOTER_X - BALL_R) {
              b.inShooter = false;
              setBallInShooter(false);
            }

            // Outer Playfield Boundary Collisions
            if (b.x < 18 + BALL_R) {
              b.x = 18 + BALL_R;
              b.vx = Math.abs(b.vx) * 0.86;
            }
            if (b.y < 20 + BALL_R) {
              b.y = 20 + BALL_R;
              b.vy = Math.abs(b.vy) * 0.86;
              if (b.inShooter) {
                b.vx -= 2.2; // Curve left into main table
              }
            }

            if (b.inShooter) {
              if (b.x > 446 - BALL_R) {
                b.x = 446 - BALL_R;
                b.vx = -Math.abs(b.vx) * 0.85;
              }
              if (b.y > 110 && b.x < SHOOTER_X + BALL_R) {
                b.x = SHOOTER_X + BALL_R;
                b.vx = Math.abs(b.vx) * 0.85;
              }
              if (b.y > 555) {
                b.y = 555;
                b.vy = 0;
                b.vx = 0;
              }
            } else {
              // Main playfield right wall (x = SHOOTER_X)
              if (b.x > SHOOTER_X - BALL_R) {
                b.x = SHOOTER_X - BALL_R;
                b.vx = -Math.abs(b.vx) * 0.86;
              }
            }

            // Guide Walls & Slingshot Kickers
            GUIDE_WALLS.forEach((w) => {
              const cp = closestPointOnSegment(b.x, b.y, w.x1, w.y1, w.x2, w.y2);
              const dx = b.x - cp.x;
              const dy = b.y - cp.y;
              const dist = Math.hypot(dx, dy);
              if (dist < BALL_R + 2 && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                b.x = cp.x + nx * (BALL_R + 2.2);
                b.y = cp.y + ny * (BALL_R + 2.2);
                const dot = b.vx * nx + b.vy * ny;
                if (dot < 0) {
                  b.vx = (b.vx - 2 * dot * nx) * w.bounce;
                  b.vy = (b.vy - 2 * dot * ny) * w.bounce;
                  if (w.isKicker && sub === 0) {
                    const pts = 75 * st.multiplier;
                    st.score += pts;
                    setScore(st.score);
                    sfx.playBoing(2);
                    spawnCanvasText(cp.x, cp.y - 10, `+${pts}`, '#38bdf8');
                  }
                }
              }
            });

            // 4 Neon Vegas Pop Bumpers
            st.bumpers.forEach((bmp, idx) => {
              const dx = b.x - bmp.x;
              const dy = b.y - bmp.y;
              const dist = Math.hypot(dx, dy);
              const minDist = BALL_R + bmp.r;
              if (dist < minDist && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                b.x = bmp.x + nx * (minDist + 2);
                b.y = bmp.y + ny * (minDist + 2);
                const kickSpeed = 8.4;
                b.vx = nx * kickSpeed + (Math.random() - 0.5) * 1.4;
                b.vy = ny * kickSpeed;
                bmp.flash = 12;

                const pts = bmp.pts * st.multiplier;
                st.score += pts;
                setScore(st.score);

                if (idx === 1) sfx.playRubberDuck();
                else if (idx === 2) sfx.playVineBoom();
                else sfx.playPinballBumper(idx);

                spawnCanvasText(bmp.x, bmp.y - bmp.r - 6, `${bmp.emoji} +${pts}`, bmp.color);
              }
            });

            // Top Vegas Rollover Lanes (L - U - C - K)
            ROLLOVER_LANES.forEach((lane, idx) => {
              if (Math.hypot(b.x - lane.x, b.y - lane.y) < 18 && !st.lanesLit[idx]) {
                st.lanesLit[idx] = true;
                const pts = 200 * st.multiplier;
                st.score += pts;
                setScore(st.score);
                sfx.playPinballBumper(idx);
                spawnCanvasText(lane.x, lane.y - 12, `LANE ${lane.letter}! +${pts}`, '#facc15');

                // Check if all 4 L-U-C-K lanes are lit -> Upgrade Multiplier!
                if (st.lanesLit.every(Boolean)) {
                  st.lanesLit = [false, false, false, false];
                  st.multiplier = Math.min(5, st.multiplier + 1);
                  setMultiplier(st.multiplier);
                  st.score += 1000;
                  setScore(st.score);
                  sfx.playJackpot();
                  setStatusBanner(`🌟 VEGAS L-U-C-K COMPLETED! ${st.multiplier}x MULTIPLIER + 1,000 BONUS!`);
                  spawnCanvasText(206, 110, `🔥 ${st.multiplier}x MULTIPLIER!`, '#facc15');
                }
              }
            });

            // Vegas Center Jackpot Sinkhole (x: 206, y: 118)
            if (
              st.jackpotCooldown <= 0 &&
              Math.hypot(b.x - 206, b.y - 118) < 18
            ) {
              st.jackpotCooldown = 95;
              const jackpotPts = 1500 * st.multiplier;
              st.score += jackpotPts;
              setScore(st.score);
              sfx.playJackpot();
              setTimeout(() => sfx.playAirhorn(), 150);
              setStatusBanner(`🎰 VEGAS SINKHOLE JACKPOT!! +${jackpotPts.toLocaleString()} PTS!`);
              spawnCanvasText(206, 95, `🎰 JACKPOT +${jackpotPts}!`, '#fde047');
              b.vx = (Math.random() > 0.5 ? 1 : -1) * 6.5;
              b.vy = 6.2;
            }

            // Flipper Collisions (Left & Right)
            const flippers = [
              {
                px: 120,
                py: 552,
                len: 74,
                angle: st.leftFlipper.angle,
                angVel: st.leftFlipper.angle - st.leftFlipper.prevAngle,
                dir: 1
              },
              {
                px: 292,
                py: 552,
                len: 74,
                angle: st.rightFlipper.angle,
                angVel: st.rightFlipper.angle - st.rightFlipper.prevAngle,
                dir: -1
              }
            ];

            flippers.forEach((fl) => {
              const tipX = fl.px + Math.cos(fl.angle) * fl.len * fl.dir;
              const tipY = fl.py + Math.sin(fl.angle) * fl.len * fl.dir;
              const cp = closestPointOnSegment(b.x, b.y, fl.px, fl.py, tipX, tipY);
              const dx = b.x - cp.x;
              const dy = b.y - cp.y;
              const dist = Math.hypot(dx, dy);
              const minDist = BALL_R + 7;

              if (dist < minDist && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                b.x = cp.x + nx * (minDist + 1.5);
                b.y = cp.y + ny * (minDist + 1.5);

                const isSwingingUp =
                  (fl.dir === 1 && fl.angVel < -0.02) ||
                  (fl.dir === -1 && fl.angVel > 0.02);

                if (isSwingingUp) {
                  const leverage = 0.55 + cp.t * 0.7;
                  b.vy = -12.8 * leverage;
                  b.vx = (b.x - 206) * 0.06 + (Math.random() - 0.5) * 2.5;
                } else {
                  const dot = b.vx * nx + b.vy * ny;
                  if (dot < 0) {
                    b.vx = (b.vx - 1.75 * dot * nx) * 0.8;
                    b.vy = (b.vy - 1.75 * dot * ny) * 0.8;
                  }
                }
              }
            });

            // Clamp max ball speed so it never tunnels
            const spd = Math.hypot(b.vx, b.vy);
            if (spd > 16.5) {
              b.vx = (b.vx / spd) * 16.5;
              b.vy = (b.vy / spd) * 16.5;
            }

            // Ball Drain Check at bottom (y > TABLE_H + 14)
            if (b.y > TABLE_H + 14) {
              if (st.ballsLeft > 1) {
                st.ballsLeft -= 1;
                setBallsLeft(st.ballsLeft);
                st.tilted = false;
                setIsTilted(false);
                b.x = 434;
                b.y = 555;
                b.vx = 0;
                b.vy = 0;
                b.inShooter = true;
                setBallInShooter(true);
                sfx.playSadTrombone();
                setStatusBanner(
                  `🎱 Ball Drained! ${st.ballsLeft} Ball${st.ballsLeft === 1 ? '' : 's'} Remaining — Launch when ready!`
                );
              } else {
                st.ballsLeft = 0;
                setBallsLeft(0);
                finalizePinballRound(st.score);
              }
            }
          }
        }
      }

      // ==========================================
      // RENDER VEGAS PINBALL CABINET & PLAYFIELD
      // ==========================================
      ctx.clearRect(0, 0, TABLE_W, TABLE_H);

      // Deep Casino Felt & Neon Gradient Background
      const bgGrad = ctx.createRadialGradient(206, 240, 30, 206, 310, 380);
      bgGrad.addColorStop(0, '#1e103a');
      bgGrad.addColorStop(0.55, '#0d0b1e');
      bgGrad.addColorStop(1, '#06070f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, TABLE_W, TABLE_H);

      // Decorative Vegas Casino Diamond Center Art
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(206, 250, 118, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '900 15px "Courier New", monospace';
      ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.textAlign = 'center';
      ctx.fillText('★ FABULOUS LAS VEGAS ARCADE ★', 206, 385);
      ctx.fillText(`${st.multiplier}X TABLE MULTIPLIER`, 206, 405);
      ctx.restore();

      // Shooter Lane Divider Wall
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(SHOOTER_X, 110);
      ctx.lineTo(SHOOTER_X, TABLE_H);
      ctx.stroke();

      // Vegas Jackpot Sinkhole (x: 206, y: 118)
      ctx.save();
      ctx.beginPath();
      ctx.arc(206, 118, 20, 0, Math.PI * 2);
      ctx.fillStyle = st.jackpotCooldown > 0 ? 'rgba(250, 204, 21, 0.35)' : 'rgba(236, 72, 153, 0.28)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = st.jackpotCooldown > 0 ? '#facc15' : '#ec4899';
      ctx.stroke();
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.fillText('🎰 1.5K', 206, 122);
      ctx.restore();

      // Top L-U-C-K Rollover Lanes
      ROLLOVER_LANES.forEach((lane, idx) => {
        const lit = st.lanesLit[idx];
        ctx.save();
        ctx.beginPath();
        ctx.arc(lane.x, lane.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = lit ? '#facc15' : 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = lit ? '#fde047' : 'rgba(0, 243, 255, 0.4)';
        ctx.stroke();
        ctx.font = '900 13px sans-serif';
        ctx.fillStyle = lit ? '#090a0f' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lane.letter, lane.x, lane.y);
        ctx.restore();
      });

      // Guide Walls & Slingshot Kickers
      GUIDE_WALLS.forEach((w) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.lineWidth = w.isKicker ? 5 : 4;
        ctx.strokeStyle = w.isKicker ? '#f472b6' : '#38bdf8';
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      });

      // 4 Neon Vegas Pop Bumpers
      st.bumpers.forEach((bmp) => {
        if (bmp.flash > 0) bmp.flash -= 1;
        const radius = bmp.r + (bmp.flash > 0 ? 4 : 0);
        ctx.save();
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = bmp.flash > 0 ? bmp.color : 'rgba(15, 23, 42, 0.92)';
        ctx.shadowColor = bmp.glow;
        ctx.shadowBlur = bmp.flash > 0 ? 24 : 12;
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = bmp.color;
        ctx.stroke();

        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bmp.emoji, bmp.x, bmp.y - 4);

        ctx.font = '900 9px monospace';
        ctx.fillStyle = bmp.flash > 0 ? '#090a0f' : '#f8fafc';
        ctx.fillText(bmp.label, bmp.x, bmp.y + 13);
        ctx.restore();
      });

      // Draw Left & Right Flippers
      const drawFlipper = (px, py, angle, dir) => {
        const tx = px + Math.cos(angle) * 74 * dir;
        const ty = py + Math.sin(angle) * 74 * dir;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.strokeStyle = st.tilted ? '#64748b' : '#facc15';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      };

      drawFlipper(120, 552, st.leftFlipper.angle, 1);
      drawFlipper(292, 552, st.rightFlipper.angle, -1);

      // Draw Spring Plunger in Shooter Lane
      const springCompress = (st.plungerCharge / 100) * 32;
      ctx.save();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(424, 566 + springCompress, 20, 44 - springCompress);
      ctx.restore();

      // Draw Silver Chrome Pinball
      ctx.save();
      ctx.beginPath();
      ctx.arc(st.ball.x, st.ball.y, BALL_R, 0, Math.PI * 2);
      const ballGrad = ctx.createRadialGradient(
        st.ball.x - 3,
        st.ball.y - 3,
        2,
        st.ball.x,
        st.ball.y,
        BALL_R
      );
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.6, '#e2e8f0');
      ballGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = ballGrad;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();

      // Draw Floating Score Popups
      st.floatingTexts.forEach((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.024;
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '900 13px Inter, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      st.floatingTexts = st.floatingTexts.filter((ft) => ft.alpha > 0);

      animId = requestAnimationFrame(stepPhysicsAndRender);
    };

    animId = requestAnimationFrame(stepPhysicsAndRender);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [finalizePinballRound]);

  const handleSharePinball = () => {
    const shareUrl = `${window.location.origin}/?mode=pinball`;
    const shareText = `🎱 I just scored ${score.toLocaleString()} pts on the LAS VEGAS MEME PINBALL machine at THE MEMES.net! Think you can beat my high score?`;
    navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(() => {});
    if (typeof navigator.share === 'function') {
      navigator
        .share({
          title: '🎱 Las Vegas Retro Pinball — THE MEMES.net',
          text: shareText,
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop(3);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <section className="tm-subgame-wrap" aria-label="Las Vegas Retro Pinball Machine">
      <div className="tm-subgame-card tm-pinball-cabinet">
        {/* Top Header */}
        <div className="tm-subgame-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onBackToFeed}>
              ← Back to Memes
            </button>
            <div>
              <h2 className="tm-subgame-title">
                🎱 LAS VEGAS RETRO PINBALL <span className="tm-subgame-badge">{multiplier}x MULT</span>
              </h2>
              <div className="tm-subgame-subtitle">
                Controls: <strong>← / →</strong> or <strong>A / D</strong> Flippers • <strong>SPACE</strong> Launch • <strong>↑</strong> Nudge Table!
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tm-spin-counter-pill" style={{ borderColor: '#facc15', color: '#facc15' }}>
              🪙 {effectiveGameTokensLeft} Game Tokens Left Today
            </span>
            <button type="button" className="tm-btn" onClick={handleSharePinball}>
              {copiedShare ? '✅ Challenge Link Copied!' : '🔗 Challenge Friends'}
            </button>
          </div>
        </div>

        {/* Vegas LED Scoreboard Bar */}
        <div className="tm-crush-hud-grid">
          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">PINBALL SCORE</span>
            <strong className="tm-crush-stat-val" style={{ color: '#facc15' }}>
              {score.toLocaleString()}
            </strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              +1 🪙 Token per 450 pts (Max {ARCADE_ECONOMY_RULES.SUB_GAMES.MAX_TOKENS_PER_ROUND}/round)
            </span>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">BALLS REMAINING</span>
            <strong className="tm-crush-stat-val" style={{ color: '#00f3ff' }}>
              {'🎱 '.repeat(ballsLeft) || '0'} ({ballsLeft}/3)
            </strong>
            <span style={{ fontSize: '11px', color: isTilted ? '#ef4444' : '#94a3b8' }}>
              {isTilted ? '🚨 TILTED!' : `Table Multiplier: ${multiplier}x`}
            </span>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">HIGH SCORE &amp; PLAYS</span>
            <strong className="tm-crush-stat-val" style={{ color: '#f472b6' }}>
              🏆 {highScore.toLocaleString()}
            </strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {effectivePlaysLeft > 0
                ? `🎟️ ${effectivePlaysLeft}/${ARCADE_ECONOMY_RULES.SUB_GAMES.PINBALL_PLAYS_PER_WINDOW} Free Plays in Window`
                : `⏳ Refills in ${formatWindowCountdown(effectiveResetMs)}`}
            </span>
          </div>
        </div>

        <div className="tm-pinball-marquee-banner">{statusBanner}</div>

        {/* Pinball Playfield Stage */}
        <div className="tm-pinball-stage">
          <canvas
            ref={canvasRef}
            width={TABLE_W}
            height={TABLE_H}
            className="tm-pinball-canvas"
          />

          {/* Game Over Summary Overlay */}
          {gameOver && roundSummary && (
            <div className="tm-subgame-gameover-overlay">
              <div className="tm-subgame-gameover-card">
                <div style={{ fontSize: '46px' }}>🎰🎱🪙</div>
                <h3 style={{ margin: '6px 0', fontSize: '22px', color: '#facc15' }}>
                  VEGAS PINBALL GAME OVER!
                </h3>
                <p style={{ margin: '4px 0 12px', color: '#cbd5e1', fontSize: '14px' }}>
                  Final Score: <strong>{roundSummary.score.toLocaleString()} pts</strong> • You Won{' '}
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
                      onClick={() => handleRestartPinball(false)}
                    >
                      🎱 Play Again ({effectivePlaysLeft} Free Left)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      disabled={tokens < ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST}
                      onClick={() => handleRestartPinball(true)}
                    >
                      🪙 Spend {ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST} Tokens to Play Now (or wait{' '}
                      {formatWindowCountdown(effectiveResetMs)})
                    </button>
                  )}

                  <button type="button" className="tm-btn" onClick={handleSharePinball}>
                    {copiedShare ? '✅ Copied!' : '🔗 Share High Score'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Arcade Cabinet Paddle Buttons (Touch & Mouse Friendly!) */}
        <div className="tm-pinball-controls-dock">
          <button
            type="button"
            className="tm-pinball-flipper-btn left"
            onPointerDown={() => {
              if (!simRef.current.tilted) sfx.playFlipperClick(true);
              simRef.current.leftFlipper.pressed = true;
            }}
            onPointerUp={() => {
              simRef.current.leftFlipper.pressed = false;
            }}
            onPointerLeave={() => {
              simRef.current.leftFlipper.pressed = false;
            }}
          >
            ◀ LEFT FLIPPER (A / ←)
          </button>

          <button
            type="button"
            className="tm-btn tm-btn-primary tm-pinball-launch-btn"
            onClick={() => launchPlunger(17.2)}
            disabled={gameOver}
          >
            {ballInShooter ? '🚀 LAUNCH BALL' : '🚀 PLUNGER'}
          </button>

          <button
            type="button"
            className="tm-btn"
            onClick={handleNudgeTable}
            disabled={gameOver || isTilted}
            title="Shake the pinball table (Warning: 3 shakes = TILT!)"
          >
            🫨 Nudge
          </button>

          <button
            type="button"
            className="tm-btn"
            onClick={() => finalizePinballRound(score)}
            disabled={gameOver || score === 0}
            title="Cash out current score for Arcade Tokens"
          >
            🏁 Cash Out
          </button>

          <button
            type="button"
            className="tm-pinball-flipper-btn right"
            onPointerDown={() => {
              if (!simRef.current.tilted) sfx.playFlipperClick(true);
              simRef.current.rightFlipper.pressed = true;
            }}
            onPointerUp={() => {
              simRef.current.rightFlipper.pressed = false;
            }}
            onPointerLeave={() => {
              simRef.current.rightFlipper.pressed = false;
            }}
          >
            RIGHT FLIPPER (D / →) ▶
          </button>
        </div>
      </div>
    </section>
  );
}
