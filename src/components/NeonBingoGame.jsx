import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { triggerWinCelebration } from '../utils/winCelebration';
import { speakUtteranceChain } from '../utils/aiSpeech';
import {
  DABBER_COLORS,
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
  { id: 'chill', label: '🐢 4.5s', ms: 4500 },
  { id: 'club', label: '🕺 2.8s', ms: 2800 },
  { id: 'turbo', label: '⚡ 1.6s', ms: 1650 },
  { id: 'manual', label: '✋ Manual', ms: 0 }
];

const VOICE_PERSONAS = [
  { id: 'valkyrie', label: '👩‍🎤 80s Female', title: "VALKYRIE '86 — 1980s Female Synth Caller" },
  { id: 'kitt', label: '🚗 K.I.T.T.', title: 'K.I.T.T. (Knight Rider Caller)' },
  { id: 'hal', label: '🔴 HAL 9000', title: 'HAL 9000 Caller' }
];

const PRIZE_META = {
  fourCorners: { label: 'Corners', fullLabel: '4 Corners', mult: 2.2, emoji: '📐' },
  oneLine: { label: '1 Line', fullLabel: '1 Line', mult: 1.8, emoji: '➖' },
  twoLines: { label: '2 Lines', fullLabel: '2 Lines', mult: 3.5, emoji: '➖➖' },
  fullHouse: { label: 'House', fullLabel: 'FULL HOUSE', mult: 8.5, emoji: '🏆' }
};

