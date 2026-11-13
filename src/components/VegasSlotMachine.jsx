import { useState, useRef, useEffect, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { triggerWinCelebration } from '../utils/winCelebration';
import SlotSymbolArt from './SlotSymbolArt';
import {
  SLOT_MACHINES,
  SLOT_MACHINE_BY_ID,
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

const INITIAL_GRID_BY_MACHINE = {
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
  const featuredMeme = memes && memes.length > 0 ? memes[0] : null;

  const [machineId, setMachineId] = useState(() => {
    try {
      const saved = localStorage.getItem(MACHINE_STORAGE_KEY);
      if (saved && SLOT_MACHINE_BY_ID[saved]) return saved;
    } catch {
      // ignore storage errors
    }
    return 'bandit85';
  });
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
  const [videoGrid, setVideoGrid] = useState(() => INITIAL_GRID_BY_MACHINE.silver_mustang);
  const [videoReelsSpinning, setVideoReelsSpinning] = useState([false, false, false, false, false]);
  const [winningCells, setWinningCells] = useState(() => new Set());
  const [wildMultipliers, setWildMultipliers] = useState(DEFAULT_BUFFALO_WILDS);

  // Silver Mustang (Dougie Jones) Options, Accumulators & Powerups
  const [mustangLines, setMustangLines] = useState(25); // 5 | 15 | 25
  const [coffeePot, setCoffeePot] = useState(1); // 0..5 -> 5 Free Spins
  const [mustangCharge, setMustangCharge] = useState(40); // 0..100 ⚡
  const [mustangFreeSpins, setMustangFreeSpins] = useState(0);
  const [freeSpinStake, setFreeSpinStake] = useState(0);
  const [mustangPot, setMustangPot] = useState(125); // Progressive pot display
  const [dougieBanner, setDougieBanner] = useState(() => pickDougieQuote('idle'));
  const [armedPowerups, setArmedPowerups] = useState({
    coffeeRush: false, // 2x next spin
    pieWild: false, // Full Wild Reel 3
    owlLock: false // Lock Dougie/Orb columns
  });

  // Lightning Vault 5000 Options, Accumulators & Hold-and-Spin
  const [anteBetOn, setAnteBetOn] = useState(false);
  const [voltageMeter, setVoltageMeter] = useState(35); // 0..100
  const [surgeArmed, setSurgeArmed] = useState(false);
  const [progressives, setProgressives] = useState({
    mini: 15,
    minor: 30,
    major: 60,
    grand: 110
  });
  const [lockItState, setLockItState] = useState(null);
  // lockItState = { active, respinsLeft, lockedMap: { "c,r": { label, mult, color } }, stake }

  // Cyber Buffalo Stampede '86 State
  const [stampedeMeter, setStampedeMeter] = useState(25); // 0..100
  const [buffaloCharge, setBuffaloCharge] = useState(45); // 0..100
  const [goldStampedeArmed, setGoldStampedeArmed] = useState(false);
  const [secondChanceArmed, setSecondChanceArmed] = useState(false);
  const [bonusWheelState, setBonusWheelState] = useState(null);
  // bonusWheelState = { spinning, angle, resultSegment, stake }

  // Shared Status & Records
  const [lastOutcome, setLastOutcome] = useState(null);
  const [statusBanner, setStatusBanner] = useState(
    'Pick a chip bet and pull the chrome arm — or switch machines above!'
  );
  const [bestWinTokens, setBestWinTokens] = useState(() =>
    Number(localStorage.getItem('tm_slots_best_win') || 0)
  );

  const timersRef = useRef([]);
  const spinAnimRef = useRef(null);
  const sirenTimerRef = useRef(null);
  const leverDragStartYRef = useRef(null);
  const autoTimerRef = useRef(null);

  const activeMachine = SLOT_MACHINE_BY_ID[machineId] || SLOT_MACHINES[0];
  const isBanditSpinning = banditSpinning.some(Boolean);
  const isVideoSpinning = videoReelsSpinning.some(Boolean);
  const isAnySpinning =
    isBanditSpinning ||
    isVideoSpinning ||
    Boolean(bonusWheelState?.spinning);

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
    }, turboOn ? 48 : 65);
    return () => {
      if (spinAnimRef.current) {
        clearInterval(spinAnimRef.current);
        spinAnimRef.current = null;
      }
    };
  }, [isBanditSpinning, isVideoSpinning, turboOn]);

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

      if (verifiedPayout > 0 && onPayoutTokens) {
        onPayoutTokens(verifiedPayout, {
          stakedTokens: activeBet,
          maxMultiplier,
          xp: isMega ? 150 : isBig ? 50 : 18,
          label: headline,
          emoji: isMega ? '🚨' : '🎰'
        });
        if (onCreditCreator && featuredMeme?.author_name) {
          onCreditCreator(featuredMeme.author_name);
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
            ? detail || `${mult}× Payline Payout!`
            : `Demo hit ${mult}× — Set a token bet to win 🪙!`,
        multiplier: mult,
        tier: isMega ? 'jackpot' : isBig ? 'big' : 'win',
        skipSound: true
      });

      if (verifiedPayout > bestWinTokens) {
        setBestWinTokens(verifiedPayout);
        localStorage.setItem('tm_slots_best_win', String(verifiedPayout));
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

  // Switch between the 4 Slot Arcade machines
  const handleSelectMachine = (nextId) => {
    if (isAnySpinning || lockItState?.active || bonusWheelState || mustangFreeSpins > 0) return;
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
    if (nextId !== 'bandit85' && INITIAL_GRID_BY_MACHINE[nextId]) {
      setVideoGrid(INITIAL_GRID_BY_MACHINE[nextId]);
    }
    if (nextId === 'silver_mustang') {
      setDougieBanner(pickDougieQuote('idle'));
    }
    setStatusBanner(`Stepped up to ${SLOT_MACHINE_BY_ID[nextId].name}!`);
  };

  const handleSelectBet = (nextBet) => {
    if (isAnySpinning || lockItState?.active || mustangFreeSpins > 0) return;
    sfx.playCoinInsert();
    setBetAmount(nextBet);
    setHoldAllowed(false);
    setHeldReels([false, false, false]);
    setNudgesLeft(0);
    setAutoSpinsLeft(0);
    setStatusBanner(
      nextBet === 0
        ? 'Demo mode active (0 cost, 0 real token payout).'
        : `${nextBet} 🪙 wager set — ready to spin!`
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
          if (roll < 0.16) {
            setHoldAllowed(true);
            setHeldReels([false, false, false]);
            setNudgesLeft(0);
            setStatusBanner('Lucky Hold! Lock up to 2 reels for next spin.');
          } else if (roll < 0.28) {
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
    const activeBet = betAmount;
    if (activeBet > 0) {
      if (tokens < activeBet) {
        sfx.playClownHonk();
        setAutoSpinsLeft(0);
        setStatusBanner(`Need ${activeBet} 🪙. Lower bet or switch to Demo.`);
        return;
      }
      if (onSpendTokens && !onSpendTokens(activeBet, "One-Arm Bandit '85 Wager")) return;
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
    timersRef.current.push(setTimeout(() => setLeverPulled(false), 420));

    setLastOutcome(null);
    setNudgesLeft(0);
    setStatusBanner(
      useFever
        ? '🔥 FEVER 2× HOT SPIN — Reel 1 Locked on 777/Diamond!'
        : activeBet > 0
        ? `${activeBet} 🪙 wagered — reels spinning.`
        : 'Demo spin — reels rolling.'
    );

    const targetStops = banditStops.map((currStop, idx) => {
      if (heldReels[idx]) return currStop;
      if (useFever && idx === 0) return Math.random() < 0.5 ? 0 : 7; // 777 or Diamond stop
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
    banditFever,
    banditFeverArmed,
    banditStops,
    betAmount,
    clearTimers,
    finalizeBanditOutcome,
    heldReels,
    onSpendTokens,
    tokens,
    turboOn
  ]);

  // ==========================================
  // MACHINE 2, 3, 4: VIDEO SLOTS & BONUSES
  // ==========================================
  const finalizeVideoSpin = useCallback(
    ({
      finalGrid,
      activeBet,
      spinWildMults,
      isFreeSpinRound,
      coffeeRushUsed,
      wasSurge,
      usedSecondChance
    }) => {
      if (machineId === 'silver_mustang') {
        const spinMult = coffeeRushUsed ? 2 : isFreeSpinRound ? 2 : 1;
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

        setMustangCharge((c) => Math.min(100, c + 12 + coffeeHits * 6 + orbHits * 10 + dougieHits * 4));
        setMustangPot((p) => Math.min(500, p + (activeBet > 0 ? 2 : 1)));

        // Check Coffee Pot Free Spins trigger (5/5)
        let triggeredBonus = false;
        if (!isFreeSpinRound && coffeeHits > 0) {
          const nextCoffee = coffeePot + coffeeHits;
          if (nextCoffee >= 5) {
            triggeredBonus = true;
            setCoffeePot(0);
            setMustangFreeSpins(5);
            setFreeSpinStake(activeBet);
            setDougieBanner(pickDougieQuote('bonus'));
            fireBigWinSiren(false, 'HELLOOOOO-O-O! FREE SPINS!');
          } else {
            setCoffeePot(nextCoffee);
          }
        }

        // Progressive Pot Jackpot check (4+ Orbs or 5 Dougie on line)
        let totalMult = evalRes.totalBetMult;
        let bonusHeadline = '';
        if (orbHits >= 4 || (evalRes.bestSym === 'dougie' && evalRes.bestCount === 5)) {
          const potBonusMult = Math.min(80, Math.round(mustangPot / 5));
          totalMult += potBonusMult;
          setMustangPot(125);
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
        const spinMult = wasSurge ? 2 : 1;
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

        setVoltageMeter((v) => Math.min(100, v + 14 + orbCount * 9));
        setProgressives((p) => ({
          mini: Number((p.mini + 0.25).toFixed(1)),
          minor: Number((p.minor + 0.5).toFixed(1)),
          major: Number((p.major + 1).toFixed(1)),
          grand: Number((p.grand + 1.5).toFixed(1))
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

        setBuffaloCharge((c) => Math.min(100, c + 12 + buffaloCount * 4));
        const nextStampede = Math.min(100, stampedeMeter + 10 + buffaloCount * 4);
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

    const isFreeSpinRound = machineId === 'silver_mustang' && mustangFreeSpins > 0;
    const activeBet = isFreeSpinRound ? freeSpinStake : getActualSpinCost();

    if (!isFreeSpinRound && activeBet > 0) {
      if (tokens < activeBet) {
        sfx.playClownHonk();
        setAutoSpinsLeft(0);
        setStatusBanner(`Need ${activeBet} 🪙. Lower bet or switch to Demo.`);
        return;
      }
      if (onSpendTokens && !onSpendTokens(activeBet, `${activeMachine.name} Spin`)) return;
    }

    clearTimers();
    setLeverPulled(true);
    sfx.playSlotLeverPull();
    timersRef.current.push(setTimeout(() => setLeverPulled(false), 380));

    if (isFreeSpinRound) {
      setMustangFreeSpins((n) => Math.max(0, n - 1));
    }

    // Consume armed powerups for this spin
    const coffeeRushUsed = machineId === 'silver_mustang' && armedPowerups.coffeeRush;
    const pieWildUsed = machineId === 'silver_mustang' && armedPowerups.pieWild;
    const owlLockUsed = machineId === 'silver_mustang' && armedPowerups.owlLock;
    const wasSurge = machineId === 'lightning_vault' && surgeArmed;
    const wasGoldUpgrade = machineId === 'buffalo_stampede' && goldStampedeArmed;
    const wasSecondChance = machineId === 'buffalo_stampede' && secondChanceArmed;

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
      lockedCols = videoGrid.map((col) => col.includes('orb') || col.includes('dougie'));
    }

    const rows = machineId === 'buffalo_stampede' ? 4 : 3;
    const generated = generateVideoGrid(machineId, {
      cols: 5,
      rows,
      anteOrbBoost: machineId === 'lightning_vault' && anteBetOn,
      goldUpgrade: wasGoldUpgrade,
      pieWildReel: pieWildUsed || wasSurge,
      lockedCols,
      prevGrid: videoGrid
    });

    // During Silver Mustang Free Spins, Golden Orb drops a guaranteed Wild on Reel 2 or 4
    if (isFreeSpinRound) {
      const orbCol = Math.random() < 0.5 ? 1 : 3;
      const orbRow = Math.floor(Math.random() * 3);
      generated[orbCol][orbRow] = 'orb';
    }

    // Smart 2nd-Chance Nudge on Buffalo if 2 Wheels landed
    let nudged = false;
    if (wasSecondChance) {
      let wheels = 0;
      generated.forEach((col) => col.forEach((s) => { if (s === 'wheel') wheels += 1; }));
      if (wheels === 2 && !generated[4].includes('wheel')) {
        nudged = true;
        if (Math.random() < 0.48) {
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
            nextWildMults[`${c},${r}`] = Math.random() < 0.35 ? 3 : 2;
          }
        })
      );
      setWildMultipliers(nextWildMults);
    }

    setStatusBanner(
      isFreeSpinRound
        ? `☕ FREE SPIN! Golden Orb active (${mustangFreeSpins - 1} left after this)`
        : activeBet > 0
        ? `${activeBet} 🪙 wagered — spinning 5 reels...`
        : 'Demo spin — 5 reels spinning...'
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
            const copy = prev.map((c) => [...c]);
            copy[colIdx] = generated[colIdx];
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
        finalizeVideoSpin({
          finalGrid: generated,
          activeBet,
          spinWildMults: nextWildMults,
          isFreeSpinRound,
          coffeeRushUsed,
          wasSurge,
          usedSecondChance: nudged
        });
      }, lastDelay)
    );
  }, [
    activeMachine.name,
    anteBetOn,
    armedPowerups.coffeeRush,
    armedPowerups.owlLock,
    armedPowerups.pieWild,
    bonusWheelState,
    clearTimers,
    finalizeVideoSpin,
    freeSpinStake,
    getActualSpinCost,
    goldStampedeArmed,
    lockItState?.active,
    machineId,
    mustangFreeSpins,
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
    const cost = mustangFreeSpins > 0 ? 0 : getActualSpinCost();
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
    const orbChance = anteBetOn ? 0.24 : 0.17;

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
        const stake = bonusWheelState.stake;
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
              disabled={isAnySpinning || Boolean(lockItState?.active) || Boolean(bonusWheelState) || mustangFreeSpins > 0}
              className={`tm-slot-tab-btn ${machineId === m.id ? 'active' : ''}`}
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
              title="Browse All 4 Slot Arcade Cabinets"
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
                className={`tm-slot-floor-card ${machineId === m.id ? 'current' : ''}`}
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
                <p className="tm-slot-floor-desc">{m.description}</p>
                <div className="tm-slot-floor-foot">
                  <span>Max {m.maxMult}× • {m.volatility}</span>
                  <button
                    type="button"
                    className="tm-slot-floor-play-btn"
                    disabled={isAnySpinning || Boolean(lockItState?.active) || Boolean(bonusWheelState)}
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
          <div className={`tm-bandit-cabinet tm-cabinet-${machineId}`}>
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

            {/* 1. ARCHED LASER MARQUEE TOPPER */}
            <div className={`tm-bandit-marquee ${machineId === 'silver_mustang' ? 'red-room-trim' : ''}`}>
              <div className="tm-bandit-bulbs" aria-hidden="true">
                {Array.from({ length: 11 }).map((_, idx) => (
                  <span key={idx} className={`tm-bandit-bulb ${idx % 2 === 0 ? 'even' : 'odd'}`} />
                ))}
              </div>
              <div className="tm-bandit-marquee-sub">{activeMachine.marqueeSub}</div>
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
                <strong>{activeMachine.name} — Vegas Paytable &amp; Features</strong>
                <p>{activeMachine.description}</p>
                <div className="tm-slot-paytable-grid">
                  {machineId === 'bandit85' && (
                    <>
                      <span>777×3 = <strong>50×</strong></span>
                      <span>💎×3 = <strong>25×</strong></span>
                      <span>BAR×3 = <strong>15×</strong></span>
                      <span>🔔×3 = <strong>10×</strong></span>
                      <span>🍒×3 = <strong>6×</strong></span>
                      <span>2×🍒/Pair = <strong>2×</strong></span>
                    </>
                  )}
                  {machineId === 'silver_mustang' && (
                    <>
                      <span>🕶️ Dougie×5 = <strong>350× Line</strong></span>
                      <span>🟡 Orb Wild = <strong>1.5× Line Boost</strong></span>
                      <span>☕ 5 Coffees = <strong>5 Free Spins</strong></span>
                      <span>4+ Orbs = <strong>Progressive Pot</strong></span>
                    </>
                  )}
                  {machineId === 'lightning_vault' && (
                    <>
                      <span>⚡ 3+ Orbs = <strong>Hold &amp; Spin</strong></span>
                      <span>15/15 Orbs = <strong>GRAND 110×+</strong></span>
                      <span>🔋 100% Surge = <strong>Reel 3 Wild ×2</strong></span>
                      <span>Ante +25% = <strong>2× Orb Odds</strong></span>
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
              <div className="tm-bandit-payglass" aria-label="Slot Machine Payout Multipliers">
                <div className="tm-bandit-paychip hot"><span>777×3</span> <strong>50×</strong></div>
                <div className="tm-bandit-paychip"><span>💎×3</span> <strong>25×</strong></div>
                <div className="tm-bandit-paychip"><span>BAR×3</span> <strong>15×</strong></div>
                <div className="tm-bandit-paychip"><span>🔔×3</span> <strong>10×</strong></div>
                <div className="tm-bandit-paychip"><span>🍒×3</span> <strong>6×</strong></div>
                <div className="tm-bandit-paychip"><span>2×🍒/Pair</span> <strong>2×</strong></div>
              </div>
            )}

            {machineId === 'silver_mustang' && (
              <div className="tm-slot-feature-strip mustang">
                <div className="tm-slot-dougie-quote">{dougieBanner}</div>
                <div className="tm-slot-meters-row">
                  <div className="tm-slot-meter-pill">
                    <span>☕ COFFEE POT</span>
                    <strong>{coffeePot}/5 {mustangFreeSpins > 0 ? `• 🆓 ${mustangFreeSpins} SPINS!` : ''}</strong>
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
              <div className={`tm-video-reel-bezel ${machineId === 'buffalo_stampede' ? 'rows-4' : 'rows-3'}`}>
                <div className="tm-video-reels-grid">
                  {[0, 1, 2, 3, 4].map((colIdx) => {
                    const colSpinning = videoReelsSpinning[colIdx];
                    const rowCount = machineId === 'buffalo_stampede' ? 4 : 3;
                    const colSyms = videoGrid[colIdx] || [];
                    const previewPool =
                      machineId === 'silver_mustang'
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
                    onClick={() => activateSilverPowerup('coffeeRush', 40, '☕ 2× Coffee Rush')}
                    title="Costs 40 ⚡ Charge — Doubles wins on next spin"
                  >
                    ☕ 2× RUSH (40⚡)
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
                    title="Increases wager by +25% for 2× Lightning Orb drop odds"
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
                  <strong>🪙 {tokens.toLocaleString()}</strong>
                </div>
                <div className="tm-bandit-stat-box">
                  <span>WAGER</span>
                  <strong>{actualCost === 0 ? '🆓 DEMO' : `🪙 ${actualCost}`}</strong>
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
                <span className="tm-bandit-bet-label">BET:</span>
                {betOptions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={isAnySpinning || Boolean(lockItState?.active) || mustangFreeSpins > 0}
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
                  disabled={isAnySpinning || Boolean(lockItState?.active) || mustangFreeSpins > 0}
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
                  disabled={isAnySpinning || Boolean(lockItState?.active) || mustangFreeSpins > 0}
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
                      : mustangFreeSpins > 0
                      ? `☕ PULL FREE SPIN (${mustangFreeSpins} LEFT!)`
                      : actualCost === 0
                      ? '🕹️ PULL DEMO SPIN (0 🪙)'
                      : `🎰 SPIN FOR ${actualCost} 🪙 (UP TO ${actualCost * activeMachine.maxMult} 🪙!)`}
                  </button>
                )}
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
      </div>
    </section>
  );
}
