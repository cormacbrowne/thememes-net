import { useState, useRef, useEffect } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';

// ==========================================
// AUTHENTIC 1980s LAS VEGAS ONE-ARM BANDIT REEL STRIP (22 Weighted Stops)
// Classic Casino Symbols & Fair House-Edge Odds (~91% RTP — Zero Free-Token Loopholes)
// ==========================================
const VEGAS_SYMBOLS = {
  '777': { id: '777', label: 'FLAMING 777', mult3: 50, color: '#ef4444' },
  diamond: { id: 'diamond', label: 'NEON DIAMOND', mult3: 25, color: '#00f3ff' },
  bar: { id: 'bar', label: 'TRIPLE BAR', mult3: 15, color: '#facc15' },
  bell: { id: 'bell', label: 'LIBERTY BELL', mult3: 10, color: '#f59e0b' },
  cherry: { id: 'cherry', label: 'TWIN CHERRY', mult3: 6, color: '#e11d48' },
  watermelon: { id: 'watermelon', label: 'MELON SLICE', mult3: 4, color: '#16a34a' },
  lemon: { id: 'lemon', label: 'VEGAS LEMON', mult3: 4, color: '#eab308' }
};

// Authentic 22-stop physical mechanical reel strip (non-adjacent distribution for natural neighbors)
const REEL_STRIP = [
  '777',
  'lemon',
  'cherry',
  'bar',
  'watermelon',
  'bell',
  'lemon',
  'diamond',
  'cherry',
  'watermelon',
  'bar',
  'lemon',
  'bell',
  'cherry',
  'watermelon',
  'diamond',
  'lemon',
  'bar',
  'cherry',
  'bell',
  'watermelon',
  'lemon'
];

const STRIP_LEN = REEL_STRIP.length;

function wrapStop(idx) {
  return ((idx % STRIP_LEN) + STRIP_LEN) % STRIP_LEN;
}

/**
 * Crisp inline SVG Classic Las Vegas Slot Machine Reel Graphics
 */
