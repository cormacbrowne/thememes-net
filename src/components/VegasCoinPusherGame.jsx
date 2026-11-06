import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';

// ==========================================
// PHASE 27: NEON COIN DOZER '86 (3D-PERSPECTIVE ARCADE COIN PUSHER & PRIZE MACHINE)
// Authentic Penny-Falls / Coin Pusher physics with reciprocating Chrome Pusher Bar,
// coin-to-coin momentum chains, Front Collection Tray vs Side Loss Gutters,
// collectible 3D Prizes (Diamonds, Mystery Loot Boxes, Golden Trophies),
// Skill-Timing Drop Meter, Cabinet Nudge with TILT sensor, and Bulldozer Fever!
// ==========================================

const W = 620;
const H = 720;

// Playfield geometry (trapezoidal pseudo-3D cabinet perspective)
const BED_TOP_Y = 128;
const PUSHER_MIN_Y = 152;
const PUSHER_MAX_Y = 258;
const PUSHER_FEVER_MAX_Y = 282;
const FRONT_LIP_Y = 566;
const TRAY_BOTTOM_Y = 696;

// Left and right bed rails widen slightly from back to front for 3D perspective
const getBedBoundsAtY = (y) => {
  const t = Math.max(0, Math.min(1, (y - BED_TOP_Y) / (FRONT_LIP_Y - BED_TOP_Y)));
  const halfWidth = 188 + t * 56; // 376px wide at back -> 488px wide at front lip
  return {
    left: W / 2 - halfWidth,
    right: W / 2 + halfWidth,
    t
  };
};

// Side loss gutters exist along the lower half of the bed (unless Fever Laser Walls are active)
const GUTTER_START_Y = 335;
const GUTTER_END_Y = 552;

const PRIZE_CATALOG = [
  {
    kind: 'diamond',
    emoji: '💎',
    label: 'Neon Diamond',
    radius: 26,
    mass: 1.55,
    tokens: 8,
    points: 1000,
    color: '#00f3ff',
    glow: 'rgba(0, 243, 255, 0.7)'
  },
  {
    kind: 'lootbox',
    emoji: '🎁',
    label: 'Mystery Box',
    radius: 28,
    mass: 1.75,
    tokens: 12,
    points: 1800,
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.75)'
  },
  {
    kind: 'trophy',
    emoji: '🏆',
    label: '86 Gold Trophy',
    radius: 30,
    mass: 1.95,
    tokens: 20,
    points: 3500,
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.85)'
  }
];

let entityIdSeq = 1;

function createCoinEntity(x, y, overrides = {}) {
  const isSilver = overrides.kind === 'silver' || (!overrides.kind && Math.random() < 0.14);
  const kind = overrides.kind || (isSilver ? 'silver' : 'gold');
  const radius = overrides.radius || (kind === 'silver' ? 21 : 19.5);
  return {
    id: `c-${entityIdSeq++}`,
    kind,
    emoji: overrides.emoji || (kind === 'silver' ? '⚡' : '🪙'),
    label: overrides.label || (kind === 'silver' ? '2× Cyber Chip' : 'Gold Coin'),
    x,
    y,
    vx: overrides.vx || 0,
    vy: overrides.vy || 0,
    radius,
    mass: overrides.mass || (kind === 'silver' ? 1.15 : 1.0),
    tokens: overrides.tokens ?? (kind === 'silver' ? 2 : 1),
    points: overrides.points ?? (kind === 'silver' ? 250 : 100),
    color: overrides.color || (kind === 'silver' ? '#38bdf8' : '#facc15'),
    glow: overrides.glow || (kind === 'silver' ? 'rgba(56, 189, 248, 0.5)' : 'rgba(250, 204, 21, 0.45)'),
    isPrize: Boolean(overrides.isPrize),
    dropping: Boolean(overrides.dropping), // Falling from drop chute onto shelf
    targetShelfY: overrides.targetShelfY || 185,
    shimmerOffset: Math.random() * Math.PI * 2,
    state: 'bed' // 'bed' | 'tray' | 'gutter'
  };
}

