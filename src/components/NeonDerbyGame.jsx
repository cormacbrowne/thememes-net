import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { speakUtteranceChain, getEnglishVoices, pickPreferredVoice } from '../utils/aiSpeech';
import {
  TRACK_CONDITIONS,
  DERBY_HORSES,
  createSeededRng,
  computeDerbyOdds,
  sampleRaceOrder,
  simulateDerby
} from '../utils/neonDerbyEngine';
import GameShell from './GameShell';
import './NeonDerbyGame.css';

const RACE_DURATION_MS = 22000; // 22-second race (within 20–25s spec)
const RACE_INTERVAL_SEC = 120; // Scheduled post every 2 minutes

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__simulateDerby = simulateDerby;
}

function getDerbyCupActive() {
  return new Date().getHours() === 20; // Daily 8pm–9pm local time = 3x Derby Cup payouts!
}

function formatCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function NeonDerbyGame({
  tokens = 0,
  soundOn = true,
  onToggleSound,
  onSpendTokens,
  onPayoutTokens,
  onBackToFeed,
  litePerfMode = false,
  prefersReducedMotion = false
}) {
  const chipSizes = ARCADE_ECONOMY_RULES.ARCADE_STAKES.ROULETTE_CHIPS || [1, 5, 10, 25];

  // P2 rule: Free Practice ON by default when player has < 10 tokens
  const [practiceMode, setPracticeMode] = useState(() => tokens < 10);
  const [raceCardIdx, setRaceCardIdx] = useState(1);
  const [conditionIdx, setConditionIdx] = useState(() => Math.floor(Math.random() * TRACK_CONDITIONS.length));
  const [isDerbyCup, setIsDerbyCup] = useState(() => getDerbyCupActive());
  const [countdownSec, setCountdownSec] = useState(RACE_INTERVAL_SEC);

  const [betType, setBetType] = useState('win'); // 'win' | 'place' | 'show' | 'exacta'
  const [primaryPick, setPrimaryPick] = useState(0);
  const [exactaSecondPick, setExactaSecondPick] = useState(1);
  const [selectedChip, setSelectedChip] = useState(() => chipSizes[1] || 5);
  const [ticketBets, setTicketBets] = useState([]); // [{ id, betType, firstIdx, secondIdx, stake, decOdds, label }]

  const [phase, setPhase] = useState('betting'); // 'betting' | 'racing' | 'photo' | 'finished'
  const [commentaryText, setCommentaryText] = useState('Pick a horse & place bets, or roll Lucky Dip.');
  const [voiceCommentary, setVoiceCommentary] = useState(false);
  const [leaderNames, setLeaderNames] = useState(['Doge', 'Stonks', 'Nyan']);
  const [raceResult, setRaceResult] = useState(null); // { order, totalPayout, totalStaked, net, derbyCup }

  const canvasRef = useRef(null);
  const animStateRef = useRef({
    running: false,
    startTime: 0,
    order: [0, 1, 2, 3, 4, 5, 6, 7],
    progress: new Array(8).fill(0),
    speeds: new Array(8).fill(0),
    curves: [],
    sparks: [],
    lastCallMark: -1,
    photoFlash: 0,
    cheers: 0
  });

  const activeCondition = TRACK_CONDITIONS[conditionIdx % TRACK_CONDITIONS.length];
  const board = useMemo(
    () => computeDerbyOdds(activeCondition, raceCardIdx),
    [activeCondition, raceCardIdx]
  );

  const totalStakedOnTicket = useMemo(
    () => ticketBets.reduce((s, b) => s + b.stake, 0),
    [ticketBets]
  );

  const speakCommentaryLine = useCallback(
    (line) => {
      if (!voiceCommentary || !soundOn || typeof window === 'undefined') return;
      const voices = getEnglishVoices();
      const voice = pickPreferredVoice(voices, 'kitt');
      speakUtteranceChain(line, {
        voice,
        rate: 1.06,
        pitch: 1.02,
        volume: 0.9,
        soundOn: true,
        maxSentences: 1
      });
    },
    [soundOn, voiceCommentary]
  );

  // Race schedule countdown (2-minute intervals)
  useEffect(() => {
    if (phase !== 'betting') return undefined;
    const id = setInterval(() => {
      setIsDerbyCup(getDerbyCupActive());
      setCountdownSec((prev) => (prev <= 1 ? RACE_INTERVAL_SEC : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Helper to build a pre-seeded smooth position curve for each horse ending strictly in `order`
  const prepareRaceAnimation = (order) => {
    const rng = createSeededRng(Date.now() ^ (raceCardIdx * 7919));
    // Assign finish times strictly ordered: winner finishes at t = 1.0, others progressively slightly behind
    const finishGapBase = [1.0, 0.986 - rng() * 0.01, 0.968 - rng() * 0.012, 0.945, 0.92, 0.895, 0.87, 0.845];
    const finishTargets = new Array(8).fill(0.9);
    order.forEach((horseIdx, rank) => {
      finishTargets[horseIdx] = finishGapBase[rank];
    });

    const curves = DERBY_HORSES.map((_, horseIdx) => ({
      targetEnd: finishTargets[horseIdx],
      midBoost: (rng() - 0.45) * 0.08,
      lateKick: (rng() - 0.35) * 0.07,
      wobbleFreq: 3.5 + rng() * 2.5,
      wobblePhase: rng() * Math.PI * 2
    }));

    animStateRef.current = {
      running: true,
      startTime: performance.now(),
      order,
      progress: new Array(8).fill(0),
      speeds: new Array(8).fill(0),
      curves,
      sparks: [],
      lastCallMark: -1,
      photoFlash: 0,
      cheers: 0
    };
  };

  const startRace = (explicitTickets = ticketBets) => {
    if (phase === 'racing' || phase === 'photo') return;

    const currentTickets = explicitTickets.length > 0
      ? explicitTickets
      : [
          {
            id: `auto-${Date.now()}`,
            betType,
            firstIdx: primaryPick,
            secondIdx: exactaSecondPick,
            stake: selectedChip,
            decOdds:
              betType === 'win'
                ? board.horses[primaryPick].winDec
                : betType === 'place'
                  ? board.horses[primaryPick].placeDec
                  : betType === 'show'
                    ? board.horses[primaryPick].showDec
                    : board.getExactaDec(primaryPick, exactaSecondPick),
            label: `${board.horses[primaryPick].short} ${betType.toUpperCase()}`
          }
        ];

    const stakeSum = currentTickets.reduce((s, b) => s + b.stake, 0);

    if (!practiceMode) {
      if (stakeSum <= 0 || tokens < stakeSum) {
        sfx.playClownHonk();
        setCommentaryText('Not enough 🪙 — switch to Free Practice or lower bet.');
        return;
      }
      if (onSpendTokens) {
        const paid = onSpendTokens(stakeSum, 'Neon Derby Bet');
        if (!paid) return;
      }
    }

    if (explicitTickets.length === 0) {
      setTicketBets(currentTickets);
    }

    const cupMultiplier = isDerbyCup ? 3 : 1;
    const raceSeed = Date.now() ^ (raceCardIdx * 4099) ^ (stakeSum * 31);
    const finalOrder = sampleRaceOrder(board.weights, raceSeed);

    setRaceResult(null);
    setPhase('racing');
    setCommentaryText("🔔 And they're off under the neon lights!");
    sfx.playRouletteSpin?.();
    if (voiceCommentary) {
      speakCommentaryLine("And they're off at Neon Derby 86!");
    }

    prepareRaceAnimation(finalOrder);

    const resolveAtEnd = () => {
      const [first, second, third] = finalOrder;
      let rawWin = 0;
      currentTickets.forEach((b) => {
        const hit =
          (b.betType === 'win' && b.firstIdx === first) ||
          (b.betType === 'place' && (b.firstIdx === first || b.firstIdx === second)) ||
          (b.betType === 'show' && (b.firstIdx === first || b.firstIdx === second || b.firstIdx === third)) ||
          (b.betType === 'exacta' && b.firstIdx === first && b.secondIdx === second);
        if (hit) {
          rawWin += Math.round(b.stake * b.decOdds * cupMultiplier);
        }
      });

      const verifiedWin = practiceMode
        ? 0
        : validateStakedGamePayout({ stakedTokens: stakeSum, rawPayout: rawWin, maxMultiplier: 160 });

      if (!practiceMode && verifiedWin > 0 && onPayoutTokens) {
        onPayoutTokens(verifiedWin, {
          stakedTokens: stakeSum,
          xp: 25,
          label: `🏇 ${board.horses[first].short} Wins!`,
          emoji: '🏆'
        });
      }

      if (verifiedWin > 0 || (practiceMode && rawWin > 0)) {
        sfx.playJackpot();
      } else {
        sfx.playPop();
      }

      const winner = board.horses[first];
      const msg = practiceMode
        ? rawWin > 0
          ? `📸 ${winner.name} wins! Practice win +${rawWin}.`
          : `📸 ${winner.name} wins ahead of ${board.horses[second].short}!`
        : verifiedWin > 0
          ? `🏆 ${winner.name} wins! You cashed +${verifiedWin} 🪙!`
          : `📸 ${winner.name} takes 1st! Place bets for the next race.`;

      setCommentaryText(msg);
      if (voiceCommentary) {
        speakCommentaryLine(`${winner.name} wins Neon Derby!`);
      }
      setRaceResult({
        order: finalOrder,
        totalPayout: practiceMode ? rawWin : verifiedWin,
        totalStaked: stakeSum,
        net: (practiceMode ? rawWin : verifiedWin) - stakeSum,
        derbyCup: cupMultiplier > 1
      });
      setPhase('finished');
    };

    // Canvas loop drives race timing & photo finish cleanly
    animStateRef.current.onFinish = resolveAtEnd;
  };

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return undefined;

    let rafId = 0;

    const renderFrame = (now) => {
      const st = animStateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      // Update race physics when active
      if (st.running) {
        const rawElapsed = now - st.startTime;
        const duration = prefersReducedMotion ? 7000 : RACE_DURATION_MS;
        const elapsedRatio = Math.min(1, rawElapsed / duration);
        // Final-furlong slight slow-mo photo finish (88% -> 100%)
        const shapedT =
          elapsedRatio < 0.88 || prefersReducedMotion
            ? elapsedRatio
            : 0.88 + ((elapsedRatio - 0.88) / 0.12) * 0.12;
        if (elapsedRatio >= 0.88 && phase === 'racing' && st.lastCallMark < 4) {
          st.lastCallMark = 4;
          setPhase('photo');
          setCommentaryText('📸 Slow-mo photo finish down the wire!');
          st.photoFlash = 1;
        } else if (elapsedRatio >= 0.65 && st.lastCallMark < 3) {
          st.lastCallMark = 3;
          const leadName = DERBY_HORSES[st.order[0]].name;
          const chaserName = DERBY_HORSES[st.order[1]].short;
          const line = `🔥 ${leadName} surges clear, ${chaserName} chasing hard!`;
          setCommentaryText(line);
          if (voiceCommentary) speakCommentaryLine(`${leadName} surges clear into the final turn!`);
        } else if (elapsedRatio >= 0.35 && st.lastCallMark < 2) {
          st.lastCallMark = 2;
          const midHorse = DERBY_HORSES[st.order[1]].name;
          const line = `⚡ ${midHorse} makes a bold move on the outside!`;
          setCommentaryText(line);
        }

        const rankedNow = [];
        for (let i = 0; i < 8; i += 1) {
          const c = st.curves[i] || { targetEnd: 0.9, midBoost: 0, lateKick: 0, wobbleFreq: 4, wobblePhase: 0 };
          const base = shapedT * c.targetEnd;
          const midBell = Math.sin(shapedT * Math.PI) * c.midBoost;
          const lateBell = Math.sin(Math.pow(shapedT, 2) * Math.PI) * c.lateKick;
          const p = Math.min(c.targetEnd, Math.max(0, base + midBell + lateBell));
          st.progress[i] = shapedT >= 0.995 ? c.targetEnd : p;
          rankedNow.push({ i, p: st.progress[i] });
        }
        rankedNow.sort((a, b) => b.p - a.p);
        if (Math.floor(rawElapsed / 350) !== st.lastTickerTick) {
          st.lastTickerTick = Math.floor(rawElapsed / 350);
          setLeaderNames([
            DERBY_HORSES[rankedNow[0].i].short,
            DERBY_HORSES[rankedNow[1].i].short,
            DERBY_HORSES[rankedNow[2].i].short
          ]);
        }

        if (elapsedRatio >= 1) {
          st.running = false;
          st.photoFlash = 1;
          const done = st.onFinish;
          st.onFinish = null;
          if (done) done();
        }
      }

      // Draw synthwave sky & parallax grandstand backdrop
      const skyGrad = ctx2d.createLinearGradient(0, 0, 0, h * 0.28);
      skyGrad.addColorStop(0, '#090218');
      skyGrad.addColorStop(1, '#2d1154');
      ctx2d.fillStyle = skyGrad;
      ctx2d.fillRect(0, 0, w, h * 0.28);

      // Synthwave sun + parallax grandstand silhouettes
      const camScroll = st.running ? (st.progress[st.order[0]] || 0) * 140 : 0;
      ctx2d.fillStyle = 'rgba(236, 72, 153, 0.35)';
      ctx2d.beginPath();
      ctx2d.arc(w * 0.78 - camScroll * 0.15, h * 0.16, 26, 0, Math.PI * 2);
      ctx2d.fill();

      ctx2d.fillStyle = '#1e1b4b';
      for (let gx = -1; gx < 6; gx += 1) {
        const bx = ((gx * 170 - camScroll * 0.4) % (w + 170) + (w + 170)) % (w + 170) - 85;
        ctx2d.fillRect(bx, h * 0.11, 130, h * 0.17);
        ctx2d.fillStyle = '#ec4899';
        ctx2d.fillRect(bx, h * 0.11, 130, 3);
        ctx2d.fillStyle = '#1e1b4b';
      }

      // Track turf / synth surface
      const trackTop = h * 0.27;
      const trackH = h - trackTop;
      ctx2d.fillStyle =
        activeCondition.id === 'rain' ? '#071722' : activeCondition.id === 'glitch' ? '#130b24' : '#0b1020';
      ctx2d.fillRect(0, trackTop, w, trackH);

      // Finish wire at x = finishX
      const startX = 36;
      const finishX = w - 42;
      ctx2d.strokeStyle = '#ffffff';
      ctx2d.lineWidth = 2;
      for (let cy = trackTop; cy < h; cy += 10) {
        ctx2d.fillStyle = Math.floor(cy / 10) % 2 === 0 ? '#ffffff' : '#ec4899';
        ctx2d.fillRect(finishX, cy, 6, 10);
      }

      // 8 Lanes + galloping sprites
      const laneH = trackH / 8;
      for (let i = 0; i < 8; i += 1) {
        const yTop = trackTop + i * laneH;
        const yMid = yTop + laneH * 0.56;
        ctx2d.strokeStyle = 'rgba(0, 243, 255, 0.14)';
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        ctx2d.moveTo(0, yTop);
        ctx2d.lineTo(w, yTop);
        ctx2d.stroke();

        const horse = DERBY_HORSES[i];
        const prog = st.progress[i] || 0;
        const x = startX + prog * (finishX - startX);
        const bob =
          st.running && !prefersReducedMotion
            ? Math.sin(now * 0.02 + i * 1.1) * 2.6
            : 0;

        // Neon dust trail
        if (st.running && !litePerfMode && prog > 0.02) {
          const trailGrad = ctx2d.createLinearGradient(x - 36, yMid, x, yMid);
          trailGrad.addColorStop(0, 'rgba(0,0,0,0)');
          trailGrad.addColorStop(1, horse.silk);
          ctx2d.fillStyle = trailGrad;
          ctx2d.fillRect(Math.max(8, x - 36), yMid - 2, 34, 4);
        }

        // Jockey silk badge + galloping emoji
        ctx2d.fillStyle = horse.silk;
        ctx2d.beginPath();
        ctx2d.arc(x - 8, yMid + bob, 9, 0, Math.PI * 2);
        ctx2d.fill();

        ctx2d.fillStyle = '#090d16';
        ctx2d.font = 'bold 10px system-ui, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(String(horse.lane), x - 8, yMid + bob + 0.5);

        ctx2d.font = '18px system-ui, sans-serif';
        ctx2d.fillText(horse.emoji, x + 8, yMid + bob);
      }

      // Cheer / win confetti sparks
      if (st.sparks.length > 0 && !litePerfMode) {
        for (let sIdx = st.sparks.length - 1; sIdx >= 0; sIdx -= 1) {
          const sp = st.sparks[sIdx];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.life -= 0.035;
          if (sp.life <= 0) {
            st.sparks.splice(sIdx, 1);
            continue;
          }
          ctx2d.globalAlpha = sp.life;
          ctx2d.fillStyle = sp.color;
          ctx2d.fillRect(sp.x, sp.y, 4, 4);
          ctx2d.globalAlpha = 1;
        }
      }

      // Photo finish strobe
      if (st.photoFlash > 0.02) {
        ctx2d.fillStyle = `rgba(255, 255, 255, ${st.photoFlash * 0.45})`;
        ctx2d.fillRect(0, 0, w, h);
        st.photoFlash *= 0.85;
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [activeCondition, litePerfMode, phase, prefersReducedMotion, speakCommentaryLine, voiceCommentary]);

  const handleAddBet = () => {
    if (phase === 'racing' || phase === 'photo') return;
    if (betType === 'exacta' && primaryPick === exactaSecondPick) {
      sfx.playClownHonk();
      setCommentaryText('Pick 2 different horses for an Exacta bet.');
      return;
    }
    const h1 = board.horses[primaryPick];
    const h2 = board.horses[exactaSecondPick];
    const decOdds =
      betType === 'win'
        ? h1.winDec
        : betType === 'place'
          ? h1.placeDec
          : betType === 'show'
            ? h1.showDec
            : board.getExactaDec(primaryPick, exactaSecondPick);

    const newTotal = totalStakedOnTicket + selectedChip;
    if (!practiceMode && newTotal > tokens) {
      sfx.playClownHonk();
      setCommentaryText('Need more 🪙 or switch to Free Practice.');
      return;
    }

    sfx.playClick();
    const label =
      betType === 'exacta'
        ? `Exacta #${h1.lane} ${h1.short} → #${h2.lane} ${h2.short}`
        : `${betType.toUpperCase()} #${h1.lane} ${h1.short}`;

    setTicketBets((prev) => [
      ...prev.slice(-7),
      {
        id: `${Date.now()}-${Math.random()}`,
        betType,
        firstIdx: primaryPick,
        secondIdx: exactaSecondPick,
        stake: selectedChip,
        decOdds,
        label
      }
    ]);
    setCommentaryText(`Added ${selectedChip} 🪙 on ${label} (${decOdds}×).`);
  };

  const handleLuckyDip = () => {
    if (phase === 'racing' || phase === 'photo') return;
    const h1 = Math.floor(Math.random() * 8);
    let h2 = Math.floor(Math.random() * 8);
    if (h2 === h1) h2 = (h1 + 1) % 8;
    setPrimaryPick(h1);
    setExactaSecondPick(h2);
    sfx.playHover?.();
    const horse = board.horses[h1];
    const decOdds =
      betType === 'win'
        ? horse.winDec
        : betType === 'place'
          ? horse.placeDec
          : betType === 'show'
            ? horse.showDec
            : board.getExactaDec(h1, h2);
    const label =
      betType === 'exacta'
        ? `Lucky Exacta #${horse.lane}→#${board.horses[h2].lane}`
        : `Lucky ${betType.toUpperCase()} #${horse.lane} ${horse.short}`;
    const stake = Math.min(selectedChip, practiceMode ? selectedChip : Math.max(1, tokens));
    const ticket = [
      {
        id: `dip-${Date.now()}`,
        betType,
        firstIdx: h1,
        secondIdx: h2,
        stake,
        decOdds,
        label
      }
    ];
    setTicketBets(ticket);
    setCommentaryText(`🎲 Lucky Dip locked ${horse.name}!`);
  };

  const handleCheer = () => {
    sfx.playMemeUpvote?.();
    const st = animStateRef.current;
    st.cheers += 1;
    const colors = ['#facc15', '#ec4899', '#00f3ff', '#22c55e'];
    for (let k = 0; k < 18; k += 1) {
      st.sparks.push({
        x: 40 + Math.random() * 580,
        y: 60 + Math.random() * 190,
        vx: (Math.random() - 0.5) * 3.2,
        vy: -1.5 - Math.random() * 2.2,
        life: 1,
        color: colors[k % colors.length]
      });
    }
  };

  const handleNextRaceCard = () => {
    setRaceCardIdx((c) => c + 1);
    setConditionIdx((prev) => (prev + 1 + Math.floor(Math.random() * 2)) % TRACK_CONDITIONS.length);
    setPhase('betting');
    setRaceResult(null);
    setTicketBets([]);
    setCountdownSec(RACE_INTERVAL_SEC);
    animStateRef.current.progress = new Array(8).fill(0);
    setCommentaryText('New race card open — check track & form guide!');
  };

  const selectedHorse = board.horses[primaryPick];
  const currentOdds =
    betType === 'win'
      ? selectedHorse.winDec
      : betType === 'place'
        ? selectedHorse.placeDec
        : betType === 'show'
          ? selectedHorse.showDec
          : board.getExactaDec(primaryPick, exactaSecondPick);

  return (
    <GameShell
      title="🏇 NEON DERBY '86"
      titleBadge={isDerbyCup ? <span className="tm-derby-cup-badge">🏆 DERBY CUP 3×</span> : null}
      ariaLabel="Neon Derby 86 Meme Horse Racing"
      onBack={onBackToFeed}
      tokens={tokens}
      hasPractice
      practiceMode={practiceMode}
      onTogglePractice={() => setPracticeMode((p) => !p)}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      extraBadges={
        <button
          type="button"
          className={`tm-derby-pill ${voiceCommentary ? 'is-active' : ''}`}
          onClick={() => setVoiceCommentary((v) => !v)}
          aria-pressed={voiceCommentary}
          aria-label="Toggle spoken race commentary"
          title="Spoken commentary"
        >
          {voiceCommentary ? '🗣️ Voice ON' : '🗣️ Voice'}
        </button>
      }
      howToPlay={[
        'Pick Win (1st), Place (top 2), Show (top 3), or Exacta (1st->2nd) + chip size.',
        `Check the track (${activeCondition.icon} ${activeCondition.name}) & form guide before betting.`,
        'Tap Start Race anytime; daily 8 PM Derby Cup pays 3× rewards.'
      ]}
    >
      <div className="tm-derby-stage">

      {/* Meta Strip */}
      <div className="tm-derby-meta-strip">
        <span className="tm-derby-cond-chip">
          {activeCondition.icon} {activeCondition.name} · {activeCondition.note}
        </span>
        <span className="tm-derby-countdown">
          Race #{raceCardIdx} · Next post {formatCountdown(countdownSec)}
        </span>
      </div>

      {/* Main Split: Track Canvas + Betting Program */}
      <div className="tm-derby-grid">
        <div className="tm-derby-track-card">
          <div className="tm-derby-ticker" aria-live="polite">
            <span>
              🏁 {phase === 'betting' ? 'Post Open' : `1st ${leaderNames[0]} • 2nd ${leaderNames[1]} • 3rd ${leaderNames[2]}`}
            </span>
            <span className="tm-derby-comment">{commentaryText}</span>
          </div>

          <canvas
            ref={canvasRef}
            width={680}
            height={280}
            className="tm-derby-canvas"
          />

          <div className="tm-derby-track-actions">
            {phase === 'racing' || phase === 'photo' ? (
              <button type="button" className="tm-derby-cheer-btn" onClick={handleCheer}>
                📣 CHEER! (Crowd Boost)
              </button>
            ) : phase === 'finished' && raceResult ? (
              <div className="tm-derby-podium">
                <span>
                  🥇 {board.horses[raceResult.order[0]].emoji} {board.horses[raceResult.order[0]].short} ·{' '}
                  🥈 {board.horses[raceResult.order[1]].short} ·{' '}
                  🥉 {board.horses[raceResult.order[2]].short}
                </span>
                <button type="button" className="tm-derby-primary-btn" onClick={handleNextRaceCard}>
                  🔄 Next Race Card
                </button>
              </div>
            ) : (
              <div className="tm-derby-ready-row">
                <button type="button" className="tm-derby-lucky-btn" onClick={handleLuckyDip}>
                  🎲 Lucky Dip
                </button>
                <button
                  type="button"
                  className="tm-derby-primary-btn"
                  onClick={() => startRace()}
                >
                  🏁 START RACE ({ticketBets.length > 0 ? `${totalStakedOnTicket} 🪙` : `${selectedChip} 🪙 quick`})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Odds Board & Betting Slip */}
        <div className="tm-derby-board-card">
          <div className="tm-derby-bet-tabs" role="tablist" aria-label="Bet type">
            {[
              { id: 'win', label: 'Win (1st)' },
              { id: 'place', label: 'Place (Top 2)' },
              { id: 'show', label: 'Show (Top 3)' },
              { id: 'exacta', label: 'Exacta (1→2)' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={betType === t.id}
                className={`tm-derby-tab ${betType === t.id ? 'active' : ''}`}
                onClick={() => setBetType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tm-derby-horses">
            {board.horses.map((h) => {
              const isFirst = primaryPick === h.idx;
              const isSecond = betType === 'exacta' && exactaSecondPick === h.idx;
              const shownDec =
                betType === 'place' ? h.placeDec : betType === 'show' ? h.showDec : h.winDec;
              return (
                <button
                  key={h.idx}
                  type="button"
                  disabled={phase === 'racing' || phase === 'photo'}
                  className={`tm-derby-horse-row ${isFirst ? 'is-primary' : ''} ${isSecond ? 'is-second' : ''}`}
                  onClick={() => {
                    if (betType === 'exacta' && !isFirst && isSecond) {
                      setPrimaryPick(h.idx);
                    } else if (betType === 'exacta' && isFirst) {
                      setExactaSecondPick((h.idx + 1) % 8);
                    } else if (betType === 'exacta' && h.idx !== primaryPick) {
                      setExactaSecondPick(h.idx);
                    } else {
                      setPrimaryPick(h.idx);
                    }
                  }}
                >
                  <span
                    className="tm-derby-silk"
                    style={{ background: h.silk, color: '#090d16' }}
                  >
                    #{h.lane}
                  </span>
                  <span className="tm-derby-horse-info">
                    <strong>
                      {h.emoji} {h.name}
                    </strong>
                    <small>Form: {h.form.join('-')}</small>
                  </span>
                  <span className="tm-derby-odds">
                    <strong>{shownDec}×</strong>
                    <small>{h.winFrac}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stake Chips + Slip */}
          <div className="tm-derby-slip">
            <div className="tm-derby-chips">
              {chipSizes.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`tm-derby-chip ${selectedChip === amt ? 'active' : ''}`}
                  onClick={() => setSelectedChip(amt)}
                >
                  {amt} 🪙
                </button>
              ))}
              <button
                type="button"
                className="tm-derby-add-btn"
                disabled={phase === 'racing' || phase === 'photo'}
                onClick={handleAddBet}
              >
                + Bet ({currentOdds}×)
              </button>
            </div>

            {ticketBets.length > 0 && (
              <div className="tm-derby-ticket-list">
                {ticketBets.map((b) => (
                  <span key={b.id} className="tm-derby-ticket-pill">
                    {b.label} · {b.stake} 🪙
                    <button
                      type="button"
                      aria-label={`Remove ${b.label}`}
                      onClick={() => setTicketBets((prev) => prev.filter((x) => x.id !== b.id))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </GameShell>
  );
}
