import { useState, useRef, useEffect, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { pulse } from '../utils/analytics';
import {
  ARCADE_ECONOMY_RULES,
  validateStakedGamePayout,
  formatEightiesPrice
} from '../utils/tokenEconomy';
import { triggerWinCelebration } from '../utils/winCelebration';
import { Wallet } from './ui/Money';
import SlotSymbolArt from './SlotSymbolArt';
import EightiesIconsStrip from './EightiesIconsStrip';
import {
  SLOT_MACHINES,
  SLOT_MACHINE_BY_ID,
  NEON_SPECIAL_POWERUPS,
  BANDIT_REEL_STRIP,
  wrapBanditStop,
  evaluateBanditPayline,
  pickDougieQuote,
  generateVideoGrid,
  evaluate5x3Paylines,
  evaluateBuffalo1024Ways,
  rollLightningOrbValue,
  BUFFALO_WHEEL_SEGMENTS,
  spinBuffaloWheelSegment
} from '../data/slotMachinesCatalog';
import './VegasSlotMachine.css';

const MACHINE_STORAGE_KEY = 'tm_slot_arcade_machine_v1';

function readInitialMachineId() {
  try {
    const saved = localStorage.getItem(MACHINE_STORAGE_KEY);
    if (saved && SLOT_MACHINE_BY_ID[saved]) return saved;
  } catch {
    // ignore storage errors
  }
  return 'bandit85';
}

const INITIAL_GRID_BY_MACHINE = {
  neon_special: [
    ['ns_airwolf', 'ns_wild', 'ns_synth'],
    ['ns_arcade', 'ns_orb', 'ns_shades'],
    ['ns_wild', 'ns_airwolf', 'ns_cassette'],
    ['ns_synth', 'ns_wild', 'ns_arcade'],
    ['ns_airwolf', 'ns_shades', 'ns_quarter']
  ],
  silver_mustang: [
    ['coffee', 'dougie', 'pie'],
    ['owlring', 'orb', 'cherry'],
    ['777', 'dougie', 'coffee'],
    ['pie', 'orb', 'redshoes'],
    ['coffee', '777', 'owlring']
  ],
  lightning_vault: [
    ['vault', 'volt7', 'bolt'],
    ['diamond', 'wildchip', 'bar'],
    ['bolt', 'volt7', 'vault'],
    ['bell', 'wildchip', 'bolt'],
    ['volt7', 'diamond', 'cherry']
  ],
  buffalo_stampede: [
    ['buffalo', 'eagle', 'goldcoin', 'wolf'],
    ['goldcoin', 'wild2x', 'buffalo', 'eagle'],
    ['buffalo', 'goldcoin', 'wheel', 'wolf'],
    ['eagle', 'wild2x', 'buffalo', 'goldcoin'],
    ['wolf', 'buffalo', 'eagle', 'wheel']
  ]
};

const DEFAULT_BUFFALO_WILDS = { '1,1': 2, '3,1': 3 };
const VIP_SLOT_BETS_FALLBACK = [5, 10, 25, 50, 100];

const NEON_CROWN_PALETTES = {
  'plasma-cyan': {
    primary: '#00f3ff',
    secondary: '#ff2a85',
    accent: '#fde047',
    label: '⚡ VIP HIGH-ROLLER $25 • PLASMA 5000 ⚡',
    sub: 'BENT-GLASS HIGH-LIMIT CABINET'
  },
  'solar-gold': {
    primary: '#f97316',
    secondary: '#fde047',
    accent: '#ff2a85',
    label: '🔥 HIGH-ROLLER $25 • CYBER 1024 🔥',
    sub: 'WIDEBODY NEON SUPER CABINET'
  },
  'laser-magenta': {
    primary: '#ff2a85',
    secondary: '#00f3ff',
    accent: '#c084fc',
    label: '★ LASER NEON SPECIAL • $25 VIP ★',
    sub: '1986 SUPERNOVA PLASMA REACTOR'
  }
};

function HighRollerNeonCrown({ theme = 'plasma-cyan' }) {
  const palette = NEON_CROWN_PALETTES[theme] || NEON_CROWN_PALETTES['plasma-cyan'];
  return (
    <div
      className={`tm-slot-neon-crown tm-neon-theme-${theme}`}
      data-testid="slot-neon-crown"
      style={{
        '--neon-primary': palette.primary,
        '--neon-secondary': palette.secondary,
        '--neon-accent': palette.accent
      }}
    >
      <svg
        className="tm-slot-neon-crown-svg"
        viewBox="0 0 380 54"
        width="100%"
        height="48"
        aria-hidden="true"
      >
        {/* Dark acrylic housing */}
        <rect x="4" y="4" width="372" height="46" rx="14" fill="#050814" stroke="#1e293b" strokeWidth="2" />

        {/* Left & Right bent neon wing tubes (outer gas + white-hot core) */}
        <path
          d="M 18 40 L 18 18 Q 18 10 28 10 L 92 10 L 82 22 L 26 22"
          fill="none"
          stroke={palette.primary}
          strokeWidth="6.5"
          strokeOpacity="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 18 40 L 18 18 Q 18 10 28 10 L 92 10 L 82 22 L 26 22"
          fill="none"
          stroke={palette.primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 18 40 L 18 18 Q 18 10 28 10 L 92 10 L 82 22 L 26 22"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.92"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M 362 40 L 362 18 Q 362 10 352 10 L 288 10 L 298 22 L 354 22"
          fill="none"
          stroke={palette.primary}
          strokeWidth="6.5"
          strokeOpacity="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 362 40 L 362 18 Q 362 10 352 10 L 288 10 L 298 22 L 354 22"
          fill="none"
          stroke={palette.primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 362 40 L 362 18 Q 362 10 352 10 L 288 10 L 298 22 L 354 22"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.92"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center bent-glass neon arch loop */}
        <path
          d="M 100 12 Q 190 2 280 12 L 292 42 Q 190 48 88 42 Z"
          fill="rgba(15, 23, 42, 0.78)"
          stroke={palette.secondary}
          strokeWidth="6"
          strokeOpacity="0.42"
          strokeLinejoin="round"
        />
        <path
          d="M 100 12 Q 190 2 280 12 L 292 42 Q 190 48 88 42 Z"
          fill="none"
          stroke={palette.secondary}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d="M 100 12 Q 190 2 280 12 L 292 42 Q 190 48 88 42 Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.1"
          strokeOpacity="0.92"
          strokeLinejoin="round"
        />

        {/* Accent bottom neon runner */}
        <path
          d="M 28 38 L 76 38 M 304 38 L 352 38"
          fill="none"
          stroke={palette.accent}
          strokeWidth="5"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />
        <path
          d="M 28 38 L 76 38 M 304 38 L 352 38"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Chrome electrode mounts */}
        {[20, 96, 284, 360].map((cx) => (
          <circle key={cx} cx={cx} cy="27" r="3" fill="#94a3b8" stroke="#0f172a" strokeWidth="1" />
        ))}
      </svg>
      <div className="tm-slot-neon-crown-text">
        <span className="tm-slot-neon-crown-title">{palette.label}</span>
        <span className="tm-slot-neon-crown-sub">{palette.sub}</span>
      </div>
    </div>
  );
}

function NeonSideRail({ side = 'left', theme = 'plasma-cyan' }) {
  const palette = NEON_CROWN_PALETTES[theme] || NEON_CROWN_PALETTES['plasma-cyan'];
  return (
    <div
      className={`tm-slot-neon-rail ${side} tm-neon-theme-${theme}`}
      data-testid={`slot-neon-rail-${side}`}
      style={{
        '--neon-primary': palette.primary,
        '--neon-secondary': palette.secondary,
        '--neon-accent': palette.accent
      }}
      aria-hidden="true"
    >
      <span className="tm-neon-clamp top" />
      <span className="tm-neon-tube primary" />
      <span className="tm-neon-tube secondary" />
      <span className="tm-neon-clamp mid" />
      <span className="tm-neon-clamp bottom" />
    </div>
  );
}

export default function VegasSlotMachine({
  embedded = false,
  tokens = 0,
  centz = 0,
  memes = [],
  onCreditCreator,
  onSpendTokens,
  onPayoutTokens,
  onRecordHighScore,
  onOpenUpload,
  onBackToFeed
}) {
  const featuredMeme = memes && memes.length > 0 ? memes[0] : null;

  const [machineId, setMachineId] = useState(readInitialMachineId);
  const activeMachine = SLOT_MACHINE_BY_ID[machineId] || SLOT_MACHINES[0];
  const isHighRollerNeon = Boolean(activeMachine?.isHighRollerNeon);
  const betOptions = isHighRollerNeon
    ? ARCADE_ECONOMY_RULES.ARCADE_STAKES.VIP_SLOT_BETS || VIP_SLOT_BETS_FALLBACK
    : ARCADE_ECONOMY_RULES.ARCADE_STAKES.SLOT_BETS;
  const [floorOpen, setFloorOpen] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);

  const [betAmount, setBetAmount] = useState(() => (tokens >= 5 ? 5 : 0));
  const [turboOn, setTurboOn] = useState(false);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState(0);
  const [leverPulled, setLeverPulled] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const [dougieCallout, setDougieCallout] = useState('');

  // Classic Bandit '85 State
  const [banditStops, setBanditStops] = useState([0, 7, 3]);
  const [banditSpinning, setBanditSpinning] = useState([false, false, false]);
  const [spinTickOffset, setSpinTickOffset] = useState(0);
  const [holdAllowed, setHoldAllowed] = useState(false);
  const [heldReels, setHeldReels] = useState([false, false, false]);
  const [nudgesLeft, setNudgesLeft] = useState(0);
  const [banditFever, setBanditFever] = useState(0); // 0..5 accumulator
  const [banditFeverArmed, setBanditFeverArmed] = useState(false);

  // Modern 5-Reel Video Slot Grid & Spin State
  const [videoGrid, setVideoGrid] = useState(
    () => INITIAL_GRID_BY_MACHINE[readInitialMachineId()] || INITIAL_GRID_BY_MACHINE.neon_special
  );
  const [videoReelsSpinning, setVideoReelsSpinning] = useState([false, false, false, false, false]);
  const [winningCells, setWinningCells] = useState(() => new Set());
  const [wildMultipliers, setWildMultipliers] = useState(DEFAULT_BUFFALO_WILDS);

  // Neon Supernova Special '86 State (6 Powerups + Neon Free Spins + House Edge)
  const [neonCharge, setNeonCharge] = useState(2); // 0..6 Reactor cells
  const [armedNeonPowerups, setArmedNeonPowerups] = useState({
    laser_wild: false,
    synth_3x: false,
    twin_sync: false,
    low_zapper: false,
    hyper_wilds: false,
    chopper_siren: false
  });
  const [neonFreeSpins, setNeonFreeSpins] = useState(0);
  const [neonFreeSpinStake, setNeonFreeSpinStake] = useState(0);
  const [neonSurgeBanner, setNeonSurgeBanner] = useState(
    '⚡ 6 NEON POWERUPS ONLINE — Charge reactor cells & fire laser combos!'
  );

  // Silver Mustang (Dougie Jones) Options, Accumulators & Powerups
  const [mustangLines, setMustangLines] = useState(25); // 5 | 15 | 25
  const [coffeePot, setCoffeePot] = useState(1); // 0..10 -> 4 Free Spins
  const [mustangCharge, setMustangCharge] = useState(15); // 0..100 ⚡
  const [mustangFreeSpins, setMustangFreeSpins] = useState(0);
  const [freeSpinStake, setFreeSpinStake] = useState(0);
  const [mustangPot, setMustangPot] = useState(60); // Progressive pot display
  const [dougieBanner, setDougieBanner] = useState(() => pickDougieQuote('idle'));
  const [armedPowerups, setArmedPowerups] = useState({
    coffeeRush: false, // 1.5x next spin
    pieWild: false, // Full Wild Reel 3
    owlLock: false // Lock Dougie/Orb columns
  });

  // Lightning Vault 5000 Options, Accumulators & Hold-and-Spin
  const [anteBetOn, setAnteBetOn] = useState(false);
  const [voltageMeter, setVoltageMeter] = useState(15); // 0..100
  const [surgeArmed, setSurgeArmed] = useState(false);
  const [progressives, setProgressives] = useState({
    mini: 10,
    minor: 20,
    major: 45,
    grand: 85
  });
  const [lockItState, setLockItState] = useState(null);
  // lockItState = { active, respinsLeft, lockedMap: { "c,r": { label, mult, color } }, stake }

  // Cyber Buffalo Stampede '86 State
  const [stampedeMeter, setStampedeMeter] = useState(10); // 0..100
  const [buffaloCharge, setBuffaloCharge] = useState(15); // 0..100
  const [goldStampedeArmed, setGoldStampedeArmed] = useState(false);
  const [secondChanceArmed, setSecondChanceArmed] = useState(false);
  const [bonusWheelState, setBonusWheelState] = useState(null);
  // bonusWheelState = { spinning, angle, resultSegment, stake }

  // Shared Status & Records
  const [lastOutcome, setLastOutcome] = useState(null);
  const [statusBanner, setStatusBanner] = useState(
    'Pick a chip bet and pull the chrome arm — or switch machines above!'
  );
  const [bestWinTokens, setBestWinTokens] = useState(() => {
    try {
      return Number(localStorage.getItem('tm_slots_best_win') || 0) || 0;
    } catch {
      return 0;
    }
  });

  const timersRef = useRef([]);
  const spinAnimRef = useRef(null);
  const pulseBatchRef = useRef({ machine: 'bandit85', turbo: false, auto: false, spins: 0, wins: 0, biggest_mult: 0 });

  const flushSlotBatch = useCallback(() => {
    const b = pulseBatchRef.current;
    if (b.spins <= 0) return;
    pulse('slot_spin_batch', {
      machine: b.machine,
      turbo: b.turbo,
      auto: b.auto,
      spins: b.spins,
      wins: b.wins,
      biggest_mult: Number(b.biggest_mult.toFixed(2))
    });
    b.spins = 0;
    b.wins = 0;
    b.biggest_mult = 0;
  }, []);

  const recordSlotSpinForPulse = useCallback((machine) => {
    const b = pulseBatchRef.current;
    if (b.spins > 0 && b.machine !== machine) {
      flushSlotBatch();
    }
    b.machine = machine;
    b.turbo = Boolean(turboOn);
    b.auto = autoSpinsLeft > 0;
    b.spins += 1;
    if (b.spins >= 10) {
      flushSlotBatch();
    }
  }, [turboOn, autoSpinsLeft, flushSlotBatch]);

  useEffect(() => () => flushSlotBatch(), [flushSlotBatch]);
  const sirenTimerRef = useRef(null);
  const leverDragStartYRef = useRef(null);
  const autoTimerRef = useRef(null);

  const isBanditSpinning = banditSpinning.some(Boolean);
  const isVideoSpinning = videoReelsSpinning.some(Boolean);
  const isWheelSpinning = Boolean(bonusWheelState?.spinning);
  const isAnySpinning =
    isBanditSpinning ||
    isVideoSpinning ||
    isWheelSpinning;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (spinAnimRef.current) clearInterval(spinAnimRef.current);
      if (sirenTimerRef.current) clearTimeout(sirenTimerRef.current);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [clearTimers]);

  // Fast drum/reel tick animation while spinning
  useEffect(() => {
    if (!isBanditSpinning && !isVideoSpinning) {
      if (spinAnimRef.current) {
        clearInterval(spinAnimRef.current);
        spinAnimRef.current = null;
      }
      return undefined;
    }
    spinAnimRef.current = setInterval(() => {
      setSpinTickOffset((n) => (n + 1) % BANDIT_REEL_STRIP.length);
    }, turboOn ? 70 : 95);
    return () => {
      if (spinAnimRef.current) {
        clearInterval(spinAnimRef.current);
        spinAnimRef.current = null;
      }
    };
  }, [isBanditSpinning, isVideoSpinning, turboOn]);

  // Watchdog recovery: guarantee reels/bonus wheel never stay locked if a timer or callback stalls
  useEffect(() => {
    if (!isBanditSpinning && !isVideoSpinning && !isWheelSpinning) return undefined;
    const timeoutMs = isWheelSpinning ? 4500 : 3500;
    const watchdog = setTimeout(() => {
      clearTimers();
      setBanditSpinning([false, false, false]);
      setVideoReelsSpinning([false, false, false, false, false]);
      setHeldReels([false, false, false]);
      if (isWheelSpinning) {
        setBonusWheelState(null);
      }
      setAutoSpinsLeft(0);
      setStatusBanner('Reels settled — pull again anytime!');
    }, timeoutMs);
    return () => clearTimeout(watchdog);
  }, [isBanditSpinning, isVideoSpinning, isWheelSpinning, clearTimers]);

  const fireBigWinSiren = useCallback((mega = false, callout = '') => {
    if (sirenTimerRef.current) clearTimeout(sirenTimerRef.current);
    setSirenActive(true);
    if (callout) setDougieCallout(callout);
    sfx.playSlotBigWinSiren({ mega });
    sirenTimerRef.current = setTimeout(() => {
      setSirenActive(false);
      setDougieCallout('');
    }, mega ? 2400 : 1700);
  }, []);

  const awardSlotWin = useCallback(
    ({
      activeBet,
      mult,
      headline,
      detail,
      tier = 'win',
      maxMultiplier = 150,
      dougiePhrase = ''
    }) => {
      const rawPayout = activeBet > 0 ? Math.round(activeBet * mult) : 0;
      const verifiedPayout = validateStakedGamePayout({
        stakedTokens: activeBet,
        rawPayout,
        maxMultiplier
      });

      const isMega = tier === 'jackpot' || mult >= 15;
      const isBig = isMega || tier === 'big' || mult >= 6;

      if (mult > 0) {
        pulseBatchRef.current.wins += 1;
        if (mult > pulseBatchRef.current.biggest_mult) {
          pulseBatchRef.current.biggest_mult = mult;
        }
      }

      if (isBig) {
        fireBigWinSiren(isMega, dougiePhrase);
      } else {
        sfx.playSlotDingDing(mult >= 2 ? 3 : 2);
      }

      triggerWinCelebration({
        amount: activeBet > 0 ? verifiedPayout : Number(mult.toFixed(1)),
        unit: activeBet > 0 ? '🪙' : '× DEMO',
        game: activeMachine.name,
        headline: headline || '🎰 REEL WINNER!',
        detail:
          activeBet > 0
            ? `${detail || `${mult}× Payline Payout!`} (${formatEightiesPrice(verifiedPayout)} Value)`
            : `Demo hit ${mult}× — Set a 1980s coin bet to win 🪙!`,
        multiplier: mult,
        tier: isMega ? 'jackpot' : isBig ? 'big' : 'win',
        chopperFlyby: isMega ? 'both' : isBig ? (Math.random() < 0.55 ? 'airwolf' : 'bluethunder') : null,
        skipSound: true
      });

      if (verifiedPayout > 0 && onPayoutTokens) {
        onPayoutTokens(verifiedPayout, {
          stakedTokens: activeBet,
          maxMultiplier,
          xp: isMega ? 150 : isBig ? 50 : 18,
          label: headline,
          emoji: isMega ? '🚨' : '🎰',
          skipCelebration: true
        });
        if (onCreditCreator && featuredMeme?.author_name) {
          onCreditCreator(featuredMeme.author_name);
        }
      }

      if (verifiedPayout > bestWinTokens) {
        setBestWinTokens(verifiedPayout);
        try {
          localStorage.setItem('tm_slots_best_win', String(verifiedPayout));
        } catch {
          // ignore storage errors
        }
        if (onRecordHighScore) onRecordHighScore('slots', verifiedPayout);
      }

      setLastOutcome({
        tier,
        mult,
        headline,
        payout: verifiedPayout,
        bet: activeBet
      });

      setStatusBanner(
        activeBet > 0
          ? `${headline} — won +${verifiedPayout} 🪙!`
          : `${headline} (Demo mode — ${mult}×)`
      );

      return verifiedPayout;
    },
    [
      activeMachine.name,
      bestWinTokens,
      featuredMeme,
      fireBigWinSiren,
      onCreditCreator,
      onPayoutTokens,
      onRecordHighScore
    ]
  );

  // Switch between the 5 Slot Arcade machines
  const handleSelectMachine = (nextId) => {
    if (
      isAnySpinning ||
      lockItState?.active ||
      bonusWheelState ||
      mustangFreeSpins > 0 ||
      neonFreeSpins > 0
    ) {
      return;
    }
    if (!SLOT_MACHINE_BY_ID[nextId]) return;
    sfx.playToggle();
    setAutoSpinsLeft(0);
    setMachineId(nextId);
    try {
      localStorage.setItem(MACHINE_STORAGE_KEY, nextId);
    } catch {
      // ignore storage errors
    }
    setFloorOpen(false);
    setPaytableOpen(false);
    setWinningCells(new Set());
    setLastOutcome(null);
    setHoldAllowed(false);
    setHeldReels([false, false, false]);
    setNudgesLeft(0);
    if (!SLOT_MACHINE_BY_ID[nextId]?.isHighRollerNeon && betAmount > 50) {
      setBetAmount(50);
    }
    if (nextId !== 'bandit85' && INITIAL_GRID_BY_MACHINE[nextId]) {
      setVideoGrid(INITIAL_GRID_BY_MACHINE[nextId]);
    }
    if (nextId === 'silver_mustang') {
      setDougieBanner(pickDougieQuote('idle'));
    } else if (nextId === 'neon_special') {
      setNeonSurgeBanner('⚡ 6 NEON POWERUPS ONLINE — Charge reactor cells & fire laser combos!');
    }
    setStatusBanner(`Stepped up to ${SLOT_MACHINE_BY_ID[nextId].name} (${SLOT_MACHINE_BY_ID[nextId].coinDenom || '25¢'} Coin-Op)!`);
  };

  const handleSelectBet = (nextBet) => {
    if (isAnySpinning || lockItState?.active || mustangFreeSpins > 0 || neonFreeSpins > 0) return;
    sfx.playCoinInsert();
    setBetAmount(nextBet);
    setHoldAllowed(false);
    setHeldReels([false, false, false]);
    setNudgesLeft(0);
    setAutoSpinsLeft(0);
    setStatusBanner(
      nextBet === 0
        ? 'Demo mode active (0 cost, 0 real token payout).'
        : `${formatEightiesPrice(nextBet)} (${nextBet} 🪙) wager set — ready to spin!`
    );
  };

  const getActualSpinCost = useCallback(() => {
    if (betAmount <= 0) return 0;
    if (machineId === 'lightning_vault' && anteBetOn) {
      return Math.ceil(betAmount * 1.25);
    }
    return betAmount;
  }, [anteBetOn, betAmount, machineId]);

  // ==========================================
  // MACHINE 1: CLASSIC BANDIT '85 LOGIC
  // ==========================================
  const toggleHoldReel = (idx) => {
    if (isAnySpinning || !holdAllowed || machineId !== 'bandit85') return;
    setHeldReels((prev) => {
      const next = [...prev];
      if (!next[idx] && next.filter(Boolean).length >= 2) return prev;
      next[idx] = !next[idx];
      sfx.playFlipperClick();
      return next;
    });
  };

  const finalizeBanditOutcome = useCallback(
    (finalStops, activeBet, fromNudge = false, feverBoost = false) => {
      try {
        const paylineSyms = finalStops.map((idx) => BANDIT_REEL_STRIP[wrapBanditStop(idx)]);
        const result = evaluateBanditPayline(paylineSyms);
        const effectiveMult = result.mult > 0 && feverBoost ? result.mult * 2 : result.mult;

        if (effectiveMult > 0) {
          setBanditFever(0);
          setBanditFeverArmed(false);
          awardSlotWin({
            activeBet,
            mult: effectiveMult,
            headline: feverBoost ? `🔥 FEVER 2× ${result.headline}` : result.headline,
            detail: `${effectiveMult}× Mechanical Payline!`,
            tier: result.tier,
            maxMultiplier: 100,
            dougiePhrase: effectiveMult >= 10 ? 'HELLOOOOO-O-O!!' : ''
          });
          setHoldAllowed(false);
          setHeldReels([false, false, false]);
          setNudgesLeft(0);
        } else {
          setBanditFever((f) => Math.min(5, f + 1));
          setBanditFeverArmed(false);
          setLastOutcome({ ...result, payout: 0, bet: activeBet });
          if (!fromNudge) {
            const roll = Math.random();
            if (roll < 0.11) {
              setHoldAllowed(true);
              setHeldReels([false, false, false]);
              setNudgesLeft(0);
              setStatusBanner('Lucky Hold! Lock up to 2 reels for next spin.');
            } else if (roll < 0.20) {
              setHoldAllowed(false);
              setHeldReels([false, false, false]);
              setNudgesLeft(1);
              setStatusBanner('Lucky Nudge! Tap ⏫ NUDGE under any reel.');
            } else {
              setHoldAllowed(false);
              setHeldReels([false, false, false]);
              setNudgesLeft(0);
              setStatusBanner(result.headline);
            }
          } else {
            setNudgesLeft(0);
            setStatusBanner('Nudge complete — pull again.');
          }
        }
      } catch (err) {
        console.warn('finalizeBanditOutcome recovery:', err);
        setBanditSpinning([false, false, false]);
        setHoldAllowed(false);
        setHeldReels([false, false, false]);
        setNudgesLeft(0);
        setAutoSpinsLeft(0);
        setStatusBanner('Spin settled — pull again!');
      }
    },
    [awardSlotWin]
  );

  const handleNudgeReel = (reelIdx) => {
    if (isAnySpinning || nudgesLeft <= 0 || machineId !== 'bandit85') return;
    sfx.playSlotReelStop(reelIdx);
    const nextStops = banditStops.map((s, idx) => (idx === reelIdx ? wrapBanditStop(s - 1) : s));
    setBanditStops(nextStops);
    setNudgesLeft(0);
    finalizeBanditOutcome(nextStops, lastOutcome?.bet ?? betAmount, true, false);
  };

  const triggerBanditSpin = useCallback(() => {
    let activeBet = betAmount;
    let fallbackBanner = '';
    if (activeBet > 0) {
      if (tokens < activeBet) {
        const affordableBet = [...betOptions].reverse().find((b) => b <= tokens) ?? 0;
        setBetAmount(affordableBet);
        activeBet = affordableBet;
        fallbackBanner =
          affordableBet > 0
            ? `Auto-stepped bet to ${affordableBet} 🪙 — reels spinning!`
            : 'Out of 🪙 — auto-switched to 🆓 DEMO mode! Reels rolling!';
      }
      if (activeBet > 0 && onSpendTokens && !onSpendTokens(activeBet, "One-Arm Bandit '85 Wager")) {
        setBetAmount(0);
        activeBet = 0;
        fallbackBanner = 'Auto-switched to 🆓 DEMO mode — reels rolling!';
      }
    }

    clearTimers();
    const useFever = banditFeverArmed && banditFever >= 5;
    if (useFever) {
      sfx.playSlotPowerup('voltage');
      setBanditFever(0);
      setBanditFeverArmed(false);
    }

    setLeverPulled(true);
    sfx.playSlotLeverPull();
    recordSlotSpinForPulse('bandit85');
    timersRef.current.push(setTimeout(() => setLeverPulled(false), 420));

    setLastOutcome(null);
    setNudgesLeft(0);
    setStatusBanner(
      fallbackBanner ||
        (useFever
          ? '🔥 FEVER 2× HOT SPIN — Reel 1 Locked on 777/Diamond!'
          : activeBet > 0
            ? `${activeBet} 🪙 wagered — reels spinning.`
            : 'Demo spin — reels rolling.')
    );

    const targetStops = banditStops.map((currStop, idx) => {
      if (heldReels[idx]) return currStop;
      if (useFever && idx === 0) return Math.random() < 0.35 ? 0 : 7; // Weighted Fever Reel 1
      return Math.floor(Math.random() * BANDIT_REEL_STRIP.length);
    });

    const nextSpinMask = [!heldReels[0], !heldReels[1], !heldReels[2]];
    setBanditSpinning(nextSpinMask);
    setHoldAllowed(false);

    const baseDelays = turboOn ? [260, 440, 620] : [520, 920, 1320];
    [0, 1, 2].forEach((reelIdx) => {
      if (heldReels[reelIdx]) return;
      timersRef.current.push(
        setTimeout(() => {
          sfx.playSlotReelStop(reelIdx);
          setBanditStops((prev) => {
            const copy = [...prev];
            copy[reelIdx] = targetStops[reelIdx];
            return copy;
          });
          setBanditSpinning((prev) => {
            const copy = [...prev];
            copy[reelIdx] = false;
            return copy;
          });
        }, baseDelays[reelIdx])
      );
    });

    const finishDelay = (nextSpinMask[2] ? baseDelays[2] : nextSpinMask[1] ? baseDelays[1] : baseDelays[0]) + 50;
    timersRef.current.push(
      setTimeout(() => {
        setHeldReels([false, false, false]);
        finalizeBanditOutcome(targetStops, activeBet, false, useFever);
      }, finishDelay)
    );
  }, [
    recordSlotSpinForPulse,
    banditFever,
    banditFeverArmed,
    banditStops,
    betAmount,
    betOptions,
    clearTimers,
    finalizeBanditOutcome,
    heldReels,
    onSpendTokens,
    tokens,
    turboOn
  ]);

  // ==========================================
  // MACHINE 2, 3, 4, 5: VIDEO SLOTS & BONUSES
  // ==========================================
  const finalizeVideoSpin = useCallback(
    ({
      finalGrid,
      activeBet,
      spinWildMults,
      isFreeSpinRound,
      coffeeRushUsed,
      wasSurge,
      usedSecondChance,
      neonUsedPowerups = null,
      neonSpontaneousLabel = ''
    }) => {
      if (machineId === 'neon_special') {
        const hasSynth3x = Boolean(neonUsedPowerups?.synth_3x);
        const spinMult = hasSynth3x ? 3 : isFreeSpinRound ? 1.5 : 1;
        const evalRes = evaluate5x3Paylines('neon_special', finalGrid, 25, spinMult);

        let orbCount = 0;
        let airwolfCount = 0;
        const orbCells = [];
        finalGrid.forEach((col, c) =>
          col.forEach((sym, r) => {
            if (sym === 'ns_orb') {
              orbCount += 1;
              orbCells.push(`${c},${r}`);
            }
            if (sym === 'ns_airwolf') {
              airwolfCount += 1;
            }
          })
        );

        const nextWinCells = new Set(evalRes.winningCells);
        let scatterMult = 0;
        if (orbCount >= 3) {
          orbCells.forEach((cellKey) => nextWinCells.add(cellKey));
          scatterMult = orbCount >= 5 ? 10 : orbCount === 4 ? 4 : 1.5;
          if (!isFreeSpinRound) {
            setNeonFreeSpins((n) => n + 4);
            setNeonFreeSpinStake(activeBet);
          }
        }
        setWinningCells(nextWinCells);

        setNeonCharge((c) => Math.min(6, c + 1 + (orbCount > 0 ? 1 : 0)));

        const totalMult = Number((evalRes.totalBetMult + scatterMult).toFixed(2));
        const powerNames = Object.entries(neonUsedPowerups || {})
          .filter(([, on]) => Boolean(on))
          .map(([id]) => NEON_SPECIAL_POWERUPS.find((p) => p.id === id)?.short || id);

        if (neonSpontaneousLabel) {
          setNeonSurgeBanner(`⚡ ${neonSpontaneousLabel} TRIGGERED! (+House Odds Certified)`);
        } else if (orbCount >= 3) {
          setNeonSurgeBanner('🔮 3+ PLASMA POWER ORBS! +4 NEON SUPERNOVA FREE SPINS UNLOCKED!');
        } else if (powerNames.length > 0) {
          setNeonSurgeBanner(`🎆 POWERUPS FIRED: ${powerNames.join(' + ')}!`);
        } else {
          setNeonSurgeBanner('⚡ Reactor charging... Activate up to 6 Neon Powerups below!');
        }

        if (totalMult > 0) {
          const isMega = totalMult >= 18 || orbCount >= 4;
          const isBig = isMega || totalMult >= 6 || airwolfCount >= 4 || Boolean(neonUsedPowerups?.chopper_siren);
          awardSlotWin({
            activeBet,
            mult: totalMult,
            headline: isMega
              ? `🎆🚨 NEON SUPERNOVA MEGA WIN! (${totalMult}×)`
              : orbCount >= 3
                ? `🔮 +4 FREE SPINS & ${totalMult}× LASER PAYOUT!`
                : hasSynth3x
                  ? `🔥 3× SYNTH OVERDRIVE HIT! (${totalMult}×)`
                  : `🎆 ${evalRes.winningLines.length} LASER PAYLINES! (${totalMult}×)`,
            detail:
              powerNames.length > 0
                ? `Active Powerups: ${powerNames.join(', ')}`
                : `${evalRes.winningLines.length} Neon Laser Lines (1986 Vegas ~11.5% House Edge)`,
            tier: isMega ? 'jackpot' : isBig ? 'big' : 'win',
            maxMultiplier: 120,
            dougiePhrase: isBig ? '🚁 AIRWOLF & BLUE THUNDER ON STANDBY!' : ''
          });
        } else if (orbCount >= 3 && !isFreeSpinRound) {
          fireBigWinSiren(false, '🔮 +4 NEON FREE SPINS!');
          setStatusBanner('🔮 3+ PLASMA ORBS! 4 Neon Supernova Free Spins Ready!');
        } else {
          setLastOutcome({ tier: 'miss', mult: 0, payout: 0, bet: activeBet });
          setStatusBanner(
            isFreeSpinRound
              ? 'Free Spin complete — Pull again for remaining Neon Free Spins!'
              : 'House holds the edge! +1 ⚡ Reactor Charge banked — activate a Powerup!'
          );
        }
        return;
      }

      if (machineId === 'silver_mustang') {
        const spinMult = coffeeRushUsed ? 1.5 : isFreeSpinRound ? 1.25 : 1;
        const evalRes = evaluate5x3Paylines('silver_mustang', finalGrid, mustangLines, spinMult);
        setWinningCells(evalRes.winningCells);

        // Count Coffee & Golden Orb symbols for accumulators
        let coffeeHits = 0;
        let orbHits = 0;
        let dougieHits = 0;
        finalGrid.forEach((col) =>
          col.forEach((sym) => {
            if (sym === 'coffee') coffeeHits += 1;
            if (sym === 'orb') orbHits += 1;
            if (sym === 'dougie') dougieHits += 1;
          })
        );

        setMustangCharge((c) => Math.min(100, c + 4 + (coffeeHits > 0 ? 2 : 0) + orbHits * 3 + dougieHits));
        setMustangPot((p) => Math.min(250, Number((p + (activeBet > 0 ? 0.5 : 0.25)).toFixed(1))));

        // Check Coffee Pot Free Spins trigger (10/10, max +1 per spin)
        let triggeredBonus = false;
        if (!isFreeSpinRound && coffeeHits > 0) {
          const nextCoffee = coffeePot + 1;
          if (nextCoffee >= 10) {
            triggeredBonus = true;
            setCoffeePot(0);
            setMustangFreeSpins(4);
            setFreeSpinStake(activeBet);
            setDougieBanner(pickDougieQuote('bonus'));
            fireBigWinSiren(false, 'HELLOOOOO-O-O! FREE SPINS!');
          } else {
            setCoffeePot(nextCoffee);
          }
        }

        // Progressive Pot Jackpot check (5 Orbs or 5 Dougie on line)
        let totalMult = evalRes.totalBetMult;
        let bonusHeadline = '';
        if (orbHits >= 5 || (evalRes.bestSym === 'dougie' && evalRes.bestCount === 5)) {
          const potBonusMult = Math.min(45, Math.round(mustangPot / 8));
          totalMult += potBonusMult;
          setMustangPot(60);
          bonusHeadline = '🚨 MR. JACKPOTS PROGRESSIVE POT! HELLOOOOO-O-O!!';
        }

        if (totalMult > 0) {
          const isBig = totalMult >= 6;
          setDougieBanner(pickDougieQuote(isBig ? 'bigWin' : 'smallWin'));
          awardSlotWin({
            activeBet,
            mult: totalMult,
            headline:
              bonusHeadline ||
              (isBig
                ? '☕🚨 HELLOOOOO-O-O!! SILVER MUSTANG BIG WIN!'
                : `☕ ${evalRes.winningLines.length} PAYLINE HIT! (${totalMult}×)`),
            detail: isFreeSpinRound
              ? `Golden Orb Free Spin ${totalMult}×!`
              : `${evalRes.winningLines.length} winning lines (${mustangLines} lines active)`,
            tier: totalMult >= 20 ? 'jackpot' : isBig ? 'big' : 'win',
            maxMultiplier: 120,
            dougiePhrase: isBig ? 'HELLOOOOO-O-O!!' : ''
          });
        } else if (!triggeredBonus) {
          setDougieBanner(pickDougieQuote('miss'));
          setLastOutcome({ tier: 'miss', mult: 0, payout: 0, bet: activeBet });
          setStatusBanner(
            isFreeSpinRound
              ? 'Free Spin complete — tap FREE SPIN to continue!'
              : 'No line match — Coffee & Charge meters updated!'
          );
        }
        return;
      }

      if (machineId === 'lightning_vault') {
        const spinMult = wasSurge ? 1.5 : 1;
        const evalRes = evaluate5x3Paylines('lightning_vault', finalGrid, 20, spinMult);
        setWinningCells(evalRes.winningCells);

        // Count Lightning Orbs for Hold & Spin Lock-It Bonus
        const orbEntries = {};
        let orbCount = 0;
        finalGrid.forEach((col, c) =>
          col.forEach((sym, r) => {
            if (sym === 'bolt') {
              orbCount += 1;
              orbEntries[`${c},${r}`] = rollLightningOrbValue();
            }
          })
        );

        setVoltageMeter((v) => Math.min(100, v + 5 + orbCount * 4));
        setProgressives((p) => ({
          mini: Math.min(25, Number((p.mini + 0.05).toFixed(2))),
          minor: Math.min(50, Number((p.minor + 0.1).toFixed(2))),
          major: Math.min(100, Number((p.major + 0.2).toFixed(2))),
          grand: Math.min(200, Number((p.grand + 0.3).toFixed(2)))
        }));

        if (orbCount >= 3) {
          setAutoSpinsLeft(0);
          fireBigWinSiren(false, '⚡ LOCK-IT HOLD & SPIN!');
          setLockItState({
            active: true,
            respinsLeft: 3,
            lockedMap: orbEntries,
            stake: activeBet
          });
          setStatusBanner(`⚡ ${orbCount} LIGHTNING ORBS LOCKED! 3 HOLD & SPIN RESPINS!`);
          return;
        }

        if (evalRes.totalBetMult > 0) {
          const isBig = evalRes.totalBetMult >= 6;
          awardSlotWin({
            activeBet,
            mult: evalRes.totalBetMult,
            headline: isBig
              ? `⚡🚨 HIGH-VOLTAGE BIG WIN! (${evalRes.totalBetMult}×)`
              : `⚡ VAULT LINE HIT! (${evalRes.totalBetMult}×)`,
            detail: wasSurge ? '2× Overcharge Surge applied!' : `${evalRes.winningLines.length} lines hit`,
            tier: evalRes.totalBetMult >= 25 ? 'jackpot' : isBig ? 'big' : 'win',
            maxMultiplier: 150,
            dougiePhrase: isBig ? 'HELLOOOOO-O-O!' : ''
          });
        } else {
          setLastOutcome({ tier: 'miss', mult: 0, payout: 0, bet: activeBet });
          setStatusBanner('Land 3+ ⚡ Orbs to trigger Hold & Spin Lock-It!');
        }
        return;
      }

      if (machineId === 'buffalo_stampede') {
        const evalRes = evaluateBuffalo1024Ways(finalGrid, spinWildMults, 1);
        setWinningCells(evalRes.winningCells);

        let wheelCount = 0;
        let buffaloCount = 0;
        finalGrid.forEach((col) =>
          col.forEach((sym) => {
            if (sym === 'wheel') wheelCount += 1;
            if (sym === 'buffalo' || sym === 'goldcoin') buffaloCount += 1;
          })
        );

        setBuffaloCharge((c) => Math.min(100, c + 5 + Math.min(3, buffaloCount)));
        const nextStampede = Math.min(100, stampedeMeter + 2 + (buffaloCount >= 3 ? 1 : 0));
        setStampedeMeter(nextStampede);

        const triggeredWheel = wheelCount >= 3 || nextStampede >= 100;
        if (triggeredWheel) {
          setAutoSpinsLeft(0);
          if (nextStampede >= 100) setStampedeMeter(0);
          fireBigWinSiren(false, '🎡 VEGAS BONUS WHEEL!');
          setBonusWheelState({
            spinning: false,
            angle: 0,
            resultSegment: null,
            stake: activeBet
          });
          setStatusBanner(
            wheelCount >= 3
              ? '🎡 3+ BONUS WHEELS! TAP SPIN WHEEL TO CLAIM!'
              : '🏆 100% GOLD STAMPEDE! BONUS WHEEL UNLOCKED!'
          );
          if (evalRes.totalBetMult > 0) {
            awardSlotWin({
              activeBet,
              mult: evalRes.totalBetMult,
              headline: `🦬 WAYS WIN + 🎡 BONUS WHEEL!`,
              detail: `${evalRes.matchedWays.length} Stampede Ways`,
              tier: 'big',
              maxMultiplier: 140
            });
          }
          return;
        }

        if (evalRes.totalBetMult > 0) {
          const isBig = evalRes.totalBetMult >= 6;
          awardSlotWin({
            activeBet,
            mult: evalRes.totalBetMult,
            headline: isBig
              ? `🦬🚨 BUFFALO STAMPEDE MEGA WAYS! (${evalRes.totalBetMult}×)`
              : `🦬 ${evalRes.matchedWays.length} STAMPEDE WAYS! (${evalRes.totalBetMult}×)`,
            detail: usedSecondChance
              ? '🛡️ 2nd-Chance Nudge checked + Ways paid!'
              : `${evalRes.matchedWays.reduce((a, w) => a + w.ways, 0)} winning ways!`,
            tier: evalRes.totalBetMult >= 25 ? 'jackpot' : isBig ? 'big' : 'win',
            maxMultiplier: 140,
            dougiePhrase: isBig ? 'HELLOOOOO-O-O!' : ''
          });
        } else {
          setLastOutcome({ tier: 'miss', mult: 0, payout: 0, bet: activeBet });
          setStatusBanner(
            wheelCount === 2
              ? 'Almost! 2 Bonus Wheels landed — Charge Gold Stampede!'
              : 'No ways matched — Gold Stampede meter building!'
          );
        }
      }
    },
    [
      awardSlotWin,
      coffeePot,
      fireBigWinSiren,
      machineId,
      mustangLines,
      mustangPot,
      stampedeMeter
    ]
  );

  const triggerVideoSpin = useCallback(() => {
    if (lockItState?.active || bonusWheelState) return;

    const isFreeSpinRound =
      (machineId === 'silver_mustang' && mustangFreeSpins > 0) ||
      (machineId === 'neon_special' && neonFreeSpins > 0);
    let activeBet =
      machineId === 'neon_special' && neonFreeSpins > 0
        ? neonFreeSpinStake
        : machineId === 'silver_mustang' && mustangFreeSpins > 0
          ? freeSpinStake
          : getActualSpinCost();
    let fallbackBanner = '';

    if (!isFreeSpinRound && activeBet > 0) {
      if (tokens < activeBet) {
        const costForBet = (b) =>
          b <= 0 ? 0 : machineId === 'lightning_vault' && anteBetOn ? Math.ceil(b * 1.25) : b;
        const affordableBet = [...betOptions].reverse().find((b) => costForBet(b) <= tokens) ?? 0;
        setBetAmount(affordableBet);
        activeBet = costForBet(affordableBet);
        fallbackBanner =
          affordableBet > 0
            ? `Auto-stepped bet to ${affordableBet} 🪙 — spinning 5 reels!`
            : 'Out of 🪙 — auto-switched to 🆓 DEMO mode! Spinning 5 reels!';
      }
      if (activeBet > 0 && onSpendTokens && !onSpendTokens(activeBet, `${activeMachine.name} Spin`)) {
        setBetAmount(0);
        activeBet = 0;
        fallbackBanner = 'Auto-switched to 🆓 DEMO mode — spinning 5 reels!';
      }
    }

    clearTimers();
    setLeverPulled(true);
    sfx.playSlotLeverPull();
    recordSlotSpinForPulse(machineId);
    timersRef.current.push(setTimeout(() => setLeverPulled(false), 380));

    if (machineId === 'silver_mustang' && mustangFreeSpins > 0) {
      setMustangFreeSpins((n) => Math.max(0, n - 1));
    } else if (machineId === 'neon_special' && neonFreeSpins > 0) {
      setNeonFreeSpins((n) => Math.max(0, n - 1));
    }

    // Consume armed powerups for this spin
    const coffeeRushUsed = machineId === 'silver_mustang' && armedPowerups.coffeeRush;
    const pieWildUsed = machineId === 'silver_mustang' && armedPowerups.pieWild;
    const owlLockUsed = machineId === 'silver_mustang' && armedPowerups.owlLock;
    const wasSurge = machineId === 'lightning_vault' && surgeArmed;
    const wasGoldUpgrade = machineId === 'buffalo_stampede' && goldStampedeArmed;
    const wasSecondChance = machineId === 'buffalo_stampede' && secondChanceArmed;

    let neonUsedPowerups = null;
    let neonSpontaneousLabel = '';
    if (machineId === 'neon_special') {
      neonUsedPowerups = { ...armedNeonPowerups };
      // 14% spontaneous Neon Powerup Surge on any spin (accounted for in 88.5% Vegas RTP)
      const anyArmed = Object.values(neonUsedPowerups).some(Boolean);
      if (!anyArmed && Math.random() < 0.14) {
        const pool = ['hyper_wilds', 'low_zapper', 'twin_sync'];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        neonUsedPowerups[pick] = true;
        neonSpontaneousLabel = NEON_SPECIAL_POWERUPS.find((p) => p.id === pick)?.name || 'NEON SURGE';
      }
      setArmedNeonPowerups({
        laser_wild: false,
        synth_3x: false,
        twin_sync: false,
        low_zapper: false,
        hyper_wilds: false,
        chopper_siren: false
      });
    }

    if (machineId === 'silver_mustang') {
      setArmedPowerups({ coffeeRush: false, pieWild: false, owlLock: false });
      setDougieBanner(pickDougieQuote('spin'));
    } else if (machineId === 'lightning_vault') {
      setSurgeArmed(false);
    } else if (machineId === 'buffalo_stampede') {
      setGoldStampedeArmed(false);
      setSecondChanceArmed(false);
    }

    setLastOutcome(null);
    setWinningCells(new Set());

    // Build locked columns for Owl Ring Lock
    let lockedCols = null;
    if (owlLockUsed) {
      lockedCols = Array.isArray(videoGrid)
        ? videoGrid.map((col) => Array.isArray(col) && (col.includes('orb') || col.includes('dougie')))
        : null;
    }

    const rows = machineId === 'buffalo_stampede' ? 4 : 3;
    const generated = generateVideoGrid(machineId, {
      cols: 5,
      rows,
      anteOrbBoost: machineId === 'lightning_vault' && anteBetOn,
      goldUpgrade: wasGoldUpgrade,
      pieWildReel: pieWildUsed || wasSurge,
      lockedCols,
      prevGrid: videoGrid,
      neonPowerups: neonUsedPowerups
    });

    // During Silver Mustang Free Spins, Golden Orb drops a guaranteed Wild on Reel 2 or 4
    if (machineId === 'silver_mustang' && isFreeSpinRound) {
      const orbCol = Math.random() < 0.5 ? 1 : 3;
      const orbRow = Math.floor(Math.random() * 3);
      generated[orbCol][orbRow] = 'orb';
    }
    // During Neon Supernova Free Spins, guarantee a Cyber Wild drop
    if (machineId === 'neon_special' && isFreeSpinRound) {
      const wc = 1 + Math.floor(Math.random() * 3);
      const wr = Math.floor(Math.random() * 3);
      generated[wc][wr] = 'ns_wild';
    }

    // Smart 2nd-Chance Nudge on Buffalo if 2 Wheels landed
    let nudged = false;
    if (wasSecondChance) {
      let wheels = 0;
      generated.forEach((col) => col.forEach((s) => { if (s === 'wheel') wheels += 1; }));
      if (wheels === 2 && !generated[4].includes('wheel')) {
        nudged = true;
        if (Math.random() < 0.28) {
          generated[4][1] = 'wheel';
        }
      }
    }

    // Generate 2x/3x wild multipliers for Buffalo Stampede
    const nextWildMults = {};
    if (machineId === 'buffalo_stampede') {
      generated.forEach((col, c) =>
        col.forEach((sym, r) => {
          if (sym === 'wild2x') {
            nextWildMults[`${c},${r}`] = Math.random() < 0.15 ? 3 : 2;
          }
        })
      );
      setWildMultipliers(nextWildMults);
    }

    setStatusBanner(
      isFreeSpinRound
        ? machineId === 'neon_special'
          ? `🎆 NEON FREE SPIN! Plasma Overdrive (${Math.max(0, neonFreeSpins - 1)} left after this)`
          : `☕ FREE SPIN! Golden Orb active (${Math.max(0, mustangFreeSpins - 1)} left after this)`
        : fallbackBanner ||
          (activeBet > 0
            ? `${activeBet} 🪙 wagered — spinning 5 reels...`
            : 'Demo spin — 5 reels spinning...')
    );

    const spinMask = [0, 1, 2, 3, 4].map((c) => !(lockedCols && lockedCols[c]));
    setVideoReelsSpinning(spinMask);

    const delays = turboOn ? [180, 290, 400, 510, 620] : [340, 560, 780, 1000, 1220];
    [0, 1, 2, 3, 4].forEach((colIdx) => {
      if (!spinMask[colIdx]) return;
      timersRef.current.push(
        setTimeout(() => {
          sfx.playSlotReelStop(colIdx % 3);
          setVideoGrid((prev) => {
            const base = Array.isArray(prev) ? prev : [];
            const copy = base.map((c) => (Array.isArray(c) ? [...c] : []));
            copy[colIdx] = Array.isArray(generated?.[colIdx]) ? generated[colIdx] : [];
            return copy;
          });
          setVideoReelsSpinning((prev) => {
            const copy = [...prev];
            copy[colIdx] = false;
            return copy;
          });
        }, delays[colIdx])
      );
    });

    const lastDelay = delays[4] + 60;
    timersRef.current.push(
      setTimeout(() => {
        try {
          finalizeVideoSpin({
            finalGrid: generated,
            activeBet,
            spinWildMults: nextWildMults,
            isFreeSpinRound,
            coffeeRushUsed,
            wasSurge,
            usedSecondChance: nudged,
            neonUsedPowerups,
            neonSpontaneousLabel
          });
        } catch (err) {
          console.warn('finalizeVideoSpin recovery:', err);
          setVideoReelsSpinning([false, false, false, false, false]);
          setAutoSpinsLeft(0);
          setStatusBanner('Spin settled — pull again!');
        }
      }, lastDelay)
    );
  }, [
    recordSlotSpinForPulse,
    activeMachine.name,
    anteBetOn,
    armedNeonPowerups,
    armedPowerups.coffeeRush,
    armedPowerups.owlLock,
    armedPowerups.pieWild,
    betOptions,
    bonusWheelState,
    clearTimers,
    finalizeVideoSpin,
    freeSpinStake,
    getActualSpinCost,
    goldStampedeArmed,
    lockItState?.active,
    machineId,
    mustangFreeSpins,
    neonFreeSpins,
    neonFreeSpinStake,
    onSpendTokens,
    secondChanceArmed,
    surgeArmed,
    tokens,
    turboOn,
    videoGrid
  ]);

  // Master spin dispatcher
  const handlePullSpin = useCallback(() => {
    if (isAnySpinning) return;
    if (machineId === 'bandit85') {
      triggerBanditSpin();
    } else {
      triggerVideoSpin();
    }
  }, [isAnySpinning, machineId, triggerBanditSpin, triggerVideoSpin]);

  // Auto-spin scheduler
  useEffect(() => {
    if (autoSpinsLeft <= 0) return undefined;
    if (isAnySpinning || lockItState?.active || bonusWheelState) return undefined;
    const cost = (mustangFreeSpins > 0 || neonFreeSpins > 0) ? 0 : getActualSpinCost();
    if (cost > 0 && tokens < cost) {
      autoTimerRef.current = setTimeout(() => {
        setAutoSpinsLeft(0);
        setStatusBanner('Auto-spin stopped: not enough 🪙 tokens.');
      }, 0);
      return () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      };
    }
    autoTimerRef.current = setTimeout(() => {
      setAutoSpinsLeft((n) => Math.max(0, n - 1));
      handlePullSpin();
    }, turboOn ? 350 : 650);
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [
    autoSpinsLeft,
    bonusWheelState,
    getActualSpinCost,
    handlePullSpin,
    isAnySpinning,
    lockItState?.active,
    mustangFreeSpins,
    neonFreeSpins,
    tokens,
    turboOn
  ]);

  // ==========================================
  // LIGHTNING VAULT HOLD & SPIN RESPIN STEP
  // ==========================================
  const handleLockItRespin = () => {
    if (!lockItState || !lockItState.active || isAnySpinning) return;
    sfx.playSlotLeverPull();

    const nextLocked = { ...lockItState.lockedMap };
    let newOrbFound = false;
    const orbChance = anteBetOn ? 0.037 : 0.036;

    for (let c = 0; c < 5; c += 1) {
      for (let r = 0; r < 3; r += 1) {
        const key = `${c},${r}`;
        if (!nextLocked[key] && Math.random() < orbChance) {
          nextLocked[key] = rollLightningOrbValue();
          newOrbFound = true;
        }
      }
    }

    const totalOrbs = Object.keys(nextLocked).length;
    const nextRespins = totalOrbs >= 15 ? 0 : newOrbFound ? 3 : lockItState.respinsLeft - 1;

    if (newOrbFound) {
      sfx.playSlotDingDing(2);
    } else {
      sfx.playSlotReelStop(1);
    }

    if (nextRespins <= 0) {
      // Bonus finished: sum all orbs (+ Grand Jackpot if 15/15!)
      let totalMult = Object.values(nextLocked).reduce((sum, item) => sum + item.mult, 0);
      const hitGrand = totalOrbs >= 15;
      if (hitGrand) {
        totalMult += Math.round(progressives.grand);
        setProgressives((p) => ({ ...p, grand: 110 }));
      }
      const bonusStake = lockItState.stake;
      setLockItState(null);
      awardSlotWin({
        activeBet: bonusStake,
        mult: totalMult,
        headline: hitGrand
          ? `🚨⚡ GRAND LOCK-IT FULL BOARD! (${totalMult}×)`
          : `⚡🚨 HOLD & SPIN LOCK-IT PAYOUT! (${totalMult}×)`,
        detail: `${totalOrbs} Lightning Orbs collected!`,
        tier: totalMult >= 30 || hitGrand ? 'jackpot' : 'big',
        maxMultiplier: 150,
        dougiePhrase: 'HELLOOOOO-O-O!!'
      });
    } else {
      setLockItState({
        ...lockItState,
        respinsLeft: nextRespins,
        lockedMap: nextLocked
      });
      setStatusBanner(
        newOrbFound
          ? `⚡ NEW ORB LOCKED! Respins reset to 3 (${totalOrbs}/15 Orbs)`
          : `Respin complete — ${nextRespins} respins remaining (${totalOrbs}/15 Orbs)`
      );
    }
  };

  // ==========================================
  // BUFFALO BONUS WHEEL SPIN
  // ==========================================
  const handleSpinBonusWheel = () => {
    if (!bonusWheelState || bonusWheelState.spinning) return;
    const { index, segment } = spinBuffaloWheelSegment();
    const sliceAngle = 360 / BUFFALO_WHEEL_SEGMENTS.length;
    const targetDeg = 360 * 5 + (360 - (index * sliceAngle + sliceAngle / 2));
    const stake = bonusWheelState.stake;

    setBonusWheelState((prev) => ({
      ...prev,
      spinning: true,
      angle: targetDeg,
      resultSegment: segment
    }));

    // Peg ticks during wheel deceleration
    [0, 120, 260, 420, 620, 860, 1140, 1480, 1860].forEach((ms) => {
      timersRef.current.push(setTimeout(() => sfx.playSlotBonusWheelTick(), ms));
    });

    timersRef.current.push(
      setTimeout(() => {
        try {
          setBonusWheelState(null);
          awardSlotWin({
            activeBet: stake,
            mult: segment.mult,
            headline: `🎡🚨 BONUS WHEEL LANDED ${segment.label}!`,
            detail: `Cyber Buffalo Prize Wheel ${segment.mult}× Payout!`,
            tier: segment.mult >= 35 ? 'jackpot' : 'big',
            maxMultiplier: 140,
            dougiePhrase: segment.mult >= 35 ? 'HELLOOOOO-O-O!!' : ''
          });
        } catch (err) {
          console.warn('Bonus wheel recovery:', err);
          setBonusWheelState(null);
          setStatusBanner('Bonus wheel settled — pull again!');
        }
      }, 2450)
    );
  };

  // ==========================================
  // POWERUP ACTIVATIONS
  // ==========================================
  const activateSilverPowerup = (key, cost, label) => {
    if (isAnySpinning || mustangCharge < cost || armedPowerups[key]) return;
    sfx.playSlotPowerup(key === 'coffeeRush' ? 'coffee' : 'boost');
    setMustangCharge((c) => Math.max(0, c - cost));
    setArmedPowerups((prev) => ({ ...prev, [key]: true }));
    setStatusBanner(`${label} ARMED for your next spin!`);
    if (key === 'coffeeRush') {
      setDougieBanner('☕ "Damn good coffee!" — 2× Multiplier Armed!');
    }
  };

  const activateVoltageSurge = () => {
    if (isAnySpinning || voltageMeter < 100 || surgeArmed) return;
    sfx.playSlotPowerup('voltage');
    setVoltageMeter(0);
    setSurgeArmed(true);
    setStatusBanner('🔋 OVERCHARGE ARMED! Reel 3 Wild + 2× Surge on next spin!');
  };

  const activateBuffaloPowerup = (kind) => {
    if (isAnySpinning) return;
    if (kind === 'gold' && buffaloCharge >= 60 && !goldStampedeArmed) {
      sfx.playSlotPowerup('boost');
      setBuffaloCharge((c) => Math.max(0, c - 60));
      setGoldStampedeArmed(true);
      setStatusBanner('🦬 GOLD STAMPEDE ARMED! High Buffalo & Gold Coin odds next spin!');
    } else if (kind === 'nudge' && buffaloCharge >= 45 && !secondChanceArmed) {
      sfx.playSlotPowerup('boost');
      setBuffaloCharge((c) => Math.max(0, c - 45));
      setSecondChanceArmed(true);
      setStatusBanner('🛡️ 2ND-CHANCE NUDGE ARMED! Extra scatter rescue on next spin!');
    }
  };

  const handleArmBanditFever = () => {
    if (isAnySpinning || banditFever < 5 || banditFeverArmed) return;
    sfx.playSlotPowerup('voltage');
    setBanditFeverArmed(true);
    setStatusBanner('🔥 FEVER 2× ARMED! Pull the lever for a Hot 777/Diamond Spin!');
  };

  const activateNeonPowerup = (powerup) => {
    if (isAnySpinning || machineId !== 'neon_special' || armedNeonPowerups[powerup.id]) return;
    if (neonCharge < powerup.chargeCost) {
      sfx.playToggle?.();
      setStatusBanner(`Need ${powerup.chargeCost} ⚡ Reactor Cells for ${powerup.name} (spin to charge!).`);
      return;
    }
    sfx.playSlotPowerup(powerup.id === 'synth_3x' || powerup.id === 'laser_wild' ? 'voltage' : 'boost');
    setNeonCharge((c) => Math.max(0, c - powerup.chargeCost));
    setArmedNeonPowerups((prev) => ({ ...prev, [powerup.id]: true }));
    setNeonSurgeBanner(`${powerup.icon} ${powerup.name.toUpperCase()} ARMED FOR NEXT SPIN!`);
    setStatusBanner(`${powerup.icon} ${powerup.name} locked in! Spin the Neon Laser Reels!`);
  };

  const handleLeverPointerDown = (e) => {
    if (isAnySpinning) return;
    leverDragStartYRef.current = e.clientY;
  };

  const handleLeverPointerUp = (e) => {
    if (isAnySpinning) return;
    const startY = leverDragStartYRef.current;
    leverDragStartYRef.current = null;
    if (startY !== null && e.clientY - startY > 14) {
      handlePullSpin();
    } else {
      handlePullSpin();
    }
  };

  const isWinner = lastOutcome && lastOutcome.mult > 0;
  const isJackpot = lastOutcome && lastOutcome.tier === 'jackpot';
  const actualCost = getActualSpinCost();

  return (
    <section
      className={`tm-bandit-stage ${embedded ? 'tm-bandit-embedded' : 'tm-bandit-standalone'} tm-slot-theme-${machineId}`}
      aria-label="Las Vegas Slot Arcade"
    >
      <div className="tm-slot-arcade-shell">
        {/* SLOT ARCADE MACHINE SWITCHER BAR */}
        <div className="tm-slot-switcher-bar" role="tablist" aria-label="Choose Slot Machine">
          {SLOT_MACHINES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={machineId === m.id}
              disabled={
                isAnySpinning ||
                Boolean(lockItState?.active) ||
                Boolean(bonusWheelState) ||
                mustangFreeSpins > 0 ||
                neonFreeSpins > 0
              }
              className={`tm-slot-tab-btn ${machineId === m.id ? 'active' : ''} ${
                m.isHighRollerNeon ? 'vip-neon' : ''
              }`}
              style={{ '--tab-accent': m.accent }}
              onClick={() => handleSelectMachine(m.id)}
            >
              <span className="tm-slot-tab-icon" aria-hidden="true">{m.icon}</span>
              <span className="tm-slot-tab-name">{m.shortName}</span>
              <span className="tm-slot-tab-badge">{m.badge}</span>
            </button>
          ))}
          {!embedded && (
            <button
              type="button"
              className={`tm-slot-floor-toggle ${floorOpen ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setFloorOpen((v) => !v);
              }}
              title="Browse All 5 Slot Arcade Cabinets"
            >
              🏛️ {floorOpen ? 'Hide Floor' : 'Slot Floor'}
            </button>
          )}
        </div>

        {/* EXPANDABLE SLOT ARCADE FLOOR BROWSER */}
        {floorOpen && !embedded && (
          <div className="tm-slot-floor-grid" aria-label="Slot Arcade Cabinet Directory">
            {SLOT_MACHINES.map((m) => (
              <div
                key={m.id}
                className={`tm-slot-floor-card ${machineId === m.id ? 'current' : ''} ${
                  m.isHighRollerNeon ? 'vip-neon' : ''
                }`}
                style={{ '--card-accent': m.accent }}
              >
                <div className="tm-slot-floor-head">
                  <span className="tm-slot-floor-emoji">{m.icon}</span>
                  <div>
                    <div className="tm-slot-floor-title">{m.name}</div>
                    <div className="tm-slot-floor-tag">{m.tag}</div>
                  </div>
                  <span className="tm-slot-floor-pill">{m.badge}</span>
                </div>
                {m.vipLabel && <div className="tm-slot-floor-vip-tag">{m.vipLabel}</div>}
                <p className="tm-slot-floor-desc">{m.description}</p>
                <div className="tm-slot-floor-foot">
                  <span>Max {m.maxMult}× • {m.volatility}</span>
                  <button
                    type="button"
                    className="tm-slot-floor-play-btn"
                    disabled={
                      isAnySpinning ||
                      Boolean(lockItState?.active) ||
                      Boolean(bonusWheelState) ||
                      mustangFreeSpins > 0 ||
                      neonFreeSpins > 0
                    }
                    onClick={() => handleSelectMachine(m.id)}
                  >
                    {machineId === m.id ? '✓ Playing' : '▶ Step Up'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MAIN CABINET + RIGHT-SIDE LEVER */}
        <div
          className={`tm-bandit-cabinet-wrap ${isJackpot || sirenActive ? 'tm-bandit-jackpot-glow' : ''}`}
        >
          <div
            className={`tm-bandit-cabinet tm-cabinet-${machineId} ${
              isHighRollerNeon ? `tm-cabinet-highroller-neon tm-neon-theme-${activeMachine.neonTheme}` : ''
            }`}
          >
            {/* FLASHING SIREN BEACONS ON BIG WIN / JACKPOT */}
            {sirenActive && (
              <div className="tm-slot-siren-bar" aria-live="polite">
                <span className="tm-slot-beacon red" aria-hidden="true">🚨</span>
                <span className="tm-slot-siren-text">
                  {dougieCallout || 'DING! DING! DING! BIG VEGAS WINNER!'}
                </span>
                <span className="tm-slot-beacon gold" aria-hidden="true">🚨</span>
              </div>
            )}

            {/* 3D BENT-GLASS NEON CROWN TOPPER FOR HIGH-ROLLER NEON CABINETS */}
            {isHighRollerNeon && <HighRollerNeonCrown theme={activeMachine.neonTheme} />}

            {/* 1. ARCHED LASER MARQUEE TOPPER */}
            <div
              className={`tm-bandit-marquee ${
                machineId === 'silver_mustang'
                  ? 'red-room-trim'
                  : machineId === 'neon_special'
                    ? 'neon-special-marquee'
                    : ''
              }`}
            >
              <div className="tm-bandit-bulbs" aria-hidden="true">
                {Array.from({ length: machineId === 'neon_special' ? 16 : 11 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`tm-bandit-bulb ${idx % 2 === 0 ? 'even' : 'odd'} ${
                      machineId === 'neon_special' ? `chase-${idx % 4}` : ''
                    }`}
                  />
                ))}
              </div>
              <div className="tm-bandit-marquee-sub">
                {activeMachine.payGlassTitle || activeMachine.marqueeSub}
              </div>
              <div className="tm-slot-house-edge-strip">
                <span>🪙 {activeMachine.coinDenom || '25¢'} COIN-OP ({activeMachine.eraYear || '1985'})</span>
                <span>⚖️ {activeMachine.houseEdgeLabel || 'HOUSE ALWAYS WINS • VEGAS ODDS'}</span>
              </div>
              {featuredMeme && machineId === 'bandit85' && (
                <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 800, marginTop: '1px' }}>
                  ★ FEATURED CREATOR: @{featuredMeme.author_name} ★
                </div>
              )}
              <div className="tm-slot-marquee-title-row">
                <h2 className="tm-bandit-marquee-title">
                  {activeMachine.icon} {activeMachine.name.toUpperCase()}
                </h2>
                <button
                  type="button"
                  className="tm-slot-paytable-btn"
                  onClick={() => {
                    sfx.playToggle();
                    setPaytableOpen((v) => !v);
                  }}
                >
                  {paytableOpen ? '✕ Close' : 'ℹ Rules'}
                </button>
              </div>
            </div>

            {/* OPTIONAL COLLAPSIBLE RULES / PAYTABLE DRAWER */}
            {paytableOpen && (
              <div className="tm-slot-paytable-drawer">
                <strong>{activeMachine.name} — 1980s Vegas Paytable &amp; House Odds</strong>
                <p>{activeMachine.description}</p>
                <div className="tm-slot-paytable-grid">
                  {machineId === 'bandit85' && (
                    <>
                      <span>777×3 = <strong>75×</strong></span>
                      <span>💎×3 = <strong>36×</strong></span>
                      <span>BAR×3 = <strong>22×</strong></span>
                      <span>🔔×3 = <strong>15×</strong></span>
                      <span>🍒×3 = <strong>9×</strong></span>
                      <span>2×🍒/Pair = <strong>2×</strong></span>
                    </>
                  )}
                  {machineId === 'neon_special' && (
                    <>
                      <span>⚡ Neon Wild×5 = <strong>200× Line</strong></span>
                      <span>🚁 Airwolf×5 = <strong>155× Line</strong></span>
                      <span>🔮 3+ Power Orbs = <strong>+4 Free Spins</strong></span>
                      <span>6 Powerups = <strong>~11.5% House Edge</strong></span>
                    </>
                  )}
                  {machineId === 'silver_mustang' && (
                    <>
                      <span>🕶️ Dougie×5 = <strong>220× Line</strong></span>
                      <span>🟡 Orb Wild = <strong>1.5× Line Boost</strong></span>
                      <span>☕ 10 Coffees = <strong>4 Free Spins</strong></span>
                      <span>5 Orbs = <strong>Progressive Pot</strong></span>
                    </>
                  )}
                  {machineId === 'lightning_vault' && (
                    <>
                      <span>⚡ 3+ Orbs = <strong>Hold &amp; Spin</strong></span>
                      <span>15/15 Orbs = <strong>GRAND 85×+</strong></span>
                      <span>🔋 100% Surge = <strong>Reel 3 Wild ×1.5</strong></span>
                      <span>Ante +25% = <strong>Boosted Orb Odds</strong></span>
                    </>
                  )}
                  {machineId === 'buffalo_stampede' && (
                    <>
                      <span>1,024 Ways = <strong>Adjacent Reels</strong></span>
                      <span>⭐ Wild = <strong>2× / 3× Multiplier</strong></span>
                      <span>🎡 3+ Wheels = <strong>Bonus Wheel</strong></span>
                      <span>100% Meter = <strong>Free Wheel Spin</strong></span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* MACHINE-SPECIFIC TOP METERS / JACKPOT LEDS */}
            {machineId === 'bandit85' && (
              <div className="tm-bandit-payglass-wrap">
                <div className="tm-bandit-coin-bezel">
                  <span>🪙 INSERT 25¢ QUARTER • MECHANICAL REEL STEPPER (1985)</span>
                  <span>HOLD / NUDGE • ~88.5% PAYBACK</span>
                </div>
                <div className="tm-bandit-payglass" aria-label="Slot Machine Payout Multipliers">
                  <div className="tm-bandit-paychip hot"><span>777×3</span> <strong>75×</strong></div>
                  <div className="tm-bandit-paychip"><span>💎×3</span> <strong>36×</strong></div>
                  <div className="tm-bandit-paychip"><span>BAR×3</span> <strong>22×</strong></div>
                  <div className="tm-bandit-paychip"><span>🔔×3</span> <strong>15×</strong></div>
                  <div className="tm-bandit-paychip"><span>🍒×3</span> <strong>9×</strong></div>
                  <div className="tm-bandit-paychip"><span>2×🍒/Pair</span> <strong>2×</strong></div>
                </div>
              </div>
            )}

            {machineId === 'neon_special' && (
              <div className="tm-slot-feature-strip neon-special">
                <div className="tm-neon-chase-lights" aria-hidden="true">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span key={i} className={`tm-neon-chase-dot c${i % 5}`} />
                  ))}
                </div>
                <div className="tm-slot-dougie-quote neon-surge">{neonSurgeBanner}</div>
                <div className="tm-slot-meters-row">
                  <div className="tm-slot-meter-pill cyan">
                    <span>⚡ POWERUP REACTOR</span>
                    <strong>{neonCharge}/6 CELLS</strong>
                  </div>
                  <div className="tm-slot-meter-pill gold">
                    <span>🔮 FREE SPINS</span>
                    <strong>{neonFreeSpins > 0 ? `🔥 ${neonFreeSpins} ACTIVE!` : '3+ ORBS = 4 SPINS'}</strong>
                  </div>
                  <div className="tm-slot-meter-pill">
                    <span>⚖️ ODDS</span>
                    <strong>HOUSE ALWAYS WINS (88.5%)</strong>
                  </div>
                </div>
              </div>
            )}

            {machineId === 'silver_mustang' && (
              <div className="tm-slot-feature-strip mustang">
                <div className="tm-slot-dougie-quote">{dougieBanner}</div>
                <div className="tm-slot-meters-row">
                  <div className="tm-slot-meter-pill">
                    <span>☕ COFFEE POT</span>
                    <strong>{coffeePot}/10 {mustangFreeSpins > 0 ? `• 🆓 ${mustangFreeSpins} SPINS!` : ''}</strong>
                  </div>
                  <div className="tm-slot-meter-pill gold">
                    <span>🏆 MUSTANG POT</span>
                    <strong>{mustangPot} 🪙</strong>
                  </div>
                  <div className="tm-slot-meter-pill cyan">
                    <span>⚡ CHARGE</span>
                    <strong>{mustangCharge}%</strong>
                  </div>
                </div>
              </div>
            )}

            {machineId === 'lightning_vault' && (
              <div className="tm-slot-feature-strip lightning">
                <div className="tm-slot-jackpot-leds">
                  <div className="tm-jp-led mini"><span>MINI</span><strong>{progressives.mini}×</strong></div>
                  <div className="tm-jp-led minor"><span>MINOR</span><strong>{progressives.minor}×</strong></div>
                  <div className="tm-jp-led major"><span>MAJOR</span><strong>{progressives.major}×</strong></div>
                  <div className="tm-jp-led grand"><span>GRAND</span><strong>{progressives.grand}×</strong></div>
                </div>
                <div className="tm-slot-meters-row">
                  <div className="tm-slot-meter-pill cyan">
                    <span>🔋 VOLTAGE SURGE</span>
                    <strong>{voltageMeter}%</strong>
                  </div>
                  {lockItState?.active && (
                    <div className="tm-slot-meter-pill gold">
                      <span>⚡ HOLD &amp; SPIN</span>
                      <strong>{lockItState.respinsLeft} RESPINS LEFT</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {machineId === 'buffalo_stampede' && (
              <div className="tm-slot-feature-strip buffalo">
                <div className="tm-slot-meters-row">
                  <div className="tm-slot-meter-pill gold">
                    <span>🏆 GOLD STAMPEDE</span>
                    <strong>{stampedeMeter}%</strong>
                  </div>
                  <div className="tm-slot-meter-pill cyan">
                    <span>⚡ POWER CHARGE</span>
                    <strong>{buffaloCharge}%</strong>
                  </div>
                  <div className="tm-slot-meter-pill">
                    <span>WAYS</span>
                    <strong>1,024 WAYS</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                REELS WINDOW: 3-DRUM BANDIT OR 5-REEL VIDEO
               ========================================== */}
            {machineId === 'bandit85' ? (
              <div className="tm-bandit-reel-bezel">
                <div className="tm-bandit-payline-arrow left" aria-hidden="true">▶</div>
                <div className="tm-bandit-payline-laser" aria-hidden="true" />
                <div className="tm-bandit-payline-arrow right" aria-hidden="true">◀</div>

                <div className="tm-bandit-drums-grid">
                  {[0, 1, 2].map((reelIdx) => {
                    const spinning = banditSpinning[reelIdx];
                    const centerStop = spinning
                      ? wrapBanditStop(spinTickOffset * (reelIdx + 2) + reelIdx * 5)
                      : banditStops[reelIdx];
                    const topSym = BANDIT_REEL_STRIP[wrapBanditStop(centerStop - 1)];
                    const midSym = BANDIT_REEL_STRIP[wrapBanditStop(centerStop)];
                    const botSym = BANDIT_REEL_STRIP[wrapBanditStop(centerStop + 1)];
                    const isHeld = heldReels[reelIdx];

                    return (
                      <div key={reelIdx} className="tm-bandit-drum-col">
                        <div
                          className={`tm-bandit-drum-window ${spinning ? 'spinning' : ''} ${
                            isHeld ? 'held' : ''
                          } ${isWinner && !spinning ? 'winner' : ''}`}
                        >
                          <div className="tm-bandit-drum-slot peek top">
                            <SlotSymbolArt symbolId={topSym} size={embedded ? 30 : 36} />
                          </div>
                          <div className="tm-bandit-drum-slot center">
                            <SlotSymbolArt symbolId={midSym} size={embedded ? 46 : 56} />
                          </div>
                          <div className="tm-bandit-drum-slot peek bottom">
                            <SlotSymbolArt symbolId={botSym} size={embedded ? 30 : 36} />
                          </div>
                          <div className="tm-bandit-drum-glass" aria-hidden="true" />
                          {isHeld && <span className="tm-bandit-held-tag">HELD</span>}
                        </div>

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
            ) : (
              <div
                className={
                  isHighRollerNeon
                    ? `tm-slot-neon-stage tm-neon-theme-${activeMachine.neonTheme}`
                    : 'tm-slot-reel-stage'
                }
              >
                {isHighRollerNeon && <NeonSideRail side="left" theme={activeMachine.neonTheme} />}
                <div
                  className={`tm-video-reel-bezel ${
                    machineId === 'buffalo_stampede' ? 'rows-4' : 'rows-3'
                  } ${
                    isHighRollerNeon
                      ? `tm-bezel-highroller-neon tm-neon-theme-${activeMachine.neonTheme}`
                      : ''
                  }`}
                >
                  <div className="tm-video-reels-grid">
                    {[0, 1, 2, 3, 4].map((colIdx) => {
                      const colSpinning = videoReelsSpinning[colIdx];
                      const rowCount = machineId === 'buffalo_stampede' ? 4 : 3;
                      const colSyms = Array.isArray(videoGrid?.[colIdx]) ? videoGrid[colIdx] : [];
                    const previewPool =
                      machineId === 'neon_special'
                        ? ['ns_wild', 'ns_airwolf', 'ns_orb', 'ns_arcade', 'ns_synth', 'ns_shades']
                        : machineId === 'silver_mustang'
                          ? ['dougie', 'coffee', 'pie', 'orb', 'owlring', '777']
                          : machineId === 'lightning_vault'
                            ? ['bolt', 'volt7', 'vault', 'wildchip', 'diamond', 'bar']
                            : ['buffalo', 'eagle', 'wolf', 'goldcoin', 'wild2x', 'wheel'];

                    return (
                      <div
                        key={colIdx}
                        className={`tm-video-reel-col ${colSpinning ? 'spinning' : ''}`}
                      >
                        {Array.from({ length: rowCount }).map((_, rowIdx) => {
                          const key = `${colIdx},${rowIdx}`;
                          const lockedOrb = lockItState?.active ? lockItState.lockedMap[key] : null;
                          const symId = colSpinning
                            ? previewPool[(spinTickOffset + colIdx * 2 + rowIdx) % previewPool.length]
                            : colSyms[rowIdx] || previewPool[0];
                          const isCellWin = !colSpinning && winningCells.has(key);
                          const wildMult =
                            !colSpinning && machineId === 'buffalo_stampede' && symId === 'wild2x'
                              ? `${wildMultipliers[key] || 2}×`
                              : null;

                          return (
                            <div
                              key={rowIdx}
                              className={`tm-video-cell ${isCellWin ? 'win' : ''} ${
                                lockedOrb ? 'orb-locked' : ''
                              }`}
                            >
                              {lockedOrb ? (
                                <div className="tm-locked-orb-badge" style={{ borderColor: lockedOrb.color }}>
                                  <span>⚡</span>
                                  <strong>{lockedOrb.label}</strong>
                                </div>
                              ) : (
                                <SlotSymbolArt
                                  symbolId={symId}
                                  size={machineId === 'buffalo_stampede' ? (embedded ? 28 : 34) : embedded ? 32 : 40}
                                  badge={wildMult}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* BONUS WHEEL OVERLAY INSIDE BUFFALO CABINET */}
                {bonusWheelState && (
                  <div className="tm-wheel-overlay" role="dialog" aria-label="Vegas Bonus Wheel">
                    <div className="tm-wheel-pointer" aria-hidden="true">▼</div>
                    <div
                      className="tm-wheel-disc"
                      style={{
                        transform: `rotate(${bonusWheelState.angle}deg)`,
                        transition: bonusWheelState.spinning
                          ? 'transform 2.4s cubic-bezier(0.12, 0.85, 0.18, 1)'
                          : 'none'
                      }}
                    >
                      {BUFFALO_WHEEL_SEGMENTS.map((seg, idx) => (
                        <span
                          key={seg.label}
                          className="tm-wheel-wedge-label"
                          style={{
                            transform: `rotate(${idx * 45 + 22.5}deg) translateY(-54px)`
                          }}
                        >
                          {seg.label}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="tm-wheel-spin-cta"
                      disabled={bonusWheelState.spinning}
                      onClick={handleSpinBonusWheel}
                    >
                      {bonusWheelState.spinning ? '🎡 SPINNING...' : '🎡 SPIN BONUS WHEEL!'}
                    </button>
                  </div>
                )}
                </div>
                {isHighRollerNeon && <NeonSideRail side="right" theme={activeMachine.neonTheme} />}
              </div>
            )}

            {/* POWERUP & OPTION BUTTON DECK */}
            <div className="tm-slot-powerup-deck">
              {machineId === 'bandit85' && (
                <>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${banditFever >= 5 ? 'ready' : ''} ${
                      banditFeverArmed ? 'armed' : ''
                    }`}
                    disabled={isAnySpinning || banditFever < 5 || banditFeverArmed}
                    onClick={handleArmBanditFever}
                  >
                    🔥 FEVER 2× ({banditFever}/5)
                  </button>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${turboOn ? 'armed' : ''}`}
                    onClick={() => {
                      sfx.playToggle();
                      setTurboOn((v) => !v);
                    }}
                  >
                    ⚡ TURBO {turboOn ? 'ON' : 'OFF'}
                  </button>
                </>
              )}

              {machineId === 'neon_special' && (
                <div className="tm-neon-powerups-grid" role="group" aria-label="Neon Special Powerups">
                  {NEON_SPECIAL_POWERUPS.map((pw) => {
                    const isArmed = Boolean(armedNeonPowerups[pw.id]);
                    const isReady = neonCharge >= pw.chargeCost && !isArmed;
                    return (
                      <button
                        key={pw.id}
                        type="button"
                        className={`tm-slot-power-btn tm-neon-pw-btn ${isReady ? 'ready' : ''} ${
                          isArmed ? 'armed' : ''
                        }`}
                        style={{ '--pw-color': pw.color }}
                        disabled={isAnySpinning || isArmed || neonCharge < pw.chargeCost}
                        onClick={() => activateNeonPowerup(pw)}
                        title={pw.desc}
                      >
                        <span>{pw.icon} {pw.short}</span>
                        <span className="tm-neon-pw-cost">
                          {isArmed ? 'ARMED!' : `${pw.chargeCost}⚡`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {machineId === 'silver_mustang' && (
                <>
                  <button
                    type="button"
                    className="tm-slot-power-btn"
                    disabled={isAnySpinning || mustangFreeSpins > 0}
                    onClick={() => {
                      sfx.playToggle();
                      setMustangLines((l) => (l === 25 ? 5 : l === 5 ? 15 : 25));
                    }}
                  >
                    📏 {mustangLines} LINES
                  </button>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${mustangCharge >= 40 ? 'ready' : ''} ${
                      armedPowerups.coffeeRush ? 'armed' : ''
                    }`}
                    disabled={isAnySpinning || mustangCharge < 40 || armedPowerups.coffeeRush}
                    onClick={() => activateSilverPowerup('coffeeRush', 40, '☕ 1.5× Coffee Rush')}
                    title="Costs 40 ⚡ Charge — 1.5× wins on next spin"
                  >
                    ☕ 1.5× RUSH (40⚡)
                  </button>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${mustangCharge >= 60 ? 'ready' : ''} ${
                      armedPowerups.pieWild ? 'armed' : ''
                    }`}
                    disabled={isAnySpinning || mustangCharge < 60 || armedPowerups.pieWild}
                    onClick={() => activateSilverPowerup('pieWild', 60, '🥧 Pie Wild Reel')}
                    title="Costs 60 ⚡ Charge — Fills Reel 3 with Golden Orb Wilds"
                  >
                    🥧 WILD R3 (60⚡)
                  </button>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${mustangCharge >= 50 ? 'ready' : ''} ${
                      armedPowerups.owlLock ? 'armed' : ''
                    }`}
                    disabled={isAnySpinning || mustangCharge < 50 || armedPowerups.owlLock}
                    onClick={() => activateSilverPowerup('owlLock', 50, '🟢 Owl Ring Lock')}
                    title="Costs 50 ⚡ Charge — Locks reels holding Dougie or Golden Orbs"
                  >
                    🟢 LOCK (50⚡)
                  </button>
                </>
              )}

              {machineId === 'lightning_vault' && (
                <>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${anteBetOn ? 'armed' : ''}`}
                    disabled={isAnySpinning || Boolean(lockItState?.active)}
                    onClick={() => {
                      sfx.playToggle();
                      setAnteBetOn((v) => !v);
                    }}
                    title="Increases wager by +25% for +45% Lightning Orb drop odds"
                  >
                    ⚡ ANTE +25% {anteBetOn ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${voltageMeter >= 100 ? 'ready' : ''} ${
                      surgeArmed ? 'armed' : ''
                    }`}
                    disabled={isAnySpinning || voltageMeter < 100 || surgeArmed || Boolean(lockItState?.active)}
                    onClick={activateVoltageSurge}
                  >
                    🔋 SURGE ({voltageMeter}%)
                  </button>
                </>
              )}

              {machineId === 'buffalo_stampede' && (
                <>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${buffaloCharge >= 60 ? 'ready' : ''} ${
                      goldStampedeArmed ? 'armed' : ''
                    }`}
                    disabled={isAnySpinning || buffaloCharge < 60 || goldStampedeArmed}
                    onClick={() => activateBuffaloPowerup('gold')}
                  >
                    🦬 GOLD UP (60⚡)
                  </button>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${buffaloCharge >= 45 ? 'ready' : ''} ${
                      secondChanceArmed ? 'armed' : ''
                    }`}
                    disabled={isAnySpinning || buffaloCharge < 45 || secondChanceArmed}
                    onClick={() => activateBuffaloPowerup('nudge')}
                  >
                    🛡️ NUDGE (45⚡)
                  </button>
                </>
              )}

              {/* Shared Vegas Auto-Spin & Turbo Controls on modern cabinets */}
              {machineId !== 'bandit85' && (
                <>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${turboOn ? 'armed' : ''}`}
                    onClick={() => {
                      sfx.playToggle();
                      setTurboOn((v) => !v);
                    }}
                  >
                    ⚡ TURBO {turboOn ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    className={`tm-slot-power-btn ${autoSpinsLeft > 0 ? 'armed' : ''}`}
                    disabled={Boolean(lockItState?.active) || Boolean(bonusWheelState)}
                    onClick={() => {
                      sfx.playToggle();
                      setAutoSpinsLeft((n) => (n > 0 ? 0 : 5));
                    }}
                  >
                    {autoSpinsLeft > 0 ? `⏹ AUTO (${autoSpinsLeft})` : '🔁 AUTO 5×'}
                  </button>
                </>
              )}
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
                  <Wallet tokens={tokens} centz={centz} size="inline" compact />
                </div>
                <div className="tm-bandit-stat-box">
                  <span>WAGER</span>
                  <strong>
                    {actualCost === 0
                      ? '🆓 DEMO'
                      : `${formatEightiesPrice(actualCost, { compact: true })} (${actualCost}🪙)`}
                  </strong>
                </div>
                <div className="tm-bandit-stat-box">
                  <span>LAST WIN</span>
                  <strong style={{ color: isWinner ? '#4ade80' : '#94a3b8' }}>
                    {lastOutcome?.payout
                      ? `+${formatEightiesPrice(lastOutcome.payout, { compact: true })} (${lastOutcome.payout}🪙)`
                      : '0¢'}
                  </strong>
                </div>
                <div className="tm-bandit-stat-box">
                  <span>RECORD</span>
                  <strong style={{ color: '#facc15' }}>
                    🏆 {formatEightiesPrice(bestWinTokens, { compact: true })}
                  </strong>
                </div>
              </div>

              <div className="tm-bandit-bet-row" role="group" aria-label="Select Chip Wager">
                <span className="tm-bandit-bet-label">COIN-OP BET:</span>
                {betOptions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={
                      isAnySpinning ||
                      Boolean(lockItState?.active) ||
                      mustangFreeSpins > 0 ||
                      neonFreeSpins > 0
                    }
                    className={`tm-bandit-chip-btn ${amt >= 100 ? 'vip' : ''} ${betAmount === amt ? 'active' : ''} ${
                      tokens < amt ? 'short' : ''
                    }`}
                    onClick={() => handleSelectBet(amt)}
                    title={`${amt} Arcade Tokens = ${formatEightiesPrice(amt)} (${
                      amt >= 100 ? 'VIP High-Roller Chip' : '1985 Quarter Standard'
                    })`}
                  >
                    {amt >= 100 && <span className="tm-vip-chip-tag">VIP</span>}
                    {formatEightiesPrice(amt, { compact: true })} <small>({amt}🪙)</small>
                  </button>
                ))}
                <button
                  type="button"
                  disabled={
                    isAnySpinning ||
                    Boolean(lockItState?.active) ||
                    mustangFreeSpins > 0 ||
                    neonFreeSpins > 0
                  }
                  className="tm-bandit-chip-btn max"
                  onClick={() => {
                    const affordable = [...betOptions].reverse().find((b) => tokens >= b) ?? 0;
                    handleSelectBet(affordable);
                  }}
                  title="Set highest affordable bet"
                >
                  MAX
                </button>
                <button
                  type="button"
                  disabled={
                    isAnySpinning ||
                    Boolean(lockItState?.active) ||
                    mustangFreeSpins > 0 ||
                    neonFreeSpins > 0
                  }
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

                {lockItState?.active ? (
                  <button
                    type="button"
                    className="tm-bandit-spin-btn lockit"
                    onClick={handleLockItRespin}
                  >
                    ⚡ LOCK-IT RESPIN ({lockItState.respinsLeft} LEFT!)
                  </button>
                ) : (
                  <button
                    type="button"
                    className="tm-bandit-spin-btn"
                    disabled={isAnySpinning || Boolean(bonusWheelState)}
                    onClick={handlePullSpin}
                  >
                    {isAnySpinning
                      ? '🎰 SPINNING REELS...'
                      : neonFreeSpins > 0
                        ? `🎆 PULL NEON FREE SPIN (${neonFreeSpins} LEFT!)`
                        : mustangFreeSpins > 0
                          ? `☕ PULL FREE SPIN (${mustangFreeSpins} LEFT!)`
                          : actualCost === 0
                            ? '🕹️ PULL DEMO SPIN (FREE)'
                            : `🎰 SPIN ${formatEightiesPrice(actualCost, { compact: true })} (${actualCost}🪙 • MAX ${formatEightiesPrice(actualCost * activeMachine.maxMult, { compact: true })})`}
                  </button>
                )}
              </div>

              {tokens < 5 && (
                <div className="tm-bandit-reload-cta">
                  <span>📸 Out of chips? Upload memes or claim daily rewards (+12 to +20 🪙)!</span>
                  {onOpenUpload && (
                    <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenUpload}>
                      📸 Upload Meme (+12 🪙)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PHYSICAL RIGHT-SIDE 3D CHROME ONE-ARM LEVER */}
          <div className="tm-bandit-arm-housing" aria-label="One-Arm Bandit Pull Lever">
            <div className="tm-bandit-arm-box" />
            <div className={`tm-bandit-arm-track ${leverPulled ? 'pulled' : ''}`}>
              <div className="tm-bandit-arm-shaft" />
              <button
                type="button"
                className="tm-bandit-arm-ball"
                disabled={isAnySpinning || Boolean(lockItState?.active) || Boolean(bonusWheelState)}
                onPointerDown={handleLeverPointerDown}
                onPointerUp={handleLeverPointerUp}
                title="Pull the One-Arm Bandit Lever!"
              >
                <span>PULL</span>
              </button>
            </div>
          </div>
        </div>
        {!embedded && <EightiesIconsStrip compact />}
      </div>
    </section>
  );
}
