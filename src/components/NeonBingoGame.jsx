import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { triggerWinCelebration } from '../utils/winCelebration';
import { speakUtteranceChain } from '../utils/aiSpeech';
import {
  DABBER_COLORS,
  RETRO_CARD_THEMES,
  BINGO_CALLS_86,
  RIVAL_HALL_PLAYERS,
  FALSE_CALL_ROASTS,
  generate90BallCard,
  generate75BallCard,
  evaluateCardStatus
} from '../utils/bingoCalls86';
import GameShell from './GameShell';
import './NeonBingoGame.css';

const SPEED_OPTIONS = [
  { id: 'chill', label: '🐢 Chill 4.5s', ms: 4500 },
  { id: 'club', label: '🕺 Club 2.8s', ms: 2800 },
  { id: 'turbo', label: '⚡ Turbo 1.6s', ms: 1650 },
  { id: 'manual', label: '✋ Manual Only', ms: 0 }
];

const PRIZE_META = {
  fourCorners: { label: '4 Corners', mult: 2.2, emoji: '📐' },
  oneLine: { label: '1 Line', mult: 1.8, emoji: '➖' },
  twoLines: { label: '2 Lines', mult: 3.5, emoji: '➖➖' },
  fullHouse: { label: 'FULL HOUSE', mult: 8.5, emoji: '🏆' }
};

const BALL_STRIPE_COLORS = ['#ff2a85', '#00f3ff', '#facc15', '#4ade80', '#c084fc'];

function getBallColor(n) {
  return BALL_STRIPE_COLORS[(n - 1) % BALL_STRIPE_COLORS.length];
}

