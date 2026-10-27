import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { formatWindowCountdown } from '../data/starterMemes';

const TABLE_W = 460;
const TABLE_H = 620;
const SHOOTER_X = 414; // Wall separating main playfield (18..414) and shooter lane (414..460)
const PLAYFIELD_CENTER_X = 215;
const BALL_R = 9.5;
const GRAVITY = 0.215;

// Widened Flipper Geometry:
// Left pivot at x=104, Right pivot at x=326 (222px pivot distance).
// Base length 64px leaves a genuine ~102px tip-to-tip gap (~70px ball center clearance) so balls can actually drain down the middle unless saved by Flippers, Nudge, or the Plasma Shield!
const LEFT_FLIPPER_PIVOT = { x: 104, y: 556 };
const RIGHT_FLIPPER_PIVOT = { x: 326, y: 556 };
const BASE_FLIPPER_LEN = 64;
const MEGA_FLIPPER_LEN = 80;

const INITIAL_BUMPERS = [
  { id: 0, x: 215, y: 196, r: 28, pts: 350, emoji: '🎰', label: '777', color: '#facc15', glow: '#f97316' },
  { id: 1, x: 128, y: 256, r: 25, pts: 300, emoji: '🦆', label: 'QUACK', color: '#00f3ff', glow: '#38bdf8' },
  { id: 2, x: 302, y: 256, r: 25, pts: 300, emoji: '💀', label: 'BOOM', color: '#f472b6', glow: '#ec4899' },
  { id: 3, x: 215, y: 318, r: 24, pts: 400, emoji: '💎', label: 'VIP', color: '#4ade80', glow: '#22c55e' }
];

const ROLLOVER_LANES = [
  { id: 0, letter: 'L', x: 116, y: 70 },
  { id: 1, letter: 'U', x: 182, y: 70 },
  { id: 2, letter: 'C', x: 248, y: 70 },
  { id: 3, letter: 'K', x: 314, y: 70 }
];

const DROP_TARGETS_INIT = [
  { id: 0, letter: 'M', emoji: '🐸', x: 134, y: 144, hit: false, color: '#4ade80' },
  { id: 1, letter: 'E', emoji: '🔥', x: 188, y: 144, hit: false, color: '#fb923c' },
  { id: 2, letter: 'M', emoji: '💎', x: 242, y: 144, hit: false, color: '#00f3ff' },
  { id: 3, letter: 'E', emoji: '👑', x: 296, y: 144, hit: false, color: '#facc15' }
];

const POWERUP_TYPES = [
  {
    id: 'multiball',
    emoji: '🎱',
    label: 'MULTIBALL MADNESS!',
    short: '🎱 MULTIBALL',
    color: '#facc15',
    desc: 'Spawns extra glowing pinballs onto the table!'
  },
  {
    id: 'shield',
    emoji: '🛡️',
    label: 'PLASMA DRAIN SHIELD (16s)',
    short: '🛡️ SHIELD',
    color: '#00f3ff',
    desc: 'Laser barrier blocks the center drain gap!'
  },
  {
    id: 'mega',
    emoji: '🧲',
    label: 'MEGA MAGNET FLIPPERS (18s)',
    short: '🧲 MEGA PADDLES',
    color: '#c084fc',
    desc: '+25% longer magnetic flippers!'
  },
  {
    id: 'fever',
    emoji: '🔥',
    label: '2X VEGAS FEVER MODE (16s)',
    short: '🔥 2X FEVER',
    color: '#ec4899',
    desc: 'Doubles ALL scores + Vegas lightshow!'
  },
  {
    id: 'nuker',
    emoji: '💣',
    label: 'DANK BUMPER NUKER!',
    short: '💣 NUKER',
    color: '#4ade80',
    desc: 'Detonates all bumpers & targets at once!'
  }
];

const ORB_SPAWN_SPOTS = [
  { x: 156, y: 374 },
  { x: 274, y: 374 },
  { x: 215, y: 410 },
  { x: 112, y: 335 },
  { x: 318, y: 335 }
];

// Slanted guide walls & slingshot kickers leading to the widened flippers
const GUIDE_WALLS = [
  // Left outer return rail to left flipper pivot (104, 556)
  { id: 'l-rail', x1: 18, y1: 400, x2: 104, y2: 556, bounce: 0.84, isKicker: false },
  // Left slingshot triangle kicker + side walls
  { id: 'l-kick', x1: 52, y1: 422, x2: 112, y2: 508, bounce: 1.38, isKicker: true, label: 'BOING!' },
  { id: 'l-kback', x1: 52, y1: 422, x2: 52, y2: 492, bounce: 0.85, isKicker: false },
  { id: 'l-kbot', x1: 52, y1: 492, x2: 112, y2: 508, bounce: 0.85, isKicker: false },
  // Right outer return rail to right flipper pivot (326, 556)
  { id: 'r-rail', x1: 414, y1: 400, x2: 326, y2: 556, bounce: 0.84, isKicker: false },
  // Right slingshot triangle kicker + side walls
  { id: 'r-kick', x1: 378, y1: 422, x2: 318, y2: 508, bounce: 1.38, isKicker: true, label: 'BOING!' },
  { id: 'r-kback', x1: 378, y1: 422, x2: 378, y2: 492, bounce: 0.85, isKicker: false },
  { id: 'r-kbot', x1: 378, y1: 492, x2: 318, y2: 508, bounce: 0.85, isKicker: false },
  // Top left deflector arch
  { id: 'tl-arch', x1: 18, y1: 95, x2: 96, y2: 20, bounce: 0.9, isKicker: false },
  // Top right shooter arch deflector
  { id: 'tr-arch', x1: 344, y1: 20, x2: 448, y2: 92, bounce: 0.92, isKicker: false }
];

// Precompute 36 perimeter Vegas marquee bulb coordinates
const MARQUEE_BULBS = (() => {
  const bulbs = [];
  // Top edge
  for (let x = 30; x <= 395; x += 36) bulbs.push({ x, y: 10 });
  // Left edge
  for (let y = 45; y <= 575; y += 44) bulbs.push({ x: 9, y });
  // Right playfield divider edge
  for (let y = 45; y <= 575; y += 44) bulbs.push({ x: SHOOTER_X, y });
  return bulbs;
})();

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1, t: 0 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy, t };
}

