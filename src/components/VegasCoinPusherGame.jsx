import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';

// ==========================================
// PHASE 27: NEON COIN DOZER '86 — SUPER-ADDICTIVE PENNY-FALLS & MINI-SLOT EDITION
// Features:
// - 3D-Perspective Reciprocating Chrome Pusher Shelf + Mega-Shove Overdrive
// - Moving "🎯 SKILL GATE" that awards +2 Bonus Coins & spins the Backbox 3-Reel Mini-Slot!
// - Backbox Mini-Slot Jackpots: Coin Avalanche (10 Coins), Diamond Drop, Mega Dozer Shove, Laser Shields!
// - Cliffhanger "Teetering on the Edge" wobble & glow for coins millimeter-close to dropping!
// - 5 Collectible 80s Prizes (💎 Diamond, 🎁 Loot Box, 🕹️ Joystick, 🏆 Trophy, 👑 Cyber Crown)
// - Hold-to-Stream / 🔥 Auto-Drop Toggle + 3-Coin Barrage + Cabinet Nudge
// ==========================================

const W = 620;
const H = 720;

const BED_TOP_Y = 148;
const PUSHER_MIN_Y = 172;
const PUSHER_MAX_Y = 276;
const PUSHER_FEVER_MAX_Y = 304;
const PUSHER_MEGA_SHOVE_Y = 326;
const FRONT_LIP_Y = 568;
const TRAY_BOTTOM_Y = 702;

const GUTTER_START_Y = 345;
const GUTTER_END_Y = 550;

const getBedBoundsAtY = (y) => {
  const t = Math.max(0, Math.min(1, (y - BED_TOP_Y) / (FRONT_LIP_Y - BED_TOP_Y)));
  const halfWidth = 188 + t * 58;
  return {
    left: W / 2 - halfWidth,
    right: W / 2 + halfWidth,
    t
  };
};

const PRIZE_CATALOG = [
  {
    kind: 'diamond',
    emoji: '💎',
    label: 'Neon Diamond',
    radius: 25,
    mass: 1.4,
    tokens: 8,
    points: 1000,
    color: '#00f3ff'
  },
  {
    kind: 'lootbox',
    emoji: '🎁',
    label: 'Mystery Box',
    radius: 27,
    mass: 1.5,
    tokens: 12,
    points: 1800,
    color: '#f472b6'
  },
  {
    kind: 'joystick',
    emoji: '🕹️',
    label: 'Gold Joystick',
    radius: 27,
    mass: 1.55,
    tokens: 15,
    points: 2400,
    color: '#a855f7'
  },
  {
    kind: 'trophy',
    emoji: '🏆',
    label: '86 Trophy',
    radius: 29,
    mass: 1.65,
    tokens: 20,
    points: 3500,
    color: '#facc15'
  },
  {
    kind: 'crown',
    emoji: '👑',
    label: 'Cyber Crown',
    radius: 30,
    mass: 1.75,
    tokens: 30,
    points: 5000,
    color: '#4ade80'
  }
];

const SLOT_SYMBOLS = ['🪙', '💎', '🎁', '⚡', '🏆'];

let entityIdSeq = 1;

function createCoinEntity(x, y, overrides = {}) {
  const roll = Math.random();
  const defaultKind = roll < 0.08 ? 'goldstack' : roll < 0.24 ? 'silver' : 'gold';
  const kind = overrides.kind || defaultKind;
  const radius =
    overrides.radius || (kind === 'goldstack' ? 22.5 : kind === 'silver' ? 20.5 : 19.2);

  return {
    id: `c-${entityIdSeq++}`,
    kind,
    emoji:
      overrides.emoji ||
      (kind === 'goldstack' ? '💰' : kind === 'silver' ? '⚡' : '🪙'),
    label:
      overrides.label ||
      (kind === 'goldstack' ? '3× Coin Stack' : kind === 'silver' ? '2× Cyber Chip' : 'Gold Coin'),
    x,
    y,
    vx: overrides.vx || 0,
    vy: overrides.vy || 0,
    radius,
    mass: overrides.mass || (kind === 'goldstack' ? 1.25 : kind === 'silver' ? 1.1 : 1.0),
    tokens: overrides.tokens ?? (kind === 'goldstack' ? 3 : kind === 'silver' ? 2 : 1),
    points: overrides.points ?? (kind === 'goldstack' ? 400 : kind === 'silver' ? 250 : 120),
    color:
      overrides.color ||
      (kind === 'goldstack' ? '#4ade80' : kind === 'silver' ? '#38bdf8' : '#facc15'),
    isPrize: Boolean(overrides.isPrize),
    dropping: Boolean(overrides.dropping),
    passedGate: false,
    targetShelfY: overrides.targetShelfY || 198,
    shimmerOffset: Math.random() * Math.PI * 2
  };
}

function createInitialBed() {
  const items = [];
  // Dense, juicy coin bed packed all the way to the front cliffhanger lip (y=562)
  // so the very first coin drops immediately trigger satisfying tray cascades!
  const rows = [
    { y: 248, count: 8 },
    { y: 284, count: 9 },
    { y: 320, count: 10 },
    { y: 358, count: 10 },
    { y: 396, count: 11 },
    { y: 434, count: 11 },
    { y: 472, count: 12 },
    { y: 508, count: 12 },
    { y: 540, count: 12 },
    { y: 561, count: 11 } // Teetering right on the front lip!
  ];

  rows.forEach((row) => {
    const bounds = getBedBoundsAtY(row.y);
    const usableW = bounds.right - bounds.left - 44;
    for (let i = 0; i < row.count; i++) {
      const frac = row.count > 1 ? i / (row.count - 1) : 0.5;
      const jitterX = (Math.random() - 0.5) * 9;
      const jitterY = (Math.random() - 0.5) * 7;
      const x = bounds.left + 22 + frac * usableW + jitterX;
      const y = row.y + jitterY;
      items.push(createCoinEntity(x, y));
    }
  });

  // Pre-place 4 juicy prizes on the bed (including a Diamond close to the front lip!)
  items.push(createCoinEntity(W / 2 - 58, 524, { ...PRIZE_CATALOG[0], isPrize: true }));
  items.push(createCoinEntity(W / 2 + 72, 448, { ...PRIZE_CATALOG[1], isPrize: true }));
  items.push(createCoinEntity(W / 2 - 84, 378, { ...PRIZE_CATALOG[2], isPrize: true }));
  items.push(createCoinEntity(W / 2 + 12, 316, { ...PRIZE_CATALOG[3], isPrize: true }));

  return items;
}

