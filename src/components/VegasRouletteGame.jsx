import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { checkDailyPerk, consumeDailyPerk } from '../utils/memeFeedBridge';
import { triggerWinCelebration } from '../utils/winCelebration';
import GameShell from './GameShell';
import './VegasRouletteGame.css';

// ==========================================
// 80s NEON LIGHTNING ROULETTE '86 — 60FPS CANVAS PHYSICS WHEEL,
// LIGHTNING MULTIPLIERS (50x / 100x / 150x) & FULL INTERACTIVE BETTING BOARD
// ==========================================

const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20,
  14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

function getNumberColor(num) {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
}

const DOZEN_BETS = [
  { id: 'doz1', label: '1st 12 (1–12)', short: '1st 12', mult: 3, match: (n) => n >= 1 && n <= 12 },
  { id: 'doz2', label: '2nd 12 (13–24)', short: '2nd 12', mult: 3, match: (n) => n >= 13 && n <= 24 },
  { id: 'doz3', label: '3rd 12 (25–36)', short: '3rd 12', mult: 3, match: (n) => n >= 25 && n <= 36 },
];

const EVEN_MONEY_BETS = [
  { id: 'red', label: '🔴 NEON RED', short: '🔴 RED', mult: 2, match: (n) => RED_NUMBERS.has(n), isRed: true },
  { id: 'black', label: '⚫ CYBER BLACK', short: '⚫ BLACK', mult: 2, match: (n) => n > 0 && !RED_NUMBERS.has(n), isBlack: true },
  { id: 'even', label: 'EVEN', short: 'EVEN', mult: 2, match: (n) => n > 0 && n % 2 === 0 },
  { id: 'odd', label: 'ODD', short: 'ODD', mult: 2, match: (n) => n > 0 && n % 2 === 1 },
  { id: 'low', label: '1–18 LOW', short: '1–18', mult: 2, match: (n) => n >= 1 && n <= 18 },
  { id: 'high', label: '19–36 HIGH', short: '19–36', mult: 2, match: (n) => n >= 19 && n <= 36 }
];

const OUTSIDE_BETS = [...DOZEN_BETS, ...EVEN_MONEY_BETS];