function createRandomPowerUpOrb(forceTypeId = null) {
  const pType = forceTypeId
    ? POWERUP_TYPES.find((p) => p.id === forceTypeId) || POWERUP_TYPES[0]
    : POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  const spot = ORB_SPAWN_SPOTS[Math.floor(Math.random() * ORB_SPAWN_SPOTS.length)];
  return {
    ...pType,
    x: spot.x + Math.round((Math.random() - 0.5) * 26),
    y: spot.y + Math.round((Math.random() - 0.5) * 20),
    r: 17,
    pulse: 0
  };
}

function createShooterBall() {
  return {
    id: `ball-${Date.now()}-${Math.random()}`,
    x: 436,
    y: 555,
    vx: 0,
    vy: 0,
    inShooter: true,
    color: '#00f3ff',
    trail: []
  };
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
  const [activeBallsCount, setActiveBallsCount] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [ballInShooter, setBallInShooter] = useState(true);
  const [isTilted, setIsTilted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roundSummary, setRoundSummary] = useState(null);
  const [statusBanner, setStatusBanner] = useState(
    '🚀 Pull Plunger or Press SPACE! Hit ⚡ Power-Up Orbs & M-E-M-E Targets!'
  );
  const [copiedShare, setCopiedShare] = useState(false);

  // Active Power-Up HUD state synced periodically from simRef
  const [hudPowerUps, setHudPowerUps] = useState({
    shieldSec: 0,
    megaSec: 0,
    feverSec: 0,
    multiballActive: false
  });

  // 1-Click Tactical Pocket Boosters (1 free of each per round!)
  const [freeShieldBoosts, setFreeShieldBoosts] = useState(1);
  const [freeMultiballBoosts, setFreeMultiballBoosts] = useState(1);
  const [freeFeverBoosts, setFreeFeverBoosts] = useState(1);

  const roundRewardedRef = useRef(false);

  // Mutable 60fps physics & lighting state
  const simRef = useRef({
    balls: [createShooterBall()],
    leftFlipper: { pressed: false, angle: 0.4, prevAngle: 0.4 },
    rightFlipper: { pressed: false, angle: -0.4, prevAngle: -0.4 },
    plungerCharge: 0,
    plungerCharging: false,
    bumpers: INITIAL_BUMPERS.map((b) => ({ ...b, flash: 0 })),
    dropTargets: DROP_TARGETS_INIT.map((t) => ({ ...t })),
    lanesLit: [false, false, false, false],
    kickerFlash: { left: 0, right: 0 },
    spinner: { x: 64, y: 262, angle: 0, spinVel: 0, tickStep: 0 },
    powerUpOrb: createRandomPowerUpOrb('multiball'),
    orbRespawnFrames: 0,
    shieldFrames: 420, // 7-second Launch Ball Save shield on Ball 1
    megaFlipperFrames: 0,
    feverFrames: 0,
    lightShowFrames: 0,
    skillShotFrames: 0,
    jackpotCooldown: 0,
    shockwaves: [],
    floatingTexts: [],
    nudgeTimestamps: [],
    tilted: false,
    frameTick: 0,
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

  const spawnCanvasText = (x, y, text, color = '#facc15', size = 13) => {
    simRef.current.floatingTexts.push({
      x: Math.max(48, Math.min(SHOOTER_X - 48, x)),
      y,
      text,
      color,
      size,
      alpha: 1,
      vy: -1.55
    });
  };

  const spawnShockwave = (x, y, color = '#00f3ff', maxR = 65) => {
    simRef.current.shockwaves.push({
      x,
      y,
      r: 8,
      maxR,
      color,
      alpha: 1
    });
  };

  const activatePowerUpEffect = useCallback((pType, sourceX = PLAYFIELD_CENTER_X, sourceY = 340) => {
    const st = simRef.current;
    st.lightShowFrames = 150;
    spawnShockwave(sourceX, sourceY, pType.color || '#facc15', 95);

    if (pType.id === 'multiball') {
      sfx.playMultiballSiren();
      const extraColors = ['#facc15', '#ec4899', '#4ade80'];
      const toSpawn = st.balls.length === 1 ? 2 : 1;
      for (let i = 0; i < toSpawn && st.balls.length < 3; i++) {
        st.balls.push({
          id: `mb-${Date.now()}-${i}-${Math.random()}`,
          x: PLAYFIELD_CENTER_X + (i === 0 ? -36 : 36),
          y: 162,
          vx: (i === 0 ? -1 : 1) * (4.5 + Math.random() * 2),
          vy: -5.5,
          inShooter: false,
          color: extraColors[(st.balls.length + i) % extraColors.length],
          trail: []
        });
      }
      setBallInShooter(false);
      setActiveBallsCount(st.balls.length);
      const bonus = 800 * st.multiplier;
      st.score += bonus;
      setScore(st.score);
      setStatusBanner(`🎱🔥 MULTIBALL MADNESS!! ${st.balls.length} BALLS IN PLAY! +${bonus} PTS!`);
      spawnCanvasText(sourceX, sourceY - 12, `🎱 MULTIBALL! +${bonus}`, '#facc15', 16);
    } else if (pType.id === 'shield') {
      sfx.playPowerUpCollect();
      st.shieldFrames = Math.max(st.shieldFrames, 16 * 60);
      const bonus = 500 * st.multiplier;
      st.score += bonus;
      setScore(st.score);
      setStatusBanner('🛡️ PLASMA DRAIN SHIELD ACTIVE (16s)! Center gap is laser-protected!');
      spawnCanvasText(sourceX, sourceY - 12, `🛡️ PLASMA SHIELD! +${bonus}`, '#00f3ff', 15);
    } else if (pType.id === 'mega') {
      sfx.playPowerUpCollect();
      st.megaFlipperFrames = Math.max(st.megaFlipperFrames, 18 * 60);
      const bonus = 500 * st.multiplier;
      st.score += bonus;
      setScore(st.score);
      setStatusBanner('🧲 MEGA MAGNETIC FLIPPERS ACTIVE (18s)! Giant Paddles + Ball Attractor!');
      spawnCanvasText(sourceX, sourceY - 12, `🧲 MEGA PADDLES! +${bonus}`, '#c084fc', 15);
    } else if (pType.id === 'fever') {
      sfx.playPowerUpCollect();
      setTimeout(() => sfx.playAirhorn(), 120);
      st.feverFrames = Math.max(st.feverFrames, 16 * 60);
      const bonus = 750 * st.multiplier;
      st.score += bonus;
      setScore(st.score);
      setStatusBanner('🔥 2X VEGAS FEVER OVERDRIVE (16s)! ALL TABLE POINTS DOUBLED!');
      spawnCanvasText(sourceX, sourceY - 12, `🔥 2X FEVER MODE! +${bonus}`, '#ec4899', 16);
    } else if (pType.id === 'nuker') {
      sfx.playSpecialBomb();
      const feverMult = st.feverFrames > 0 ? 2 : 1;
      const nukePts = 1600 * st.multiplier * feverMult;
      st.score += nukePts;
      setScore(st.score);
      st.bumpers.forEach((bmp) => {
        bmp.flash = 22;
        spawnShockwave(bmp.x, bmp.y, bmp.color, 55);
      });
      const unhitTarget = st.dropTargets.find((t) => !t.hit);
      if (unhitTarget) unhitTarget.hit = true;
      setStatusBanner(`💣 DANK BUMPER NUKER DETONATED! ALL BUMPERS BLASTED FOR +${nukePts.toLocaleString()} PTS!`);
      spawnCanvasText(PLAYFIELD_CENTER_X, 250, `💣 NUKER BLAST! +${nukePts}`, '#4ade80', 16);
    }
  }, []);

  const finalizePinballRound = useCallback(
    (finalScore) => {
      if (roundRewardedRef.current) return;
      roundRewardedRef.current = true;
      simRef.current.gameOver = true;
      setGameOver(true);
      if (finalScore > storedHighScore) {
        setStoredHighScore(finalScore);
      }

      // Turbo-charged fair token payout: 1 token per 320 pts + milestone bonuses, up to 50 tokens/round
      const milestoneBonus =
        finalScore >= 12000 ? 12 : finalScore >= 6000 ? 8 : finalScore >= 2500 ? 5 : finalScore >= 800 ? 3 : 1;
      const rawTokens = Math.floor(finalScore / 320) + milestoneBonus;
      const requestedTokens = Math.min(
        ARCADE_ECONOMY_RULES.SUB_GAMES.MAX_TOKENS_PER_ROUND,
        Math.max(finalScore >= 200 ? 3 : 0, rawTokens)
      );
      const xpEarned = Math.min(350, Math.max(35, Math.floor(finalScore / 28)));

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

  const launchPlunger = useCallback((customPower = 17.2) => {
    const st = simRef.current;
    if (st.gameOver) return;
    const shooterBall = st.balls.find(
      (b) => b.inShooter || (b.x > SHOOTER_X && b.y > 470)
    );
    if (shooterBall) {
      sfx.playPlungerLaunch();
      shooterBall.vy = -(customPower + Math.random() * 2.2);
      shooterBall.vx = -1.4;
      st.plungerCharge = 0;
      st.plungerCharging = false;
      st.skillShotFrames = 210; // 3.5s Skill Shot window!
      st.shieldFrames = Math.max(st.shieldFrames, 420); // 7s automatic Ball Save on launch
      setStatusBanner('🎯 SKILL SHOT READY! Hit L-U-C-K or 777 Sinkhole + Collect ⚡ Power-Up Orbs!');
    }
  }, []);

  const handleNudgeTable = useCallback(() => {
    const st = simRef.current;
    if (st.gameOver || st.tilted) return;
    const anyInPlay = st.balls.some((b) => !b.inShooter);
    if (!anyInPlay) return;

    const now = Date.now();
    st.nudgeTimestamps = [...st.nudgeTimestamps.filter((t) => now - t < 4000), now];

    if (st.nudgeTimestamps.length >= 3) {
      st.tilted = true;
      setIsTilted(true);
      sfx.playSadTrombone();
      setStatusBanner('🚨 TILT! Too much shaking — Flippers locked for this ball!');
      spawnCanvasText(PLAYFIELD_CENTER_X, 340, '🚨 TILT!!', '#ef4444', 16);
      return;
    }

    sfx.playBoing(2);
    st.balls.forEach((b) => {
      if (!b.inShooter) {
        b.vx += (Math.random() - 0.5) * 5.8;
        b.vy -= 3.2;
        spawnCanvasText(b.x, b.y - 14, '🫨 NUDGE SAVE!', '#38bdf8', 13);
      }
    });
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
      balls: [createShooterBall()],
      leftFlipper: { pressed: false, angle: 0.4, prevAngle: 0.4 },
      rightFlipper: { pressed: false, angle: -0.4, prevAngle: -0.4 },
      plungerCharge: 0,
      plungerCharging: false,
      bumpers: INITIAL_BUMPERS.map((b) => ({ ...b, flash: 0 })),
      dropTargets: DROP_TARGETS_INIT.map((t) => ({ ...t })),
      lanesLit: [false, false, false, false],
      kickerFlash: { left: 0, right: 0 },
      spinner: { x: 64, y: 262, angle: 0, spinVel: 0, tickStep: 0 },
      powerUpOrb: createRandomPowerUpOrb('multiball'),
      orbRespawnFrames: 0,
      shieldFrames: 420,
      megaFlipperFrames: 0,
      feverFrames: 0,
      lightShowFrames: 60,
      skillShotFrames: 0,
      jackpotCooldown: 0,
      shockwaves: [],
      floatingTexts: [],
      nudgeTimestamps: [],
      tilted: false,
      frameTick: 0,
      score: 0,
      multiplier: 1,
      ballsLeft: 3,
      gameOver: false
    };
    setScore(0);
    setBallsLeft(3);
    setActiveBallsCount(1);
    setMultiplier(1);
    setBallInShooter(true);
    setIsTilted(false);
    setGameOver(false);
    setRoundSummary(null);
    setFreeShieldBoosts(1);
    setFreeMultiballBoosts(1);
    setFreeFeverBoosts(1);
    setStatusBanner('🚀 Pull Plunger or Press SPACE! Hit ⚡ Power-Up Orbs & M-E-M-E Targets!');
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
          const power = 14.5 + (st.plungerCharge / 100) * 6.5;
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

  // 60FPS Pinball Physics & Las Vegas Neon Lightshow Renderer Loop
  useEffect(() => {
    let animId = null;

    const stepPhysicsAndRender = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const st = simRef.current;
      st.frameTick += 1;

      // Sync HUD timers every 12 frames (~5 times/sec)
      if (st.frameTick % 12 === 0) {
        setHudPowerUps({
          shieldSec: Math.ceil(st.shieldFrames / 60),
          megaSec: Math.ceil(st.megaFlipperFrames / 60),
          feverSec: Math.ceil(st.feverFrames / 60),
          multiballActive: st.balls.length > 1
        });
      }

      // 1. Update Timers & Plunger
      if (st.plungerCharging && st.balls.some((b) => b.inShooter)) {
        st.plungerCharge = Math.min(100, st.plungerCharge + 3.2);
      }
      if (st.shieldFrames > 0) st.shieldFrames -= 1;
      if (st.megaFlipperFrames > 0) st.megaFlipperFrames -= 1;
      if (st.feverFrames > 0) st.feverFrames -= 1;
      if (st.lightShowFrames > 0) st.lightShowFrames -= 1;
      if (st.skillShotFrames > 0) st.skillShotFrames -= 1;
      if (st.jackpotCooldown > 0) st.jackpotCooldown -= 1;
      if (st.kickerFlash.left > 0) st.kickerFlash.left -= 1;
      if (st.kickerFlash.right > 0) st.kickerFlash.right -= 1;

      // Respawn Power-Up Orb if collected
      if (!st.powerUpOrb) {
        st.orbRespawnFrames -= 1;
        if (st.orbRespawnFrames <= 0) {
          st.powerUpOrb = createRandomPowerUpOrb();
        }
      } else {
        st.powerUpOrb.pulse += 0.09;
      }

      // High-Speed Left Spinner rotation & score ticks
      if (st.spinner.spinVel > 0.02) {
        st.spinner.angle += st.spinner.spinVel;
        st.spinner.spinVel *= 0.96;
        if (st.frameTick % 4 === 0) {
          st.spinner.tickStep += 1;
          sfx.playSpinnerTick(st.spinner.tickStep);
          const spinPts = 40 * st.multiplier * (st.feverFrames > 0 ? 2 : 1);
          st.score += spinPts;
          setScore(st.score);
        }
      }

      // 2. Update Flippers
      st.leftFlipper.prevAngle = st.leftFlipper.angle;
      st.rightFlipper.prevAngle = st.rightFlipper.angle;
      const targetLeft = st.leftFlipper.pressed && !st.tilted ? -0.48 : 0.4;
      const targetRight = st.rightFlipper.pressed && !st.tilted ? 0.48 : -0.4;
      st.leftFlipper.angle += (targetLeft - st.leftFlipper.angle) * 0.44;
      st.rightFlipper.angle += (targetRight - st.rightFlipper.angle) * 0.44;

      const currentFlipperLen = st.megaFlipperFrames > 0 ? MEGA_FLIPPER_LEN : BASE_FLIPPER_LEN;
      const feverMult = st.feverFrames > 0 ? 2 : 1;

      // 3. Update All Active Balls (2 sub-steps per frame)
      if (!st.gameOver) {
        for (let sub = 0; sub < 2; sub++) {
          for (let bIdx = st.balls.length - 1; bIdx >= 0; bIdx--) {
            const b = st.balls[bIdx];
            if (!b) continue;

            if (b.inShooter && b.x > SHOOTER_X && b.y >= 554 && b.vy >= 0) {
              b.x = 436;
              b.y = 555;
              b.vx = 0;
              b.vy = 0;
            } else {
              b.vy += GRAVITY * 0.5;

              // Magnetic Flipper Attractor pull when Mega Paddles Power-Up is active
              if (!b.inShooter && st.megaFlipperFrames > 0 && b.y > 410 && b.y < 548 && b.vy > 0) {
                const targetX = b.x < PLAYFIELD_CENTER_X ? 148 : 282;
                b.vx += (targetX - b.x) * 0.0022;
              }

              b.x += b.vx * 0.5;
              b.y += b.vy * 0.5;

              // Record comet trail on sub-step 0
              if (sub === 0) {
                b.trail.push({ x: b.x, y: b.y });
                if (b.trail.length > 11) b.trail.shift();
              }

              // Close shooter gate once ball enters main playfield
              if (b.inShooter && b.x < SHOOTER_X - BALL_R) {
                b.inShooter = false;
                setBallInShooter(st.balls.some((ball) => ball.inShooter));
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
                  b.vx -= 2.4;
                }
              }

              if (b.inShooter) {
                if (b.x > 448 - BALL_R) {
                  b.x = 448 - BALL_R;
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
                if (dist < BALL_R + 2.2 && dist > 0.001) {
                  const nx = dx / dist;
                  const ny = dy / dist;
                  b.x = cp.x + nx * (BALL_R + 2.5);
                  b.y = cp.y + ny * (BALL_R + 2.5);
                  const dot = b.vx * nx + b.vy * ny;
                  if (dot < 0) {
                    b.vx = (b.vx - 2 * dot * nx) * w.bounce;
                    b.vy = (b.vy - 2 * dot * ny) * w.bounce;
                    if (w.isKicker && sub === 0) {
                      if (w.id === 'l-kick') st.kickerFlash.left = 10;
                      if (w.id === 'r-kick') st.kickerFlash.right = 10;
                      const pts = 85 * st.multiplier * feverMult;
                      st.score += pts;
                      setScore(st.score);
                      sfx.playBoing(2);
                      spawnShockwave(cp.x, cp.y, '#f472b6', 36);
                      spawnCanvasText(cp.x, cp.y - 10, `⚡ +${pts}`, '#f472b6', 12);
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
                  const kickSpeed = 8.6;
                  b.vx = nx * kickSpeed + (Math.random() - 0.5) * 1.5;
                  b.vy = ny * kickSpeed;
                  bmp.flash = 14;

                  const pts = bmp.pts * st.multiplier * feverMult;
                  st.score += pts;
                  setScore(st.score);

                  if (idx === 1) sfx.playRubberDuck();
                  else if (idx === 2) sfx.playVineBoom();
                  else sfx.playPinballBumper(idx);

                  spawnShockwave(bmp.x, bmp.y, bmp.color, 52);
                  spawnCanvasText(bmp.x, bmp.y - bmp.r - 6, `${bmp.emoji} +${pts}`, bmp.color, 13);
                }
              });

              // M - E - M - E Neon Drop Targets
              st.dropTargets.forEach((t, idx) => {
                if (Math.hypot(b.x - t.x, b.y - t.y) < BALL_R + 13) {
                  b.vy = Math.abs(b.vy) * 0.9 + 2.2;
                  if (!t.hit) {
                    t.hit = true;
                    const pts = 350 * st.multiplier * feverMult;
                    st.score += pts;
                    setScore(st.score);
                    sfx.playPinballBumper(idx);
                    spawnShockwave(t.x, t.y, t.color, 44);
                    spawnCanvasText(t.x, t.y - 16, `🎯 ${t.letter}! +${pts}`, t.color, 14);

                    // Check if all 4 M-E-M-E targets are knocked down!
                    if (st.dropTargets.every((dt) => dt.hit)) {
                      const bankBonus = 2500 * st.multiplier * feverMult;
                      st.score += bankBonus;
                      setScore(st.score);
                      st.lightShowFrames = 180;
                      sfx.playPowerUpCollect();
                      setTimeout(() => sfx.playJackpot(), 140);
                      if (!st.powerUpOrb) {
                        st.powerUpOrb = createRandomPowerUpOrb();
                      }
                      setStatusBanner(
                        `🎆 M-E-M-E DROP TARGETS CLEARED! +${bankBonus.toLocaleString()} PTS & POWER-UP SPAWNED!`
                      );
                      spawnCanvasText(
                        PLAYFIELD_CENTER_X,
                        152,
                        `🎆 M-E-M-E BANK! +${bankBonus}`,
                        '#fde047',
                        16
                      );
                      setTimeout(() => {
                        simRef.current.dropTargets.forEach((dt) => {
                          dt.hit = false;
                        });
                      }, 850);
                    }
                  }
                }
              });

              // Left Orbit Whirlpool Spinner Gate (x: 64, y: 262)
              if (sub === 0 && Math.hypot(b.x - st.spinner.x, b.y - st.spinner.y) < 22) {
                const spd = Math.hypot(b.vx, b.vy);
                if (spd > 2.5 && st.spinner.spinVel < 0.7) {
                  st.spinner.spinVel = 0.85;
                  spawnCanvasText(st.spinner.x, st.spinner.y - 18, '🌀 WHIRLPOOL SPIN!', '#00f3ff', 12);
                }
              }

              // Collectible Power-Up Orb Collision
              if (
                st.powerUpOrb &&
                Math.hypot(b.x - st.powerUpOrb.x, b.y - st.powerUpOrb.y) < BALL_R + st.powerUpOrb.r
              ) {
                const collected = st.powerUpOrb;
                st.powerUpOrb = null;
                st.orbRespawnFrames = 360; // Next orb spawns in 6 seconds
                activatePowerUpEffect(collected, collected.x, collected.y);
              }

              // Top Vegas Rollover Lanes (L - U - C - K)
              ROLLOVER_LANES.forEach((lane, idx) => {
                if (Math.hypot(b.x - lane.x, b.y - lane.y) < 17 && !st.lanesLit[idx]) {
                  st.lanesLit[idx] = true;
                  const skillBonus = st.skillShotFrames > 0 ? 1200 : 0;
                  if (skillBonus > 0) st.skillShotFrames = 0;
                  const pts = 250 * st.multiplier * feverMult + skillBonus;
                  st.score += pts;
                  setScore(st.score);
                  sfx.playPinballBumper(idx);
                  spawnCanvasText(
                    lane.x,
                    lane.y - 12,
                    skillBonus > 0 ? `🎯 SKILL SHOT! +${pts}` : `LANE ${lane.letter}! +${pts}`,
                    '#facc15',
                    13
                  );

                  if (st.lanesLit.every(Boolean)) {
                    st.lanesLit = [false, false, false, false];
                    st.multiplier = Math.min(6, st.multiplier + 1);
                    setMultiplier(st.multiplier);
                    st.score += 1200;
                    setScore(st.score);
                    st.lightShowFrames = 140;
                    sfx.playJackpot();
                    setStatusBanner(
                      `🌟 VEGAS L-U-C-K COMPLETED! ${st.multiplier}x MULTIPLIER + 1,200 BONUS!`
                    );
                    spawnCanvasText(PLAYFIELD_CENTER_X, 108, `🔥 ${st.multiplier}x MULTIPLIER!`, '#facc15', 16);
                  }
                }
              });

              // Vegas Center Jackpot Sinkhole (x: 215, y: 112)
              if (
                st.jackpotCooldown <= 0 &&
                Math.hypot(b.x - PLAYFIELD_CENTER_X, b.y - 112) < 18
              ) {
                st.jackpotCooldown = 90;
                const skillBonus = st.skillShotFrames > 0 ? 1200 : 0;
                if (skillBonus > 0) st.skillShotFrames = 0;
                const jackpotPts = 1500 * st.multiplier * feverMult + skillBonus;
                st.score += jackpotPts;
                setScore(st.score);
                st.lightShowFrames = 150;
                sfx.playJackpot();
                setTimeout(() => sfx.playAirhorn(), 140);
                spawnShockwave(PLAYFIELD_CENTER_X, 112, '#fde047', 90);
                setStatusBanner(
                  `🎰 VEGAS SINKHOLE JACKPOT!! +${jackpotPts.toLocaleString()} PTS!`
                );
                spawnCanvasText(PLAYFIELD_CENTER_X, 92, `🎰 JACKPOT +${jackpotPts}!`, '#fde047', 16);
                b.vx = (Math.random() > 0.5 ? 1 : -1) * 6.8;
                b.vy = 6.2;
              }

              // Flipper Collisions (Left & Right with widened gap)
              const flippers = [
                {
                  px: LEFT_FLIPPER_PIVOT.x,
                  py: LEFT_FLIPPER_PIVOT.y,
                  len: currentFlipperLen,
                  angle: st.leftFlipper.angle,
                  angVel: st.leftFlipper.angle - st.leftFlipper.prevAngle,
                  dir: 1
                },
                {
                  px: RIGHT_FLIPPER_PIVOT.x,
                  py: RIGHT_FLIPPER_PIVOT.y,
                  len: currentFlipperLen,
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
                const minDist = BALL_R + 6.5;

                if (dist < minDist && dist > 0.001) {
                  const nx = dx / dist;
                  const ny = dy / dist;
                  b.x = cp.x + nx * (minDist + 1.5);
                  b.y = cp.y + ny * (minDist + 1.5);

                  const isSwingingUp =
                    (fl.dir === 1 && fl.angVel < -0.018) ||
                    (fl.dir === -1 && fl.angVel > 0.018);

                  if (isSwingingUp) {
                    const leverage = 0.58 + cp.t * 0.72;
                    b.vy = -13.2 * leverage;
                    b.vx = (b.x - PLAYFIELD_CENTER_X) * 0.055 + (Math.random() - 0.5) * 2.4;
                  } else {
                    const dot = b.vx * nx + b.vy * ny;
                    if (dot < 0) {
                      b.vx = (b.vx - 1.72 * dot * nx) * 0.78;
                      b.vy = (b.vy - 1.72 * dot * ny) * 0.78;
                    }
                  }
                }
              });

              // 🛡️ PLASMA DRAIN SHIELD CHECK (saves balls falling through the center gap!)
              if (
                st.shieldFrames > 0 &&
                b.vy > 0 &&
                b.y >= 572 &&
                b.y <= 592 &&
                b.x >= 140 &&
                b.x <= 290
              ) {
                b.y = 570;
                b.vy = -12.8;
                b.vx = (Math.random() - 0.5) * 6.5;
                const savePts = 250 * st.multiplier * feverMult;
                st.score += savePts;
                setScore(st.score);
                sfx.playLaserZap();
                spawnShockwave(b.x, 574, '#00f3ff', 65);
                spawnCanvasText(b.x, 548, `🛡️ PLASMA SAVE! +${savePts}`, '#00f3ff', 14);
                setStatusBanner('🛡️ BALL SAVED BY PLASMA DRAIN SHIELD! Keep Flipping!');
              }

              // Clamp max ball speed so it never tunnels
              const spd = Math.hypot(b.vx, b.vy);
              if (spd > 16.5) {
                b.vx = (b.vx / spd) * 16.5;
                b.vy = (b.vy / spd) * 16.5;
              }

              // Ball Drain Check at bottom (y > TABLE_H + 14)
              if (b.y > TABLE_H + 14) {
                if (st.balls.length > 1) {
                  // Multiball extra ball drained — keep playing with remaining ball(s)!
                  st.balls.splice(bIdx, 1);
                  setActiveBallsCount(st.balls.length);
                  sfx.playBoing(1);
                  setStatusBanner(
                    `🎱 Multiball Drained — ${st.balls.length} Ball${st.balls.length === 1 ? '' : 's'} Still in Play!`
                  );
                } else if (st.ballsLeft > 1) {
                  st.ballsLeft -= 1;
                  setBallsLeft(st.ballsLeft);
                  st.tilted = false;
                  setIsTilted(false);
                  st.balls = [createShooterBall()];
                  setActiveBallsCount(1);
                  setBallInShooter(true);
                  sfx.playSadTrombone();
                  setStatusBanner(
                    `🎱 Ball Drained! ${st.ballsLeft} Ball${st.ballsLeft === 1 ? '' : 's'} Left — Press SPACE or Launch!`
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
      }

      // ==========================================
      // RENDER LAS VEGAS PINBALL CABINET & LIGHTSHOW
      // ==========================================
      ctx.clearRect(0, 0, TABLE_W, TABLE_H);

      // 1. Dynamic Casino Felt & Fever Overdrive Background
      const isFever = st.feverFrames > 0 || st.lightShowFrames > 0;
      const bgGrad = ctx.createRadialGradient(215, 240, 28, 215, 310, 390);
      if (st.feverFrames > 0) {
        bgGrad.addColorStop(0, st.frameTick % 16 < 8 ? '#3b0764' : '#422006');
        bgGrad.addColorStop(0.55, '#1e103a');
        bgGrad.addColorStop(1, '#070812');
      } else {
        bgGrad.addColorStop(0, '#1e103a');
        bgGrad.addColorStop(0.55, '#0d0b1e');
        bgGrad.addColorStop(1, '#06070f');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, TABLE_W, TABLE_H);

      // 2. Flashing Las Vegas Marquee Chaser Bulbs around the Playfield
      MARQUEE_BULBS.forEach((bulb, idx) => {
        const chaseOn = isFever
          ? (idx + Math.floor(st.frameTick / 3)) % 2 === 0
          : (idx + Math.floor(st.frameTick / 6)) % 4 === 0;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bulb.x, bulb.y, chaseOn ? 3.6 : 2.2, 0, Math.PI * 2);
        const bulbColors = ['#facc15', '#00f3ff', '#ec4899', '#4ade80'];
        const bColor = bulbColors[idx % bulbColors.length];
        ctx.fillStyle = chaseOn ? bColor : 'rgba(255, 255, 255, 0.14)';
        if (chaseOn) {
          ctx.shadowColor = bColor;
          ctx.shadowBlur = 10;
        }
        ctx.fill();
        ctx.restore();
      });

      // 3. Decorative Vegas Casino Center Art & Live Multiplier Ring
      ctx.save();
      ctx.strokeStyle = isFever ? 'rgba(250, 204, 21, 0.35)' : 'rgba(250, 204, 21, 0.14)';
      ctx.lineWidth = isFever ? 3 : 2;
      ctx.beginPath();
      ctx.arc(PLAYFIELD_CENTER_X, 254, 120, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '900 14px "Courier New", monospace';
      ctx.fillStyle = isFever ? 'rgba(250, 204, 21, 0.55)' : 'rgba(250, 204, 21, 0.25)';
      ctx.textAlign = 'center';
      ctx.fillText('★ FABULOUS LAS VEGAS MEME PINBALL ★', PLAYFIELD_CENTER_X, 444);
      ctx.fillText(
        st.feverFrames > 0
          ? `🔥 2X FEVER ACTIVE! (${st.multiplier * 2}X TOTAL MULT)`
          : `${st.multiplier}X TABLE MULTIPLIER`,
        PLAYFIELD_CENTER_X,
        462
      );
      ctx.restore();

      // 4. Shooter Lane Divider Wall
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(SHOOTER_X, 110);
      ctx.lineTo(SHOOTER_X, TABLE_H);
      ctx.stroke();

      // 5. Vegas Jackpot Sinkhole (x: 215, y: 112)
      ctx.save();
      ctx.beginPath();
      ctx.arc(PLAYFIELD_CENTER_X, 112, 20, 0, Math.PI * 2);
      ctx.fillStyle =
        st.jackpotCooldown > 0 ? 'rgba(250, 204, 21, 0.35)' : 'rgba(236, 72, 153, 0.32)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = st.jackpotCooldown > 0 ? '#facc15' : '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.font = '900 10px sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.fillText('🎰 1.5K', PLAYFIELD_CENTER_X, 116);
      ctx.restore();

      // 6. Top L-U-C-K Rollover Lanes
      ROLLOVER_LANES.forEach((lane, idx) => {
        const lit = st.lanesLit[idx];
        ctx.save();
        ctx.beginPath();
        ctx.arc(lane.x, lane.y, 13.5, 0, Math.PI * 2);
        ctx.fillStyle = lit ? '#facc15' : 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = lit ? '#fde047' : 'rgba(0, 243, 255, 0.45)';
        ctx.stroke();
        ctx.font = '900 13px sans-serif';
        ctx.fillStyle = lit ? '#090a0f' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lane.letter, lane.x, lane.y);
        ctx.restore();
      });

      // 7. M - E - M - E Drop Targets Bank
      st.dropTargets.forEach((t) => {
        ctx.save();
        ctx.fillStyle = t.hit ? t.color : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2.5;
        if (t.hit) {
          ctx.shadowColor = t.color;
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.roundRect(t.x - 16, t.y - 10, 32, 20, 6);
        ctx.fill();
        ctx.stroke();
        ctx.font = '900 11px sans-serif';
        ctx.fillStyle = t.hit ? '#090a0f' : '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${t.emoji}${t.letter}`, t.x, t.y);
        ctx.restore();
      });

      // 8. High-Speed Left Whirlpool Spinner
      ctx.save();
      ctx.translate(st.spinner.x, st.spinner.y);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(st.spinner.angle);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(13, 0);
      ctx.moveTo(0, -13);
      ctx.lineTo(0, 13);
      ctx.stroke();
      ctx.restore();

      // 9. Guide Walls & Slingshot Kickers
      GUIDE_WALLS.forEach((w) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        const kFlash =
          (w.id === 'l-kick' && st.kickerFlash.left > 0) ||
          (w.id === 'r-kick' && st.kickerFlash.right > 0);
        ctx.lineWidth = w.isKicker ? (kFlash ? 7 : 5) : 4;
        ctx.strokeStyle = kFlash ? '#facc15' : w.isKicker ? '#f472b6' : '#38bdf8';
        if (w.isKicker) {
          ctx.shadowColor = kFlash ? '#facc15' : '#ec4899';
          ctx.shadowBlur = kFlash ? 18 : 8;
        }
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      });

      // 10. Collectible Glowing Power-Up Orb on Playfield
      if (st.powerUpOrb) {
        const orb = st.powerUpOrb;
        const pulseR = orb.r + Math.sin(orb.pulse) * 3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 22;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = orb.color;
        ctx.stroke();

        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(orb.emoji, orb.x, orb.y - 2);

        ctx.font = '900 8px monospace';
        ctx.fillStyle = orb.color;
        ctx.fillText(orb.short, orb.x, orb.y + 24);
        ctx.restore();
      }

      // 11. 4 Neon Vegas Pop Bumpers
      st.bumpers.forEach((bmp) => {
        if (bmp.flash > 0) bmp.flash -= 1;
        const radius = bmp.r + (bmp.flash > 0 ? 5 : 0);
        ctx.save();
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = bmp.flash > 0 ? bmp.color : 'rgba(15, 23, 42, 0.92)';
        ctx.shadowColor = bmp.glow;
        ctx.shadowBlur = bmp.flash > 0 ? 28 : 14;
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = bmp.color;
        ctx.stroke();

        ctx.font = '19px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bmp.emoji, bmp.x, bmp.y - 4);

        ctx.font = '900 9px monospace';
        ctx.fillStyle = bmp.flash > 0 ? '#090a0f' : '#f8fafc';
        ctx.fillText(bmp.label, bmp.x, bmp.y + 12);
        ctx.restore();
      });

      // 12. 🛡️ Plasma Drain Shield Barrier (between flippers)
      if (st.shieldFrames > 0) {
        const shieldAlpha = st.shieldFrames < 120 ? (st.frameTick % 8 < 4 ? 0.9 : 0.25) : 0.88;
        ctx.save();
        ctx.globalAlpha = shieldAlpha;
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(148, 574);
        ctx.lineTo(282, 574);
        ctx.stroke();

        ctx.font = '900 9px monospace';
        ctx.fillStyle = '#00f3ff';
        ctx.textAlign = 'center';
        ctx.fillText(`🛡️ BALL SAVER (${Math.ceil(st.shieldFrames / 60)}s)`, PLAYFIELD_CENTER_X, 590);
        ctx.restore();
      } else {
        // Subtle indicator of the real drain gap so the player sees the target zone
        ctx.save();
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(156, 582);
        ctx.lineTo(274, 582);
        ctx.stroke();
        ctx.restore();
      }

      // 13. Draw Left & Right Flippers
      const drawFlipper = (px, py, angle, dir) => {
        const tx = px + Math.cos(angle) * currentFlipperLen * dir;
        const ty = py + Math.sin(angle) * currentFlipperLen * dir;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.lineWidth = 13;
        ctx.lineCap = 'round';
        const isMega = st.megaFlipperFrames > 0;
        ctx.strokeStyle = st.tilted ? '#64748b' : isMega ? '#e879f9' : '#facc15';
        ctx.shadowColor = isMega ? '#c084fc' : '#f97316';
        ctx.shadowBlur = isMega ? 20 : 12;
        ctx.stroke();

        // Pivot cap
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#090a0f';
        ctx.fill();
        ctx.restore();
      };

      drawFlipper(LEFT_FLIPPER_PIVOT.x, LEFT_FLIPPER_PIVOT.y, st.leftFlipper.angle, 1);
      drawFlipper(RIGHT_FLIPPER_PIVOT.x, RIGHT_FLIPPER_PIVOT.y, st.rightFlipper.angle, -1);

      // 14. Draw Spring Plunger in Shooter Lane
      const springCompress = (st.plungerCharge / 100) * 32;
      ctx.save();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(426, 566 + springCompress, 20, 44 - springCompress);
      ctx.restore();

      // 15. Draw Expanding Shockwave Rings
      st.shockwaves.forEach((sw) => {
        sw.r += (sw.maxR - sw.r) * 0.18 + 1.5;
        sw.alpha -= 0.045;
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
      st.shockwaves = st.shockwaves.filter((sw) => sw.alpha > 0);

      // 16. Draw All Active Pinballs & Comet Trails
      st.balls.forEach((b) => {
        // Comet trail
        b.trail.forEach((pt, idx) => {
          const ratio = (idx + 1) / b.trail.length;
          ctx.save();
          ctx.globalAlpha = ratio * 0.38;
          ctx.fillStyle = st.feverFrames > 0 ? '#facc15' : b.color || '#00f3ff';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, BALL_R * ratio * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        const ballGrad = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, BALL_R);
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.55, b.color === '#facc15' ? '#fef08a' : b.color === '#ec4899' ? '#fbcfe8' : '#e2e8f0');
        ballGrad.addColorStop(1, b.color || '#64748b');
        ctx.fillStyle = ballGrad;
        ctx.shadowColor = st.feverFrames > 0 ? '#facc15' : b.color || '#00f3ff';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      });

      // 17. Draw Floating Score & Power-Up Popups
      st.floatingTexts.forEach((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.022;
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.size || 13}px Inter, sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
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
  }, [finalizePinballRound, activatePowerUpEffect]);

  const handleSharePinball = () => {
    const shareUrl = `${window.location.origin}/?mode=pinball`;
    const shareText = `🎱 I just scored ${score.toLocaleString()} pts on LAS VEGAS RETRO PINBALL at THE MEMES.net! Think you can beat my high score?`;
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
                🎱 LAS VEGAS RETRO PINBALL{' '}
                <span className="tm-subgame-badge">
                  {hudPowerUps.feverSec > 0 ? `🔥 ${multiplier * 2}x FEVER!` : `${multiplier}x MULT`}
                </span>
              </h2>
              <div className="tm-subgame-subtitle">
                Controls: <strong>← / →</strong> or <strong>A / D</strong> Flippers •{' '}
                <strong>SPACE</strong> Launch • <strong>↑</strong> Nudge • Hit ⚡ Orbs for Power-Ups!
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
              Up to {ARCADE_ECONOMY_RULES.SUB_GAMES.MAX_TOKENS_PER_ROUND} 🪙 Tokens/Round
            </span>
          </div>

          <div className="tm-crush-stat-box">
            <span className="tm-crush-stat-label">BALLS &amp; ACTIVE POWER-UPS</span>
            <strong className="tm-crush-stat-val" style={{ color: '#00f3ff' }}>
              {'🎱 '.repeat(ballsLeft) || '0'} ({ballsLeft}/3)
              {activeBallsCount > 1 && (
                <span style={{ color: '#facc15', fontSize: '12px', marginLeft: '6px' }}>
                  🔥 {activeBallsCount}x MULTIBALL!
                </span>
              )}
            </strong>
            <span style={{ fontSize: '11px', color: isTilted ? '#ef4444' : '#cbd5e1' }}>
              {isTilted
                ? '🚨 TILTED!'
                : [
                    hudPowerUps.shieldSec > 0 ? `🛡️ Shield ${hudPowerUps.shieldSec}s` : null,
                    hudPowerUps.megaSec > 0 ? `🧲 Mega ${hudPowerUps.megaSec}s` : null,
                    hudPowerUps.feverSec > 0 ? `🔥 2x Fever ${hudPowerUps.feverSec}s` : null
                  ]
                    .filter(Boolean)
                    .join(' • ') || `Multiplier: ${multiplier}x • Hit ⚡ Orbs!`}
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

        {/* Tactical Pocket Power-Up Boosters Bar */}
        <div className="tm-crush-boosters-bar" style={{ marginBottom: '10px' }}>
          <button
            type="button"
            className="tm-crush-booster-btn"
            disabled={freeShieldBoosts <= 0 || gameOver}
            onClick={() => {
              setFreeShieldBoosts((c) => c - 1);
              activatePowerUpEffect(POWERUP_TYPES[1]);
            }}
            title="Activate a 16-second laser forcefield across the center flipper gap!"
          >
            🛡️ Deploy Drain Shield ({freeShieldBoosts})
          </button>

          <button
            type="button"
            className="tm-crush-booster-btn"
            disabled={freeMultiballBoosts <= 0 || gameOver}
            onClick={() => {
              setFreeMultiballBoosts((c) => c - 1);
              activatePowerUpEffect(POWERUP_TYPES[0]);
            }}
            title="Spawn extra pinballs directly onto the playfield for Multiball Madness!"
          >
            🎱 Trigger Multiball ({freeMultiballBoosts})
          </button>

          <button
            type="button"
            className="tm-crush-booster-btn"
            disabled={freeFeverBoosts <= 0 || gameOver}
            onClick={() => {
              setFreeFeverBoosts((c) => c - 1);
              activatePowerUpEffect(POWERUP_TYPES[3]);
            }}
            title="Ignite 2X Vegas Fever Overdrive & Mega Magnetic Flippers!"
          >
            🔥 2X Vegas Fever ({freeFeverBoosts})
          </button>

          <button
            type="button"
            className="tm-crush-booster-btn"
            onClick={() => finalizePinballRound(score)}
            disabled={gameOver || score === 0}
            title="Cash out current score for Arcade Tokens"
          >
            🏁 Cash Out ({score.toLocaleString()} pts)
          </button>
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
                    <span
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#facc15',
                        marginTop: '4px'
                      }}
                    >
                      {roundSummary.capNote}
                    </span>
                  )}
                </p>

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
                      🪙 Spend {ARCADE_ECONOMY_RULES.SUB_GAMES.EXTRA_LIFE_TOKEN_COST} Tokens to Play
                      Now (or wait {formatWindowCountdown(effectiveResetMs)})
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
            onClick={() => launchPlunger(17.5)}
            disabled={gameOver}
          >
            {ballInShooter ? '🚀 LAUNCH BALL' : '🚀 PLUNGER'}
          </button>

          <button
            type="button"
            className="tm-btn"
            onClick={handleNudgeTable}
            disabled={gameOver || isTilted}
            title="Shake the pinball table to save a center drain (Warning: 3 shakes in 4s = TILT!)"
          >
            🫨 Nudge
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

        {/* Power-Up Legend Strip */}
        <div className="tm-pinball-legend">
          <span>🎱 <strong>Multiball:</strong> Up to 3 Balls</span>
          <span>🛡️ <strong>Shield:</strong> Saves Center Drains</span>
          <span>🧲 <strong>Mega Paddles:</strong> Giant Magnetic Flippers</span>
          <span>🔥 <strong>2x Fever:</strong> Double Table Points</span>
          <span>🎯 <strong>M-E-M-E Bank:</strong> +2,500 Bonus</span>
        </div>
      </div>
    </section>
  );
}