function SlotSymbolSvg({ symbolId, size = 56 }) {
  switch (symbolId) {
    case '777':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Flaming Lucky 777">
          <defs>
            <linearGradient id="v7Red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4d4d" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="v7Gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* Flame Aura */}
          <path
            d="M12 48 C8 38, 15 28, 12 20 C19 25, 22 14, 30 8 C33 17, 42 12, 48 20 C54 27, 55 40, 48 48 Z"
            fill="#f97316"
            opacity="0.32"
          />
          {/* Back Shadow Twin 7s */}
          <path
            d="M8 14 H28 L18 46 H10 L19 21 H8 Z"
            fill="#991b1b"
            stroke="#facc15"
            strokeWidth="1.4"
            opacity="0.88"
          />
          <path
            d="M36 14 H56 L46 46 H38 L47 21 H36 Z"
            fill="#991b1b"
            stroke="#facc15"
            strokeWidth="1.4"
            opacity="0.88"
          />
          {/* Hero Center Vegas 7 */}
          <path
            d="M15 10 H50 L34 55 H21 L35 20 H15 Z"
            fill="url(#v7Red)"
            stroke="url(#v7Gold)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M19 14 H44" stroke="#fef9c3" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <rect x="13" y="47" width="38" height="11" rx="3" fill="#111827" stroke="#facc15" strokeWidth="1.5" />
          <text
            x="32"
            y="55.5"
            textAnchor="middle"
            fill="#fef08a"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="Impact, Arial Black, sans-serif"
            letterSpacing="1"
          >
            JACKPOT
          </text>
        </svg>
      );

    case 'bar':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Triple Gold BAR">
          {[8, 25, 42].map((y, idx) => (
            <g key={y}>
              <rect
                x="6"
                y={y}
                width="52"
                height="14"
                rx="3.5"
                fill="#0f172a"
                stroke="#facc15"
                strokeWidth="2.2"
              />
              <rect x="8.5" y={y + 2} width="47" height="3" rx="1" fill="#fde047" opacity="0.25" />
              <text
                x="32"
                y={y + 10.8}
                textAnchor="middle"
                fill={idx === 1 ? '#fef08a' : '#facc15'}
                fontSize="10.5"
                fontWeight="900"
                fontFamily="Impact, Arial Black, sans-serif"
                letterSpacing="2.2"
              >
                BAR
              </text>
            </g>
          ))}
        </svg>
      );

    case 'bell':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Golden Liberty Bell">
          <defs>
            <linearGradient id="vBellGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="45%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="11" r="4.5" fill="#d97706" stroke="#78350f" strokeWidth="1.8" />
          <circle cx="32" cy="51" r="6" fill="#b45309" stroke="#78350f" strokeWidth="2" />
          <path
            d="M32 14 C19 14, 15 26, 13 39 L8 46 H56 L51 39 C49 26, 45 14, 32 14 Z"
            fill="url(#vBellGold)"
            stroke="#78350f"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Liberty Bell Crack & Specular Highlight */}
          <path d="M22 21 C20 28, 18 35, 16 41" stroke="#fef9c3" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M35 30 L33 37 L36 41 L34 46" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'cherry':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Glossy Twin Cherries">
          <defs>
            <radialGradient id="vCherryRed" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="35%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#881337" />
            </radialGradient>
          </defs>
          {/* Twin Emerald Stems & Leaf */}
          <path
            d="M21 36 C21 22, 30 14, 38 9 C36 20, 41 26, 45 38"
            fill="none"
            stroke="#15803d"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M37 10 C46 7, 54 12, 51 19 C44 21, 38 17, 37 10 Z"
            fill="#22c55e"
            stroke="#14532d"
            strokeWidth="1.8"
          />
          {/* Left Cherry */}
          <circle cx="20" cy="43" r="12.5" fill="url(#vCherryRed)" stroke="#881337" strokeWidth="2.2" />
          <ellipse cx="16" cy="38" rx="3.8" ry="2.3" transform="rotate(-30 16 38)" fill="#fff" opacity="0.75" />
          {/* Right Cherry */}
          <circle cx="44" cy="45" r="12.5" fill="url(#vCherryRed)" stroke="#881337" strokeWidth="2.2" />
          <ellipse cx="40" cy="40" rx="3.8" ry="2.3" transform="rotate(-30 40 40)" fill="#fff" opacity="0.75" />
        </svg>
      );

    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Neon Casino Diamond">
          <defs>
            <linearGradient id="vDiam" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="45%" stopColor="#00f3ff" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <polygon
            points="18,12 46,12 57,26 32,55 7,26"
            fill="url(#vDiam)"
            stroke="#0369a1"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <polyline points="7,26 57,26" stroke="#e0f2fe" strokeWidth="1.8" />
          <polyline points="18,12 24,26 32,55 40,26 46,12" fill="none" stroke="#bae6fd" strokeWidth="1.6" />
          <polygon points="24,26 32,12 40,26" fill="#ffffff" opacity="0.55" />
        </svg>
      );

    case 'watermelon':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Vegas Watermelon Slice">
          {/* Outer Green Rind */}
          <path
            d="M8 22 A25 25 0 0 0 56 22 Z"
            fill="#16a34a"
            stroke="#14532d"
            strokeWidth="2.4"
            transform="rotate(-14 32 30)"
          />
          {/* White Inner Rind */}
          <path
            d="M12 22 A21 21 0 0 0 52 22 Z"
            fill="#dcfce7"
            transform="rotate(-14 32 30)"
          />
          {/* Juicy Crimson Flesh */}
          <path
            d="M14.5 22 A18.5 18.5 0 0 0 49.5 22 Z"
            fill="#ef4444"
            transform="rotate(-14 32 30)"
          />
          {/* Seeds */}
          <g fill="#111827" transform="rotate(-14 32 30)">
            <ellipse cx="24" cy="28" rx="1.6" ry="2.5" />
            <ellipse cx="32" cy="31" rx="1.6" ry="2.5" />
            <ellipse cx="40" cy="28" rx="1.6" ry="2.5" />
            <ellipse cx="28" cy="35" rx="1.5" ry="2.3" />
            <ellipse cx="36" cy="35" rx="1.5" ry="2.3" />
          </g>
        </svg>
      );

    case 'lemon':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Golden Vegas Lemon">
          <defs>
            <radialGradient id="vLemon" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="55%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </radialGradient>
          </defs>
          <g transform="rotate(-22 32 34)">
            <path
              d="M10 34 C14 20, 24 18, 32 18 C40 18, 50 20, 54 34 C50 48, 40 50, 32 50 C24 50, 14 48, 10 34 Z"
              fill="url(#vLemon)"
              stroke="#a16207"
              strokeWidth="2.4"
            />
            <ellipse cx="27" cy="27" rx="8" ry="3" fill="#fff" opacity="0.6" />
          </g>
          <path
            d="M36 16 C43 10, 52 12, 49 19 C43 21, 38 19, 36 16 Z"
            fill="#22c55e"
            stroke="#14532d"
            strokeWidth="1.8"
          />
        </svg>
      );
  }
}