function buildShuffledCage(maxBall) {
  const arr = [];
  for (let i = 1; i <= maxBall; i++) arr.push(i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeTickets(mode, count) {
  return Array.from({ length: count }, (_, idx) =>
    mode === '75' ? generate75BallCard(idx) : generate90BallCard(idx)
  );
}

/**
 * Generates deterministic rival target ball counts for dramatic comic tension
 */
function makeRivalProgress() {
  return RIVAL_HALL_PLAYERS.map((r) => ({
    ...r,
    toGo: Math.floor(Math.random() * 4) + 5
  }));
}

export default function NeonBingoGame({
  tokens = 0,
  soundOn = true,
  onToggleSound,
  onSpendTokens,
  onPayoutTokens,
  onEarnMemeCentz,
  onBackToFeed
}) {
  const cardBuyin = ARCADE_ECONOMY_RULES.ARCADE_STAKES?.BINGO_CARD_BUYIN || 10;

  // Game setup & mode state
  const [practiceMode, setPracticeMode] = useState(() => tokens < cardBuyin);
  const [ballMode, setBallMode] = useState('90'); // '90' | '75'
  const [cardCount, setCardCount] = useState(2); // 1 | 2 | 4
  const [cardTheme, setCardTheme] = useState('miami');
  const [dabberId, setDabberId] = useState('pink');
  const [autoDab, setAutoDab] = useState(false);
  const [voiceCaller, setVoiceCaller] = useState(true);
  const [speedId, setSpeedId] = useState('club');
  const [ceefaxMode, setCeefaxMode] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);

  // Active round state
  const [roundActive, setRoundActive] = useState(false);
  const [roundStaked, setRoundStaked] = useState(0);
  const [tickets, setTickets] = useState(() => makeTickets('90', 2));
  const [ballQueue, setBallQueue] = useState(() => buildShuffledCage(90));
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [dabbedNumbers, setDabbedNumbers] = useState([]);
  const [claimedPrizes, setClaimedPrizes] = useState({
    fourCorners: false,
    oneLine: false,
    twoLines: false,
    fullHouse: false
  });
  const [isAutoCalling, setIsAutoCalling] = useState(false);
  const [rivals, setRivals] = useState(() => makeRivalProgress());
  const [falseCallCount, setFalseCallCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);

  // Comedy / feedback state
  const [callerBanner, setCallerBanner] = useState(
    'WELCOME TO NEON BINGO ’86! Pick your UV Dabber Ink, hit EYES DOWN to drop balls!'
  );
  const [crowdBanner, setCrowdBanner] = useState(null); // { type: 'cheer' | 'boo' | 'info', title, body, emojis }
  const [tomatoSplats, setTomatoSplats] = useState([]);
  const [shakeCell, setShakeCell] = useState(null);

  const cageCanvasRef = useRef(null);
  const popImpulseRef = useRef(0);
  const speechRef = useRef(null);

  const maxBalls = ballMode === '75' ? 75 : 90;
  const currentBall = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;
  const activeCall = currentBall ? BINGO_CALLS_86[currentBall] : null;
  const activeDabber = useMemo(
    () => DABBER_COLORS.find((d) => d.id === dabberId) || DABBER_COLORS[0],
    [dabberId]
  );

  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);
  const dabbedSet = useMemo(() => new Set(dabbedNumbers), [dabbedNumbers]);

  const cardEvaluations = useMemo(
    () => tickets.map((card) => evaluateCardStatus(card, calledSet, dabbedSet)),
    [tickets, calledSet, dabbedSet]
  );

  // Stop any playing voice when unmounting
  useEffect(() => {
    return () => {
      try {
        speechRef.current?.stop?.();
      } catch {
        // ignore
      }
    };
  }, []);

  // Auto-dab any newly called numbers when autoDab is toggled ON
  useEffect(() => {
    if (!autoDab || !calledNumbers.length) return;
    const allCardNums = new Set(tickets.flatMap((t) => t.numbers));
    setDabbedNumbers((prev) => {
      const prevSet = new Set(prev);
      let changed = false;
      calledNumbers.forEach((n) => {
        if (allCardNums.has(n) && !prevSet.has(n)) {
          prevSet.add(n);
          changed = true;
        }
      });
      return changed ? [...prevSet] : prev;
    });
  }, [autoDab, calledNumbers, tickets]);

  // Animated HTML5 Canvas 1986 Rotary Air-Blower Bingo Cage
  useEffect(() => {
    const canvas = cageCanvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const W = 210;
    const H = 190;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2;
    const cy = H / 2 - 4;
    const r = 74;

    const cageBalls = Array.from({ length: 16 }, (_, i) => ({
      angle: (i / 16) * Math.PI * 2,
      rad: 18 + (i % 4) * 12,
      vx: (Math.random() - 0.5) * 3.4,
      vy: (Math.random() - 0.5) * 3.4,
      x: cx + Math.cos(i) * 30,
      y: cy + Math.sin(i) * 30,
      color: BALL_STRIPE_COLORS[i % BALL_STRIPE_COLORS.length],
      num: ((i * 7) % 89) + 1
    }));

    let rafId = 0;
    let rot = 0;
    const tick = () => {
      rot += isAutoCalling || popImpulseRef.current > 0.05 ? 0.048 : 0.014;
      popImpulseRef.current = Math.max(0, popImpulseRef.current * 0.93);

      ctx.clearRect(0, 0, W, H);

      // Neon synth radial glow behind cage
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r + 18);
      bgGrad.addColorStop(0, 'rgba(0, 243, 255, 0.22)');
      bgGrad.addColorStop(0.65, 'rgba(255, 42, 133, 0.14)');
      bgGrad.addColorStop(1, 'rgba(7, 8, 16, 0)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 18, 0, Math.PI * 2);
      ctx.fill();

      // Stand base
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect?.(cx - 46, cy + r - 4, 92, 14, 6);
      ctx.fill();
      ctx.stroke();

      // Outer wireframe sphere
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.72)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 42, 133, 0.45)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 4);
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Update & draw swirling neon balls inside the blower
      const airBoost = isAutoCalling ? 0.52 : 0.18 + popImpulseRef.current * 0.9;
      cageBalls.forEach((b) => {
        b.vy += 0.12 - (b.y > cy + r * 0.45 ? airBoost * 2.1 : 0);
        b.vx += (Math.random() - 0.5) * airBoost * 1.4;
        b.vx *= 0.985;
        b.vy *= 0.985;
        b.x += b.vx;
        b.y += b.vy;

        const dx = b.x - cx;
        const dy = b.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const maxDist = r - 11;
        if (dist > maxDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = cx + nx * maxDist;
          b.y = cy + ny * maxDist;
          const dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * 0.86;
          b.vy = (b.vy - 2 * dot * ny) * 0.86;
        }

        // Draw shiny bingo ball
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, 9.5, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#090d16';
        ctx.font = '900 6.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.num), b.x, b.y + 0.5);
        ctx.restore();
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isAutoCalling]);

  const speakCallout = useCallback(
    (num, fromGesture = false) => {
      const info = BINGO_CALLS_86[num];
      if (!info || !soundOn) return;
      if (info.sfxType === 'duck') {
        sfx.playBingoDuckQuack?.();
      } else if (info.sfxType === 'horn') {
        sfx.playAirhorn?.();
      } else if (info.sfxType === 'whistle') {
        sfx.playBoing?.(3);
      } else if (info.sfxType === 'coin') {
        sfx.playCoinDrop?.();
      }

      if (!voiceCaller) return;
      try {
        speechRef.current?.stop?.();
        const phrase =
          num === 22
            ? `Two little ducks! Quack quack! Number 22!`
            : `${info.call}! Number ${num}!`;
        speechRef.current = speakUtteranceChain({
          text: phrase,
          mode: 'kitt',
          fromGesture
        });
      } catch {
        // ignore speech failure
      }
    },
    [soundOn, voiceCaller]
  );

  // Start / Buy new retro bingo cards & begin calling
  const handleStartNewRound = useCallback(
    (customBallMode = ballMode, customCount = cardCount, forcePractice = practiceMode) => {
      const totalCost = forcePractice ? 0 : customCount * cardBuyin;
      if (!forcePractice && totalCost > 0) {
        const spent = onSpendTokens?.(totalCost);
        if (!spent) {
          setCrowdBanner({
            type: 'info',
            title: `Need M$${totalCost} for ${customCount} Card${customCount > 1 ? 's' : ''}!`,
            body: 'Switch to Free Practice mode or play 1 card to jump right in!',
            emojis: '🪙'
          });
          return false;
        }
      }

      const limit = customBallMode === '75' ? 75 : 90;
      const newTickets = makeTickets(customBallMode, customCount);
      const shuffled = buildShuffledCage(limit);
      const firstBall = shuffled[0];

      sfx.playBingoBallPop?.();
      popImpulseRef.current = 1;

      setTickets(newTickets);
      setBallQueue(shuffled.slice(1));
      setCalledNumbers([firstBall]);
      setDabbedNumbers([]);
      setClaimedPrizes({
        fourCorners: false,
        oneLine: false,
        twoLines: false,
        fullHouse: false
      });
      setRivals(makeRivalProgress());
      setRoundStaked(totalCost);
      setRoundActive(true);
      setIsAutoCalling(speedId !== 'manual');
      setCrowdBanner(null);
      setTomatoSplats([]);

      const firstInfo = BINGO_CALLS_86[firstBall];
      setCallerBanner(
        `EYES DOWN! First ball out of the blower: #${firstBall} — "${firstInfo?.call}"! ${firstInfo?.chant}`
      );
      speakCallout(firstBall, true);
      return true;
    },
    [ballMode, cardCount, cardBuyin, onSpendTokens, practiceMode, speakCallout, speedId]
  );

  const drawNextBall = useCallback(
    (fromGesture = false) => {
      if (!roundActive) {
        handleStartNewRound(ballMode, cardCount, practiceMode);
        return;
      }
      if (ballQueue.length === 0) {
        setIsAutoCalling(false);
        setCallerBanner('TOP OF THE SHOP! All balls have been drawn — check your tickets & start a fresh card!');
        return;
      }

      const nextBall = ballQueue[0];
      setBallQueue((prev) => prev.slice(1));
      setCalledNumbers((prev) => [...prev, nextBall]);
      popImpulseRef.current = 1;
      sfx.playBingoBallPop?.();

      const info = BINGO_CALLS_86[nextBall];
      setCallerBanner(`#${nextBall} — ${info?.call?.toUpperCase()}! ${info?.chant}`);
      speakCallout(nextBall, fromGesture);

      // Update Rival Hall tension
      setRivals((prev) =>
        prev.map((r) => {
          if (Math.random() < 0.24 && r.toGo > 1) {
            return { ...r, toGo: r.toGo - 1 };
          }
          return r;
        })
      );
    },
    [ballMode, ballQueue, cardCount, handleStartNewRound, practiceMode, roundActive, speakCallout]
  );

  // Auto-caller interval when round is running
  useEffect(() => {
    if (!roundActive || !isAutoCalling) return undefined;
    const speedCfg = SPEED_OPTIONS.find((s) => s.id === speedId);
    if (!speedCfg || speedCfg.ms <= 0) return undefined;

    const timer = setInterval(() => {
      drawNextBall(false);
    }, speedCfg.ms);
    return () => clearInterval(timer);
  }, [drawNextBall, isAutoCalling, roundActive, speedId]);

  // Manual Dabber Pen Stamp handler
  const handleDabCell = (cardIdx, value, e) => {
    if (value === null || value === 'FREE') return;
    if (!roundActive) {
      setCrowdBanner({
        type: 'info',
        title: 'Hit "👀 EYES DOWN! PLAY!" first!',
        body: 'Press Eyes Down to drop the first bingo ball from the 1986 neon cage.',
        emojis: '🎱'
      });
      return;
    }

    if (!calledSet.has(value)) {
      sfx.playVote?.(false, 1);
      const cellKey = `${cardIdx}-${value}`;
      setShakeCell(cellKey);
      setTimeout(() => setShakeCell((curr) => (curr === cellKey ? null : curr)), 450);
      setCallerBanner(
        `HOLD ON EAGER BEAVER! #${value} ("${BINGO_CALLS_86[value]?.call}") hasn't come out of the blower yet!`
      );
      return;
    }

    if (dabbedSet.has(value)) {
      return; // Already stamped with neon ink!
    }

    const dabColorIdx = DABBER_COLORS.findIndex((d) => d.id === dabberId);
    sfx.playBingoDab?.(Math.max(0, dabColorIdx));
    setDabbedNumbers((prev) => (prev.includes(value) ? prev : [...prev, value]));

    // Skill Bonus: manual dabbing awards +15¢ MemeCentz when available!
    if (!autoDab) {
      onEarnMemeCentz?.(15, e, 'Manual Neon Dab!');
    }
  };

  // THE GIANT "SHOUT BINGO!" BUTTON (Cheers + Jackpot vs. Comedy Boos + Tomato Splat!)
  const handleShoutBingo = () => {
    if (!roundActive || calledNumbers.length === 0) {
      sfx.playBingoCrowdBoo?.();
      setCrowdBanner({
        type: 'boo',
        title: 'TOMATO ALERT! GAME HASN’T EVEN STARTED!',
        body: 'Press "EYES DOWN!" before yelling BINGO in the hall, ya cheeky chancer!',
        emojis: '🍅'
      });
      return;
    }

    // Check highest unclaimed valid prize across all player tickets
    const hasCorners = !claimedPrizes.fourCorners && cardEvaluations.some((ev) => ev.fourCorners);
    const hasOneLine = !claimedPrizes.oneLine && cardEvaluations.some((ev) => ev.oneLine);
    const hasTwoLines = !claimedPrizes.twoLines && cardEvaluations.some((ev) => ev.twoLines);
    const hasFullHouse = !claimedPrizes.fullHouse && cardEvaluations.some((ev) => ev.fullHouse);

    const newlyWonKeys = [];
    if (hasFullHouse) newlyWonKeys.push('fullHouse');
    else {
      if (hasTwoLines) newlyWonKeys.push('twoLines');
      else if (hasOneLine) newlyWonKeys.push('oneLine');
      if (hasCorners) newlyWonKeys.push('fourCorners');
    }

    if (newlyWonKeys.length > 0) {
      sfx.playBingoCrowdCheer?.();
      setWinsCount((c) => c + 1);

      const nextClaimed = { ...claimedPrizes };
      let totalPayout = 0;
      const prizeNames = [];

      newlyWonKeys.forEach((key) => {
        nextClaimed[key] = true;
        const meta = PRIZE_META[key];
        prizeNames.push(`${meta.emoji} ${meta.label}`);
        if (roundStaked > 0) {
          totalPayout += Math.round(cardBuyin * meta.mult);
        }
      });

      // Speed bonus if Full House under 45 balls
      if (hasFullHouse && roundStaked > 0 && calledNumbers.length <= 45) {
        totalPayout += cardBuyin * 2;
      }

      setClaimedPrizes(nextClaimed);

      if (roundStaked > 0 && totalPayout > 0) {
        onPayoutTokens?.(totalPayout, {
          stakedTokens: roundStaked,
          xp: hasFullHouse ? 140 : 45,
          label: `BINGO! ${prizeNames.join(' + ')} (+M$${totalPayout})`,
          emoji: hasFullHouse ? '🏆' : '🎱',
          maxMultiplier: 120
        });
      } else {
        triggerWinCelebration({
          amount: hasFullHouse ? 100 : 25,
          unit: hasFullHouse ? '🏆 HOUSE!' : '🎱 LINE!',
          headline: `BINGO! ${prizeNames.join(' & ')}!`,
          multiplier: hasFullHouse ? 8 : 2
        });
      }

      if (hasFullHouse) {
        setIsAutoCalling(false);
        setRoundActive(false);
      }

      const cheerHeadline = hasFullHouse
        ? '🏆 FULL HOUSE!! TOP OF THE SHOP!!'
        : `🎉 VALID BINGO CALL: ${prizeNames.join(' + ')}!`;
      setCrowdBanner({
        type: 'cheer',
        title: cheerHeadline,
        body:
          roundStaked > 0
            ? `The 1986 hall goes WILD! Crowd cheers & you win +M$${totalPayout} MemeDollarz! Keep dabbing for Full House!`
            : `Nanna Turbo throws her knitting in the air! ${prizeNames.join(' & ')} verified!`,
        emojis: '🎉🥳🎱'
      });
      setCallerBanner(`HALL GOES WILD! CHECK THAT TICKET — ${prizeNames.join(' & ')} CONFIRMED!`);

      if (voiceCaller && soundOn) {
        try {
          speechRef.current?.stop?.();
          speechRef.current = speakUtteranceChain({
            text: hasFullHouse
              ? 'Full house! Bingo winner! Break out the synthwave champagne!'
              : `Yes! Checked and correct! ${prizeNames.join(' and ')} confirmed!`,
            mode: 'kitt',
            fromGesture: true
          });
        } catch {
          // ignore
        }
      }
      return;
    }

    // FALSE CALL!! HILARIOUSTY TIME — CROWD BOOS & TOMATO SPLATS!
    sfx.playBingoCrowdBoo?.();
    setFalseCallCount((c) => c + 1);
    const forgotDab = cardEvaluations.some((ev) => ev.calledButUndabbedWin || ev.undabbedCalled.length > 0);
    const roast = forgotDab
      ? 'WAIT A SECOND! You HAVE called numbers on your ticket, but you FORGOT TO DAB THEM WITH YOUR PEN! Grab your Neon Dabber and stamp them first!'
      : FALSE_CALL_ROASTS[Math.floor(Math.random() * FALSE_CALL_ROASTS.length)];

    const splats = Array.from({ length: 5 }, (_, idx) => ({
      id: `${Date.now()}-${idx}`,
      left: 12 + idx * 17 + Math.random() * 6,
      top: 18 + (idx % 3) * 22 + Math.random() * 10,
      rot: Math.round((Math.random() - 0.5) * 45)
    }));
    setTomatoSplats(splats);
    setTimeout(() => setTomatoSplats([]), 2400);

    setCrowdBanner({
      type: 'boo',
      title: '🍅 BOOOOOO!! FALSE BINGO CALL!! SHAME!!',
      body: roast,
      emojis: '🍅👎🤡'
    });
    setCallerBanner(`BOOOOO! FALSE CALL BY PLAYER 1! ${roast}`);

    if (voiceCaller && soundOn) {
      try {
        speechRef.current?.stop?.();
        speechRef.current = speakUtteranceChain({
          text: forgotDab
            ? 'False call! You forgot to dab your numbers with your neon pen!'
            : 'Boooo! False bingo call! Put your glasses on!',
          mode: 'hal',
          fromGesture: true
        });
      } catch {
        // ignore
      }
    }
  };

  // Handle card mode/count switching
  const handleSwitchFormat = (nextMode, nextCount) => {
    sfx.playToggle?.();
    setBallMode(nextMode);
    setCardCount(nextCount);
    setRoundActive(false);
    setIsAutoCalling(false);
    setCalledNumbers([]);
    setDabbedNumbers([]);
    setBallQueue(buildShuffledCage(nextMode === '75' ? 75 : 90));
    setTickets(makeTickets(nextMode, nextCount));
    setCrowdBanner(null);
    setCallerBanner(
      `Ready with ${nextCount} Retro ${nextMode}-Ball Card${nextCount > 1 ? 's' : ''}! Hit EYES DOWN to start!`
    );
  };

  const toggleSound = () => {
    if (onToggleSound) {
      onToggleSound();
      return;
    }
    const next = !soundOn;
    sfx.enabled = next;
    if (next) sfx.playToggle();
  };

  const totalBuyinCost = practiceMode ? 0 : cardCount * cardBuyin;

  const extraBadges = (
    <>
      <span className="tm-gs-badge tm-bingo-win-pill" title="Verified Bingos Won">
        🏆 {winsCount} Bingos
      </span>
      {falseCallCount > 0 && (
        <span className="tm-gs-badge tm-bingo-shame-pill" title="Tomatoes Earned for False Calls">
          🍅 {falseCallCount} Bogus
        </span>
      )}
    </>
  );

  return (
    <GameShell
      title="NEON BINGO ’86"
      eyebrow="1986 ELECTRIC BINGO HALL • ALL 90 COMEDY CALLOUTS"
      titleBadge={<span className="tm-bingo-live-pill">80s HALL LIVE</span>}
      className={`tm-bingo-shell ${ceefaxMode ? 'is-ceefax' : ''}`}
      onBack={onBackToFeed}
      tokens={tokens}
      hasPractice
      practiceMode={practiceMode}
      practiceDisabled={roundActive}
      onTogglePractice={() => {
        if (roundActive) return;
        setPracticeMode((p) => !p);
      }}
      extraBadges={extraBadges}
      soundOn={soundOn}
      onToggleSound={toggleSound}
      statusBanner={callerBanner}
      howToPlay={[
        'Choose Free Practice or MemeDollarz Jackpot Mode (1, 2, or 4 Retro Tickets), then press EYES DOWN to spin the 1986 Air-Blower Cage!',
        'Pick your Neon Dabber Ink color (Pink, Cyan, Lime, Gold, Purple) and manually stamp called numbers on your card for +15¢ MemeCentz skill bonuses!',
        'Listen to DJ Flashman call all 90 classic comedy rhymes (like "Two Little Ducks — Quack Quack! 22") — or toggle CEEFAX P.888 Teletext mode!',
        'Complete 4 Corners, 1 Line, 2 Lines, or Full House, then smash SHOUT BINGO! Careful: shout without a dabbed win and the hall pelts you with tomatoes!'
      ]}
    >
      <div
        className={`tm-bingo-arena tm-bingo-theme-${cardTheme}`}
        style={{
          '--dab-color': activeDabber.hex,
          '--dab-ink': activeDabber.ink,
          '--dab-glow': activeDabber.glow
        }}
      >
        {/* Flying Tomato Splats on False Call */}
        {tomatoSplats.length > 0 && (
          <div className="tm-bingo-tomato-layer" aria-hidden="true">
            {tomatoSplats.map((sp) => (
              <div
                key={sp.id}
                className="tm-bingo-tomato-splat"
                style={{
                  left: `${sp.left}%`,
                  top: `${sp.top}%`,
                  transform: `rotate(${sp.rot}deg)`
                }}
              >
                🍅<span>BOOO!</span>
              </div>
            ))}
          </div>
        )}

        {/* TOP CONTROLS: CARD SETUP, NEON DABBER PEN & RETRO SKINS */}
        <section className="tm-bingo-toolbar" aria-label="Bingo Hall Controls">
          <div className="tm-bingo-tool-group">
            <span className="tm-bingo-label">🎱 Format:</span>
            {[
              { id: '90', label: '90-Ball UK Hall' },
              { id: '75', label: '75-Ball Vegas 5×5' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`tm-bingo-chip ${ballMode === m.id ? 'active' : ''}`}
                disabled={roundActive}
                onClick={() => handleSwitchFormat(m.id, cardCount)}
              >
                {m.label}
              </button>
            ))}

            <span className="tm-bingo-label">🎟️ Cards:</span>
            {[1, 2, 4].map((cnt) => (
              <button
                key={cnt}
                type="button"
                className={`tm-bingo-chip ${cardCount === cnt ? 'active' : ''}`}
                disabled={roundActive}
                onClick={() => handleSwitchFormat(ballMode, cnt)}
              >
                {cnt}x {practiceMode ? '' : `(M$${cnt * cardBuyin})`}
              </button>
            ))}
          </div>

          <div className="tm-bingo-tool-group">
            <span className="tm-bingo-label">🖊️ Neon Dabber:</span>
            <div className="tm-bingo-dabber-rack" role="radiogroup" aria-label="Dabber Ink Color">
              {DABBER_COLORS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={dabberId === d.id}
                  className={`tm-bingo-dabber-btn ${dabberId === d.id ? 'active' : ''}`}
                  style={{ '--pen-hex': d.hex }}
                  onClick={() => {
                    sfx.playBingoDab?.(DABBER_COLORS.indexOf(d));
                    setDabberId(d.id);
                  }}
                  title={`${d.name} UV Dabber Pen`}
                >
                  <span className="tm-dabber-cap" style={{ background: d.hex }} />
                  <span>{d.name.split(' ')[1]}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`tm-bingo-chip ${autoDab ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle?.();
                setAutoDab((v) => !v);
              }}
              title="Toggle Auto-Dabber vs Manual Pen Bonus"
            >
              {autoDab ? '🤖 Auto-Dab ON' : '🖊️ Manual Pen (+15¢)'}
            </button>
          </div>

          <div className="tm-bingo-tool-group">
            <span className="tm-bingo-label">🎨 Card Paper:</span>
            {RETRO_CARD_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tm-bingo-chip ${cardTheme === t.id ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setCardTheme(t.id);
                }}
              >
                {t.label}
              </button>
            ))}

            <button
              type="button"
              className={`tm-bingo-chip ${ceefaxMode ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle?.();
                setCeefaxMode((v) => !v);
              }}
              title="Switch to 1986 BBC Ceefax Page 888 Teletext Display"
            >
              📺 {ceefaxMode ? 'CEEFAX P.888 ON' : 'Ceefax 888'}
            </button>

            <button
              type="button"
              className={`tm-bingo-chip ${dictionaryOpen ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle?.();
                setDictionaryOpen((v) => !v);
              }}
            >
              📖 All 90 Calls
            </button>
          </div>
        </section>

        {/* OPTIONAL 1986 CALL SHEET / ALL 90 FUNNY CALLS DRAWER */}
        {dictionaryOpen && (
          <section className="tm-bingo-dict-drawer" aria-label="All 90 Classic Bingo Callouts">
            <div className="tm-bingo-dict-head">
              <div>
                <strong>📖 1986 BINGO CALLER&apos;S BIBLE (1–90)</strong>
                <span>Tap any ball below to preview DJ Flashman&apos;s live callout + comedy SFX!</span>
              </div>
              <button
                type="button"
                className="tm-bingo-chip active"
                onClick={() => setDictionaryOpen(false)}
              >
                ✕ Close
              </button>
            </div>
            <div className="tm-bingo-dict-grid">
              {Object.entries(BINGO_CALLS_86).map(([numStr, info]) => {
                const n = Number(numStr);
                const wasCalled = calledSet.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    className={`tm-bingo-dict-item ${wasCalled ? 'is-called' : ''}`}
                    onClick={() => speakCallout(n, true)}
                  >
                    <span className="tm-dict-num" style={{ borderColor: getBallColor(n) }}>
                      {n}
                    </span>
                    <span className="tm-dict-text">
                      <strong>
                        {info.emoji} {info.call}
                      </strong>
                      <small>{info.chant}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* MAIN STAGE: LEFT BLOWER CAGE + CALLOUT | RIGHT RETRO CARDS + SHOUT BINGO BUTTON */}
        <div className="tm-bingo-stage">
          {/* LEFT: BLOWER CAGE, CURRENT CALLOUT, HISTORY & SOUND DECK */}
          <aside className="tm-bingo-caller-col">
            <div className="tm-bingo-blower-card">
              <div className="tm-bingo-blower-head">
                <span>
                  {ceefaxMode ? 'CEEFAX 888  SUN 1986  BINGO HALL' : '🪩 1986 AIR-BLOWER CAGE'}
                </span>
                <span className="tm-bingo-ball-counter">
                  {calledNumbers.length}/{maxBalls} DRAWN
                </span>
              </div>

              <div className="tm-bingo-cage-stage">
                <canvas
                  ref={cageCanvasRef}
                  className="tm-bingo-cage-canvas"
                  aria-label="Animated 1986 Neon Bingo Air-Blower Cage"
                />

                <div className="tm-bingo-current-orb-wrap">
                  {currentBall ? (
                    <div
                      key={currentBall}
                      className="tm-bingo-current-orb"
                      style={{
                        '--orb-color': getBallColor(currentBall)
                      }}
                    >
                      <span className="tm-orb-num">{currentBall}</span>
                    </div>
                  ) : (
                    <div className="tm-bingo-current-orb is-idle">
                      <span className="tm-orb-num">’86</span>
                    </div>
                  )}

                  <div className="tm-bingo-callout-box" aria-live="polite">
                    <div className="tm-callout-headline">
                      {activeCall ? `${activeCall.emoji} ${activeCall.call}` : 'READY ON THE TUBE!'}
                    </div>
                    <div className="tm-callout-chant">
                      {activeCall
                        ? activeCall.chant
                        : 'Press EYES DOWN below to launch Ball #1!'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Caller Controls */}
              <div className="tm-bingo-caller-controls">
                {!roundActive ? (
                  <button
                    type="button"
                    className="tm-bingo-primary-btn"
                    onClick={() => handleStartNewRound(ballMode, cardCount, practiceMode)}
                  >
                    👀 EYES DOWN! PLAY! {totalBuyinCost > 0 ? `(M$${totalBuyinCost})` : '(FREE)'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="tm-bingo-primary-btn"
                      onClick={() => drawNextBall(true)}
                    >
                      🎱 DRAW NEXT BALL
                    </button>
                    <button
                      type="button"
                      className={`tm-bingo-chip ${isAutoCalling ? 'active' : ''}`}
                      onClick={() => {
                        sfx.playToggle?.();
                        setIsAutoCalling((v) => !v);
                      }}
                    >
                      {isAutoCalling ? '⏸ Pause' : '▶ Auto-Call'}
                    </button>
                  </>
                )}

                <select
                  aria-label="Caller Speed"
                  className="tm-bingo-speed-select"
                  value={speedId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSpeedId(nextId);
                    if (nextId === 'manual') setIsAutoCalling(false);
                  }}
                >
                  {SPEED_OPTIONS.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={`tm-bingo-chip ${voiceCaller ? 'active' : ''}`}
                  onClick={() => {
                    sfx.playToggle?.();
                    setVoiceCaller((v) => !v);
                  }}
                  title="Toggle DJ Flashman Live Voice Callouts"
                >
                  {voiceCaller ? '🎙️ Voice ON' : '🎙️ Voice OFF'}
                </button>
              </div>
            </div>

            {/* Prize Meter & Payout Tiers */}
            <div className="tm-bingo-prizes-bar">
              {Object.entries(PRIZE_META).map(([key, meta]) => {
                const isClaimed = claimedPrizes[key];
                const isReadyNow =
                  !isClaimed &&
                  cardEvaluations.some((ev) => Boolean(ev[key]));
                const payAmt =
                  totalBuyinCost > 0
                    ? Math.round(cardBuyin * meta.mult)
                    : Math.round(10 * meta.mult);
                return (
                  <div
                    key={key}
                    className={`tm-bingo-prize-pill ${isClaimed ? 'is-claimed' : ''} ${
                      isReadyNow ? 'is-ready' : ''
                    }`}
                  >
                    <span>
                      {meta.emoji} {meta.label}
                    </span>
                    <strong>
                      {isClaimed ? '✅ PAID' : isReadyNow ? '🔔 SHOUT!' : totalBuyinCost > 0 ? `M$${payAmt}` : 'DEMO'}
                    </strong>
                  </div>
                );
              })}
            </div>

            {/* Recent Called Balls Board */}
            <div className="tm-bingo-history-box">
              <div className="tm-bingo-subhead">
                <span>📡 RECENT CALLS</span>
                <span>{calledNumbers.length > 0 ? `Last: #${currentBall}` : 'Waiting...'}</span>
              </div>
              <div className="tm-bingo-history-pills">
                {calledNumbers.length === 0 ? (
                  <span className="tm-bingo-muted">No balls drawn yet — spin that cage!</span>
                ) : (
                  [...calledNumbers]
                    .reverse()
                    .slice(0, 18)
                    .map((n, i) => (
                      <button
                        key={n}
                        type="button"
                        className={`tm-history-ball ${i === 0 ? 'is-latest' : ''}`}
                        style={{ borderColor: getBallColor(n) }}
                        onClick={() => speakCallout(n, true)}
                        title={`${n}: ${BINGO_CALLS_86[n]?.call}`}
                      >
                        {n}
                      </button>
                    ))
                )}
              </div>
            </div>

            {/* WOW Feature: Caller's 1986 Crowd Sound & Heckle Deck */}
            <div className="tm-bingo-heckle-deck">
              <div className="tm-bingo-subhead">
                <span>🎛️ CROWD SOUND & HECKLE DECK</span>
              </div>
              <div className="tm-heckle-btns">
                <button
                  type="button"
                  className="tm-heckle-btn"
                  onClick={() => {
                    sfx.playBingoDuckQuack?.();
                    setCallerBanner('🦆🦆 TWO LITTLE DUCKS IN THE CROWD! QUACK QUACK!');
                  }}
                >
                  🦆 Quack!
                </button>
                <button
                  type="button"
                  className="tm-heckle-btn"
                  onClick={() => {
                    sfx.playAirhorn?.();
                    setCallerBanner('📯 MLG 1986 HORN! EVERYBODY WAKE UP AT TABLE 6!');
                  }}
                >
                  📯 Airhorn
                </button>
                <button
                  type="button"
                  className="tm-heckle-btn"
                  onClick={() => {
                    sfx.playBingoCrowdCheer?.();
                    setCallerBanner('👏 STADIUM APPLAUSE FOR NANNA TURBO’S HAIRSPRAY!');
                  }}
                >
                  👏 Cheer!
                </button>
                <button
                  type="button"
                  className="tm-heckle-btn"
                  onClick={() => {
                    sfx.playBingoCrowdBoo?.();
                    setCallerBanner('🍅 CROWD BOOS THE CALLER! "CHECK THE MACHINE, PAL!"');
                  }}
                >
                  🍅 Boo!
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT: RETRO TICKETS + SHOUT BINGO! + RIVAL PLAYERS */}
          <section className="tm-bingo-cards-col" aria-label="Your Retro Bingo Cards">
            {crowdBanner && (
              <div
                className={`tm-bingo-crowd-banner is-${crowdBanner.type}`}
                role="alert"
              >
                <div className="tm-crowd-emoji">{crowdBanner.emojis}</div>
                <div className="tm-crowd-copy">
                  <strong>{crowdBanner.title}</strong>
                  <p>{crowdBanner.body}</p>
                </div>
                <button
                  type="button"
                  className="tm-crowd-close"
                  onClick={() => setCrowdBanner(null)}
                  aria-label="Dismiss announcement"
                >
                  ✕
                </button>
              </div>
            )}

            <div className={`tm-bingo-tickets-grid count-${cardCount}`}>
              {tickets.map((ticket, tIdx) => {
                const evalInfo = cardEvaluations[tIdx];
                return (
                  <article
                    key={ticket.id}
                    className={`tm-bingo-ticket mode-${ticket.mode} ${
                      evalInfo.oneLine || evalInfo.fourCorners ? 'has-bingo-glow' : ''
                    }`}
                  >
                    <header className="tm-ticket-header">
                      <span className="tm-ticket-title">
                        🎟️ {ticket.label} · SER#{ticket.serial}
                      </span>
                      <span className="tm-ticket-progress">
                        {evalInfo.dabbedCount}/{evalInfo.totalCount} DABBED
                        {evalInfo.undabbedCalled.length > 0 && (
                          <strong className="tm-undabbed-hint">
                            {' '}
                            · {evalInfo.undabbedCalled.length} MISSED DAB!
                          </strong>
                        )}
                      </span>
                    </header>

                    {ticket.mode === '75' && (
                      <div className="tm-bingo-75-head" aria-hidden="true">
                        <span>B</span>
                        <span>I</span>
                        <span>N</span>
                        <span>G</span>
                        <span>O</span>
                      </div>
                    )}

                    <div
                      className={`tm-ticket-cells mode-${ticket.mode}`}
                      role="grid"
                      aria-label={`${ticket.label} numbers`}
                    >
                      {ticket.grid.map((row, rIdx) =>
                        row.map((cellVal, cIdx) => {
                          if (cellVal === null) {
                            return (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                className="tm-ticket-cell is-blank"
                                aria-hidden="true"
                              >
                                <span className="tm-blank-logo">★86</span>
                              </div>
                            );
                          }
                          if (cellVal === 'FREE') {
                            return (
                              <div key={`${rIdx}-${cIdx}`} className="tm-ticket-cell is-free is-dabbed">
                                <span className="tm-dab-splat" />
                                <span className="tm-cell-free-lbl">⚡FREE</span>
                              </div>
                            );
                          }
                          const isCalled = calledSet.has(cellVal);
                          const isDabbed = dabbedSet.has(cellVal);
                          const isLatest = currentBall === cellVal;
                          const isOneToGo = evalInfo.oneToGo.includes(cellVal);
                          const isShaking = shakeCell === `${tIdx}-${cellVal}`;
                          return (
                            <button
                              key={`${rIdx}-${cIdx}`}
                              type="button"
                              onClick={(e) => handleDabCell(tIdx, cellVal, e)}
                              className={`tm-ticket-cell is-number ${isDabbed ? 'is-dabbed' : ''} ${
                                isCalled && !isDabbed ? 'is-callable' : ''
                              } ${isLatest ? 'is-latest' : ''} ${isOneToGo && !isDabbed ? 'is-1togo' : ''} ${
                                isShaking ? 'is-shaking' : ''
                              }`}
                              title={
                                isDabbed
                                  ? `Stamped #${cellVal} (${BINGO_CALLS_86[cellVal]?.call})`
                                  : isCalled
                                  ? `Click with Neon Dabber to stamp #${cellVal}!`
                                  : `Number #${cellVal}: "${BINGO_CALLS_86[cellVal]?.call}"`
                              }
                            >
                              {isDabbed && <span className="tm-dab-splat" aria-hidden="true" />}
                              <span className="tm-cell-num">{cellVal}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* GIANT "SHOUT BINGO!" ACTION DECK */}
            <div className="tm-bingo-shout-bar">
              <button
                type="button"
                className={`tm-shout-bingo-btn ${
                  cardEvaluations.some(
                    (ev) =>
                      (!claimedPrizes.fourCorners && ev.fourCorners) ||
                      (!claimedPrizes.oneLine && ev.oneLine) ||
                      (!claimedPrizes.twoLines && ev.twoLines) ||
                      (!claimedPrizes.fullHouse && ev.fullHouse)
                  )
                    ? 'is-hot'
                    : ''
                }`}
                onClick={handleShoutBingo}
              >
                <span className="tm-shout-icon">📢</span>
                <span className="tm-shout-text">
                  <strong>SHOUT &ldquo;BINGO!&rdquo;</strong>
                  <small>Claim 4 Corners, 1 Line, 2 Lines or Full House (False calls get 🍅!)</small>
                </span>
              </button>

              {roundActive && (
                <button
                  type="button"
                  className="tm-bingo-reset-btn"
                  onClick={() => handleSwitchFormat(ballMode, cardCount)}
                >
                  🔄 Fresh Cards
                </button>
              )}
            </div>

            {/* RIVAL 1986 BINGO HALL PLAYERS */}
            <div className="tm-bingo-rivals-strip" aria-label="Rival Bingo Hall Players">
              <span className="tm-rivals-title">🏟️ TABLE RIVALS:</span>
              {rivals.map((r) => (
                <div
                  key={r.id}
                  className={`tm-rival-pill ${r.toGo <= 2 ? 'is-sweating' : ''}`}
                  title={r.bio}
                >
                  <span>{r.avatar}</span>
                  <span>{r.name}</span>
                  <strong>{r.toGo} TO GO</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </GameShell>
  );
}