function createInitialBed() {
  const items = [];
  // Seed a dense, authentic multi-row coin bed from y=220 down to y=556 (right on the edge of the front lip!)
  const rows = [
    { y: 235, count: 7 },
    { y: 274, count: 8 },
    { y: 314, count: 9 },
    { y: 355, count: 10 },
    { y: 396, count: 10 },
    { y: 438, count: 11 },
    { y: 480, count: 11 },
    { y: 520, count: 11 },
    { y: 552, count: 10 } // Teetering right on the front lip!
  ];

  rows.forEach((row) => {
    const bounds = getBedBoundsAtY(row.y);
    const usableW = bounds.right - bounds.left - 48;
    for (let i = 0; i < row.count; i++) {
      const frac = row.count > 1 ? i / (row.count - 1) : 0.5;
      const jitterX = (Math.random() - 0.5) * 10;
      const jitterY = (Math.random() - 0.5) * 9;
      const x = bounds.left + 24 + frac * usableW + jitterX;
      const y = row.y + jitterY;
      items.push(createCoinEntity(x, y));
    }
  });

  // Place 3 exciting prizes in the middle/lower bed ready to be nudged forward!
  const p1 = PRIZE_CATALOG[0]; // Diamond near front-left
  items.push(
    createCoinEntity(W / 2 - 75, 468, {
      ...p1,
      isPrize: true
    })
  );
  const p2 = PRIZE_CATALOG[1]; // Mystery Box center
  items.push(
    createCoinEntity(W / 2 + 68, 412, {
      ...p2,
      isPrize: true
    })
  );
  const p3 = PRIZE_CATALOG[2]; // Trophy upper-mid
  items.push(
    createCoinEntity(W / 2, 336, {
      ...p3,
      isPrize: true
    })
  );

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

  // Free Play vs Token Mode (defaults to Free Play if player has < 5 tokens so anyone can play immediately)
  const [freePlay, setFreePlay] = useState(() => tokens < 5);
  const [practiceCoins, setPracticeCoins] = useState(45);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    Number(localStorage.getItem('tm_pusher_highscore') || 0)
  );
  const [coinsWonSession, setCoinsWonSession] = useState(0);
  const [prizesWonSession, setPrizesWonSession] = useState(0);
  const [feverProgress, setFeverProgress] = useState(0); // 0..12
  const [feverSecondsLeft, setFeverSecondsLeft] = useState(0);
  const [tiltWarnings, setTiltWarnings] = useState(0);
  const [isTilted, setIsTilted] = useState(false);
  const [statusBanner, setStatusBanner] = useState(
    '🪙 TAP ANYWHERE ON THE TOP DROP RAIL (OR PRESS SPACE) TO DROP COINS ONTO THE MOVING PUSHER SHELF!'
  );

  // Mutable simulation state for 60fps canvas loop
  const simRef = useRef({
    coins: createInitialBed(),
    fallingTrayCoins: [],
    floatingTexts: [],
    sparks: [],
    pusherPhase: 0,
    pusherY: PUSHER_MIN_Y,
    pusherExtendedRatio: 0, // 0 = retracted (PERFECT DROP!), 1 = fully extended
    aimX: W / 2,
    aimDir: 1,
    feverUntil: 0,
    shakeMag: 0,
    lastDropAt: 0,
    comboCount: 0,
    lastTrayWinAt: 0,
    recentDropsSincePrize: 0
  });

  // Sync latest callbacks & mode into refs for RAF loop access
  const callbacksRef = useRef({
    freePlay,
    onEarnTokens,
    onEarnXp,
    highScore
  });
  useEffect(() => {
    callbacksRef.current = { freePlay, onEarnTokens, onEarnXp, highScore };
  }, [freePlay, onEarnTokens, onEarnXp, highScore]);

  // Auto-regenerate practice coins in Free Play mode & countdown Fever timer
  useEffect(() => {
    const iv = setInterval(() => {
      setPracticeCoins((prev) => (prev < 45 ? Math.min(45, prev + 2) : prev));
      const rem = Math.max(0, Math.ceil((simRef.current.feverUntil - performance.now()) / 1000));
      setFeverSecondsLeft(rem);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const spawnSparks = (x, y, color = '#facc15', count = 14) => {
    const s = simRef.current;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 4.8;
      s.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.4,
        color,
        alpha: 1,
        size: 2.5 + Math.random() * 3.5
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
      vy: -1.6
    });
  };

  // Drop a single coin at X
  const handleDropCoin = useCallback(
    (targetX = null, isFreeShower = false) => {
      if (isTilted) return;
      const now = performance.now();
      const s = simRef.current;

      if (!isFreeShower && now - s.lastDropAt < 110) return;

      if (!isFreeShower) {
        if (freePlay) {
          if (practiceCoins <= 0) {
            setPracticeCoins(35);
            setStatusBanner('🆓 FREE PRACTICE BUCKET REFILLED (+35 COINS)! KEEP PUSHING!');
            sfx.playCoinDrop?.();
            return;
          }
          setPracticeCoins((c) => Math.max(0, c - 1));
        } else {
          if (tokens < 1) {
            setFreePlay(true);
            setPracticeCoins(40);
            setStatusBanner('🆓 Switched to FREE PLAY Mode (+40 Practice Coins)! Or upload a meme for +45 🪙!');
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
          ? Math.max(boundsTop.left + 28, Math.min(boundsTop.right - 28, targetX))
          : Math.max(boundsTop.left + 28, Math.min(boundsTop.right - 28, s.aimX));

      // Skill timing check: if pusher is retracted (< 0.38 extended), the coin lands flat on the upper shelf
      // right in front of the pusher face and pushes the entire pile on the next stroke!
      const isSkillDrop = s.pusherExtendedRatio <= 0.42;
      const landingY = isSkillDrop
        ? Math.max(PUSHER_MIN_Y + 20, s.pusherY + 18)
        : Math.min(PUSHER_MAX_Y + 28, s.pusherY + 24 + Math.random() * 14);

      const newCoin = createCoinEntity(dropX, BED_TOP_Y - 18, {
        dropping: true,
        targetShelfY: landingY,
        vy: isSkillDrop ? 7.2 : 6.0,
        vx: (Math.random() - 0.5) * 0.6
      });

      s.coins.push(newCoin);
      s.recentDropsSincePrize += 1;

      if (isSkillDrop && !isFreeShower) {
        spawnFloatingText(dropX, BED_TOP_Y + 34, '🎯 SKILL TIMING DROP!', '#4ade80', 0.92);
      }

      // Periodically spawn a new special Prize onto the upper shelf every 11 coin drops!
      if (s.recentDropsSincePrize >= 11) {
        s.recentDropsSincePrize = 0;
        const prizeTpl = PRIZE_CATALOG[Math.floor(Math.random() * PRIZE_CATALOG.length)];
        const prizeX = W / 2 + (Math.random() - 0.5) * 160;
        s.coins.push(
          createCoinEntity(prizeX, BED_TOP_Y - 24, {
            ...prizeTpl,
            isPrize: true,
            dropping: true,
            targetShelfY: PUSHER_MAX_Y + 22,
            vy: 5.5
          })
        );
        spawnFloatingText(prizeX, BED_TOP_Y + 60, `✨ NEW ${prizeTpl.emoji} ${prizeTpl.label.toUpperCase()} SPAWNED!`, prizeTpl.color, 1.05);
        sfx.playPowerup?.();
      }
    },
    [freePlay, isTilted, onSpendTokens, practiceCoins, tokens]
  );

  // 3-Coin Power Spread Drop
  const handleSpreadDrop = () => {
    if (isTilted) return;
    if (!freePlay && tokens < 3) {
      handleDropCoin(W / 2);
      return;
    }
    [-110, 0, 110].forEach((offset, idx) => {
      setTimeout(() => {
        handleDropCoin(W / 2 + offset + (Math.random() - 0.5) * 14, false);
      }, idx * 120);
    });
  };

  // Cabinet Nudge (shakes coins forward toward the front lip, with 3-strike TILT alarm)
  const handleNudgeCabinet = () => {
    if (isTilted) return;
    const s = simRef.current;
    s.shakeMag = 11;
    sfx.playVineBoom?.();

    const nextWarnings = tiltWarnings + 1;
    setTiltWarnings(nextWarnings);

    if (nextWarnings >= 3) {
      setIsTilted(true);
      setStatusBanner('🚨 TILT ALARM! CABINET LOCKED FOR 4 SECONDS — EASY ON THE GLASS!');
      sfx.playSadTrombone?.();
      setTimeout(() => {
        setIsTilted(false);
        setTiltWarnings(0);
        setStatusBanner('🪙 TILT RESET! PUSHER BAR ONLINE — DROP COINS TO PUSH THE EDGE!');
      }, 4000);
      return;
    }

    // Nudge all coins on the bed slightly forward toward the front lip!
    s.coins.forEach((c) => {
      if (!c.dropping) {
        c.y += 3.2 + Math.random() * 2.8;
        c.x += (Math.random() - 0.5) * 3.5;
      }
    });
    setStatusBanner(`💥 CABINET NUDGED! COINS SHIFTED TOWARD THE EDGE! (TILT WARNING ${nextWarnings}/3)`);
    setTimeout(() => {
      setTiltWarnings((w) => Math.max(0, w - 1));
    }, 6500);
  };

  // Reset / Re-rack Coin Bed
  const handleResetBed = () => {
    simRef.current.coins = createInitialBed();
    sfx.playCoinDrop?.();
    setStatusBanner('🔄 FRESH COIN & PRIZE BED RACKED! DROP COINS ON THE RETRACTED SHELF!');
  };

  // Keyboard shortcuts (Space = Drop at Aim, Left/Right = Move Aim, N = Nudge)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleDropCoin(simRef.current.aimX);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        simRef.current.aimX = Math.max(150, simRef.current.aimX - 24);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        simRef.current.aimX = Math.min(W - 150, simRef.current.aimX + 24);
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

      // 1. Reciprocating Chrome Pusher Bar motion
      const pusherSpeed = isFever ? 2.55 : 1.85;
      s.pusherPhase += dt * pusherSpeed;
      const maxPush = isFever ? PUSHER_FEVER_MAX_Y : PUSHER_MAX_Y;
      const prevPusherY = s.pusherY;
      const wave = 0.5 - 0.5 * Math.cos(s.pusherPhase); // 0 (retracted) .. 1 (extended)
      s.pusherExtendedRatio = wave;
      s.pusherY = PUSHER_MIN_Y + (maxPush - PUSHER_MIN_Y) * wave;
      const pusherDeltaY = Math.max(0, s.pusherY - prevPusherY);

      // 2. Oscillate top drop aim cursor gently when user isn't hovering
      s.aimX += s.aimDir * 75 * dt;
      if (s.aimX > W - 148) {
        s.aimX = W - 148;
        s.aimDir = -1;
      } else if (s.aimX < 148) {
        s.aimX = 148;
        s.aimDir = 1;
      }

      if (s.shakeMag > 0) {
        s.shakeMag = Math.max(0, s.shakeMag - 32 * dt);
      }

      // 3. Update coins dropping from top chute onto the upper shelf
      for (let i = 0; i < s.coins.length; i++) {
        const c = s.coins[i];
        if (c.dropping) {
          c.y += c.vy;
          c.x += c.vx;
          c.vy += 0.32;
          if (c.y >= c.targetShelfY) {
            c.y = c.targetShelfY;
            c.dropping = false;
            c.vx = 0;
            // Give a forward impulse when landing on the shelf so it nudges adjacent coins
            c.vy = 2.4;
            sfx.playCoinClink?.(0.8);
          }
        } else {
          // Apply velocity & high shelf friction
          c.x += c.vx;
          c.y += c.vy;
          c.vx *= 0.72;
          c.vy *= 0.72;
        }
      }

      // 4. Pusher Bar Mechanical Sweeping Force
      // Any coin on the shelf whose top edge is behind/touching the advancing pusher face gets pushed forward!
      if (pusherDeltaY > 0) {
        for (let i = 0; i < s.coins.length; i++) {
          const c = s.coins[i];
          if (c.dropping) continue;
          const coinTop = c.y - c.radius * 0.85;
          if (coinTop < s.pusherY && c.y < s.pusherY + 38) {
            const targetY = s.pusherY + c.radius * 0.85;
            const pushAmt = Math.max(pusherDeltaY * 1.08, targetY - c.y);
            c.y += pushAmt;
            c.vy = Math.max(c.vy, pusherDeltaY * 0.85);
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
            const minDist = (a.radius + b.radius) * 0.91; // Slight overlap allowed for realistic stacked coins
            const distSq = dx * dx + dy * dy;

            if (distSq > 0.0001 && distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq);
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              // Bias momentum transfer forward (downward toward the front lip) so back-row pushes cascade to the front!
              const aIsHigher = a.y < b.y;
              if (aIsHigher) {
                a.x -= nx * overlap * 0.25;
                a.y -= Math.max(0, ny * overlap * 0.15);
                b.x += nx * overlap * 0.65;
                b.y += Math.abs(ny) * overlap * 0.88;
              } else {
                b.x += nx * overlap * 0.25;
                b.y -= Math.max(0, -ny * overlap * 0.15);
                a.x -= nx * overlap * 0.65;
                a.y += Math.abs(ny) * overlap * 0.88;
              }
            }
          }

          // Keep coins from being pushed above the back wall
          if (a.y < PUSHER_MIN_Y + a.radius * 0.7) {
            a.y = PUSHER_MIN_Y + a.radius * 0.7;
          }

          // Side rail & Side Gutter boundary check
          const bounds = getBedBoundsAtY(a.y);
          const inGutterZone = a.y >= GUTTER_START_Y && a.y <= GUTTER_END_Y;

          if (isFever || !inGutterZone || a.isPrize) {
            // Prizes and Fever-shielded coins bounce safely inside the chrome side rails!
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

        // Check side gutter loss (only non-prize coins when Fever shields are off)
        if (!isFever && inGutterZone && !c.isPrize && (c.x < bounds.left + 4 || c.x > bounds.right - 4)) {
          s.fallingTrayCoins.push({
            ...c,
            vy: 4.5,
            vx: c.x < W / 2 ? -2.2 : 2.2,
            isLostGutter: true,
            alpha: 1
          });
          spawnFloatingText(
            c.x < W / 2 ? bounds.left + 16 : bounds.right - 16,
            c.y,
            'SIDE GUTTER',
            '#94a3b8',
            0.78
          );
          continue;
        }

        // Check FRONT COLLECTION TRAY WIN!
        if (c.y >= FRONT_LIP_Y) {
          trayWinsThisFrame += 1;
          s.fallingTrayCoins.push({
            ...c,
            vy: 5.5 + Math.random() * 2.5,
            vx: (Math.random() - 0.5) * 2.5,
            isLostGutter: false,
            alpha: 1
          });

          const cb = callbacksRef.current;
          const timeSinceLast = now - s.lastTrayWinAt;
          s.comboCount = timeSinceLast < 2200 ? Math.min(8, s.comboCount + 1) : 1;
          s.lastTrayWinAt = now;

          const mult = isFever ? 2 : 1;
          const ptsEarned = c.points * mult + (s.comboCount > 1 ? s.comboCount * 50 : 0);
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
          }

          if (cb.freePlay) {
            // In Free Play, winning coins refills practice bucket + awards arcade XP!
            setPracticeCoins((prev) => Math.min(60, prev + tokenAward));
            cb.onEarnXp?.(c.isPrize ? 35 : 8);
          } else {
            cb.onEarnTokens?.(
              tokenAward,
              null,
              c.isPrize ? `${c.emoji} ${c.label} Dozer Prize!` : '🪙 Coin Dozer Tray Drop',
              'subgame'
            );
            cb.onEarnXp?.(c.isPrize ? 45 : 10);
          }

          spawnSparks(c.x, FRONT_LIP_Y + 12, c.color, c.isPrize ? 28 : 12);
          spawnFloatingText(
            c.x,
            FRONT_LIP_Y - 8,
            c.isPrize
              ? `${c.emoji} ${c.label.toUpperCase()} +${tokenAward} 🪙 (+${ptsEarned} PTS)!`
              : `+${tokenAward} 🪙 ${s.comboCount > 1 ? `(${s.comboCount}× CASCADE!)` : ''}`,
            c.isPrize ? '#f472b6' : '#4ade80',
            c.isPrize ? 1.18 : 0.95
          );

          // Special Prize Bonus Effects!
          if (c.kind === 'lootbox') {
            setStatusBanner('🎁 MYSTERY BOX COLLECTED! TRIGGERING 5-COIN CEILING SHOWER!');
            for (let k = 0; k < 5; k++) {
              setTimeout(() => {
                const rx = W / 2 + (Math.random() - 0.5) * 220;
                s.coins.push(
                  createCoinEntity(rx, BED_TOP_Y - 16, {
                    dropping: true,
                    targetShelfY: PUSHER_MIN_Y + 28 + Math.random() * 45,
                    vy: 6.8
                  })
                );
                sfx.playCoinDrop?.();
              }, k * 140);
            }
          } else if (c.kind === 'trophy') {
            s.feverUntil = Math.max(s.feverUntil, now + 15000);
            setFeverSecondsLeft(15);
            setStatusBanner('🏆 GOLDEN TROPHY WON! 🛡️ 15s BULLDOZER FEVER & LASER SIDE-WALLS ACTIVATED!');
          }

          // Advance Bulldozer Fever Meter
          setFeverProgress((prev) => {
            const next = prev + (c.isPrize ? 3 : 1);
            if (next >= 12) {
              s.feverUntil = Math.max(s.feverUntil, performance.now() + 14000);
              setFeverSecondsLeft(14);
              setStatusBanner('🌈 BULLDOZER FEVER ACTIVE (14s)! LASER SIDE-WALLS UP + 2× EXTENDED DOZER STROKE!');
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

      // Keep coin bed healthy: if total coins on bed drops below 42, gently feed replacement coins on the back shelf
      if (remaining.length < 42) {
        const bounds = getBedBoundsAtY(PUSHER_MIN_Y + 30);
        const rx = bounds.left + 36 + Math.random() * (bounds.right - bounds.left - 72);
        remaining.push(createCoinEntity(rx, PUSHER_MIN_Y + 24));
      }

      s.coins = remaining;

      // 7. Update falling tray coins, sparks & floating popups
      s.fallingTrayCoins = s.fallingTrayCoins.filter((fc) => {
        fc.x += fc.vx;
        fc.y += fc.vy;
        fc.vy += 0.42;
        if (fc.y > TRAY_BOTTOM_Y - 18) {
          fc.alpha -= 0.08;
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
        ft.alpha -= 0.018;
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

      // 2. Top Illuminated Marquee & Drop Zone Header
      const topBounds = getBedBoundsAtY(BED_TOP_Y);
      const botBounds = getBedBoundsAtY(FRONT_LIP_Y);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(16, 12, W - 32, 96);
      ctx.strokeStyle = isFever ? '#f472b6' : '#00f3ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 12, W - 32, 96);

      ctx.fillStyle = '#facc15';
      ctx.font = '900 17px Orbitron, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isFever
          ? '🌈 BULLDOZER FEVER — LASER SIDE SHIELDS + 2× PUSH!'
          : '🪙 TAP ANYWHERE ON THIS DROP ZONE TO INSERT COIN',
        W / 2,
        36
      );

      // Skill Timing Indicator Bar inside Header
      const isSweetSpot = s.pusherExtendedRatio <= 0.42;
      ctx.fillStyle = isSweetSpot ? 'rgba(74, 222, 128, 0.22)' : 'rgba(148, 163, 184, 0.14)';
      ctx.fillRect(70, 48, W - 140, 22);
      ctx.strokeStyle = isSweetSpot ? '#4ade80' : 'rgba(148, 163, 184, 0.4)';
      ctx.strokeRect(70, 48, W - 140, 22);
      ctx.fillStyle = isSweetSpot ? '#4ade80' : '#cbd5e1';
      ctx.font = '800 12px monospace';
      ctx.fillText(
        isSweetSpot
          ? '🎯 PUSHER RETRACTED — PERFECT DROP WINDOW (LANDS FLAT ON SHELF!)'
          : '⏳ PUSHER EXTENDING — WAIT OR DROP TO STACK',
        W / 2,
        63
      );

      // Moving Aiming Coin Cursor on Top Rail
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.aimX, 92, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 11px sans-serif';
      ctx.fillText('DROP', s.aimX, 96);
      ctx.restore();

      // Aiming Laser Guide Line
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = isSweetSpot ? 'rgba(74, 222, 128, 0.55)' : 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.aimX, 108);
      ctx.lineTo(s.aimX, s.pusherY + 18);
      ctx.stroke();
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

      // Perspective Grid Lines on Playfield
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let frac = 0.15; frac < 0.9; frac += 0.15) {
        const tx = topBounds.left + (topBounds.right - topBounds.left) * frac;
        const bx = botBounds.left + (botBounds.right - botBounds.left) * frac;
        ctx.beginPath();
        ctx.moveTo(tx, BED_TOP_Y);
        ctx.lineTo(bx, FRONT_LIP_Y);
        ctx.stroke();
      }
      for (let gy = 200; gy < FRONT_LIP_Y; gy += 60) {
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
        // Glowing Laser Side-Wall Shields!
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
        // Danger Side Loss Gutters
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
      pusherGrad.addColorStop(1, isFever ? '#ec4899' : '#00f3ff');

      ctx.beginPath();
      ctx.moveTo(topBounds.left + 4, BED_TOP_Y);
      ctx.lineTo(topBounds.right - 4, BED_TOP_Y);
      ctx.lineTo(pusherBounds.right - 6, s.pusherY);
      ctx.lineTo(pusherBounds.left + 6, s.pusherY);
      ctx.closePath();
      ctx.fillStyle = pusherGrad;
      ctx.fill();

      // Heavy 3D Chrome Front Bumper Lip of the Pusher Bar
      ctx.fillStyle = isFever ? '#f472b6' : '#00f3ff';
      ctx.shadowColor = isFever ? '#f472b6' : '#00f3ff';
      ctx.shadowBlur = 14;
      ctx.fillRect(
        pusherBounds.left + 6,
        s.pusherY - 12,
        pusherBounds.right - pusherBounds.left - 12,
        12
      );

      // Diagonal hazard stripes on pusher bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.font = '900 13px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        isFever ? '⚡ HYPER DOZER OVERDRIVE ⚡' : '◄◄ NEON DOZER BAR 1986 ►►',
        W / 2,
        s.pusherY - 22
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

      // Payoff Tray Chute below Front Lip
      const trayGrad = ctx.createLinearGradient(0, FRONT_LIP_Y + 12, 0, TRAY_BOTTOM_Y);
      trayGrad.addColorStop(0, '#090d1a');
      trayGrad.addColorStop(1, '#111c38');
      ctx.fillStyle = trayGrad;
      ctx.fillRect(botBounds.left - 8, FRONT_LIP_Y + 12, botBounds.right - botBounds.left + 16, TRAY_BOTTOM_Y - FRONT_LIP_Y - 12);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(botBounds.left - 8, FRONT_LIP_Y + 12, botBounds.right - botBounds.left + 16, TRAY_BOTTOM_Y - FRONT_LIP_Y - 12);

      ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
      ctx.font = '900 20px Orbitron, Impact, sans-serif';
      ctx.fillText('🪙 PRIZE & TOKEN COLLECTION TRAY 🎁', W / 2, FRONT_LIP_Y + 76);
      ctx.restore();

      // 7. Draw Coins & Prizes sorted by Y (back-to-front painter's algorithm for authentic 3D stacking!)
      const renderList = [...s.coins].sort((a, b) => {
        if (a.isPrize !== b.isPrize) return a.isPrize ? 1 : -1; // Prizes sit proudly on top of coins
        if (a.dropping !== b.dropping) return a.dropping ? 1 : -1;
        return a.y - b.y;
      });

      const drawSingleCoin = (c, alpha = 1) => {
        ctx.save();
        ctx.globalAlpha = alpha;

        // Perspective scale: coins slightly larger near front lip
        const persp = 0.9 + Math.max(0, Math.min(0.22, ((c.y - BED_TOP_Y) / (FRONT_LIP_Y - BED_TOP_Y)) * 0.2));
        const rx = c.radius * persp;
        const ry = c.radius * persp * 0.86; // Foreshortened 3D oval coin

        // 3D Coin Rim / Thickness Cylinder
        const rimDepth = c.isPrize ? 7 : 5;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + rimDepth, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = c.isPrize ? '#701a75' : c.kind === 'silver' ? '#0369a1' : '#a16207';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.stroke();

        // Top Face of Coin / Prize Disc
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
        const faceGrad = ctx.createRadialGradient(
          c.x - rx * 0.3,
          c.y - ry * 0.3,
          2,
          c.x,
          c.y,
          rx
        );
        if (c.isPrize) {
          faceGrad.addColorStop(0, '#ffffff');
          faceGrad.addColorStop(0.45, c.color);
          faceGrad.addColorStop(1, '#1e1b4b');
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
        if (c.isPrize || c.y > FRONT_LIP_Y - 26) {
          ctx.shadowColor = c.y > FRONT_LIP_Y - 26 ? '#4ade80' : c.color;
          ctx.shadowBlur = c.isPrize ? 14 : 9;
        }
        ctx.fill();

        // Inner stamped arcade ring
        ctx.lineWidth = c.isPrize ? 2.2 : 1.4;
        ctx.strokeStyle = c.isPrize ? '#ffffff' : 'rgba(255, 255, 255, 0.65)';
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx * 0.74, ry * 0.74, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Emoji / Stamp Icon
        ctx.fillStyle = '#0f172a';
        ctx.font = `${Math.round(rx * (c.isPrize ? 0.95 : 0.78))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.emoji, c.x, c.y + 1);

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
  }, []);

  // Pointer interaction on the canvas: move aim X & drop coin where clicked/tapped
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
            <div className="tm-pusher-eyebrow">🪙 VEGAS PENNY-FALLS ARCADE • 1986 EDITION</div>
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

            {/* Live Score & Tray Telemetry */}
            <div className="tm-pusher-stats-grid">
              <div className="tm-pusher-stat">
                <span>SCORE</span>
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
                <span>PRIZES</span>
                <strong style={{ color: '#f472b6' }}>🎁 {prizesWonSession}</strong>
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
                💥 NUDGE TABLE ({tiltWarnings}/3)
              </button>
              <button
                type="button"
                className="tm-pusher-action-btn reset"
                onClick={handleResetBed}
              >
                🔄 RE-RACK BED
              </button>
            </div>

            {/* Prize Legend */}
            <div className="tm-pusher-prize-legend">
              <span>💎 Diamond: <strong>+8 🪙</strong></span>
              <span>🎁 Loot Box: <strong>+12 🪙 + Shower</strong></span>
              <span>🏆 Trophy: <strong>+20 🪙 + Shields</strong></span>
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