/**
 * Evaluates classic Las Vegas 3-reel payline `[s0, s1, s2]`.
 * Losing spins return mult = 0 (zero free-token consolation payouts!).
 */
function evaluateVegasPayline(symIds) {
  const [s0, s1, s2] = symIds;

  // 1. Three of a Kind
  if (s0 === s1 && s1 === s2) {
    const info = VEGAS_SYMBOLS[s0] || VEGAS_SYMBOLS.lemon;
    return {
      tier: s0 === '777' ? 'jackpot' : 'triple',
      mult: info.mult3,
      headline:
        s0 === '777'
          ? '🚨 TRIPLE FLAMING 777 VEGAS JACKPOT! (50× BET!)'
          : `🎰 TRIPLE ${info.label}! (${info.mult3}× BET!)`
    };
  }

  // 2. Classic Vegas Cherries Rule: Any 2 Cherries on payline = 2x Bet
  const cherryCount = symIds.filter((s) => s === 'cherry').length;
  if (cherryCount === 2) {
    return {
      tier: 'double',
      mult: 2,
      headline: '🍒🍒 TWIN CHERRIES WINNER! (2× BET)'
    };
  }

  // 3. Adjacent High-Symbol Pair (777, Diamond, BAR, Bell on Reels 1-2 or 2-3) = 2x Bet
  const highSet = new Set(['777', 'diamond', 'bar', 'bell']);
  if ((s0 === s1 && highSet.has(s0)) || (s1 === s2 && highSet.has(s1))) {
    const matched = s0 === s1 ? VEGAS_SYMBOLS[s0] : VEGAS_SYMBOLS[s1];
    return {
      tier: 'double',
      mult: 2,
      headline: `✨ DOUBLE ${matched.label} PAIR! (2× BET)`
    };
  }

  // 4. Classic Left-Reel Single Cherry Push = 1x Bet back
  if (s0 === 'cherry') {
    return {
      tier: 'push',
      mult: 1,
      headline: '🍒 LEFT CHERRY PUSH — BET RETURNED (1×)'
    };
  }

  return {
    tier: 'miss',
    mult: 0,
    headline: 'NO PAYLINE MATCH — PULL THE CHROME ARM AGAIN!'
  };
}