export default function VegasRouletteGame({
  tokens = 0,
  onSpendTokens,
  onPayoutTokens,
  onRecordHighScore,
  onOpenUpload,
  onBackToFeed
}) {
  const chipSizes = ARCADE_ECONOMY_RULES.ARCADE_STAKES.ROULETTE_CHIPS || [1, 5, 10, 25];

  const smallestChip = chipSizes[0] || 1;
  const [selectedChip, setSelectedChip] = useState(() =>
    tokens >= 5 ? 5 : smallestChip
  );
  const [practiceMode, setPracticeMode] = useState(() => tokens < smallestChip);

  // Bets map: { 'n_17': 10, 'red': 5, 'doz2': 5, ... }
  const [bets, setBets] = useState({});
  const [lastBets, setLastBets] = useState(null);

  const [spinning, setSpinning] = useState(false);
  const [spinPhase, setSpinPhase] = useState('idle'); // 'idle' | 'lightning' | 'spinning' | 'dropping' | 'landed'
  const [landingFlash, setLandingFlash] = useState(false);
  const [winningNum, setWinningNum] = useState(null);
  const [lightningMap, setLightningMap] = useState({}); // { 17: 100, 0: 150, 23: 50 }
  const [history, setHistory] = useState([17, 0, 32, 7, 24, 19, 8, 36]);
  const [statusBanner, setStatusBanner] = useState(() =>
    tokens < smallestChip
      ? 'Free Practice on — tap Red, Black, or numbers to spin.'
      : 'Tap Red/Black or a number to bet (30× straight, 150× lightning).'
  );
  const [lastWinInfo, setLastWinInfo] = useState(null); // { payout, num, lightningMult }
  const [bestWin, setBestWin] = useState(() =>
    Number(localStorage.getItem('tm_roulette_highscore') || 0)
  );

  const canvasRef = useRef(null);
  const wheelColRef = useRef(null);
  const animStateRef = useRef({
    wheelAngle: 0,
    wheelSpeed: 0.008,
    ballActive: false,
    ballAngle: 0,
    ballSpeed: 0,
    ballRadius: 118,
    ballTrail: [],
    targetPocketIdx: 0,
    lockedInPocket: false,
    spinStartMs: 0,
    spinDurationMs: 3250,
    lightningFlashUntil: 0,
    sparks: [],
    shockwaves: [],
    lastPocketTick: -1,
    lightningNums: {},
    ledTick: 0
  });

  const totalBetAmount = Object.values(bets).reduce((sum, v) => sum + v, 0);

  const handlePlaceBet = (betKey, labelText = '') => {
    if (spinning) return;
    const addAmt = selectedChip;
    const nextTotal = totalBetAmount + addAmt;
    if (!practiceMode && nextTotal > tokens) {
      sfx.playClownHonk();
      setStatusBanner(
        `Need ${nextTotal} 🪙 to bet. Try Free Practice mode.`
      );
      return;
    }
    sfx.playChipStack();
    setBets((prev) => ({
      ...prev,
      [betKey]: Math.min(200, (prev[betKey] || 0) + addAmt)
    }));
    if (labelText) {
      setStatusBanner(`+${addAmt} chip on ${labelText} (${nextTotal} on table)`);
    }
  };

  const handlePresetBet = (presetType) => {
    if (spinning) return;
    const unit = selectedChip;
    let nextBets = {};

    if (presetType === 'lucky7s') {
      [0, 7, 17, 27].forEach((n) => {
        nextBets[`n_${n}`] = unit;
      });
    } else if (presetType === 'redBlitz') {
      nextBets = { red: unit * 2, odd: unit, doz2: unit };
    } else if (presetType === 'random5') {
      const picks = new Set();
      while (picks.size < 5) {
        picks.add(Math.floor(Math.random() * 37));
      }
      picks.forEach((n) => {
        nextBets[`n_${n}`] = unit;
      });
    } else if (presetType === 'rebet' && lastBets) {
      nextBets = { ...lastBets };
    }

    const cost = Object.values(nextBets).reduce((s, v) => s + v, 0);
    if (cost <= 0) return;
    if (!practiceMode && cost > tokens) {
      sfx.playClownHonk();
      setStatusBanner(`Need ${cost} 🪙 for preset. Try 1 🪙 or Practice.`);
      return;
    }

    sfx.playChipStack();
    setBets(nextBets);
    setStatusBanner(`Preset loaded (${cost} ${practiceMode ? 'free' : '🪙'}). Tap Spin.`);
  };

  const handleClearBets = () => {
    if (spinning) return;
    sfx.playToggle();
    setBets({});
    setLastWinInfo(null);
    setStatusBanner('Table cleared. Tap a color or number to bet.');
  };

  const resolveSpinOutcome = useCallback(
    (landedNum, activeBets, activeLightning, isFreePractice, stakedTotal) => {
      setSpinning(false);
      setWinningNum(landedNum);
      setHistory((prev) => [landedNum, ...prev.slice(0, 11)]);

      let rawPayout = 0;

      // 1. Check Straight-Up Number Bets (n_0 .. n_36)
      const straightBet = activeBets[`n_${landedNum}`] || 0;
      const struckMult = activeLightning[landedNum] || null;
      if (straightBet > 0) {
        // Real Lightning Roulette math: 30x (29:1 + stake) keeps ~5% house edge with 3x 50-150x strikes
        const mult = struckMult || 30;
        rawPayout += straightBet * mult;
      }

      // 2. Check Outside Bets
      OUTSIDE_BETS.forEach((ob) => {
        const amt = activeBets[ob.id] || 0;
        if (amt > 0 && ob.match(landedNum)) {
          rawPayout += amt * ob.mult;
        }
      });

      // 3. Check 3 Column Bets (col1, col2, col3)
      [1, 2, 3].forEach((colIdx) => {
        const amt = activeBets[`col${colIdx}`] || 0;
        if (amt > 0 && landedNum > 0 && (landedNum - colIdx) % 3 === 0) {
          rawPayout += amt * 3;
        }
      });

      const colName =
        landedNum === 0 ? 'Green' : RED_NUMBERS.has(landedNum) ? 'Red' : 'Black';

      if (rawPayout > 0) {
        const verifiedPayout = isFreePractice
          ? rawPayout
          : validateStakedGamePayout({
              stakedTokens: stakedTotal,
              rawPayout,
              maxMultiplier: 155
            });

        if (!isFreePractice && verifiedPayout > bestWin) {
          setBestWin(verifiedPayout);
          try {
            localStorage.setItem('tm_roulette_highscore', String(verifiedPayout));
          } catch {
            // ignore
          }
          if (onRecordHighScore) onRecordHighScore('roulette', verifiedPayout);
        }

        if (!isFreePractice && verifiedPayout > 0 && onPayoutTokens) {
          onPayoutTokens(verifiedPayout, {
            stakedTokens: stakedTotal,
            xp: struckMult && straightBet > 0 ? 75 : 40,
            maxMultiplier: 155,
            label: `🎡 Roulette #${landedNum}: +${verifiedPayout} 🪙!`,
            emoji: '🎡'
          });
        }

        const hitLightning = Boolean(straightBet > 0 && struckMult);
        const multEst = stakedTotal > 0 ? verifiedPayout / Math.max(1, stakedTotal) : 2;
        triggerWinCelebration({
          amount: verifiedPayout,
          unit: isFreePractice ? 'CHIPS' : '🪙',
          game: "Lightning Roulette '86",
          headline: hitLightning
            ? `⚡ ${struckMult}× LIGHTNING HIT #${landedNum}!`
            : `🎡 #${landedNum} ${colName.toUpperCase()} WINNER!`,
          detail: isFreePractice
            ? `Practice Win! Switch to Token Mode to keep real 🪙!`
            : `Ball dropped into #${landedNum} (${colName})!`,
          multiplier: hitLightning ? struckMult : multEst,
          tier: hitLightning ? 'jackpot' : multEst >= 5 ? 'big' : 'win'
        });

        setLastWinInfo({
          payout: verifiedPayout,
          num: landedNum,
          lightningMult: straightBet > 0 ? struckMult : null
        });
        setStatusBanner(
          `Landed #${landedNum} (${colName}) — won +${verifiedPayout} ${
            isFreePractice ? 'chips' : '🪙'
          }.`
        );
      } else {
        sfx.playSadTrombone();
        setLastWinInfo(null);
        setStatusBanner(
          `Landed #${landedNum} (${colName}). Tap Rebet or spin again.`
        );
      }
      setSpinPhase('landed');
      setLandingFlash(true);
      setTimeout(() => setLandingFlash(false), 900);
      setTimeout(() => setSpinPhase((p) => (p === 'landed' ? 'idle' : p)), 1500);
    },
    [bestWin, onPayoutTokens, onRecordHighScore]
  );

  const handleSpinWheel = () => {
    if (spinning) return;
    if (totalBetAmount <= 0) {
      sfx.playClownHonk();
      setStatusBanner('Place at least 1 chip before spinning.');
      return;
    }

    let stakedTotal = practiceMode ? 0 : totalBetAmount;
    if (!practiceMode) {
      const hasFreePerk = checkDailyPerk('roulette');
      if (hasFreePerk && totalBetAmount <= 10) {
        consumeDailyPerk('roulette');
        stakedTotal = totalBetAmount;
        sfx.playLevelUp();
      } else {
        if (tokens < totalBetAmount) {
          sfx.playClownHonk();
          setStatusBanner(
            `Need ${totalBetAmount} 🪙. Clear table or switch to Practice.`
          );
          return;
        }
        if (onSpendTokens) {
          const ok = onSpendTokens(totalBetAmount, 'Neon Lightning Roulette Spin');
          if (!ok) return;
        }
      }
    }

    setLastBets({ ...bets });
    setLastWinInfo(null);
    setWinningNum(null);
    setLandingFlash(false);
    setSpinning(true);
    setSpinPhase('lightning');

    // Focus the giant spinning wheel smoothly on iPhone / mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 860) {
      try {
        wheelColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // ignore smooth scroll error on older browsers
      }
    }

    // 1. Strike 3 Random Numbers with 80s Neon Lightning (50x, 100x, 150x)!
    const multPool = [50, 75, 100, 150];
    const newLightning = {};
    const chosenSet = new Set();
    while (chosenSet.size < 3) {
      const n = Math.floor(Math.random() * 37);
      if (!chosenSet.has(n)) {
        chosenSet.add(n);
        newLightning[n] = multPool[Math.floor(Math.random() * multPool.length)];
      }
    }
    setLightningMap(newLightning);
    sfx.playLightningStrike();
    setTimeout(() => sfx.playRouletteSpin(), 140);

    // 2. Pick fair random winning pocket index (0..36 in WHEEL_ORDER)
    const winPocketIdx = Math.floor(Math.random() * WHEEL_ORDER.length);
    const landedNum = WHEEL_ORDER[winPocketIdx];

    const lightningSummary = Object.entries(newLightning)
      .map(([n, m]) => `#${n} ${m}×`)
      .join(', ');
    setStatusBanner(`⚡ Lightning struck ${lightningSummary}! Ball flying at 88 MPH!`);

    // 3. Configure 60fps Canvas Ball Physics Trajectory
    const st = animStateRef.current;
    const nowMs = performance.now();
    st.wheelSpeed = 0.052;
    st.ballActive = true;
    st.lockedInPocket = false;
    st.ballRadius = 117;
    st.ballTrail = [];
    st.ballAngle = st.wheelAngle + Math.PI * 0.7;
    st.ballSpeed = -0.22; // Fast dramatic orbit opposite to wheel rotation
    st.targetPocketIdx = winPocketIdx;
    st.lightningNums = newLightning;
    st.lastPocketTick = -1;
    st.spinStartMs = nowMs;
    st.spinDurationMs = 3250;
    st.lightningFlashUntil = nowMs + 750;

    setTimeout(() => setSpinPhase((p) => (p === 'lightning' ? 'spinning' : p)), 550);
    setTimeout(() => setSpinPhase((p) => (p === 'spinning' ? 'dropping' : p)), 2050);

    const activeBetsSnapshot = { ...bets };
    const isFreeSnapshot = practiceMode;

    // Settle cleanly in winning pocket (~3.25 seconds)
    setTimeout(() => {
      const pocketSlice = (Math.PI * 2) / WHEEL_ORDER.length;
      st.lockedInPocket = true;
      st.ballRadius = 77;
      st.wheelSpeed = 0.009;
      st.ballTrail = [];
      // Spawn twin neon celebration shockwaves & sparks at winning pocket
      const winAng = st.wheelAngle + (winPocketIdx + 0.5) * pocketSlice;
      const wx = 140 + Math.cos(winAng) * 77;
      const wy = 140 + Math.sin(winAng) * 77;
      st.shockwaves.push({ x: wx, y: wy, r: 8, maxR: 64, life: 28, maxLife: 28 });
      st.shockwaves.push({ x: 140, y: 140, r: 24, maxR: 132, life: 26, maxLife: 26 });
      for (let i = 0; i < 22; i++) {
        const a = (Math.PI * 2 * i) / 22;
        st.sparks.push({
          x: wx,
          y: wy,
          vx: Math.cos(a) * (2.4 + Math.random() * 3.1),
          vy: Math.sin(a) * (2.4 + Math.random() * 3.1),
          col: i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#00f3ff' : '#ec4899',
          life: 24
        });
      }
      resolveSpinOutcome(landedNum, activeBetsSnapshot, newLightning, isFreeSnapshot, stakedTotal);
    }, 3250);
  };

  // 60fps Canvas Renderer for the 80s Neon Cyber-Roulette Wheel
  useEffect(() => {
    let rafId = null;
    const W = 280;
    const H = 280;
    const CX = 140;
    const CY = 140;
    const slice = (Math.PI * 2) / WHEEL_ORDER.length;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const st = animStateRef.current;
      const now = performance.now();
      st.ledTick = (st.ledTick + (spinning ? 0.35 : 0.08)) % 24;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 1. Advance wheel & smooth ball physics
          st.wheelAngle = (st.wheelAngle + st.wheelSpeed) % (Math.PI * 2);
          if (spinning && st.wheelSpeed > 0.016) {
            st.wheelSpeed *= 0.994;
          }

          let displayBallRadius = st.ballRadius;
          if (st.ballActive) {
            if (!st.lockedInPocket) {
              const elapsed = Math.max(0, now - st.spinStartMs);
              const progress = Math.min(1, elapsed / (st.spinDurationMs || 3250));

              st.ballAngle += st.ballSpeed;
              st.ballSpeed *= 0.986;

              // Track comet trail while moving fast
              st.ballTrail.push({ angle: st.ballAngle, radius: st.ballRadius });
              if (st.ballTrail.length > 9) st.ballTrail.shift();

              if (progress > 0.56) {
                // Smooth spiral drop + magnetic steer toward winning pocket
                const dropT = Math.min(1, (progress - 0.56) / 0.44);
                const easeDrop = 1 - Math.pow(1 - dropT, 2.2);
                const bounce = Math.sin(dropT * Math.PI * 5) * (1 - dropT) * 6;
                st.ballRadius = 117 - easeDrop * 40;
                displayBallRadius = Math.max(74, st.ballRadius + bounce);

                const targetAng = st.wheelAngle + (st.targetPocketIdx + 0.5) * slice;
                let diff = targetAng - st.ballAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                st.ballAngle += diff * (0.04 + dropT * 0.22);
              }

              // Play pocket fret tick when ball crosses pocket dividers in inner zone
              if (st.ballRadius < 106) {
                const relAngle =
                  (((st.ballAngle - st.wheelAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const curPocket = Math.floor(relAngle / slice);
                if (curPocket !== st.lastPocketTick) {
                  st.lastPocketTick = curPocket;
                  sfx.playRouletteBallTick(Math.min(1, Math.abs(st.ballSpeed) * 7));
                }
              }
            } else {
              // Locked inside winning pocket rotating with the wheel!
              st.ballAngle = st.wheelAngle + (st.targetPocketIdx + 0.5) * slice;
              st.ballRadius = 77;
              displayBallRadius = 77;
            }
          }

          // 2. Clear & Scale to High-Res 480x480 Canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.scale(canvas.width / W, canvas.height / H);

          // Outer Ambient Halo (pulses brighter while spinning!)
          ctx.globalAlpha = spinning ? 0.34 : 0.2;
          ctx.fillStyle = spinning ? '#ec4899' : '#00f3ff';
          ctx.beginPath();
          ctx.arc(CX, CY, 136, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Dark Metallic Bowl Track
          ctx.fillStyle = '#070916';
          ctx.strokeStyle = spinning ? '#facc15' : '#00f3ff';
          ctx.lineWidth = spinning ? 4 : 3.5;
          ctx.beginPath();
          ctx.arc(CX, CY, 129, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 24 Chasing Neon Marquee Rim Bulbs
          for (let b = 0; b < 24; b++) {
            const ba = (Math.PI * 2 * b) / 24;
            const bx = CX + Math.cos(ba) * 123.5;
            const by = CY + Math.sin(ba) * 123.5;
            const activeBulb = Math.floor(st.ledTick) % 3 === b % 3;
            ctx.fillStyle = activeBulb
              ? b % 2 === 0
                ? '#facc15'
                : '#00f3ff'
              : 'rgba(148, 163, 184, 0.25)';
            ctx.beginPath();
            ctx.arc(bx, by, activeBulb ? 2.4 : 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Radial Speed Blur Arcs while spinning fast
          if (spinning && !st.lockedInPocket) {
            for (let arc = 0; arc < 4; arc++) {
              const aStart = -st.wheelAngle * 2.2 + (Math.PI * arc) / 2;
              ctx.strokeStyle = arc % 2 === 0 ? 'rgba(0, 243, 255, 0.36)' : 'rgba(236, 72, 153, 0.32)';
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.arc(CX, CY, 110 + (arc % 2) * 5, aStart, aStart + 0.55);
              ctx.stroke();
            }
          }

          // 8 Diamond Ball Deflectors on Outer Bowl Track
          for (let d = 0; d < 8; d++) {
            const da = (Math.PI * 2 * d) / 8;
            const dx = CX + Math.cos(da) * 114;
            const dy = CY + Math.sin(da) * 114;
            ctx.fillStyle = d % 2 === 0 ? '#facc15' : '#ec4899';
            ctx.beginPath();
            ctx.arc(dx, dy, 3.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Draw 37 Rotating Neon Pockets
          WHEEL_ORDER.forEach((num, idx) => {
            const a0 = st.wheelAngle + idx * slice;
            const a1 = a0 + slice;
            const isLightning = Boolean(st.lightningNums[num]);
            const isWinPocket = st.lockedInPocket && st.targetPocketIdx === idx;

            let pocketCol = '#111827';
            if (num === 0) pocketCol = '#16a34a';
            else if (RED_NUMBERS.has(num)) pocketCol = '#e11d48';

            if (isWinPocket) {
              pocketCol = '#facc15';
            } else if (isLightning) {
              pocketCol = '#a855f7';
            }

            ctx.fillStyle = pocketCol;
            ctx.beginPath();
            ctx.moveTo(CX, CY);
            ctx.arc(CX, CY, 102, a0, a1);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = isWinPocket
              ? '#ffffff'
              : isLightning
              ? '#facc15'
              : 'rgba(0, 243, 255, 0.42)';
            ctx.lineWidth = isWinPocket ? 2.5 : 1;
            ctx.stroke();

            // Electric Lightning Arc from center to struck pockets!
            if (isLightning && now < st.lightningFlashUntil) {
              const midA = a0 + slice * 0.5;
              const j1 = (Math.random() - 0.5) * 12;
              const j2 = (Math.random() - 0.5) * 12;
              ctx.strokeStyle = '#fde047';
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.moveTo(CX, CY);
              ctx.lineTo(CX + Math.cos(midA) * 52 + j1, CY + Math.sin(midA) * 52 + j2);
              ctx.lineTo(CX + Math.cos(midA) * 96, CY + Math.sin(midA) * 96);
              ctx.stroke();
            }

            // Draw Pocket Number along outer ring
            const midA = a0 + slice * 0.5;
            const tx = CX + Math.cos(midA) * 90;
            const ty = CY + Math.sin(midA) * 90;
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(midA + Math.PI / 2);
            ctx.fillStyle = isWinPocket ? '#050814' : '#ffffff';
            ctx.font = '900 8.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(num), 0, 3);
            ctx.restore();
          });

          // 4. Inner Pocket Ring & Synthwave Turret Center Hub
          ctx.fillStyle = '#090d1e';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(CX, CY, 58, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Rotating Gold Turret Spokes
          for (let s = 0; s < 4; s++) {
            const sa = st.wheelAngle * 1.5 + (Math.PI * s) / 2;
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(CX + Math.cos(sa) * 24, CY + Math.sin(sa) * 24);
            ctx.lineTo(CX + Math.cos(sa) * 56, CY + Math.sin(sa) * 56);
            ctx.stroke();
          }

          // Center Digital VFD Hub Readout
          ctx.fillStyle = '#040711';
          ctx.strokeStyle = spinning ? '#ec4899' : '#00f3ff';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(CX, CY, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'center';
          if (winningNum !== null) {
            ctx.fillStyle =
              winningNum === 0
                ? '#4ade80'
                : RED_NUMBERS.has(winningNum)
                ? '#fb7185'
                : '#38bdf8';
            ctx.font = '900 19px Impact, Arial Black, sans-serif';
            ctx.fillText(String(winningNum), CX, CY + 6);
          } else {
            ctx.fillStyle = spinning ? '#00f3ff' : '#facc15';
            ctx.font = '900 11px sans-serif';
            ctx.fillText(spinning ? 'SPIN!' : "80s '86", CX, CY + 4);
          }

          // 5. Draw Glowing Chrome Roulette Ball + Motion Comet Trail
          if (st.ballActive) {
            if (!st.lockedInPocket && st.ballTrail.length > 1) {
              st.ballTrail.forEach((pt, tIdx) => {
                const alpha = ((tIdx + 1) / st.ballTrail.length) * 0.35;
                const tx = CX + Math.cos(pt.angle) * pt.radius;
                const ty = CY + Math.sin(pt.angle) * pt.radius;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#00f3ff';
                ctx.beginPath();
                ctx.arc(tx, ty, 2.5 + (tIdx / st.ballTrail.length) * 3, 0, Math.PI * 2);
                ctx.fill();
              });
              ctx.globalAlpha = 1;
            }

            const bx = CX + Math.cos(st.ballAngle) * displayBallRadius;
            const by = CY + Math.sin(st.ballAngle) * displayBallRadius;

            ctx.globalAlpha = 0.48;
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.arc(bx, by, 10.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bx, by, 5.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // 6. Shockwaves & Sparks
          st.shockwaves = st.shockwaves
            .map((sw) => ({
              ...sw,
              r: sw.r + (sw.maxR - sw.r) * 0.22,
              life: sw.life - 1
            }))
            .filter((sw) => sw.life > 0);

          st.shockwaves.forEach((sw) => {
            ctx.globalAlpha = sw.life / sw.maxLife;
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
            ctx.stroke();
          });

          st.sparks = st.sparks
            .map((sp) => ({
              ...sp,
              x: sp.x + sp.vx,
              y: sp.y + sp.vy,
              life: sp.life - 1
            }))
            .filter((sp) => sp.life > 0);

          st.sparks.forEach((sp) => {
            ctx.globalAlpha = sp.life / 24;
            ctx.fillStyle = sp.col;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 2.4, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [spinning, winningNum]);

  return (
    <GameShell
      title="NEON LIGHTNING ROULETTE '86"
      eyebrow="European single-zero wheel • Lightning up to 150×"
      ariaLabel="80s Neon Lightning Roulette Wheel and Table"
      onBack={onBackToFeed}
      tokens={tokens}
      hasPractice
      practiceMode={practiceMode}
      practiceDisabled={spinning}
      onTogglePractice={() => {
        if (spinning) return;
        setPracticeMode((p) => !p);
        setBets({});
      }}
      extraBadges={
        <span className="tm-roul-streak-pill">
          🏆 Best: <strong>{bestWin} 🪙</strong>
        </span>
      }
      howToPlay={[
        'Tap Red, Black, Outside bets, or individual numbers to stack chips.',
        'Straight numbers pay 30×; random Lightning strikes pay 50× to 150×.',
        'Toggle Free Practice anytime to play with zero token risk.'
      ]}
    >
      <div className="tm-roul-cabinet">

        {/* 2. RECENT WINNING NUMBERS HISTORY & LIGHTNING CALLOUT STRIP */}
        <div className="tm-roul-history-bar">
          <div className="tm-roul-history-pills">
            <span className="tm-roul-hist-label">RECENT:</span>
            {history.map((num, idx) => {
              const col = getNumberColor(num);
              const sym = col === 'red' ? '◆' : col === 'black' ? '●' : '★';
              return (
                <span
                  key={`${num}-${idx}`}
                  className={`tm-roul-hist-ball ${col} ${idx === 0 ? 'latest' : ''}`}
                  title={`${num} (${col})`}
                  aria-label={`${num} ${col}`}
                >
                  <span className="tm-roul-hist-sym" aria-hidden="true">
                    {sym}
                  </span>
                  {num}
                </span>
              );
            })}
          </div>

          {Object.keys(lightningMap).length > 0 && (
            <div className="tm-roul-lightning-strip">
              <span>⚡ LIGHTNING NUMBERS:</span>
              {Object.entries(lightningMap).map(([n, m]) => (
                <span key={n} className="tm-roul-lightning-badge">
                  #{n} <strong>{m}×</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. MAIN SPLIT STAGE: 60FPS NEON WHEEL (LEFT) + INTERACTIVE BETTING FELT (RIGHT) */}
        <div className="tm-roul-main-grid">
          {/* LEFT: 60FPS ROTATING NEON WHEEL & SPIN BUTTON */}
          <div
            ref={wheelColRef}
            className={`tm-roul-wheel-column ${spinning ? 'is-spinning' : ''} ${
              landingFlash ? 'is-landing' : ''
            }`}
          >
            {(spinning || spinPhase === 'landed') && (
              <div className="tm-roul-telemetry-pill" aria-live="polite">
                {spinPhase === 'lightning' && '⚡ LIGHTNING STRIKING 150×!'}
                {spinPhase === 'spinning' && '🔥 88 MPH WHEEL SPIN!'}
                {spinPhase === 'dropping' && '🎱 BALL DROPPING INTO POCKET...'}
                {spinPhase === 'landed' &&
                  winningNum !== null &&
                  `🎯 LANDED #${winningNum} (${getNumberColor(winningNum).toUpperCase()})`}
              </div>
            )}
            <div className="tm-roul-canvas-box">
              <canvas
                ref={canvasRef}
                width={520}
                height={520}
                className="tm-roul-canvas"
                onClick={() => {
                  if (!spinning && totalBetAmount > 0) {
                    handleSpinWheel();
                  }
                }}
                title="Tap the Wheel or click SPIN WHEEL to launch the chrome ball!"
              />
              {lastWinInfo && (
                <div className="tm-roul-win-overlay-pill">
                  🏆 #{lastWinInfo.num} WON +{lastWinInfo.payout}{' '}
                  {practiceMode ? 'CHIPS' : '🪙'}!
                </div>
              )}
            </div>

            <button
              type="button"
              className="tm-roul-spin-btn"
              disabled={spinning || totalBetAmount <= 0}
              onClick={handleSpinWheel}
            >
              {spinning
                ? '🎡 WHEEL SPINNING...'
                : `⚡ SPIN WHEEL (${totalBetAmount} ${practiceMode ? 'FREE' : '🪙'})`}
            </button>
          </div>

          {/* RIGHT: INTERACTIVE 80s NEON BETTING BOARD */}
          <div className="tm-roul-board-column">
            {/* Chip Size Selector + Quick Presets */}
            <div className="tm-roul-chip-toolbar">
              <div className="tm-roul-chip-selector">
                <span className="tm-roul-hist-label">CHIP:</span>
                {chipSizes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tm-roul-chip-pill ${selectedChip === c ? 'active' : ''}`}
                    onClick={() => {
                      sfx.playChipStack();
                      setSelectedChip(c);
                    }}
                  >
                    🪙 {c}
                  </button>
                ))}
              </div>

              <div className="tm-roul-preset-btns">
                <button
                  type="button"
                  className="tm-roul-preset-btn"
                  disabled={spinning}
                  onClick={() => handlePresetBet('lucky7s')}
                >
                  🎰 Lucky 7s
                </button>
                <button
                  type="button"
                  className="tm-roul-preset-btn"
                  disabled={spinning}
                  onClick={() => handlePresetBet('redBlitz')}
                >
                  🔥 Red Blitz
                </button>
                <button
                  type="button"
                  className="tm-roul-preset-btn"
                  disabled={spinning}
                  onClick={() => handlePresetBet('random5')}
                >
                  ⚡ 5 Lightning Picks
                </button>
                {lastBets && (
                  <button
                    type="button"
                    data-rebet="true"
                    className="tm-roul-preset-btn"
                    disabled={spinning}
                    onClick={() => handlePresetBet('rebet')}
                  >
                    ↺ Rebet
                  </button>
                )}
                <button
                  type="button"
                  className="tm-roul-preset-btn clear"
                  disabled={spinning || totalBetAmount === 0}
                  onClick={handleClearBets}
                >
                  🧹 Clear
                </button>
              </div>
            </div>

            {/* 0 + 1..36 Number Grid */}
            <div className="tm-roul-numbers-felt">
              {/* Green Zero Button */}
              <button
                type="button"
                className={`tm-roul-num-cell zero ${winningNum === 0 ? 'winner' : ''} ${
                  lightningMap[0] ? 'lightning' : ''
                }`}
                aria-label="0 green"
                onClick={() => handlePlaceBet('n_0', 'Green 0 (29:1)')}
              >
                <span className="tm-roul-num-txt">0</span>
                <span className="tm-roul-cb-dot" aria-hidden="true">★</span>
                {lightningMap[0] && (
                  <span className="tm-roul-cell-bolt">⚡{lightningMap[0]}×</span>
                )}
                {bets.n_0 > 0 && <span className="tm-roul-chip-stack">{bets.n_0}</span>}
              </button>

              {/* 12x3 Numbers Matrix + 3 Column 2:1 Cells */}
              <div className="tm-roul-matrix-grid">
                {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                  const col = getNumberColor(num);
                  const betVal = bets[`n_${num}`] || 0;
                  const lMult = lightningMap[num];
                  const isWin = winningNum === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      className={`tm-roul-num-cell ${col} ${isWin ? 'winner' : ''} ${
                        lMult ? 'lightning' : ''
                      }`}
                      aria-label={`${num} ${col}`}
                      onClick={() => handlePlaceBet(`n_${num}`, `#${num} (29:1)`)}
                    >
                      <span className="tm-roul-cb-dot" aria-hidden="true">
                        {col === 'red' ? '◆' : '●'}
                      </span>
                      <span className="tm-roul-num-txt">{num}</span>
                      {lMult && <span className="tm-roul-cell-bolt">⚡{lMult}×</span>}
                      {betVal > 0 && <span className="tm-roul-chip-stack">{betVal}</span>}
                    </button>
                  );
                })}
              </div>

              {/* 3 Column 2:1 Bets */}
              <div className="tm-roul-cols-strip">
                {[1, 2, 3].map((colIdx) => (
                  <button
                    key={colIdx}
                    type="button"
                    className="tm-roul-col-cell"
                    onClick={() => handlePlaceBet(`col${colIdx}`, `Column #${colIdx} (2:1)`)}
                  >
                    <span>2:1</span>
                    {bets[`col${colIdx}`] > 0 && (
                      <span className="tm-roul-chip-stack">{bets[`col${colIdx}`]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Dozens Bets (1st 12 / 2nd 12 / 3rd 12) */}
            <div className="tm-roul-dozens-grid">
              {DOZEN_BETS.map((ob) => {
                const betVal = bets[ob.id] || 0;
                return (
                  <button
                    key={ob.id}
                    type="button"
                    className={`tm-roul-outside-cell ${betVal > 0 ? 'has-bet' : ''}`}
                    onClick={() => handlePlaceBet(ob.id, ob.label)}
                  >
                    <span>{ob.short}</span>
                    {betVal > 0 && <span className="tm-roul-chip-stack">{betVal}</span>}
                  </button>
                );
              })}
            </div>

            {/* Even-Money Bets (RED / BLACK / EVEN / ODD / 1-18 / 19-36) — hoisted above numbers on mobile */}
            <div className="tm-roul-even-grid">
              {EVEN_MONEY_BETS.map((ob) => {
                const betVal = bets[ob.id] || 0;
                return (
                  <button
                    key={ob.id}
                    type="button"
                    className={`tm-roul-outside-cell ${ob.isRed ? 'red-zone' : ''} ${
                      ob.isBlack ? 'black-zone' : ''
                    } ${betVal > 0 ? 'has-bet' : ''}`}
                    aria-label={ob.label}
                    onClick={() => handlePlaceBet(ob.id, ob.label)}
                  >
                    <span>
                      {ob.isRed && <span className="tm-roul-cb-shape" aria-hidden="true">◆ </span>}
                      {ob.isBlack && <span className="tm-roul-cb-shape" aria-hidden="true">● </span>}
                      {ob.short}
                    </span>
                    {betVal > 0 && <span className="tm-roul-chip-stack">{betVal}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. BOTTOM STATUS BAR */}
        <div className="tm-roul-footer">
          <div className="tm-roul-banner" role="status" aria-live="polite">
            {statusBanner}
          </div>
          {!practiceMode && tokens < selectedChip && onOpenUpload && (
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={onOpenUpload}
            >
              📸 Upload Meme (+45 🪙)
            </button>
          )}
        </div>

        {/* 5. STICKY MOBILE BOTTOM ACTION BAR (<= 860px) */}
        <div className="tm-roul-mobile-actionbar" aria-label="Roulette mobile action bar">
          <div className="tm-roul-mobile-chips-row">
            <div className="tm-roul-chip-selector">
              {chipSizes.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`tm-roul-chip-pill ${selectedChip === c ? 'active' : ''}`}
                  onClick={() => {
                    sfx.playChipStack();
                    setSelectedChip(c);
                  }}
                >
                  🪙 {c}
                </button>
              ))}
            </div>
            <div className="tm-roul-mobile-quick">
              <button
                type="button"
                className="tm-roul-preset-btn clear"
                disabled={spinning || totalBetAmount === 0}
                onClick={handleClearBets}
              >
                🧹 Clear
              </button>
              <button
                type="button"
                className="tm-roul-preset-btn"
                disabled={spinning || !lastBets}
                onClick={() => handlePresetBet('rebet')}
              >
                ↺ Rebet
              </button>
            </div>
          </div>
          <button
            type="button"
            className="tm-roul-spin-btn"
            disabled={spinning || totalBetAmount <= 0}
            onClick={handleSpinWheel}
          >
            {spinning
              ? '🎡 SPINNING...'
              : `⚡ SPIN (${totalBetAmount} ${practiceMode ? 'FREE' : '🪙'})`}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