export default function VegasCoinPusherGame({
  tokens = 0,
  onSpendTokens,
  onEarnTokens,
  onEarnXp,
  onOpenBlankStudio,
  onSelectViewMode
}) {
  const canvasRef = useRef(null);

  const [freePlay, setFreePlay] = useState(() => tokens < 5);
  const [practiceCoins, setPracticeCoins] = useState(60);
  const [autoDrop, setAutoDrop] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    Number(localStorage.getItem('tm_pusher_highscore') || 0)
  );
  const [coinsWonSession, setCoinsWonSession] = useState(0);
  const [, setPrizesWonSession] = useState(0);
  const [collectedPrizeKinds, setCollectedPrizeKinds] = useState([]);
  const [feverProgress, setFeverProgress] = useState(0);
  const [feverSecondsLeft, setFeverSecondsLeft] = useState(0);
  const [tiltWarnings, setTiltWarnings] = useState(0);
  const [isTilted, setIsTilted] = useState(false);
  const [slotReels, setSlotReels] = useState(['🪙', '💎', '🪙']);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [statusBanner, setStatusBanner] = useState(
    '🎯 AIM FOR THE MOVING GREEN SKILL GATE TO SPIN THE MINI-SLOT & RAIN BONUS COINS!'
  );

  // Multiplier grows as you collect unique prizes!
  const prizeMultiplier = 1 + Math.min(2, collectedPrizeKinds.length * 0.25);

  const simRef = useRef({
    coins: createInitialBed(),
    fallingTrayCoins: [],
    trayPile: [], // Visual pile of won coins gleaming in the bottom tray
    floatingTexts: [],
    sparks: [],
    pusherPhase: 0,
    pusherY: PUSHER_MIN_Y,
    pusherExtendedRatio: 0,
    megaShoveUntil: 0,
    aimX: W / 2,
    aimDir: 1,
    gateX: W / 2,
    gateDir: 1,
    gateFlashUntil: 0,
    slotReels: ['🪙', '💎', '🪙'],
    slotSpinUntil: 0,
    feverUntil: 0,
    shakeMag: 0,
    lastDropAt: 0,
    comboCount: 0,
    lastTrayWinAt: 0,
    recentDropsSincePrize: 0
  });

  const callbacksRef = useRef({
    freePlay,
    onEarnTokens,
    onEarnXp,
    highScore,
    prizeMultiplier
  });
  useEffect(() => {
    callbacksRef.current = { freePlay, onEarnTokens, onEarnXp, highScore, prizeMultiplier };
  }, [freePlay, onEarnTokens, onEarnXp, highScore, prizeMultiplier]);

  // Trigger Backbox 3-Reel Mini-Slot Spin when a coin passes through the moving Skill Gate!
  const triggerMiniSlotSpin = useCallback(() => {
    const s = simRef.current;
    if (performance.now() < s.slotSpinUntil) return;
    s.slotSpinUntil = performance.now() + 1150;
    setSlotSpinning(true);
    sfx.playRouletteSpin?.();

    setTimeout(() => {
      setSlotSpinning(false);
      const roll = Math.random();
      let outcome;
      if (roll < 0.22) {
        outcome = ['🪙', '🪙', '🪙']; // Coin Avalanche!
        setStatusBanner('🎰 MINI-SLOT HIT: 🪙🪙🪙 10-COIN AVALANCHE RAINING ONTO THE SHELF!');
        sfx.playJackpot?.();
        for (let k = 0; k < 10; k++) {
          setTimeout(() => {
            const rx = W / 2 + (Math.random() - 0.5) * 260;
            s.coins.push(
              createCoinEntity(rx, BED_TOP_Y - 12, {
                dropping: true,
                passedGate: true,
                targetShelfY: PUSHER_MIN_Y + 22 + Math.random() * 48,
                vy: 7.4
              })
            );
            sfx.playCoinDrop?.();
          }, k * 95);
        }
      } else if (roll < 0.42) {
        outcome = ['⚡', '⚡', '⚡']; // Mega Dozer Shove + Laser Shields!
        s.megaShoveUntil = performance.now() + 7000;
        s.feverUntil = Math.max(s.feverUntil, performance.now() + 10000);
        setFeverSecondsLeft(10);
        setStatusBanner('🎰 MINI-SLOT HIT: ⚡⚡⚡ MEGA DOZER STROKE + 10s LASER SIDE-WALLS!');
        sfx.playPrizeDrop?.(true);
      } else if (roll < 0.60) {
        outcome = ['💎', '💎', '💎']; // Twin Diamond Drop!
        setStatusBanner('🎰 MINI-SLOT HIT: 💎💎💎 TWIN NEON DIAMONDS DROPPED ONTO THE BED!');
        sfx.playPrizeDrop?.(true);
        [-65, 65].forEach((offset) => {
          s.coins.push(
            createCoinEntity(W / 2 + offset, BED_TOP_Y - 18, {
              ...PRIZE_CATALOG[0],
              isPrize: true,
              dropping: true,
              passedGate: true,
              targetShelfY: PUSHER_MAX_Y + 45,
              vy: 6.2
            })
          );
        });
      } else if (roll < 0.76) {
        outcome = ['🎁', '🎁', '🎁']; // Mystery Prize Drop!
        const pr = PRIZE_CATALOG[Math.floor(Math.random() * PRIZE_CATALOG.length)];
        setStatusBanner(`🎰 MINI-SLOT HIT: 🎁🎁🎁 GIANT ${pr.emoji} ${pr.label.toUpperCase()} DROPPED!`);
        sfx.playPrizeDrop?.(true);
        s.coins.push(
          createCoinEntity(W / 2 + (Math.random() - 0.5) * 90, BED_TOP_Y - 18, {
            ...pr,
            isPrize: true,
            dropping: true,
            passedGate: true,
            targetShelfY: PUSHER_MAX_Y + 35,
            vy: 6.2
          })
        );
      } else {
        // 2-of-a-kind consolations still drop +3 bonus coins!
        const sym = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        outcome = [sym, sym, '🪙'];
        setStatusBanner(`🎰 SKILL GATE BONUS: ${sym}${sym}🪙 +3 EXTRA COINS DROPPED ONTO THE SHELF!`);
        for (let k = 0; k < 3; k++) {
          const rx = W / 2 + (k - 1) * 75;
          s.coins.push(
            createCoinEntity(rx, BED_TOP_Y - 10, {
              dropping: true,
              passedGate: true,
              targetShelfY: PUSHER_MIN_Y + 24,
              vy: 7.2
            })
          );
        }
      }
      s.slotReels = outcome;
      setSlotReels(outcome);
    }, 1150);
  }, []);

  const spawnSparks = (x, y, color = '#facc15', count = 14) => {
    const s = simRef.current;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.6 + Math.random() * 5.2;
      s.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5,
        color,
        alpha: 1,
        size: 2.5 + Math.random() * 3.8
      });
    }
  };

  const spawnFloatingText = (x, y, text, color = '#facc15', scale = 1) => {
    simRef.current.floatingTexts.push({
      x,
      y,
      text,
      color,
      scale,
      alpha: 1,
      vy: -1.65
    });
  };

  // Drop a coin at targetX
  const handleDropCoin = useCallback(
    (targetX = null, isFreeShower = false) => {
      if (isTilted) return;
      const now = performance.now();
      const s = simRef.current;

      if (!isFreeShower && now - s.lastDropAt < 95) return;

      if (!isFreeShower) {
        if (freePlay) {
          if (practiceCoins <= 0) {
            setPracticeCoins(50);
            setStatusBanner('🆓 FREE PRACTICE BUCKET REFILLED (+50 COINS)! KEEP DOZING!');
            sfx.playCoinDrop?.();
            return;
          }
          setPracticeCoins((c) => Math.max(0, c - 1));
        } else {
          if (tokens < 1) {
            setFreePlay(true);
            setPracticeCoins(50);
            setStatusBanner('🆓 Switched to FREE PLAY Mode (+50 Coins)! Or upload a meme for +45 🪙!');
            return;
          }
          if (onSpendTokens) {
            const ok = onSpendTokens(1, 'Neon Coin Dozer Drop');
            if (ok === false) return;
          }
        }
        s.lastDropAt = now;
      }

      sfx.playCoinDrop?.();

      const boundsTop = getBedBoundsAtY(PUSHER_MIN_Y + 25);
      const dropX =
        targetX != null
          ? Math.max(boundsTop.left + 26, Math.min(boundsTop.right - 26, targetX))
          : Math.max(boundsTop.left + 26, Math.min(boundsTop.right - 26, s.aimX));

      const isSkillDrop = s.pusherExtendedRatio <= 0.45;
      const landingY = isSkillDrop
        ? Math.max(PUSHER_MIN_Y + 18, s.pusherY + 16)
        : Math.min(PUSHER_MAX_Y + 26, s.pusherY + 22 + Math.random() * 14);

      const newCoin = createCoinEntity(dropX, BED_TOP_Y - 26, {
        dropping: true,
        targetShelfY: landingY,
        vy: isSkillDrop ? 7.6 : 6.4,
        vx: (Math.random() - 0.5) * 0.5
      });

      s.coins.push(newCoin);
      s.recentDropsSincePrize += 1;

      if (isSkillDrop && !isFreeShower) {
        spawnFloatingText(dropX, BED_TOP_Y + 24, '🎯 FLAT SHELF DROP!', '#4ade80', 0.9);
      }

      // Spawn a new collectible Prize every 9 drops!
      if (s.recentDropsSincePrize >= 9) {
        s.recentDropsSincePrize = 0;
        const prizeTpl = PRIZE_CATALOG[Math.floor(Math.random() * PRIZE_CATALOG.length)];
        const prizeX = W / 2 + (Math.random() - 0.5) * 170;
        s.coins.push(
          createCoinEntity(prizeX, BED_TOP_Y - 28, {
            ...prizeTpl,
            isPrize: true,
            dropping: true,
            passedGate: true,
            targetShelfY: PUSHER_MAX_Y + 20,
            vy: 5.8
          })
        );
        spawnFloatingText(
          prizeX,
          BED_TOP_Y + 54,
          `✨ ${prizeTpl.emoji} ${prizeTpl.label.toUpperCase()} SPAWNED!`,
          prizeTpl.color,
          1.08
        );
        sfx.playPowerup?.();
      }
    },
    [freePlay, isTilted, onSpendTokens, practiceCoins, tokens]
  );

  // Auto-regenerate practice coins & handle Auto-Drop stream
  useEffect(() => {
    const iv = setInterval(() => {
      setPracticeCoins((prev) => (prev < 60 ? Math.min(60, prev + 3) : prev));
      const rem = Math.max(0, Math.ceil((simRef.current.feverUntil - performance.now()) / 1000));
      setFeverSecondsLeft(rem);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!autoDrop || isTilted) return undefined;
    const iv = setInterval(() => {
      handleDropCoin(simRef.current.aimX + (Math.random() - 0.5) * 28, false);
    }, 340);
    return () => clearInterval(iv);
  }, [autoDrop, isTilted, handleDropCoin]);

  // 3-Coin Power Barrage
  const handleSpreadDrop = () => {
    if (isTilted) return;
    if (!freePlay && tokens < 3) {
      handleDropCoin(W / 2);
      return;
    }
    [-115, 0, 115].forEach((offset, idx) => {
      setTimeout(() => {
        handleDropCoin(W / 2 + offset + (Math.random() - 0.5) * 14, false);
      }, idx * 105);
    });
  };

  // Cabinet Nudge
  const handleNudgeCabinet = () => {
    if (isTilted) return;
    const s = simRef.current;
    s.shakeMag = 12;
    sfx.playVineBoom?.();

    const nextWarnings = tiltWarnings + 1;
    setTiltWarnings(nextWarnings);

    if (nextWarnings >= 3) {
      setIsTilted(true);
      setAutoDrop(false);
      setStatusBanner('🚨 TILT ALARM! CABINET LOCKED FOR 4 SECONDS — EASY ON THE GLASS!');
      sfx.playSadTrombone?.();
      setTimeout(() => {
        setIsTilted(false);
        setTiltWarnings(0);
        setStatusBanner('🪙 TILT RESET! PUSHER BAR ONLINE — DROP COINS TO PUSH THE EDGE!');
      }, 4000);
      return;
    }

    s.coins.forEach((c) => {
      if (!c.dropping) {
        c.y += 4.2 + Math.random() * 3.2;
        c.x += (Math.random() - 0.5) * 3.2;
      }
    });
    setStatusBanner(`💥 CABINET NUDGED! CLIFFHANGER COINS SHOVED FORWARD! (TILT ${nextWarnings}/3)`);
    setTimeout(() => {
      setTiltWarnings((w) => Math.max(0, w - 1));
    }, 6500);
  };

  const handleResetBed = () => {
    simRef.current.coins = createInitialBed();
    sfx.playCoinDrop?.();
    setStatusBanner('🔄 FRESH COIN & PRIZE BED RACKED! CLIFFHANGER COINS READY AT THE LIP!');
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleDropCoin(simRef.current.aimX);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        simRef.current.aimX = Math.max(145, simRef.current.aimX - 24);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        simRef.current.aimX = Math.min(W - 145, simRef.current.aimX + 24);
      } else if (e.code === 'KeyN') {
        handleNudgeCabinet();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Main 60fps Physics & Rendering Loop
  useEffect(() => {
    let rafId;
    let lastTime = performance.now();

    const stepSimulation = (now) => {
      const dt = Math.min(0.033, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      const s = simRef.current;
      const isFever = now < s.feverUntil;
      const isMegaShove = now < s.megaShoveUntil;

      // 1. Reciprocating Chrome Pusher Bar motion
      const pusherSpeed = isFever ? 2.65 : 1.95;
      s.pusherPhase += dt * pusherSpeed;
      const maxPush = isMegaShove
        ? PUSHER_MEGA_SHOVE_Y
        : isFever
        ? PUSHER_FEVER_MAX_Y
        : PUSHER_MAX_Y;
      const prevPusherY = s.pusherY;
      const wave = 0.5 - 0.5 * Math.cos(s.pusherPhase);
      s.pusherExtendedRatio = wave;
      s.pusherY = PUSHER_MIN_Y + (maxPush - PUSHER_MIN_Y) * wave;
      const pusherDeltaY = Math.max(0, s.pusherY - prevPusherY);

      // 2. Moving "🎯 SKILL GATE" across the top drop chute
      s.gateX += s.gateDir * 112 * dt;
      if (s.gateX > W - 175) {
        s.gateX = W - 175;
        s.gateDir = -1;
      } else if (s.gateX < 175) {
        s.gateX = 175;
        s.gateDir = 1;
      }

      if (s.shakeMag > 0) {
        s.shakeMag = Math.max(0, s.shakeMag - 32 * dt);
      }

      // 3. Update coins dropping from top chute & check Skill Gate pass-through!
      for (let i = 0; i < s.coins.length; i++) {
        const c = s.coins[i];
        if (c.dropping) {
          c.y += c.vy;
          c.x += c.vx;
          c.vy += 0.35;

          // Check if coin passed through the moving Skill Gate (y around BED_TOP_Y - 4)
          if (!c.passedGate && c.y >= BED_TOP_Y - 8 && c.y <= BED_TOP_Y + 22) {
            c.passedGate = true;
            if (Math.abs(c.x - s.gateX) <= 44) {
              s.gateFlashUntil = now + 550;
              spawnSparks(s.gateX, BED_TOP_Y, '#4ade80', 16);
              spawnFloatingText(s.gateX, BED_TOP_Y - 10, '🎯 SKILL GATE HIT! +2 COINS & SLOT SPIN!', '#4ade80', 1.02);
              // Spawn 2 immediate bonus coins on the shelf
              [-26, 26].forEach((ox) => {
                s.coins.push(
                  createCoinEntity(
                    Math.max(160, Math.min(W - 160, c.x + ox)),
                    PUSHER_MIN_Y + 22,
                    { vy: 2.8 }
                  )
                );
              });
              triggerMiniSlotSpin();
            }
          }

          if (c.y >= c.targetShelfY) {
            c.y = c.targetShelfY;
            c.dropping = false;
            c.vx = 0;
            c.vy = 2.9; // Strong landing impulse to nudge the pile!
            sfx.playCoinClink?.(0.85);
          }
        } else {
          c.x += c.vx;
          c.y += c.vy;
          c.vx *= 0.72;
          c.vy *= 0.72;
        }
      }

      // 4. Pusher Bar Mechanical Sweeping Force
      if (pusherDeltaY > 0) {
        for (let i = 0; i < s.coins.length; i++) {
          const c = s.coins[i];
          if (c.dropping) continue;
          const coinTop = c.y - c.radius * 0.88;
          if (coinTop < s.pusherY && c.y < s.pusherY + 42) {
            const targetY = s.pusherY + c.radius * 0.88;
            const pushAmt = Math.max(pusherDeltaY * 1.14, targetY - c.y);
            c.y += pushAmt;
            c.vy = Math.max(c.vy, pusherDeltaY * 0.92);
          }
        }
      }

      // 5. Multi-Pass Circle-to-Circle Collision & Forward Pressure Solver (4 iterations)
      const activeCoins = s.coins;
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < activeCoins.length; i++) {
          const a = activeCoins[i];
          if (a.dropping) continue;

          for (let j = i + 1; j < activeCoins.length; j++) {
            const b = activeCoins[j];
            if (b.dropping) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = (a.radius + b.radius) * 0.91;
            const distSq = dx * dx + dy * dy;

            if (distSq > 0.0001 && distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq);
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              const aIsHigher = a.y < b.y;
              if (aIsHigher) {
                a.x -= nx * overlap * 0.22;
                a.y -= Math.max(0, ny * overlap * 0.12);
                b.x += nx * overlap * 0.62;
                b.y += Math.abs(ny) * overlap * 0.92;
              } else {
                b.x += nx * overlap * 0.22;
                b.y -= Math.max(0, -ny * overlap * 0.12);
                a.x -= nx * overlap * 0.62;
                a.y += Math.abs(ny) * overlap * 0.92;
              }
            }
          }

          if (a.y < PUSHER_MIN_Y + a.radius * 0.7) {
            a.y = PUSHER_MIN_Y + a.radius * 0.7;
          }

          const bounds = getBedBoundsAtY(a.y);
          const inGutterZone = a.y >= GUTTER_START_Y && a.y <= GUTTER_END_Y;

          if (isFever || !inGutterZone || a.isPrize) {
            const minX = bounds.left + a.radius;
            const maxX = bounds.right - a.radius;
            if (a.x < minX) {
              a.x = minX;
              a.vx = Math.abs(a.vx) * 0.5;
            } else if (a.x > maxX) {
              a.x = maxX;
              a.vx = -Math.abs(a.vx) * 0.5;
            }
          }
        }
      }

      // 6. Check for coins/prizes pushed over the FRONT COLLECTION LIP vs SIDE LOSS GUTTERS
      const remaining = [];
      let trayWinsThisFrame = 0;

      for (let i = 0; i < activeCoins.length; i++) {
        const c = activeCoins[i];
        if (c.dropping) {
          remaining.push(c);
          continue;
        }

        const bounds = getBedBoundsAtY(c.y);
        const inGutterZone = c.y >= GUTTER_START_Y && c.y <= GUTTER_END_Y;

        if (!isFever && inGutterZone && !c.isPrize && (c.x < bounds.left + 3 || c.x > bounds.right - 3)) {
          s.fallingTrayCoins.push({
            ...c,
            vy: 4.8,
            vx: c.x < W / 2 ? -2.2 : 2.2,
            isLostGutter: true,
            alpha: 1
          });
          continue;
        }

        // FRONT COLLECTION TRAY WIN!
        if (c.y >= FRONT_LIP_Y) {
          trayWinsThisFrame += 1;
          s.fallingTrayCoins.push({
            ...c,
            vy: 5.8 + Math.random() * 2.5,
            vx: (Math.random() - 0.5) * 2.4,
            isLostGutter: false,
            alpha: 1
          });

          // Add gleaming coin to visual tray pile at the bottom!
          s.trayPile.push({
            x: Math.max(120, Math.min(W - 120, c.x + (Math.random() - 0.5) * 24)),
            y: TRAY_BOTTOM_Y - 16 - (s.trayPile.length % 18) * 2.2,
            radius: Math.min(22, c.radius * 0.88),
            color: c.color,
            emoji: c.emoji,
            isPrize: c.isPrize
          });
          if (s.trayPile.length > 36) s.trayPile.shift();

          const cb = callbacksRef.current;
          const timeSinceLast = now - s.lastTrayWinAt;
          s.comboCount = timeSinceLast < 2400 ? Math.min(10, s.comboCount + 1) : 1;
          s.lastTrayWinAt = now;

          const feverMult = isFever ? 2 : 1;
          const ptsEarned = Math.round(
            c.points * feverMult * (cb.prizeMultiplier || 1) + (s.comboCount > 1 ? s.comboCount * 60 : 0)
          );
          const tokenAward = c.tokens * (isFever && !c.isPrize ? 2 : 1);

          setScore((prev) => {
            const next = prev + ptsEarned;
            if (next > cb.highScore) {
              localStorage.setItem('tm_pusher_highscore', String(next));
              setHighScore(next);
            }
            return next;
          });

          setCoinsWonSession((prev) => prev + tokenAward);
          if (c.isPrize) {
            setPrizesWonSession((prev) => prev + 1);
            setCollectedPrizeKinds((prev) => (prev.includes(c.kind) ? prev : [...prev, c.kind]));
            s.shakeMag = 8;
          }

          if (cb.freePlay) {
            setPracticeCoins((prev) => Math.min(75, prev + tokenAward));
            cb.onEarnXp?.(c.isPrize ? 40 : 10);
          } else {
            cb.onEarnTokens?.(
              tokenAward,
              null,
              c.isPrize ? `${c.emoji} ${c.label} Dozer Prize!` : '🪙 Coin Dozer Tray Drop',
              'subgame'
            );
            cb.onEarnXp?.(c.isPrize ? 50 : 12);
          }

          spawnSparks(c.x, FRONT_LIP_Y + 12, c.color, c.isPrize ? 30 : 14);
          spawnFloatingText(
            c.x,
            FRONT_LIP_Y - 10,
            c.isPrize
              ? `${c.emoji} ${c.label.toUpperCase()} +${tokenAward} 🪙 (+${ptsEarned} PTS)!`
              : `+${tokenAward} 🪙 ${s.comboCount > 1 ? `(${s.comboCount}× CASCADE!)` : ''}`,
            c.isPrize ? '#f472b6' : '#4ade80',
            c.isPrize ? 1.2 : 0.98
          );

          // Special Prize Bonus Effects!
          if (c.kind === 'lootbox' || c.kind === 'crown') {
            const showerCount = c.kind === 'crown' ? 10 : 6;
            setStatusBanner(
              `${c.emoji} ${c.label.toUpperCase()} WON! TRIGGERING ${showerCount}-COIN CEILING SHOWER!`
            );
            for (let k = 0; k < showerCount; k++) {
              setTimeout(() => {
                const rx = W / 2 + (Math.random() - 0.5) * 230;
                s.coins.push(
                  createCoinEntity(rx, BED_TOP_Y - 14, {
                    dropping: true,
                    passedGate: true,
                    targetShelfY: PUSHER_MIN_Y + 26 + Math.random() * 44,
                    vy: 7.0
                  })
                );
                sfx.playCoinDrop?.();
              }, k * 110);
            }
          } else if (c.kind === 'joystick') {
            s.megaShoveUntil = Math.max(s.megaShoveUntil, now + 8000);
            setStatusBanner('🕹️ GOLDEN JOYSTICK COLLECTED! ⚡ 8s MEGA DOZER SUPER-STROKE ACTIVATED!');
          } else if (c.kind === 'trophy') {
            s.feverUntil = Math.max(s.feverUntil, now + 15000);
            setFeverSecondsLeft(15);
            setStatusBanner('🏆 GOLDEN TROPHY WON! 🛡️ 15s BULLDOZER FEVER & LASER SIDE-WALLS ACTIVATED!');
          }

          setFeverProgress((prev) => {
            const next = prev + (c.isPrize ? 4 : 1);
            if (next >= 12) {
              s.feverUntil = Math.max(s.feverUntil, performance.now() + 14000);
              setFeverSecondsLeft(14);
              setStatusBanner('🌈 BULLDOZER FEVER ACTIVE (14s)! LASER SIDE-WALLS UP + 2× DOZER STROKE!');
              sfx.playPrizeDrop?.(true);
              return 0;
            }
            return next;
          });

          continue;
        }

        remaining.push(c);
      }

      if (trayWinsThisFrame > 0) {
        if (trayWinsThisFrame >= 3) {
          sfx.playPrizeDrop?.(true);
          setStatusBanner(`🎉 ${trayWinsThisFrame}-COIN AVALANCHE INTO THE PAYOFF TRAY!`);
        } else {
          sfx.playPrizeDrop?.(false);
        }
      }

      if (remaining.length < 48) {
        const bounds = getBedBoundsAtY(PUSHER_MIN_Y + 30);
        const rx = bounds.left + 34 + Math.random() * (bounds.right - bounds.left - 68);
        remaining.push(createCoinEntity(rx, PUSHER_MIN_Y + 24));
      }

      s.coins = remaining;

      // 7. Update falling tray coins, sparks & floating popups
      s.fallingTrayCoins = s.fallingTrayCoins.filter((fc) => {
        fc.x += fc.vx;
        fc.y += fc.vy;
        fc.vy += 0.45;
        if (fc.y > TRAY_BOTTOM_Y - 22) {
          fc.alpha -= 0.09;
        }
        return fc.alpha > 0 && fc.y < H + 30;
      });

      s.sparks = s.sparks.filter((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.18;
        sp.alpha -= 0.032;
        return sp.alpha > 0;
      });

      s.floatingTexts = s.floatingTexts.filter((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.017;
        return ft.alpha > 0;
      });

      // ==========================================
      // RENDER 3D-PERSPECTIVE ARCADE COIN DOZER CABINET
      // ==========================================
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.save();

      if (s.shakeMag > 0.2) {
        ctx.translate((Math.random() - 0.5) * s.shakeMag, (Math.random() - 0.5) * s.shakeMag);
      }

      // 1. Deep Synthwave Cabinet Backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#070916');
      bgGrad.addColorStop(0.5, '#0d1329');
      bgGrad.addColorStop(1, '#050711');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const topBounds = getBedBoundsAtY(BED_TOP_Y);
      const botBounds = getBedBoundsAtY(FRONT_LIP_Y);

      // 2. Top Illuminated Backbox with 3-Reel Mini-Slot & Skill Timing Bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fillRect(14, 10, W - 28, 102);
      ctx.strokeStyle = isFever ? '#f472b6' : '#facc15';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(14, 10, W - 28, 102);

      // Mini-Slot 3 Reels Box on the Top-Left/Center
      const isSlotSpinningNow = now < s.slotSpinUntil;
      ctx.fillStyle = '#050814';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.fillRect(26, 18, 152, 46);
      ctx.strokeRect(26, 18, 152, 46);

      ctx.fillStyle = '#67e8f9';
      ctx.font = '900 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🎰 SKILL GATE SLOT', 102, 29);

      for (let r = 0; r < 3; r++) {
        const rx = 44 + r * 44;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.fillRect(rx, 33, 36, 26);
        const sym = isSlotSpinningNow
          ? SLOT_SYMBOLS[Math.floor((now / 65 + r * 2) % SLOT_SYMBOLS.length)]
          : s.slotReels[r];
        ctx.font = '18px sans-serif';
        ctx.fillText(sym, rx + 18, 52);
      }

      // Header Marquee Title & Skill Timing Window
      ctx.fillStyle = '#facc15';
      ctx.font = '900 15px Orbitron, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isFever
          ? '🌈 BULLDOZER FEVER — 2× PUSH & LASER SHIELDS!'
          : '🪙 TAP OR HOLD TO DROP COINS THROUGH THE SKILL GATE!',
        388,
        32
      );

      const isSweetSpot = s.pusherExtendedRatio <= 0.45;
      ctx.fillStyle = isSweetSpot ? 'rgba(74, 222, 128, 0.22)' : 'rgba(148, 163, 184, 0.14)';
      ctx.fillRect(190, 40, 398, 22);
      ctx.strokeStyle = isSweetSpot ? '#4ade80' : 'rgba(148, 163, 184, 0.4)';
      ctx.strokeRect(190, 40, 398, 22);
      ctx.fillStyle = isSweetSpot ? '#4ade80' : '#cbd5e1';
      ctx.font = '800 11px monospace';
      ctx.fillText(
        isSweetSpot
          ? '🎯 SHELF OPEN — PERFECT DROP WINDOW (MAXIMUM FORWARD PUSH!)'
          : '⏳ DOZER PUSHING FORWARD — DROP TO STACK COINS',
        389,
        55
      );

      // Moving Aiming Coin Cursor on Top Rail
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.aimX, 94, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 10px sans-serif';
      ctx.fillText('DROP', s.aimX, 98);
      ctx.restore();

      // Aiming Laser Guide Line
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = isSweetSpot ? 'rgba(74, 222, 128, 0.6)' : 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.aimX, 110);
      ctx.lineTo(s.aimX, s.pusherY + 16);
      ctx.stroke();
      ctx.restore();

      // 2B. Moving Neon "🎯 SKILL GATE" across the Drop Chute!
      const gateFlashing = now < s.gateFlashUntil;
      ctx.save();
      ctx.fillStyle = gateFlashing ? 'rgba(74, 222, 128, 0.45)' : 'rgba(0, 243, 255, 0.22)';
      ctx.strokeStyle = gateFlashing ? '#4ade80' : '#00f3ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = gateFlashing ? '#4ade80' : '#00f3ff';
      ctx.shadowBlur = gateFlashing ? 18 : 10;
      ctx.fillRect(s.gateX - 44, BED_TOP_Y - 22, 88, 18);
      ctx.strokeRect(s.gateX - 44, BED_TOP_Y - 22, 88, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🎯 +2🪙 & SPIN', s.gateX, BED_TOP_Y - 10);
      ctx.restore();

      // 3. Trapezoidal 3D Coin Bed Surface
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topBounds.left, BED_TOP_Y);
      ctx.lineTo(topBounds.right, BED_TOP_Y);
      ctx.lineTo(botBounds.right, FRONT_LIP_Y);
      ctx.lineTo(botBounds.left, FRONT_LIP_Y);
      ctx.closePath();

      const bedGrad = ctx.createLinearGradient(0, BED_TOP_Y, 0, FRONT_LIP_Y);
      bedGrad.addColorStop(0, '#111936');
      bedGrad.addColorStop(0.55, '#172347');
      bedGrad.addColorStop(1, '#1e2b58');
      ctx.fillStyle = bedGrad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 243, 255, 0.13)';
      ctx.lineWidth = 1;
      for (let frac = 0.15; frac < 0.9; frac += 0.15) {
        const tx = topBounds.left + (topBounds.right - topBounds.left) * frac;
        const bx = botBounds.left + (botBounds.right - botBounds.left) * frac;
        ctx.beginPath();
        ctx.moveTo(tx, BED_TOP_Y);
        ctx.lineTo(bx, FRONT_LIP_Y);
        ctx.stroke();
      }
      for (let gy = 210; gy < FRONT_LIP_Y; gy += 60) {
        const gb = getBedBoundsAtY(gy);
        ctx.beginPath();
        ctx.moveTo(gb.left, gy);
        ctx.lineTo(gb.right, gy);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Left & Right Side Gutters (or Glowing Fever Laser Side-Walls)
      const gStart = getBedBoundsAtY(GUTTER_START_Y);
      const gEnd = getBedBoundsAtY(GUTTER_END_Y);

      if (isFever) {
        ctx.save();
        ctx.strokeStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(gStart.left, GUTTER_START_Y);
        ctx.lineTo(gEnd.left, GUTTER_END_Y);
        ctx.moveTo(gStart.right, GUTTER_START_Y);
        ctx.lineTo(gEnd.right, GUTTER_END_Y);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.lineWidth = 5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(gStart.left, GUTTER_START_Y);
        ctx.lineTo(gEnd.left, GUTTER_END_Y);
        ctx.moveTo(gStart.right, GUTTER_START_Y);
        ctx.lineTo(gEnd.right, GUTTER_END_Y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(248, 113, 113, 0.72)';
        ctx.font = '800 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OUT', gStart.left - 22, (GUTTER_START_Y + GUTTER_END_Y) / 2);
        ctx.fillText('OUT', gStart.right + 22, (GUTTER_START_Y + GUTTER_END_Y) / 2);
        ctx.restore();
      }

      // Outer Chrome Rails
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(topBounds.left, BED_TOP_Y);
      ctx.lineTo(gStart.left, GUTTER_START_Y);
      ctx.moveTo(topBounds.right, BED_TOP_Y);
      ctx.lineTo(gStart.right, GUTTER_START_Y);
      ctx.stroke();
      ctx.restore();

      // 5. Reciprocating Chrome & Neon PUSHER BAR ("THE DOZER")
      const pusherBounds = getBedBoundsAtY(s.pusherY);
      ctx.save();
      const pusherGrad = ctx.createLinearGradient(0, BED_TOP_Y, 0, s.pusherY);
      pusherGrad.addColorStop(0, '#1e293b');
      pusherGrad.addColorStop(0.75, '#334155');
      pusherGrad.addColorStop(1, isMegaShove ? '#facc15' : isFever ? '#ec4899' : '#00f3ff');

      ctx.beginPath();
      ctx.moveTo(topBounds.left + 4, BED_TOP_Y);
      ctx.lineTo(topBounds.right - 4, BED_TOP_Y);
      ctx.lineTo(pusherBounds.right - 6, s.pusherY);
      ctx.lineTo(pusherBounds.left + 6, s.pusherY);
      ctx.closePath();
      ctx.fillStyle = pusherGrad;
      ctx.fill();

      ctx.fillStyle = isMegaShove ? '#facc15' : isFever ? '#f472b6' : '#00f3ff';
      ctx.shadowColor = isMegaShove ? '#facc15' : isFever ? '#f472b6' : '#00f3ff';
      ctx.shadowBlur = 15;
      ctx.fillRect(
        pusherBounds.left + 6,
        s.pusherY - 12,
        pusherBounds.right - pusherBounds.left - 12,
        12
      );

      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.font = '900 13px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        isMegaShove
          ? '⚡ MEGA DOZER SUPER-STROKE ⚡'
          : isFever
          ? '🌈 BULLDOZER FEVER OVERDRIVE 🌈'
          : '◄◄ NEON DOZER BAR 1986 ►►',
        W / 2,
        s.pusherY - 20
      );
      ctx.restore();

      // 6. Front Collection Lip & Chrome Payoff Tray
      ctx.save();
      const lipGrad = ctx.createLinearGradient(botBounds.left, FRONT_LIP_Y - 6, botBounds.left, FRONT_LIP_Y + 18);
      lipGrad.addColorStop(0, '#4ade80');
      lipGrad.addColorStop(0.5, '#16a34a');
      lipGrad.addColorStop(1, '#052e16');
      ctx.fillStyle = lipGrad;
      ctx.fillRect(botBounds.left, FRONT_LIP_Y - 4, botBounds.right - botBounds.left, 16);

      ctx.fillStyle = '#052e16';
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        '▼ WINNING PAYOFF EDGE — PUSH COINS & PRIZES OVER THIS LIP! ▼',
        W / 2,
        FRONT_LIP_Y + 8
      );

      const trayGrad = ctx.createLinearGradient(0, FRONT_LIP_Y + 12, 0, TRAY_BOTTOM_Y);
      trayGrad.addColorStop(0, '#090d1a');
      trayGrad.addColorStop(1, '#111c38');
      ctx.fillStyle = trayGrad;
      ctx.fillRect(
        botBounds.left - 8,
        FRONT_LIP_Y + 12,
        botBounds.right - botBounds.left + 16,
        TRAY_BOTTOM_Y - FRONT_LIP_Y - 12
      );
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        botBounds.left - 8,
        FRONT_LIP_Y + 12,
        botBounds.right - botBounds.left + 16,
        TRAY_BOTTOM_Y - FRONT_LIP_Y - 12
      );

      ctx.fillStyle = 'rgba(74, 222, 128, 0.28)';
      ctx.font = '900 18px Orbitron, Impact, sans-serif';
      ctx.fillText('🪙 PRIZE & TOKEN COLLECTION TRAY 🎁', W / 2, FRONT_LIP_Y + 58);
      ctx.restore();

      // 6B. Draw Accumulated Gleaming Coins inside the Bottom Collection Tray!
      s.trayPile.forEach((tc) => {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(tc.x, tc.y, tc.radius, tc.radius * 0.78, 0, 0, Math.PI * 2);
        ctx.fillStyle = tc.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tc.emoji, tc.x, tc.y);
        ctx.restore();
      });

      // 7. Draw Coins & Prizes on the Bed (with Cliffhanger Edge Wobble!)
      const renderList = [...s.coins].sort((a, b) => {
        if (a.isPrize !== b.isPrize) return a.isPrize ? 1 : -1;
        if (a.dropping !== b.dropping) return a.dropping ? 1 : -1;
        return a.y - b.y;
      });

      const drawSingleCoin = (c, alpha = 1) => {
        ctx.save();
        ctx.globalAlpha = alpha;

        const isTeetering = !c.dropping && c.y >= FRONT_LIP_Y - 22;
        const wobbleX = isTeetering ? Math.sin(now * 0.028 + c.shimmerOffset) * 1.6 : 0;
        const cx = c.x + wobbleX;
        const cy = c.y;

        const persp = 0.9 + Math.max(0, Math.min(0.24, ((cy - BED_TOP_Y) / (FRONT_LIP_Y - BED_TOP_Y)) * 0.22));
        const rx = c.radius * persp;
        const ry = c.radius * persp * 0.86;

        // 3D Coin Rim / Thickness Cylinder
        const rimDepth = c.isPrize ? 7.5 : c.kind === 'goldstack' ? 7 : 5;
        ctx.beginPath();
        ctx.ellipse(cx, cy + rimDepth, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = c.isPrize
          ? '#701a75'
          : c.kind === 'goldstack'
          ? '#15803d'
          : c.kind === 'silver'
          ? '#0369a1'
          : '#a16207';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.stroke();

        // Top Face of Coin / Prize Disc
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        const faceGrad = ctx.createRadialGradient(
          cx - rx * 0.3,
          cy - ry * 0.3,
          2,
          cx,
          cy,
          rx
        );
        if (c.isPrize) {
          faceGrad.addColorStop(0, '#ffffff');
          faceGrad.addColorStop(0.45, c.color);
          faceGrad.addColorStop(1, '#1e1b4b');
        } else if (c.kind === 'goldstack') {
          faceGrad.addColorStop(0, '#dcfce7');
          faceGrad.addColorStop(0.55, '#4ade80');
          faceGrad.addColorStop(1, '#15803d');
        } else if (c.kind === 'silver') {
          faceGrad.addColorStop(0, '#e0f2fe');
          faceGrad.addColorStop(0.55, '#38bdf8');
          faceGrad.addColorStop(1, '#0284c7');
        } else {
          faceGrad.addColorStop(0, '#fef08a');
          faceGrad.addColorStop(0.55, '#facc15');
          faceGrad.addColorStop(1, '#ca8a04');
        }
        ctx.fillStyle = faceGrad;
        if (c.isPrize || isTeetering) {
          ctx.shadowColor = isTeetering ? '#4ade80' : c.color;
          ctx.shadowBlur = c.isPrize ? 15 : 11;
        }
        ctx.fill();

        ctx.lineWidth = c.isPrize || isTeetering ? 2.4 : 1.4;
        ctx.strokeStyle = isTeetering ? '#4ade80' : c.isPrize ? '#ffffff' : 'rgba(255, 255, 255, 0.65)';
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 0.74, ry * 0.74, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = `${Math.round(rx * (c.isPrize ? 0.96 : 0.78))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.emoji, cx, cy + 1);

        ctx.restore();
      };

      renderList.forEach((c) => drawSingleCoin(c, 1));
      s.fallingTrayCoins.forEach((fc) => drawSingleCoin(fc, fc.alpha));

      // 8. Draw Particle Sparks
      s.sparks.forEach((sp) => {
        ctx.save();
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 9. Draw Floating Win / Combo Popups
      s.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = `900 ${Math.round(15 * ft.scale)}px Orbitron, Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();
      rafId = requestAnimationFrame(stepSimulation);
    };

    rafId = requestAnimationFrame(stepSimulation);
    return () => cancelAnimationFrame(rafId);
  }, [triggerMiniSlotSpin]);

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: W / 2, y: 80 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / Math.max(1, rect.width);
    const scaleY = H / Math.max(1, rect.height);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasPointerMove = (e) => {
    const pt = getCanvasPoint(e);
    simRef.current.aimX = Math.max(145, Math.min(W - 145, pt.x));
  };

  const handleCanvasPointerDown = (e) => {
    const pt = getCanvasPoint(e);
    simRef.current.aimX = Math.max(145, Math.min(W - 145, pt.x));
    handleDropCoin(simRef.current.aimX);
  };

  return (
    <section className="tm-pusher-arena" aria-label="Neon Coin Dozer '86 Arcade Machine">
      <div className="tm-pusher-layout">
        {/* LEFT / TOP COMPACT TELEMETRY & CONTROLS DECK */}
        <div className="tm-pusher-side-deck">
          <div className="tm-pusher-brand-card">
            <div className="tm-pusher-eyebrow">🪙 VEGAS PENNY-FALLS &amp; MINI-SLOT • 1986 EDITION</div>
            <h2 className="tm-pusher-title">NEON COIN DOZER &apos;86</h2>
            <p className="tm-pusher-sub">{statusBanner}</p>

            {/* Mode Switcher: Free Play vs Token Mode */}
            <div className="tm-pusher-mode-row">
              <button
                type="button"
                className={`tm-pusher-mode-btn ${freePlay ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setFreePlay(true);
                }}
              >
                🆓 Free Play ({practiceCoins} Coins)
              </button>
              <button
                type="button"
                className={`tm-pusher-mode-btn ${!freePlay ? 'active token' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setFreePlay(false);
                }}
              >
                🪙 Token Mode ({tokens} 🪙)
              </button>
            </div>

            {/* Live Score, Tray Won & Mini-Slot Readout */}
            <div className="tm-pusher-stats-grid">
              <div className="tm-pusher-stat">
                <span>SCORE ({prizeMultiplier.toFixed(2)}×)</span>
                <strong>{score.toLocaleString()}</strong>
              </div>
              <div className="tm-pusher-stat">
                <span>BEST</span>
                <strong>{highScore.toLocaleString()}</strong>
              </div>
              <div className="tm-pusher-stat">
                <span>TRAY WON</span>
                <strong style={{ color: '#4ade80' }}>+{coinsWonSession} 🪙</strong>
              </div>
              <div className="tm-pusher-stat">
                <span>MINI-SLOT</span>
                <strong style={{ color: '#facc15' }}>
                  {slotSpinning ? '🎰 SPIN...' : slotReels.join(' ')}
                </strong>
              </div>
            </div>

            {/* Bulldozer Fever Progress Bar */}
            <div className="tm-pusher-fever-box">
              <div className="tm-pusher-fever-head">
                <span>
                  {feverSecondsLeft > 0
                    ? `🌈 BULLDOZER FEVER ACTIVE (${feverSecondsLeft}s)!`
                    : '🛡️ LASER SIDE-WALL FEVER METER'}
                </span>
                <strong>{feverSecondsLeft > 0 ? 'MAX!' : `${feverProgress}/12`}</strong>
              </div>
              <div className="tm-pusher-fever-track">
                <div
                  className={`tm-pusher-fever-fill ${feverSecondsLeft > 0 ? 'fever' : ''}`}
                  style={{
                    width: `${feverSecondsLeft > 0 ? 100 : Math.min(100, (feverProgress / 12) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Primary Arcade Action Controls */}
            <div className="tm-pusher-controls-grid">
              <button
                type="button"
                className="tm-pusher-action-btn primary"
                disabled={isTilted}
                onClick={() => handleDropCoin(simRef.current.aimX)}
              >
                🪙 DROP COIN {freePlay ? '(FREE)' : '(1 🪙)'}
              </button>
              <button
                type="button"
                className={`tm-pusher-action-btn spread ${autoDrop ? 'active-autodrop' : ''}`}
                disabled={isTilted}
                onClick={() => {
                  sfx.playToggle?.();
                  setAutoDrop((prev) => !prev);
                }}
                style={{
                  borderColor: autoDrop ? '#4ade80' : '#00f3ff',
                  background: autoDrop ? 'rgba(34, 197, 94, 0.24)' : undefined,
                  color: autoDrop ? '#4ade80' : '#67e8f9'
                }}
              >
                {autoDrop ? '🔥 AUTO-DROP: ON' : '🔥 AUTO-DROP: OFF'}
              </button>
              <button
                type="button"
                className="tm-pusher-action-btn spread"
                disabled={isTilted}
                onClick={handleSpreadDrop}
              >
                ⚡ 3-COIN BARRAGE
              </button>
              <button
                type="button"
                className="tm-pusher-action-btn nudge"
                disabled={isTilted}
                onClick={handleNudgeCabinet}
              >
                💥 NUDGE ({tiltWarnings}/3)
              </button>
              <button
                type="button"
                className="tm-pusher-action-btn reset"
                onClick={handleResetBed}
              >
                🔄 RE-RACK BED
              </button>
            </div>

            {/* Collectible Prize Vault Shelf */}
            <div className="tm-pusher-prize-legend">
              {PRIZE_CATALOG.map((pr) => {
                const won = collectedPrizeKinds.includes(pr.kind);
                return (
                  <span
                    key={pr.kind}
                    style={{
                      opacity: won ? 1 : 0.65,
                      color: won ? '#4ade80' : '#cbd5e1',
                      fontWeight: won ? 900 : 700
                    }}
                    title={`${pr.label}: +${pr.tokens} 🪙`}
                  >
                    {pr.emoji} +{pr.tokens}🪙 {won ? '✓' : ''}
                  </span>
                );
              })}
            </div>

            <div className="tm-pusher-footer-links">
              {onOpenBlankStudio && (
                <button type="button" className="tm-pusher-link-btn" onClick={onOpenBlankStudio}>
                  📸 Upload Meme (+45 🪙)
                </button>
              )}
              {onSelectViewMode && (
                <button
                  type="button"
                  className="tm-pusher-link-btn"
                  onClick={() => onSelectViewMode('pinball')}
                >
                  🎱 Play Pinball
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CENTER-STAGE FULL-HEIGHT 3D COIN DOZER CABINET CANVAS */}
        <div className="tm-pusher-stage-wrap">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="tm-pusher-canvas"
            onPointerMove={handleCanvasPointerMove}
            onPointerDown={handleCanvasPointerDown}
          />
        </div>
      </div>
    </section>
  );
}