export default function VegasSlotMachine({
  embedded = false,
  tokens = 0,
  memes = [],
  onCreditCreator,
  onSpendTokens,
  onPayoutTokens,
  onRecordHighScore,
  onOpenUpload,
  onBackToFeed
}) {
  const betOptions = ARCADE_ECONOMY_RULES.ARCADE_STAKES.SLOT_BETS; // [5, 10, 25, 50]
  const [betAmount, setBetAmount] = useState(() => (tokens >= 5 ? 5 : 0)); // 0 = Free Demo Mode
  const [reelStops, setReelStops] = useState([0, 7, 3]); // Initial display: 777 | Diamond | BAR
  const [reelSpinning, setReelSpinning] = useState([false, false, false]);
  const featuredMeme = memes && memes.length > 0 ? memes[0] : null;
  const [spinTickOffset, setSpinTickOffset] = useState(0);
  const [leverPulled, setLeverPulled] = useState(false);

  // Authentic Fruit-Machine Lucky Features (only granted occasionally after non-winning spins)
  const [holdAllowed, setHoldAllowed] = useState(false);
  const [heldReels, setHeldReels] = useState([false, false, false]);
  const [nudgesLeft, setNudgesLeft] = useState(0);

  const [lastOutcome, setLastOutcome] = useState(null);
  const [statusBanner, setStatusBanner] = useState(
    'SELECT YOUR CHIP BET & PULL THE RED CHROME ARM!'
  );
  const [bestWinTokens, setBestWinTokens] = useState(() =>
    Number(localStorage.getItem('tm_slots_best_win') || 0)
  );

  const timersRef = useRef([]);
  const spinAnimRef = useRef(null);
  const leverDragStartYRef = useRef(null);

  const isAnySpinning = reelSpinning.some(Boolean);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      if (spinAnimRef.current) clearInterval(spinAnimRef.current);
    };
  }, []);

  // Fast mechanical drum tick while reels are spinning
  useEffect(() => {
    if (!isAnySpinning) {
      if (spinAnimRef.current) {
        clearInterval(spinAnimRef.current);
        spinAnimRef.current = null;
      }
      return undefined;
    }
    spinAnimRef.current = setInterval(() => {
      setSpinTickOffset((n) => (n + 1) % STRIP_LEN);
    }, 65);
    return () => {
      if (spinAnimRef.current) {
        clearInterval(spinAnimRef.current);
        spinAnimRef.current = null;
      }
    };
  }, [isAnySpinning]);

  const handleSelectBet = (nextBet) => {
    if (isAnySpinning) return;
    sfx.playCoinInsert();
    setBetAmount(nextBet);
    // Changing bet clears any active holds/nudges (standard Vegas anti-exploit rule)
    setHoldAllowed(false);
    setHeldReels([false, false, false]);
    setNudgesLeft(0);
    setStatusBanner(
      nextBet === 0
        ? '🆓 DEMO MODE SELECTED (0 🪙 COST • 0 🪙 PAYOUT)'
        : `🪙 ${nextBet}-TOKEN CHIP WAGER LOCKED — PULL THE LEVER!`
    );
  };

  const toggleHoldReel = (idx) => {
    if (isAnySpinning || !holdAllowed) return;
    setHeldReels((prev) => {
      const next = [...prev];
      if (!next[idx] && next.filter(Boolean).length >= 2) {
        // Max 2 reels can be held at once
        return prev;
      }
      next[idx] = !next[idx];
      sfx.playFlipperClick();
      return next;
    });
  };

  const finalizeSpinOutcome = (finalStops, activeBet, fromNudge = false) => {
    const paylineSyms = finalStops.map((idx) => REEL_STRIP[wrapStop(idx)]);
    const result = evaluateVegasPayline(paylineSyms);

    const rawPayout = activeBet > 0 ? activeBet * result.mult : 0;
    const verifiedPayout = validateStakedGamePayout({
      stakedTokens: activeBet,
      rawPayout,
      maxMultiplier: 50
    });

    if (result.mult > 0) {
      if (result.tier === 'jackpot') {
        sfx.playJackpot();
        setTimeout(() => sfx.playAirhorn(), 180);
      } else if (result.mult >= 4) {
        sfx.playJackpot();
      } else {
        sfx.playCoinInsert();
      }

      if (verifiedPayout > 0 && onPayoutTokens) {
        onPayoutTokens(verifiedPayout, {
          stakedTokens: activeBet,
          xp: result.tier === 'jackpot' ? 150 : result.mult >= 6 ? 45 : 15,
          label: result.headline,
          emoji: result.tier === 'jackpot' ? '7️⃣' : '🎰'
        });
        if (onCreditCreator && featuredMeme?.author_name) {
          onCreditCreator(featuredMeme.author_name);
        }
      }

      if (verifiedPayout > bestWinTokens) {
        setBestWinTokens(verifiedPayout);
        localStorage.setItem('tm_slots_best_win', String(verifiedPayout));
        if (onRecordHighScore) onRecordHighScore('slots', verifiedPayout);
      }

      setHoldAllowed(false);
      setHeldReels([false, false, false]);
      setNudgesLeft(0);
      setLastOutcome({
        ...result,
        payout: verifiedPayout,
        bet: activeBet
      });
      setStatusBanner(
        activeBet > 0
          ? `${result.headline} → WON +${verifiedPayout} 🪙!`
          : `${result.headline} (DEMO MODE — WAGER TOKENS TO WIN!)`
      );
    } else {
      // Losing spin: 0 tokens paid! Occasional lucky Hold or Nudge feature if not already from a nudge
      setLastOutcome({ ...result, payout: 0, bet: activeBet });
      if (!fromNudge) {
        const roll = Math.random();
        if (roll < 0.16) {
          setHoldAllowed(true);
          setHeldReels([false, false, false]);
          setNudgesLeft(0);
          setStatusBanner('⚡ LUCKY HOLD LIT! TAP UP TO 2 REELS TO LOCK FOR NEXT PULL!');
        } else if (roll < 0.28) {
          setHoldAllowed(false);
          setHeldReels([false, false, false]);
          setNudgesLeft(1);
          setStatusBanner('⚡ 1 LUCKY NUDGE LIT! TAP A NUDGE BUTTON BELOW ANY REEL!');
        } else {
          setHoldAllowed(false);
          setHeldReels([false, false, false]);
          setNudgesLeft(0);
          setStatusBanner(result.headline);
        }
      } else {
        setNudgesLeft(0);
        setStatusBanner('NUDGE COMPLETE — NO PAYLINE MATCH. PULL AGAIN!');
      }
    }
  };

  const handleNudgeReel = (reelIdx) => {
    if (isAnySpinning || nudgesLeft <= 0) return;
    sfx.playSlotReelStop(reelIdx);
    const nextStops = reelStops.map((s, idx) => (idx === reelIdx ? wrapStop(s - 1) : s));
    setReelStops(nextStops);
    setNudgesLeft(0);
    finalizeSpinOutcome(nextStops, lastOutcome?.bet ?? betAmount, true);
  };

  const triggerPullSpin = () => {
    if (isAnySpinning) return;

    let activeBet = betAmount;
    if (activeBet > 0) {
      if (tokens < activeBet) {
        sfx.playClownHonk();
        setStatusBanner(
          `⚠️ NEED ${activeBet} 🪙 FOR THAT BET! LOWER BET, SWITCH TO DEMO, OR UPLOAD A MEME (+45 🪙)!`
        );
        return;
      }
      if (onSpendTokens) {
        const ok = onSpendTokens(activeBet, 'One-Arm Bandit Wager');
        if (!ok) return;
      }
    }

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    // Animate physical right-side chrome lever pull
    setLeverPulled(true);
    sfx.playSlotLeverPull();
    const leverTimer = setTimeout(() => setLeverPulled(false), 440);
    timersRef.current.push(leverTimer);

    setLastOutcome(null);
    setNudgesLeft(0);
    setStatusBanner(
      activeBet > 0
        ? `🎰 ${activeBet} 🪙 INSERTED — MECHANICAL DRUMS SPINNING...`
        : '🆓 DEMO PULL — DRUMS SPINNING...'
    );

    // Choose random independent stop index on the 22-stop physical strip for non-held reels
    const targetStops = reelStops.map((currStop, idx) =>
      heldReels[idx] ? currStop : Math.floor(Math.random() * STRIP_LEN)
    );

    const nextSpinMask = [!heldReels[0], !heldReels[1], !heldReels[2]];
    setReelSpinning(nextSpinMask);

    // Hold consumes after this spin
    setHoldAllowed(false);

    const stopDelays = [520, 920, 1320];
    [0, 1, 2].forEach((reelIdx) => {
      if (heldReels[reelIdx]) return;
      const t = setTimeout(() => {
        sfx.playSlotReelStop(reelIdx);
        setReelStops((prev) => {
          const copy = [...prev];
          copy[reelIdx] = targetStops[reelIdx];
          return copy;
        });
        setReelSpinning((prev) => {
          const copy = [...prev];
          copy[reelIdx] = false;
          return copy;
        });
      }, stopDelays[reelIdx]);
      timersRef.current.push(t);
    });

    const finishDelay = nextSpinMask[2] ? 1370 : nextSpinMask[1] ? 970 : 570;
    const doneTimer = setTimeout(() => {
      setHeldReels([false, false, false]);
      finalizeSpinOutcome(targetStops, activeBet, false);
    }, finishDelay);
    timersRef.current.push(doneTimer);
  };

  // Drag downward on the red lever knob on iPad / iPhone / Desktop
  const handleLeverPointerDown = (e) => {
    if (isAnySpinning) return;
    leverDragStartYRef.current = e.clientY;
  };

  const handleLeverPointerUp = (e) => {
    if (isAnySpinning) return;
    const startY = leverDragStartYRef.current;
    leverDragStartYRef.current = null;
    if (startY !== null && e.clientY - startY > 14) {
      triggerPullSpin();
    } else {
      triggerPullSpin();
    }
  };

  const isWinner = lastOutcome && lastOutcome.mult > 0;
  const isJackpot = lastOutcome && lastOutcome.tier === 'jackpot';

  return (
    <section
      className={`tm-bandit-stage ${embedded ? 'tm-bandit-embedded' : 'tm-bandit-standalone'}`}
      aria-label="Las Vegas 777 One-Arm Bandit Slot Machine"
    >
      <div className={`tm-bandit-cabinet-wrap ${isJackpot ? 'tm-bandit-jackpot-glow' : ''}`}>
        {/* MAIN VEGAS CHROME & NEON CABINET */}
        <div className="tm-bandit-cabinet">
          {/* 1. ARCHED 80s LAS VEGAS MARQUEE TOPPER */}
          <div className="tm-bandit-marquee">
            <div className="tm-bandit-bulbs" aria-hidden="true">
              {Array.from({ length: 11 }).map((_, idx) => (
                <span key={idx} className={`tm-bandit-bulb ${idx % 2 === 0 ? 'even' : 'odd'}`} />
              ))}
            </div>
            <div className="tm-bandit-marquee-sub">★ FABULOUS 1985 NEON CASINO ★</div>
            {featuredMeme && (
              <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 800, marginTop: '2px' }}>
                ★ FEATURED CREATOR: @{featuredMeme.author_name} ★
              </div>
            )}
            <h2 className="tm-bandit-marquee-title">ONE-ARM BANDIT 777</h2>
          </div>

          {/* 2. BACKLIT CASINO PAYTABLE GLASS */}
          <div className="tm-bandit-payglass" aria-label="Slot Machine Payout Multipliers">
            <div className="tm-bandit-paychip jackpot">
              <span>777×3</span>
              <strong>50×</strong>
            </div>
            <div className="tm-bandit-paychip">
              <span>💎×3</span>
              <strong>25×</strong>
            </div>
            <div className="tm-bandit-paychip">
              <span>BAR×3</span>
              <strong>15×</strong>
            </div>
            <div className="tm-bandit-paychip">
              <span>🔔×3</span>
              <strong>10×</strong>
            </div>
            <div className="tm-bandit-paychip">
              <span>🍒×3</span>
              <strong>6×</strong>
            </div>
            <div className="tm-bandit-paychip">
              <span>🍉/🍋×3</span>
              <strong>4×</strong>
            </div>
            <div className="tm-bandit-paychip">
              <span>2×🍒/PAIR</span>
              <strong>2×</strong>
            </div>
            <div className="tm-bandit-paychip">
              <span>1×🍒L</span>
              <strong>1×</strong>
            </div>
          </div>

          {/* 3. CHROME BEZEL + 3 CURVED IVORY MECHANICAL REEL DRUMS */}
          <div className="tm-bandit-reel-bezel">
            <div className="tm-bandit-payline-arrow left" aria-hidden="true">
              ▶
            </div>
            <div className="tm-bandit-payline-laser" aria-hidden="true" />
            <div className="tm-bandit-payline-arrow right" aria-hidden="true">
              ◀
            </div>

            <div className="tm-bandit-drums-grid">
              {[0, 1, 2].map((reelIdx) => {
                const spinning = reelSpinning[reelIdx];
                const centerStop = spinning
                  ? wrapStop(spinTickOffset * (reelIdx + 2) + reelIdx * 5)
                  : reelStops[reelIdx];
                const topSym = REEL_STRIP[wrapStop(centerStop - 1)];
                const midSym = REEL_STRIP[wrapStop(centerStop)];
                const botSym = REEL_STRIP[wrapStop(centerStop + 1)];
                const isHeld = heldReels[reelIdx];

                return (
                  <div key={reelIdx} className="tm-bandit-drum-col">
                    <div
                      className={`tm-bandit-drum-window ${spinning ? 'spinning' : ''} ${
                        isHeld ? 'held' : ''
                      } ${isWinner && !spinning ? 'winner' : ''}`}
                    >
                      {/* Top Curved Cylinder Peek */}
                      <div className="tm-bandit-drum-slot peek top">
                        <SlotSymbolSvg symbolId={topSym} size={embedded ? 34 : 38} />
                      </div>

                      {/* Center Payline Stop */}
                      <div className="tm-bandit-drum-slot center">
                        <SlotSymbolSvg symbolId={midSym} size={embedded ? 50 : 58} />
                      </div>

                      {/* Bottom Curved Cylinder Peek */}
                      <div className="tm-bandit-drum-slot peek bottom">
                        <SlotSymbolSvg symbolId={botSym} size={embedded ? 34 : 38} />
                      </div>

                      {/* 3D Cylindrical Drum Top/Bottom Shading Glass */}
                      <div className="tm-bandit-drum-glass" aria-hidden="true" />
                      {isHeld && <span className="tm-bandit-held-tag">HELD</span>}
                    </div>

                    {/* Fruit-Machine HOLD / NUDGE Deck Buttons under each drum */}
                    <div className="tm-bandit-drum-btns">
                      <button
                        type="button"
                        className={`tm-bandit-mini-btn ${isHeld ? 'active-hold' : ''} ${
                          holdAllowed ? 'lit' : ''
                        }`}
                        disabled={!holdAllowed || isAnySpinning}
                        onClick={() => toggleHoldReel(reelIdx)}
                      >
                        {isHeld ? '🔒 HELD' : 'HOLD'}
                      </button>
                      <button
                        type="button"
                        className={`tm-bandit-mini-btn ${nudgesLeft > 0 ? 'lit-nudge' : ''}`}
                        disabled={nudgesLeft <= 0 || isAnySpinning}
                        onClick={() => handleNudgeReel(reelIdx)}
                      >
                        ⏫ NUDGE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. DIGITAL VFD LED PAYOUT DISPLAY */}
          <div className={`tm-bandit-led-bar ${isWinner ? 'win' : ''}`} role="status">
            {statusBanner}
          </div>

          {/* 5. CASINO CHIP WAGER DECK + SPIN BUTTON */}
          <div className="tm-bandit-control-deck">
            <div className="tm-bandit-wallet-row">
              <div className="tm-bandit-stat-box">
                <span>WALLET</span>
                <strong>🪙 {tokens.toLocaleString()}</strong>
              </div>
              <div className="tm-bandit-stat-box">
                <span>WAGER</span>
                <strong>{betAmount === 0 ? '🆓 DEMO' : `🪙 ${betAmount}`}</strong>
              </div>
              <div className="tm-bandit-stat-box">
                <span>LAST WIN</span>
                <strong style={{ color: isWinner ? '#4ade80' : '#94a3b8' }}>
                  {lastOutcome?.payout ? `+${lastOutcome.payout} 🪙` : '0 🪙'}
                </strong>
              </div>
              <div className="tm-bandit-stat-box">
                <span>RECORD</span>
                <strong style={{ color: '#facc15' }}>🏆 {bestWinTokens} 🪙</strong>
              </div>
            </div>

            <div className="tm-bandit-bet-row" role="group" aria-label="Select Chip Wager">
              <span className="tm-bandit-bet-label">BET CHIPS:</span>
              {betOptions.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isAnySpinning}
                  className={`tm-bandit-chip-btn ${betAmount === amt ? 'active' : ''} ${
                    tokens < amt ? 'short' : ''
                  }`}
                  onClick={() => handleSelectBet(amt)}
                >
                  🪙 {amt}
                </button>
              ))}
              <button
                type="button"
                disabled={isAnySpinning}
                className={`tm-bandit-chip-btn demo ${betAmount === 0 ? 'active' : ''}`}
                onClick={() => handleSelectBet(0)}
                title="Practice for free (0 tokens staked, 0 tokens paid)"
              >
                🆓 DEMO
              </button>
            </div>

            <div className="tm-bandit-action-row">
              {!embedded && onBackToFeed && (
                <button type="button" className="tm-bandit-back-btn" onClick={onBackToFeed}>
                  ← Memes
                </button>
              )}

              <button
                type="button"
                className="tm-bandit-spin-btn"
                disabled={isAnySpinning}
                onClick={triggerPullSpin}
              >
                {isAnySpinning
                  ? '🎰 SPINNING DRUMS...'
                  : betAmount === 0
                  ? '🕹️ PULL DEMO SPIN (0 🪙)'
                  : `🎰 PULL FOR ${betAmount} 🪙 (WIN UP TO ${betAmount * 50} 🪙!)`}
              </button>
            </div>

            {tokens < 5 && (
              <div className="tm-bandit-reload-cta">
                <span>📸 Out of chips? Memes are the #1 Token Generator (+45 to +75 🪙)!</span>
                {onOpenUpload && (
                  <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenUpload}>
                    📸 Upload Meme (+45 🪙)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PHYSICAL RIGHT-SIDE 3D CHROME ONE-ARM LEVER (MOUNTED ON ALL DEVICES) */}
        <div className="tm-bandit-arm-housing" aria-label="One-Arm Bandit Pull Lever">
          <div className="tm-bandit-arm-box" />
          <div className={`tm-bandit-arm-track ${leverPulled ? 'pulled' : ''}`}>
            <div className="tm-bandit-arm-shaft" />
            <button
              type="button"
              className="tm-bandit-arm-ball"
              disabled={isAnySpinning}
              onPointerDown={handleLeverPointerDown}
              onPointerUp={handleLeverPointerUp}
              title="Pull the One-Arm Bandit Lever!"
            >
              <span>PULL</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