const EMPTY_CLAIMS = {
  fourCorners: null,
  oneLine: null,
  twoLines: null,
  fullHouse: null
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
 * Gives every multiplayer rival in the hall a real unique Bingo ticket!
 */
function makeRivalsWithTickets(mode = '90') {
  const emptySet = new Set();
  return RIVAL_HALL_PLAYERS.map((r, idx) => {
    const ticket = mode === '75' ? generate75BallCard(10 + idx) : generate90BallCard(10 + idx);
    const ev = evaluateCardStatus(ticket, emptySet, emptySet);
    return {
      ...r,
      ticket,
      dabbedCount: 0,
      totalCount: ev.totalCount,
      remainingForHouse: ev.totalCount,
      fourCorners: false,
      oneLine: false,
      twoLines: false,
      fullHouse: false,
      toGo: Math.min(5, ev.totalCount),
      justDabbed: false,
      statusText: 'Waiting for #1'
    };
  });
}

function evaluateRivalList(prevRivals, calledSet, latestBall) {
  return prevRivals.map((r) => {
    const ev = evaluateCardStatus(r.ticket, calledSet, calledSet);
    const justDabbed = latestBall !== null && r.ticket.numbers.includes(latestBall);
    const toGo = ev.oneToGo.length > 0 ? 1 : Math.min(5, ev.remainingForHouse);
    let statusText = `${ev.dabbedCount}/${ev.totalCount}`;
    if (ev.fullHouse) statusText = 'HOUSE READY!';
    else if (ev.oneToGo.length > 0) statusText = '1 TO GO!';
    else if (justDabbed) statusText = `Dabbed #${latestBall}!`;

    return {
      ...r,
      dabbedCount: ev.dabbedCount,
      totalCount: ev.totalCount,
      remainingForHouse: ev.remainingForHouse,
      fourCorners: ev.fourCorners,
      oneLine: ev.oneLine,
      twoLines: ev.twoLines,
      fullHouse: ev.fullHouse,
      toGo,
      justDabbed,
      statusText
    };
  });
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

  // Game setup & mode state (default 1 card — great on iPhone, buy up to 4 cards!)
  const [practiceMode, setPracticeMode] = useState(() => tokens < cardBuyin);
  const [ballMode, setBallMode] = useState('90'); // '90' | '75'
  const [cardCount, setCardCount] = useState(1); // 1 | 2 | 3 | 4
  const [activeMobileCardIdx, setActiveMobileCardIdx] = useState(0);
  const [showAllMobileCards, setShowAllMobileCards] = useState(false);

  const [dabberId, setDabberId] = useState('pink');
  const [autoDab, setAutoDab] = useState(false);
  const [voiceCaller, setVoiceCaller] = useState(true);
  const [callerPersona, setCallerPersona] = useState(() => {
    const saved = localStorage.getItem('tm_bingo_voice_persona_v1');
    return saved === 'kitt' || saved === 'hal' || saved === 'valkyrie' ? saved : 'valkyrie';
  });
  const [speedId, setSpeedId] = useState('club');
  const [ceefaxMode, setCeefaxMode] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);

  // Active round state
  const [roundActive, setRoundActive] = useState(false);
  const [roundStaked, setRoundStaked] = useState(0);
  const [roundWonTotal, setRoundWonTotal] = useState(0);
  const [tickets, setTickets] = useState(() => makeTickets('90', 1));
  const [ballQueue, setBallQueue] = useState(() => buildShuffledCage(90));
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [dabbedNumbers, setDabbedNumbers] = useState([]);
  const [claimedPrizes, setClaimedPrizes] = useState(() => ({ ...EMPTY_CLAIMS }));
  const [isAutoCalling, setIsAutoCalling] = useState(false);
  const [rivals, setRivals] = useState(() => makeRivalsWithTickets('90'));
  const [rivalEventFeed, setRivalEventFeed] = useState(
    '🏟️ LIVE HALL: You + 4 real-ticket rivals in this game! Hit EYES DOWN to drop Ball #1!'
  );
  const [gameOverState, setGameOverState] = useState(null); // { winnerType, winnerName, winnerAvatar, payout, ballsCalled, playerWonTotal, finalClaims }
  const [falseCallCount, setFalseCallCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);

  // Comedy / feedback state
  const [callerBanner, setCallerBanner] = useState(
    'WELCOME TO NEON BINGO ’86! 4 live rivals are seated beside you — hit EYES DOWN to begin!'
  );
  const [crowdBanner, setCrowdBanner] = useState(null); // { type: 'cheer' | 'boo' | 'rival' | 'info', title, body, emojis }
  const [tomatoSplats, setTomatoSplats] = useState([]);
  const [shakeCell, setShakeCell] = useState(null);

  const cageCanvasRef = useRef(null);
  const popImpulseRef = useRef(0);
  const speechRef = useRef(null);

  // Live refs so timed rival claim checks never read stale state
  const roundActiveRef = useRef(roundActive);
  const claimedPrizesRef = useRef(claimedPrizes);
  const calledNumbersRef = useRef(calledNumbers);
  const roundWonTotalRef = useRef(roundWonTotal);
  const cardEvaluationsRef = useRef([]);

  useEffect(() => {
    roundActiveRef.current = roundActive;
  }, [roundActive]);
  useEffect(() => {
    claimedPrizesRef.current = claimedPrizes;
  }, [claimedPrizes]);
  useEffect(() => {
    calledNumbersRef.current = calledNumbers;
  }, [calledNumbers]);
  useEffect(() => {
    roundWonTotalRef.current = roundWonTotal;
  }, [roundWonTotal]);

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

  useEffect(() => {
    cardEvaluationsRef.current = cardEvaluations;
  }, [cardEvaluations]);

  // Keep mobile active card index valid if cardCount shrinks (derived, no extra render)
  const visibleMobileCardIdx = activeMobileCardIdx >= cardCount ? 0 : activeMobileCardIdx;

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

      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r + 18);
      bgGrad.addColorStop(0, 'rgba(0, 243, 255, 0.22)');
      bgGrad.addColorStop(0.65, 'rgba(255, 42, 133, 0.14)');
      bgGrad.addColorStop(1, 'rgba(7, 8, 16, 0)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect?.(cx - 46, cy + r - 4, 92, 14, 6);
      ctx.fill();
      ctx.stroke();

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

  const speakBingoAnnouncement = useCallback(
    (text, fromGesture = false, modeOverride = null) => {
      if (!voiceCaller || !soundOn || !text) return;
      try {
        speechRef.current?.stop?.();
        speechRef.current = speakUtteranceChain({
          text,
          mode: modeOverride || callerPersona,
          fromGesture
        });
      } catch {
        // ignore speech failure
      }
    },
    [callerPersona, soundOn, voiceCaller]
  );

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

      const phrase =
        num === 22
          ? `Two little ducks! Quack quack! Number 22!`
          : `${info.call}! Number ${num}!`;
      speakBingoAnnouncement(phrase, fromGesture);
    },
    [soundOn, speakBingoAnnouncement]
  );

  // RIVAL LIVE HALL CLAIM EFFECT:
  // Whenever balls are drawn, if any rival completes an unclaimed prize (4 Corners / 1 Line / 2 Lines / Full House),
  // allow a brief 1100ms reaction window in case the human also hit on this ball — otherwise the rival claims it!
  useEffect(() => {
    if (!roundActive || calledNumbers.length === 0) return undefined;

    const unclaimedTiers = ['fullHouse', 'twoLines', 'oneLine', 'fourCorners'];
    const pendingTier = unclaimedTiers.find(
      (tier) => !claimedPrizes[tier] && rivals.some((r) => Boolean(r[tier]))
    );
    if (!pendingTier) return undefined;

    const winnerRival = rivals.find((r) => Boolean(r[pendingTier]));
    if (!winnerRival) return undefined;

    const timer = setTimeout(() => {
      if (!roundActiveRef.current) return;
      const latestClaims = claimedPrizesRef.current;
      if (latestClaims[pendingTier]) return;

      const nextClaims = {
        ...latestClaims,
        [pendingTier]: {
          by: 'rival',
          name: winnerRival.name,
          avatar: winnerRival.avatar
        }
      };

      claimedPrizesRef.current = nextClaims;
      setClaimedPrizes(nextClaims);
      sfx.playRivalBingoAlert?.();

      const prizeInfo = PRIZE_META[pendingTier];

      if (pendingTier === 'fullHouse') {
        setIsAutoCalling(false);
        setRoundActive(false);
        roundActiveRef.current = false;

        setGameOverState({
          winnerType: 'rival',
          winnerName: winnerRival.name,
          winnerAvatar: winnerRival.avatar,
          payout: 0,
          ballsCalled: calledNumbersRef.current.length,
          playerWonTotal: roundWonTotalRef.current,
          finalClaims: nextClaims
        });

        setRivalEventFeed(
          `🛑 FULL HOUSE! ${winnerRival.avatar} ${winnerRival.name} WON FULL HOUSE! GAME OVER!`
        );
        setCallerBanner(
          `GAME OVER! ${winnerRival.avatar} ${winnerRival.name} called FULL HOUSE after ${calledNumbersRef.current.length} balls!`
        );
        setCrowdBanner({
          type: 'rival',
          title: `🛑 GAME OVER — ${winnerRival.avatar} ${winnerRival.name.toUpperCase()} WON FULL HOUSE!`,
          body: 'Someone else beat the hall to Full House! Check the prize breakdown below or buy new cards to play again.',
          emojis: `${winnerRival.avatar} 🏆`
        });
        speakBingoAnnouncement(
          `Game over! ${winnerRival.name} has called Full House and won the hall!`,
          false
        );
      } else {
        setRivalEventFeed(
          `⚠️ PRIZE GONE! ${winnerRival.avatar} ${winnerRival.name} won ${prizeInfo.fullLabel}!`
        );
        setCallerBanner(
          `HEADS UP! ${winnerRival.avatar} ${winnerRival.name} JUST CLAIMED ${prizeInfo.fullLabel.toUpperCase()}!`
        );
        setCrowdBanner({
          type: 'rival',
          title: `⚠️ RIVAL WON THE ROW! ${winnerRival.avatar} ${winnerRival.name} claimed ${prizeInfo.fullLabel}!`,
          body: `That ${prizeInfo.fullLabel} prize is now taken! Keep dabbing for the remaining prizes and Full House!`,
          emojis: `${winnerRival.avatar} ⚠️`
        });
        speakBingoAnnouncement(
          `Attention Bingo Hall! ${winnerRival.name} just won ${prizeInfo.fullLabel}!`,
          false
        );
      }
    }, 1050);

    return () => clearTimeout(timer);
  }, [calledNumbers.length, claimedPrizes, rivals, roundActive, speakBingoAnnouncement]);

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
      const firstSet = new Set([firstBall]);

      sfx.playBingoBallPop?.();
      popImpulseRef.current = 1;

      const freshRivals = evaluateRivalList(makeRivalsWithTickets(customBallMode), firstSet, firstBall);
      const firstHitRival = freshRivals.find((r) => r.justDabbed);

      setTickets(newTickets);
      setActiveMobileCardIdx(0);
      setBallQueue(shuffled.slice(1));
      setCalledNumbers([firstBall]);
      setDabbedNumbers([]);
      setClaimedPrizes({ ...EMPTY_CLAIMS });
      claimedPrizesRef.current = { ...EMPTY_CLAIMS };
      setGameOverState(null);
      setRivals(freshRivals);
      setRivalEventFeed(
        firstHitRival
          ? `🎯 ${firstHitRival.avatar} ${firstHitRival.name} dabbed opening ball #${firstBall}! (4 rivals playing live)`
          : `🟢 LIVE HALL: You + 4 rivals playing! Ball #${firstBall} is out!`
      );
      setRoundStaked(totalCost);
      setRoundWonTotal(0);
      roundWonTotalRef.current = 0;
      setRoundActive(true);
      roundActiveRef.current = true;
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
        setRoundActive(false);
        setGameOverState((prev) =>
          prev || {
            winnerType: 'draw',
            winnerName: 'No Full House',
            winnerAvatar: '🎱',
            payout: 0,
            ballsCalled: calledNumbers.length,
            playerWonTotal: roundWonTotal,
            finalClaims: claimedPrizes
          }
        );
        setCallerBanner('TOP OF THE SHOP! All balls drawn — GAME OVER! Start a fresh card to play again!');
        return;
      }

      const nextBall = ballQueue[0];
      const nextCalled = [...calledNumbers, nextBall];
      const nextSet = new Set(nextCalled);

      setBallQueue((prev) => prev.slice(1));
      setCalledNumbers(nextCalled);
      if (autoDab && tickets.some((t) => t.numbers.includes(nextBall))) {
        setDabbedNumbers((prev) => (prev.includes(nextBall) ? prev : [...prev, nextBall]));
      }
      popImpulseRef.current = 1;
      sfx.playBingoBallPop?.();

      const info = BINGO_CALLS_86[nextBall];
      setCallerBanner(`#${nextBall} — ${info?.call?.toUpperCase()}! ${info?.chant}`);
      speakCallout(nextBall, fromGesture);

      // Evaluate real rival cards against updated calledSet
      setRivals((prev) => {
        const updated = evaluateRivalList(prev, nextSet, nextBall);
        const sweating = updated.find((r) => r.toGo <= 1);
        const hitRival = updated.find((r) => r.justDabbed);
        if (sweating) {
          setRivalEventFeed(
            `🔥 SWEAT ALERT: ${sweating.avatar} ${sweating.name} is 1 NUMBER AWAY! (${sweating.dabbedCount}/${sweating.totalCount})`
          );
        } else if (hitRival) {
          setRivalEventFeed(
            `🎯 ${hitRival.avatar} ${hitRival.name} stamped #${nextBall} (${hitRival.dabbedCount}/${hitRival.totalCount} dabbed)`
          );
        } else {
          setRivalEventFeed(`🎱 Ball #${nextBall} missed all 4 rivals — your chance to pull ahead!`);
        }
        return updated;
      });
    },
    [
      autoDab,
      ballMode,
      ballQueue,
      calledNumbers,
      cardCount,
      claimedPrizes,
      handleStartNewRound,
      practiceMode,
      roundActive,
      roundWonTotal,
      speakCallout,
      tickets
    ]
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
        title: gameOverState ? 'Game Over! Start a New Round!' : 'Hit "👀 EYES DOWN! PLAY!" first!',
        body: gameOverState
          ? 'The previous Full House finished! Choose how many cards you want and tap PLAY AGAIN.'
          : 'Press Eyes Down to drop the first bingo ball from the 1986 neon cage.',
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
      return;
    }

    const dabColorIdx = DABBER_COLORS.findIndex((d) => d.id === dabberId);
    sfx.playBingoDab?.(Math.max(0, dabColorIdx));
    setDabbedNumbers((prev) => (prev.includes(value) ? prev : [...prev, value]));

    if (!autoDab) {
      onEarnMemeCentz?.(15, e, 'Manual Neon Dab!');
    }
  };

  // THE GIANT "SHOUT BINGO!" BUTTON
  const handleShoutBingo = () => {
    if (!roundActive || calledNumbers.length === 0) {
      sfx.playBingoCrowdBoo?.();
      setCrowdBanner({
        type: 'boo',
        title: '🍅 TOMATO ALERT! GAME IS NOT ACTIVE!',
        body: gameOverState
          ? 'That game already ended on Full House! Hit PLAY NEW GAME to start another round!'
          : 'Press "EYES DOWN!" before yelling BINGO in the hall, ya cheeky chancer!',
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
    if (hasFullHouse) {
      newlyWonKeys.push('fullHouse');
    } else {
      if (hasTwoLines) newlyWonKeys.push('twoLines');
      else if (hasOneLine) newlyWonKeys.push('oneLine');
      if (hasCorners) newlyWonKeys.push('fourCorners');
    }

    if (newlyWonKeys.length > 0) {
      setWinsCount((c) => c + 1);

      const nextClaimed = { ...claimedPrizes };
      let totalPayout = 0;
      const prizeNames = [];

      newlyWonKeys.forEach((key) => {
        nextClaimed[key] = { by: 'player', name: 'YOU', avatar: '👑' };
        const meta = PRIZE_META[key];
        prizeNames.push(`${meta.emoji} ${meta.label}`);
        totalPayout += Math.round(cardBuyin * meta.mult);
      });

      if (hasFullHouse && calledNumbers.length <= 45) {
        totalPayout += cardBuyin * 2;
      }

      const newRoundTotal = roundWonTotal + (roundStaked > 0 ? totalPayout : 0);
      setRoundWonTotal(newRoundTotal);
      roundWonTotalRef.current = newRoundTotal;
      setClaimedPrizes(nextClaimed);
      claimedPrizesRef.current = nextClaimed;

      if (hasFullHouse) {
        // FULL HOUSE BY PLAYER = GAME OVER + MASSIVE MULTI-WAVE FANFARE SPECTACLE!!
        setIsAutoCalling(false);
        setRoundActive(false);
        roundActiveRef.current = false;

        setGameOverState({
          winnerType: 'player',
          winnerName: 'YOU (HALL CHAMPION!)',
          winnerAvatar: '👑',
          payout: roundStaked > 0 ? totalPayout : 250,
          ballsCalled: calledNumbers.length,
          playerWonTotal: roundStaked > 0 ? newRoundTotal : 250,
          finalClaims: nextClaimed
        });

        // Lots of layered fanfares + crowd cheer + choppers + fireworks!
        sfx.playBingoGrandFanfare?.();
        sfx.playBingoCrowdCheer?.();
        setTimeout(() => sfx.playRareWinFanfare?.({ rareTheme: 'arcade-fireworks' }), 850);
        setTimeout(() => sfx.playBingoGrandFanfare?.(), 1750);

        if (roundStaked > 0 && totalPayout > 0) {
          onPayoutTokens?.(totalPayout, {
            stakedTokens: roundStaked,
            xp: 180,
            label: `FULL HOUSE CHAMPION! (+M$${totalPayout})`,
            emoji: '🏆',
            maxMultiplier: 150
          });
        }

        triggerWinCelebration({
          amount: roundStaked > 0 ? totalPayout : 250,
          unit: roundStaked > 0 ? '👑 FULL HOUSE M$' : '🏆 FULL HOUSE!',
          game: "NEON BINGO '86",
          headline: '👑 BINGO! FULL HOUSE CHAMPION!! 🎉',
          detail: `GAME OVER • YOU BEAT ALL 4 RIVALS IN ${calledNumbers.length} BALLS!`,
          multiplier: 18,
          tier: 'jackpot',
          theme: 'arcade-fireworks',
          forceRare: true,
          skipSound: true,
          chopperFlyby: 'both'
        });

        setRivalEventFeed('👑 BINGO!! YOU CALLED FULL HOUSE AND SWEPT THE 1986 HALL! GAME OVER!');
        setCrowdBanner({
          type: 'cheer',
          title: '👑 BINGO!! FULL HOUSE CHAMPION!! GAME OVER! 🎉🎆',
          body:
            roundStaked > 0
              ? `🎺 SOUND THE TRUMPETS! You beat all 4 rivals for +M$${totalPayout} MemeDollarz! Game complete — play again anytime!`
              : '🎺 THE ENTIRE 1986 BINGO HALL ERUPTS! Standing ovation, champagne corks flying — Full House Champion!',
          emojis: '👑🎺🎆🥳'
        });
        setCallerBanner('👑 FULL HOUSE CONFIRMED!! STOP THE CLOCK — YOU ARE THE 1986 HALL CHAMPION!!');
        speakBingoAnnouncement(
          'BINGO! BINGO! FULL HOUSE CHAMPION! Stop the clock! Break out the synthwave champagne — you beat the entire 1986 Bingo Hall!',
          true
        );
        return;
      }

      // Row / 4-Corners Win (Game continues toward Full House!)
      sfx.playBingoCrowdCheer?.();
      if (roundStaked > 0 && totalPayout > 0) {
        onPayoutTokens?.(totalPayout, {
          stakedTokens: roundStaked,
          xp: 55,
          label: `BINGO! ${prizeNames.join(' + ')} (+M$${totalPayout})`,
          emoji: '🎱',
          maxMultiplier: 120
        });
      } else {
        triggerWinCelebration({
          amount: 25,
          unit: '🎱 ROW WIN!',
          headline: `BINGO! ${prizeNames.join(' & ')}!`,
          multiplier: 2.5
        });
      }

      setRivalEventFeed(`🎉 YOU CLAIMED ${prizeNames.join(' & ')} BEFORE THE RIVALS! Keep going for Full House!`);
      setCrowdBanner({
        type: 'cheer',
        title: `🎉 VALID BINGO CALL: ${prizeNames.join(' + ')}!`,
        body:
          roundStaked > 0
            ? `YOU BEAT THE HALL! Won +M$${totalPayout} MemeDollarz! Keep dabbing — Full House ends the game!`
            : `Nanna Turbo throws her knitting in the air! ${prizeNames.join(' & ')} verified! Keep going for Full House!`,
        emojis: '🎉🥳🎱'
      });
      setCallerBanner(`HALL GOES WILD! ${prizeNames.join(' & ')} CLAIMED BY YOU — PLAY ON FOR FULL HOUSE!`);
      speakBingoAnnouncement(`Yes! Checked and correct! ${prizeNames.join(' and ')} confirmed for Player One!`, true);
      return;
    }

    // Check if they DID complete a row, except a Rival already stole that prize!
    const rivalStoleOneLine = claimedPrizes.oneLine?.by === 'rival' && cardEvaluations.some((ev) => ev.oneLine);
    const rivalStoleTwoLines = claimedPrizes.twoLines?.by === 'rival' && cardEvaluations.some((ev) => ev.twoLines);
    const rivalStoleCorners = claimedPrizes.fourCorners?.by === 'rival' && cardEvaluations.some((ev) => ev.fourCorners);
    if (rivalStoleOneLine || rivalStoleTwoLines || rivalStoleCorners) {
      sfx.playRivalBingoAlert?.();
      const stolenName = rivalStoleTwoLines
        ? claimedPrizes.twoLines.name
        : rivalStoleOneLine
          ? claimedPrizes.oneLine.name
          : claimedPrizes.fourCorners.name;
      setCrowdBanner({
        type: 'rival',
        title: `😅 TOO LATE! ${stolenName.toUpperCase()} ALREADY WON THAT PRIZE!`,
        body: 'That row prize was already claimed by another player in the hall! Keep dabbing for the higher unclaimed prizes!',
        emojis: '⏰🎱'
      });
      speakBingoAnnouncement(`Too late! ${stolenName} already claimed that prize! Keep going for Full House!`, true);
      return;
    }

    // FALSE CALL!! CROWD BOOS & TOMATO SPLATS!
    sfx.playBingoCrowdBoo?.();
    setFalseCallCount((c) => c + 1);
    const forgotDab = cardEvaluations.some((ev) => ev.calledButUndabbedWin || ev.undabbedCalled.length > 0);
    const roast = forgotDab
      ? 'WAIT A SECOND! You HAVE called numbers on your ticket, but you FORGOT TO DAB THEM WITH YOUR PEN! Stamp them first!'
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
    speakBingoAnnouncement(
      forgotDab
        ? 'False call! You forgot to dab your numbers with your neon pen!'
        : 'Boooo! False bingo call! Check your card!',
      true
    );
  };

  // Handle card mode / count switching
  const handleSwitchFormat = (nextMode, nextCount) => {
    sfx.playToggle?.();
    setBallMode(nextMode);
    setCardCount(nextCount);
    setActiveMobileCardIdx(0);
    setRoundActive(false);
    roundActiveRef.current = false;
    setIsAutoCalling(false);
    setCalledNumbers([]);
    setDabbedNumbers([]);
    setClaimedPrizes({ ...EMPTY_CLAIMS });
    claimedPrizesRef.current = { ...EMPTY_CLAIMS };
    setGameOverState(null);
    setBallQueue(buildShuffledCage(nextMode === '75' ? 75 : 90));
    setTickets(makeTickets(nextMode, nextCount));
    setRivals(makeRivalsWithTickets(nextMode));
    setCrowdBanner(null);
    setRivalEventFeed(
      `🎟️ Armed with ${nextCount} Card${nextCount > 1 ? 's' : ''} (${nextMode}-Ball) vs 4 Rivals! Hit EYES DOWN!`
    );
    setCallerBanner(
      `Ready with ${nextCount} Retro ${nextMode}-Ball Card${nextCount > 1 ? 's' : ''}! Hit EYES DOWN to start!`
    );
  };

  const handleBuyExtraCard = () => {
    if (roundActive) {
      setCrowdBanner({
        type: 'info',
        title: 'Wait until this round ends to add more cards!',
        body: 'Once someone hits Full House (or if you press Fresh Cards), you can buy 1–4 scorecards!',
        emojis: '🎟️'
      });
      return;
    }
    const nextCount = cardCount < 4 ? cardCount + 1 : 1;
    handleSwitchFormat(ballMode, nextCount);
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

  const hasAnyReadyWin = cardEvaluations.some(
    (ev) =>
      (!claimedPrizes.fourCorners && ev.fourCorners) ||
      (!claimedPrizes.oneLine && ev.oneLine) ||
      (!claimedPrizes.twoLines && ev.twoLines) ||
      (!claimedPrizes.fullHouse && ev.fullHouse)
  );

  return (
    <GameShell
      title="NEON BINGO ’86"
      eyebrow="1986 LIVE MULTIPLAYER HALL • 1–4 CARDS VS 4 RIVALS"
      titleBadge={<span className="tm-bingo-live-pill">🟢 5 IN HALL</span>}
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
        'Start with 1 Scorecard (ideal on iPhone!) or tap ➕ Buy Card to play 2, 3, or 4 cards at once (great on PC or with iPhone card tabs!).',
        'Choose your 1980s Caller Voice: 👩‍🎤 80s Female Synth (Valkyrie ’86), 🚗 K.I.T.T., or 🔴 HAL 9000.',
        'Watch the LIVE HALL scoreboard at the top! Four rivals have real tickets — if they beat you to 4 Corners, 1 Line, or 2 Lines, that prize is locked!',
        'First player (you OR a rival!) to hit FULL HOUSE ends the game! Beat the hall to Full House and hit SHOUT BINGO for massive fanfares!'
      ]}
    >
      <div
        className="tm-bingo-arena"
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

        {/* TOP CONTROLS: FORMAT, 1 DEFAULT + BUY CARDS, VOICE PICKER, UV INK */}
        <section className="tm-bingo-toolbar" aria-label="Bingo Hall Controls">
          <div className="tm-bingo-tool-row">
            <div className="tm-bingo-tool-cluster">
              {[
                { id: '90', label: '🇬🇧 90' },
                { id: '75', label: '🇺🇸 75' }
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

              <span className="tm-bingo-sep" aria-hidden="true" />

              {[1, 2, 3, 4].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  className={`tm-bingo-chip tm-card-count-chip ${cardCount === cnt ? 'active' : ''}`}
                  disabled={roundActive}
                  onClick={() => handleSwitchFormat(ballMode, cnt)}
                  title={`Play ${cnt} Bingo Card${cnt > 1 ? 's' : ''}${cnt === 1 ? ' (Default)' : ''}`}
                >
                  🎟️{cnt}
                  {cnt === 1 && !practiceMode ? '' : practiceMode ? '' : `·M$${cnt * cardBuyin}`}
                </button>
              ))}

              {cardCount < 4 && (
                <button
                  type="button"
                  className="tm-bingo-chip tm-buy-card-btn"
                  disabled={roundActive}
                  onClick={handleBuyExtraCard}
                  title={
                    roundActive
                      ? 'Finish current game before buying extra cards'
                      : `Add Scorecard #${cardCount + 1} (${practiceMode ? 'FREE Practice' : `+M$${cardBuyin}`})`
                  }
                >
                  ➕ Buy Card {practiceMode ? '' : `(+M$${cardBuyin})`}
                </button>
              )}
            </div>

            <div className="tm-bingo-tool-cluster">
              <div className="tm-bingo-voice-picker" role="group" aria-label="Caller Voice Persona">
                {VOICE_PERSONAS.map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    className={`tm-bingo-chip ${callerPersona === vp.id ? 'active' : ''}`}
                    onClick={() => {
                      sfx.playToggle?.();
                      setCallerPersona(vp.id);
                      localStorage.setItem('tm_bingo_voice_persona_v1', vp.id);
                      if (voiceCaller && soundOn) {
                        const sample =
                          vp.id === 'valkyrie'
                            ? 'Eyes down players! Your eighty-six neon hall caller is ready!'
                            : vp.id === 'hal'
                              ? 'Good evening players. HAL 9000 bingo protocols initialized.'
                              : 'All Knight Industries systems ready for Neon Bingo!';
                        speakBingoAnnouncement(sample, true, vp.id);
                      }
                    }}
                    title={vp.title}
                  >
                    {vp.label}
                  </button>
                ))}
              </div>

              <div className="tm-bingo-dabber-rack" role="radiogroup" aria-label="Dabber Ink Color">
                {DABBER_COLORS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={dabberId === d.id}
                    aria-label={`${d.name} UV Dabber Ink`}
                    className={`tm-bingo-dabber-dot ${dabberId === d.id ? 'active' : ''}`}
                    style={{ '--pen-hex': d.hex }}
                    onClick={() => {
                      sfx.playBingoDab?.(DABBER_COLORS.indexOf(d));
                      setDabberId(d.id);
                    }}
                    title={`${d.name} UV Dabber Pen`}
                  >
                    <span className="tm-dabber-cap" style={{ background: d.hex }} />
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`tm-bingo-chip ${autoDab ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  const nextAuto = !autoDab;
                  setAutoDab(nextAuto);
                  if (nextAuto && calledNumbers.length) {
                    const allCardNums = new Set(tickets.flatMap((t) => t.numbers));
                    setDabbedNumbers((prev) => {
                      const merged = new Set(prev);
                      calledNumbers.forEach((n) => {
                        if (allCardNums.has(n)) merged.add(n);
                      });
                      return [...merged];
                    });
                  }
                }}
                title="Toggle Auto-Dabber vs Manual Pen +15¢ Bonus"
              >
                {autoDab ? '🤖 Auto' : '🖊️ +15¢'}
              </button>

              <button
                type="button"
                className={`tm-bingo-chip ${ceefaxMode ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setCeefaxMode((v) => !v);
                }}
                title="Switch to 1986 BBC Ceefax Page 888 Teletext Display"
              >
                📺 {ceefaxMode ? '888 ON' : '888'}
              </button>

              <button
                type="button"
                className={`tm-bingo-chip ${dictionaryOpen ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setDictionaryOpen((v) => !v);
                }}
                title="Browse all 90 classic 1986 Bingo callouts"
              >
                📖 Calls
              </button>
            </div>
          </div>
        </section>

        {/* HIGH-VISIBILITY LIVE MULTIPLAYER HALL BOARD (PROMINENT AT TOP FOR IPHONE & PC!) */}
        <section className="tm-bingo-live-hall-board" aria-label="Live Hall Competitors">
          <div className="tm-hall-board-head">
            <span className="tm-hall-live-indicator">
              <span className="tm-hall-pulse-dot" aria-hidden="true" />
              <strong>LIVE HALL: YOU vs 4 PLAYERS</strong>
            </span>
            <span className="tm-hall-feed-ticker">{rivalEventFeed}</span>
          </div>

          <div className="tm-hall-rivals-grid">
            {rivals.map((r) => {
              const pct = r.totalCount > 0 ? Math.min(100, Math.round((r.dabbedCount / r.totalCount) * 100)) : 0;
              const isOneToGo = r.toGo <= 1;
              const wonAnyRow =
                claimedPrizes.oneLine?.name === r.name ||
                claimedPrizes.twoLines?.name === r.name ||
                claimedPrizes.fourCorners?.name === r.name ||
                claimedPrizes.fullHouse?.name === r.name;

              return (
                <div
                  key={r.id}
                  className={`tm-hall-rival-card ${r.justDabbed ? 'just-hit' : ''} ${
                    isOneToGo ? 'is-sweating' : ''
                  } ${wonAnyRow ? 'has-won' : ''}`}
                  title={`${r.name}: ${r.bio}`}
                >
                  <div className="tm-hall-rival-top">
                    <span className="tm-hall-rival-avatar">{r.avatar}</span>
                    <span className="tm-hall-rival-name">{r.name.split(' ')[0]}</span>
                    <span className={`tm-hall-rival-badge ${isOneToGo ? 'hot' : ''}`}>
                      {r.fullHouse
                        ? '🏆 HOUSE!'
                        : isOneToGo
                          ? '🔥 1 TO GO!'
                          : `${r.dabbedCount}/${r.totalCount}`}
                    </span>
                  </div>
                  <div className="tm-hall-rival-bar-track" aria-hidden="true">
                    <div className="tm-hall-rival-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="tm-hall-rival-sub">{r.statusText}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* OPTIONAL 1986 CALL SHEET / ALL 90 FUNNY CALLS DRAWER */}
        {dictionaryOpen && (
          <section className="tm-bingo-dict-drawer" aria-label="All 90 Classic Bingo Callouts">
            <div className="tm-bingo-dict-head">
              <div>
                <strong>📖 1986 BINGO CALLER&apos;S BIBLE (1–90)</strong>
                <span>Tap any ball below to preview live callouts + comedy SFX!</span>
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

        {/* GAME OVER SUMMARY PANEL (PLAYER FULL HOUSE CHAMPION OR RIVAL FULL HOUSE) */}
        {gameOverState && (
          <section
            className={`tm-bingo-gameover-banner ${
              gameOverState.winnerType === 'player' ? 'is-player-win' : 'is-rival-win'
            }`}
            role="status"
          >
            <div className="tm-gameover-main">
              <div className="tm-gameover-icon">
                {gameOverState.winnerType === 'player' ? '👑🎺🏆' : '🛑' + gameOverState.winnerAvatar}
              </div>
              <div className="tm-gameover-copy">
                <div className="tm-gameover-eyebrow">
                  {gameOverState.winnerType === 'player'
                    ? 'FULL HOUSE CONFIRMED • GAME OVER • HALL CHAMPION!'
                    : 'GAME OVER • FULL HOUSE CLAIMED'}
                </div>
                <h3>
                  {gameOverState.winnerType === 'player'
                    ? `BINGO!! YOU WON FULL HOUSE! (+${
                        roundStaked > 0 ? `M$${gameOverState.playerWonTotal}` : 'HALL GLORY'
                      })`
                    : `${gameOverState.winnerName} got Full House in ${gameOverState.ballsCalled} balls!`}
                </h3>
                <div className="tm-gameover-claims-row">
                  {Object.entries(PRIZE_META).map(([k, meta]) => {
                    const cl = gameOverState.finalClaims?.[k];
                    return (
                      <span
                        key={k}
                        className={`tm-gameover-claim-chip ${cl?.by === 'player' ? 'you' : cl?.by === 'rival' ? 'rival' : ''}`}
                      >
                        {meta.emoji} {meta.label}:{' '}
                        <strong>{cl ? `${cl.avatar} ${cl.name.split(' ')[0]}` : 'Unclaimed'}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="tm-gameover-actions">
              <button
                type="button"
                className="tm-bingo-primary-btn"
                onClick={() => handleStartNewRound(ballMode, cardCount, practiceMode)}
              >
                🎟️ PLAY AGAIN ({cardCount} Card{cardCount > 1 ? 's' : ''})
              </button>
              {cardCount < 4 && (
                <button
                  type="button"
                  className="tm-bingo-chip active"
                  onClick={() => handleStartNewRound(ballMode, cardCount + 1, practiceMode)}
                >
                  ➕ Buy Card #{cardCount + 1} &amp; Play
                </button>
              )}
            </div>
          </section>
        )}

        {/* MAIN STAGE: LEFT BLOWER CAGE + CALLOUT + PRIZES | RIGHT TICKETS + SHOUT BINGO */}
        <div className="tm-bingo-stage">
          {/* LEFT: BLOWER CAGE, CURRENT CALLOUT, PRIZES & RECENT CALLS */}
          <aside className="tm-bingo-caller-col">
            <div className="tm-bingo-blower-card">
              <div className="tm-bingo-blower-head">
                <span>{ceefaxMode ? 'CEEFAX 888 · BINGO' : '🪩 ’86 AIR-BLOWER'}</span>
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
                  <div className="tm-bingo-orb-and-call">
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
                        {activeCall ? activeCall.chant : 'Tap EYES DOWN to launch Ball #1!'}
                      </div>
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
                    👀 EYES DOWN! {totalBuyinCost > 0 ? `(M$${totalBuyinCost})` : '(FREE)'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="tm-bingo-primary-btn"
                      onClick={() => drawNextBall(true)}
                    >
                      🎱 NEXT BALL
                    </button>
                    <button
                      type="button"
                      className={`tm-bingo-chip ${isAutoCalling ? 'active' : ''}`}
                      onClick={() => {
                        sfx.playToggle?.();
                        setIsAutoCalling((v) => !v);
                      }}
                    >
                      {isAutoCalling ? '⏸ Pause' : '▶ Auto'}
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
                  title="Toggle Live Spoken Callouts"
                >
                  🎙️{voiceCaller ? ' ON' : ' OFF'}
                </button>
              </div>
            </div>

            {/* Recent Called Balls Board */}
            <div className="tm-bingo-history-box">
              <div className="tm-bingo-subhead">
                <span>📡 RECENT CALLS</span>
                <span className="tm-bingo-last-tag">
                  {calledNumbers.length > 0 ? `#${currentBall}` : 'Ready'}
                </span>
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

            {/* Prize Meter & Who Claimed Each Row / Full House */}
            <div className="tm-bingo-prizes-bar">
              {Object.entries(PRIZE_META).map(([key, meta]) => {
                const claim = claimedPrizes[key];
                const isPlayerClaimed = claim?.by === 'player';
                const isRivalClaimed = claim?.by === 'rival';
                const isReadyNow = !claim && cardEvaluations.some((ev) => Boolean(ev[key]));
                const payAmt = Math.round(cardBuyin * meta.mult);

                return (
                  <div
                    key={key}
                    className={`tm-bingo-prize-pill ${isPlayerClaimed ? 'is-claimed' : ''} ${
                      isRivalClaimed ? 'is-rival-claimed' : ''
                    } ${isReadyNow ? 'is-ready' : ''}`}
                    title={
                      isRivalClaimed
                        ? `${claim.name} already claimed ${meta.fullLabel}!`
                        : isPlayerClaimed
                          ? `You claimed ${meta.fullLabel}!`
                          : `${meta.fullLabel} still open!`
                    }
                  >
                    <span>
                      {meta.emoji} {meta.label}
                    </span>
                    <strong>
                      {isPlayerClaimed
                        ? '👑 YOU!'
                        : isRivalClaimed
                          ? `${claim.avatar} ${claim.name.split(' ')[0]} WON`
                          : isReadyNow
                            ? '🔔 WIN!'
                            : totalBuyinCost > 0
                              ? `M$${payAmt}`
                              : 'OPEN'}
                    </strong>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* RIGHT: RETRO TICKETS (WITH IPHONE TAB SWITCHER FOR MULTI-CARD) + SHOUT BINGO! */}
          <section className="tm-bingo-cards-col" aria-label="Your Retro Bingo Cards">
            {crowdBanner && (
              <div className={`tm-bingo-crowd-banner is-${crowdBanner.type}`} role="alert">
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

            {/* Mobile/iPhone Card Switcher when Player Bought >1 Card */}
            {cardCount > 1 && (
              <div className="tm-mobile-card-tabs" role="tablist" aria-label="Switch Scorecards on Mobile">
                {tickets.map((t, idx) => {
                  const ev = cardEvaluations[idx];
                  const hasReady =
                    (!claimedPrizes.fourCorners && ev?.fourCorners) ||
                    (!claimedPrizes.oneLine && ev?.oneLine) ||
                    (!claimedPrizes.twoLines && ev?.twoLines) ||
                    (!claimedPrizes.fullHouse && ev?.fullHouse);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={!showAllMobileCards && visibleMobileCardIdx === idx}
                      className={`tm-mobile-card-tab ${
                        !showAllMobileCards && visibleMobileCardIdx === idx ? 'active' : ''
                      } ${hasReady ? 'is-hot' : ''}`}
                      onClick={() => {
                        sfx.playToggle?.();
                        setShowAllMobileCards(false);
                        setActiveMobileCardIdx(idx);
                      }}
                    >
                      <span>#{idx + 1}</span>
                      <small>
                        {ev?.dabbedCount || 0}/{ev?.totalCount || 15}
                        {hasReady ? ' 🔔' : ev?.oneToGo?.length ? ' 🔥' : ''}
                      </small>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`tm-mobile-card-tab stack-btn ${showAllMobileCards ? 'active' : ''}`}
                  onClick={() => {
                    sfx.playToggle?.();
                    setShowAllMobileCards((v) => !v);
                  }}
                  title="Show all cards stacked"
                >
                  {showAllMobileCards ? '1 Card View' : `All (${cardCount})`}
                </button>
              </div>
            )}

            <div className={`tm-bingo-tickets-grid count-${cardCount}`}>
              {tickets.map((ticket, tIdx) => {
                const evalInfo = cardEvaluations[tIdx];
                const isHiddenOnMobile =
                  cardCount > 1 && !showAllMobileCards && tIdx !== visibleMobileCardIdx;
                return (
                  <article
                    key={ticket.id}
                    className={`tm-bingo-ticket mode-${ticket.mode} ${
                      evalInfo.oneLine || evalInfo.fourCorners ? 'has-bingo-glow' : ''
                    } ${isHiddenOnMobile ? 'tm-mobile-card-hidden' : ''}`}
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
                className={`tm-shout-bingo-btn ${hasAnyReadyWin ? 'is-hot' : ''}`}
                disabled={!roundActive && Boolean(gameOverState)}
                onClick={handleShoutBingo}
              >
                <span className="tm-shout-icon">📢</span>
                <span className="tm-shout-text">
                  <strong>SHOUT &ldquo;BINGO!&rdquo;</strong>
                  <small>
                    {cardEvaluations.some((ev) => !claimedPrizes.fullHouse && ev.fullHouse)
                      ? '🏆 FULL HOUSE READY — HIT FOR FANFARE & VICTORY!'
                      : 'Beat the 4 rivals to 4 Corners · 1 Line · 2 Lines · Full House'}
                  </small>
                </span>
              </button>

              {roundActive && (
                <button
                  type="button"
                  className="tm-bingo-reset-btn"
                  onClick={() => handleSwitchFormat(ballMode, cardCount)}
                >
                  🔄 Reset Game
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </GameShell>
  );
}
