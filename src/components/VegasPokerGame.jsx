import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { triggerWinCelebration } from '../utils/winCelebration';
import {
  createShuffledDeck,
  evaluateBestHoldemHand,
  compareHandScores,
  decideAiPokerAction
} from '../utils/pokerEngine';
import GameShell from './GameShell';
import './VegasPokerGame.css';

const REAL_STACK_KEY = 'tm_poker_real_stack_v1';
const REAL_BOUGHT_IN_KEY = 'tm_poker_real_bought_v1';
const BEST_POT_KEY = 'tm_poker_best_pot_v1';

const CHIP_DENOMS = [
  { val: 50, color: '#ff2a85', rim: '#fde047', label: '50' },
  { val: 25, color: '#a855f7', rim: '#f5d0fe', label: '25' },
  { val: 10, color: '#00f3ff', rim: '#ecfeff', label: '10' },
  { val: 5, color: '#22c55e', rim: '#bbf7d0', label: '5' },
  { val: 1, color: '#facc15', rim: '#fef08a', label: '1' }
];

function getVisualChips(amount = 0) {
  const chips = [];
  let rem = Math.max(0, Math.floor(amount));
  for (const denom of CHIP_DENOMS) {
    while (rem >= denom.val && chips.length < 7) {
      chips.push(denom);
      rem -= denom.val;
    }
  }
  if (chips.length === 0 && amount > 0) chips.push(CHIP_DENOMS[4]);
  return chips;
}

function ChipStackVisual({ amount, compact = false }) {
  if (!amount || amount <= 0) return null;
  const chips = getVisualChips(amount);
  return (
    <div className={`tm-pk-chip-stack ${compact ? 'is-compact' : ''}`} aria-hidden="true">
      <div className="tm-pk-chips-col">
        {chips.map((c, idx) => (
          <span
            key={idx}
            className="tm-pk-chip-disc"
            style={{
              backgroundColor: c.color,
              borderColor: c.rim,
              zIndex: idx + 1
            }}
          >
            {idx === chips.length - 1 ? c.label : ''}
          </span>
        ))}
      </div>
      <span className="tm-pk-chip-val">{amount}</span>
    </div>
  );
}

function PokerCard({ card, hidden = false, highlighted = false }) {
  if (hidden || !card) {
    return (
      <div className="tm-pk-card is-back" aria-label="Hidden card">
        <span className="tm-pk-card-back-emblem">86</span>
      </div>
    );
  }
  return (
    <div
      className={`tm-pk-card ${card.isRed ? 'is-red' : 'is-black'} ${highlighted ? 'is-highlight' : ''}`}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span className="tm-pk-card-corner">{card.rank}</span>
      <span className="tm-pk-card-suit">{card.suit}</span>
      <span className="tm-pk-card-corner bottom">{card.rank}</span>
    </div>
  );
}

const INITIAL_BOTS = [
  { id: 1, name: 'Max Neon', avatar: '🕶️', personality: 'aggressive' },
  { id: 2, name: "Viper '86", avatar: '🐍', personality: 'tight' }
];

export default function VegasPokerGame({
  tokens = 0,
  soundOn = true,
  onToggleSound,
  onSpendTokens,
  onPayoutTokens,
  onBackToFeed
}) {
  const buyInOptions = ARCADE_ECONOMY_RULES.ARCADE_STAKES.POKER_BUYINS || [10, 25, 50, 100];

  const [savedRealStack, setSavedRealStack] = useState(() => {
    try {
      return Math.max(0, Number(localStorage.getItem(REAL_STACK_KEY) || 0));
    } catch {
      return 0;
    }
  });
  const [savedBoughtIn, setSavedBoughtIn] = useState(() => {
    try {
      return Math.max(0, Number(localStorage.getItem(REAL_BOUGHT_IN_KEY) || 0));
    } catch {
      return 0;
    }
  });

  // Start on Real Tokens table if already seated with real chips or >= 10 tokens; otherwise Free Practice
  const [practiceMode, setPracticeMode] = useState(() => savedRealStack <= 0 && tokens < 10);
  const [practiceChips, setPracticeChips] = useState(250);
  const [selectedBuyIn, setSelectedBuyIn] = useState(() =>
    tokens >= 25 ? 25 : buyInOptions[0] || 10
  );
  const [bestPot, setBestPot] = useState(() => {
    try {
      return Number(localStorage.getItem(BEST_POT_KEY) || 0);
    } catch {
      return 0;
    }
  });

  const [phase, setPhase] = useState('idle'); // 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
  const [dealerIdx, setDealerIdx] = useState(0);
  const [community, setCommunity] = useState([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [raiseStep, setRaiseStep] = useState(10);
  const [turnIdx, setTurnIdx] = useState(null); // 0 | 1 | 2 | null
  const [statusBanner, setStatusBanner] = useState(
    'Buy in with 🪙 site tokens or practice free to deal Texas Hold\'em!'
  );
  const [winnerIds, setWinnerIds] = useState([]);
  const [showdownSummary, setShowdownSummary] = useState('');

  const [seats, setSeats] = useState([
    { id: 0, name: 'You', avatar: '⚡', chips: savedRealStack > 0 ? savedRealStack : 250, hole: [], bet: 0, folded: false, allIn: false, acted: false, lastAction: '' },
    { id: 1, name: INITIAL_BOTS[0].name, avatar: INITIAL_BOTS[0].avatar, chips: 150, hole: [], bet: 0, folded: false, allIn: false, acted: false, lastAction: '' },
    { id: 2, name: INITIAL_BOTS[1].name, avatar: INITIAL_BOTS[1].avatar, chips: 150, hole: [], bet: 0, folded: false, allIn: false, acted: false, lastAction: '' }
  ]);

  const deckRef = useRef([]);
  const aiTimerRef = useRef(null);
  const streetTimerRef = useRef(null);
  const turnIdxRef = useRef(null);

  useEffect(() => {
    turnIdxRef.current = turnIdx;
  }, [turnIdx]);

  const playerChips = practiceMode ? practiceChips : savedRealStack;

  // Persist real token chip stack safely so players never lose chips on accidental tab switch
  const syncRealStackStorage = useCallback((nextStack, nextBought) => {
    setSavedRealStack(nextStack);
    if (typeof nextBought === 'number') setSavedBoughtIn(nextBought);
    try {
      localStorage.setItem(REAL_STACK_KEY, String(Math.max(0, Math.floor(nextStack))));
      if (typeof nextBought === 'number') {
        localStorage.setItem(REAL_BOUGHT_IN_KEY, String(Math.max(0, Math.floor(nextBought))));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (streetTimerRef.current) clearTimeout(streetTimerRef.current);
    };
  }, []);

  const blindSmall = playerChips >= 100 ? 2 : 1;
  const blindBig = playerChips >= 100 ? 5 : 2;

  const livePlayerHand = useMemo(() => {
    const mySeat = seats[0];
    if (!mySeat?.hole || mySeat.hole.length < 2) return null;
    return evaluateBestHoldemHand([...mySeat.hole, ...community]);
  }, [community, seats]);

  const handleBuyInTokens = (amount) => {
    if (phase !== 'idle' && phase !== 'showdown') return;
    if (!onSpendTokens || tokens < amount) {
      setStatusBanner(`Need ${amount} 🪙 in wallet! Switch to Free Practice or buy smaller stack.`);
      sfx.playError?.();
      return;
    }
    const ok = onSpendTokens(amount, `Neon Hold'em '86 Buy-In (${amount} 🪙)`);
    if (!ok) return;
    sfx.playPokerChip?.(3);
    const nextStack = savedRealStack + amount;
    const nextBought = savedBoughtIn + amount;
    setPracticeMode(false);
    syncRealStackStorage(nextStack, nextBought);
    setSeats((prev) =>
      prev.map((s, idx) =>
        idx === 0
          ? { ...s, chips: nextStack, hole: [], bet: 0, lastAction: `BOUGHT ${amount} 🪙` }
          : { ...s, chips: Math.max(s.chips, amount * 2), hole: [], bet: 0, lastAction: '' }
      )
    );
    setPhase('idle');
    setStatusBanner(`🟡 Stacked ${nextStack} 🪙 chips at the table! Hit Deal Hand to play.`);
  };

  const handleCashOutChips = () => {
    if (phase !== 'idle' && phase !== 'showdown') return;
    if (practiceMode || savedRealStack <= 0) return;

    const rawCashout = savedRealStack;
    const stakedRef = Math.max(1, savedBoughtIn || rawCashout);
    const verifiedPayout = validateStakedGamePayout({
      stakedTokens: stakedRef,
      rawPayout: rawCashout,
      maxMultiplier: ARCADE_ECONOMY_RULES.ARCADE_STAKES.POKER_MAX_MULTIPLIER || 12
    });

    if (onPayoutTokens && verifiedPayout > 0) {
      onPayoutTokens(verifiedPayout, {
        stakedTokens: stakedRef,
        xp: verifiedPayout > stakedRef ? 45 : 15,
        label: `🃏 Poker Cashout +${verifiedPayout} 🪙`,
        emoji: '🃏'
      });
    }

    if (verifiedPayout > stakedRef) {
      triggerWinCelebration({
        amount: verifiedPayout,
        unit: '🪙',
        game: "Neon Hold'em '86",
        headline: '🃏 POKER TABLE CASHOUT!',
        detail: `Cashed ${verifiedPayout} 🪙 back to Wallet!`,
        multiplier: verifiedPayout / stakedRef,
        tier: verifiedPayout >= stakedRef * 2.5 ? 'jackpot' : 'big'
      });
    } else {
      sfx.playPokerChip?.(4);
    }

    syncRealStackStorage(0, 0);
    setPhase('idle');
    setCommunity([]);
    setPot(0);
    setWinnerIds([]);
    setShowdownSummary('');
    setSeats((prev) => prev.map((s) => ({ ...s, hole: [], bet: 0, lastAction: '', chips: s.id === 0 ? 0 : s.chips })));
    setStatusBanner(`💰 Cashed out ${verifiedPayout} 🪙 back into your Arcade Wallet!`);
  };

  const resolveShowdown = useCallback(
    (finalSeats, boardCards, totalPot, earlyWinSeatId = null) => {
      let winners = [];
      let summaryText;

      if (earlyWinSeatId !== null) {
        winners = [finalSeats[earlyWinSeatId]];
        summaryText = `${winners[0].name} wins ${totalPot} ${practiceMode ? 'chips' : '🪙'} (everyone else folded)!`;
      } else {
        const contenders = finalSeats
          .filter((s) => !s.folded)
          .map((s) => ({
            seat: s,
            evalRes: evaluateBestHoldemHand([...s.hole, ...boardCards])
          }));
        contenders.sort((a, b) => compareHandScores(b.evalRes.score, a.evalRes.score));
        const topScore = contenders[0].evalRes.score;
        const winningEntries = contenders.filter(
          (c) => compareHandScores(c.evalRes.score, topScore) === 0
        );
        winners = winningEntries.map((c) => c.seat);
        const names = winners.map((w) => w.name).join(' & ');
        summaryText = `${names} ${winners.length > 1 ? 'split' : 'wins'} ${totalPot} ${practiceMode ? 'chips' : '🪙'} with ${contenders[0].evalRes.name}!`;
      }

      const share = Math.floor(totalPot / winners.length);
      const remainder = totalPot - share * winners.length;
      const winIdSet = new Set(winners.map((w) => w.id));

      const nextSeats = finalSeats.map((s) => {
        if (!winIdSet.has(s.id)) return { ...s, bet: 0 };
        const extra = s.id === winners[0].id ? remainder : 0;
        return { ...s, chips: s.chips + share + extra, bet: 0 };
      });

      const playerWon = winIdSet.has(0);
      const nextPlayerChips = nextSeats[0].chips;

      if (practiceMode) {
        setPracticeChips(nextPlayerChips);
      } else {
        syncRealStackStorage(nextPlayerChips);
      }

      if (playerWon && totalPot > bestPot) {
        setBestPot(totalPot);
        try {
          localStorage.setItem(BEST_POT_KEY, String(totalPot));
        } catch {
          // ignore
        }
      }

      setSeats(nextSeats);
      setPot(0);
      setCurrentBet(0);
      setWinnerIds(winners.map((w) => w.id));
      setShowdownSummary(summaryText);
      setPhase('showdown');
      turnIdxRef.current = null;
      setTurnIdx(null);
      setStatusBanner(`🏆 ${summaryText}`);
      sfx.playPokerShowdown?.(playerWon);

      if (playerWon && totalPot >= 30) {
        triggerWinCelebration({
          amount: share,
          unit: practiceMode ? 'CHIPS' : '🪙',
          game: "Neon Hold'em '86",
          headline: earlyWinSeatId === 0 ? '😎 BLUFF / POT SCOOPED!' : '🃏 SHOWDOWN WINNER!',
          detail: summaryText,
          multiplier: Math.max(2, Math.round(totalPot / Math.max(10, blindBig * 5))),
          tier: totalPot >= 100 ? 'jackpot' : 'big'
        });
      }
    },
    [bestPot, blindBig, practiceMode, syncRealStackStorage]
  );

  const advanceStreetOrShowdown = useCallback(
    (curSeats, curCommunity, curPot, curPhase) => {
      const stepStreet = (sSeats, sCommunity, sPot, sPhase) => {
        const activeUnfolded = sSeats.filter((s) => !s.folded);
        if (activeUnfolded.length === 1) {
          resolveShowdown(sSeats, sCommunity, sPot, activeUnfolded[0].id);
          return;
        }

        const resetSeats = sSeats.map((s) => ({
          ...s,
          bet: 0,
          acted: s.folded || s.allIn,
          lastAction: s.folded ? 'FOLDED' : s.allIn ? 'ALL IN' : ''
        }));

        let nextPhase = 'showdown';
        let nextBoard = [...sCommunity];
        if (sPhase === 'preflop') {
          nextPhase = 'flop';
          nextBoard = [...sCommunity, deckRef.current.pop(), deckRef.current.pop(), deckRef.current.pop()];
          sfx.playCardDeal?.();
        } else if (sPhase === 'flop') {
          nextPhase = 'turn';
          nextBoard = [...sCommunity, deckRef.current.pop()];
          sfx.playCardFlip?.();
        } else if (sPhase === 'turn') {
          nextPhase = 'river';
          nextBoard = [...sCommunity, deckRef.current.pop()];
          sfx.playCardFlip?.();
        }

        if (nextPhase === 'showdown') {
          resolveShowdown(resetSeats, nextBoard, sPot, null);
          return;
        }

        const ableToBet = resetSeats.filter((s) => !s.folded && !s.allIn && s.chips > 0);
        setSeats(resetSeats);
        setCommunity(nextBoard);
        setCurrentBet(0);
        setPhase(nextPhase);

        if (ableToBet.length <= 1) {
          turnIdxRef.current = null;
          setTurnIdx(null);
          setStatusBanner(`⚡ ALL-IN RUNOUT — Dealing ${nextPhase.toUpperCase()}!`);
          if (streetTimerRef.current) clearTimeout(streetTimerRef.current);
          streetTimerRef.current = setTimeout(() => {
            stepStreet(resetSeats, nextBoard, sPot, nextPhase);
          }, 700);
          return;
        }

        let nextActor = (dealerIdx + 1) % 3;
        for (let step = 0; step < 3; step += 1) {
          const candidate = (dealerIdx + 1 + step) % 3;
          if (!resetSeats[candidate].folded && !resetSeats[candidate].allIn && resetSeats[candidate].chips > 0) {
            nextActor = candidate;
            break;
          }
        }
        turnIdxRef.current = nextActor;
        setTurnIdx(nextActor);
        setStatusBanner(`🃏 ${nextPhase.toUpperCase()} dealt — ${resetSeats[nextActor].name}'s turn!`);
      };

      stepStreet(curSeats, curCommunity, curPot, curPhase);
    },
    [dealerIdx, resolveShowdown]
  );

  const applySeatAction = useCallback(
    (seatId, action, snapshot) => {
      if (turnIdxRef.current !== seatId) return;
      const { curSeats, curCommunity, curPot, curBet, curPhase } = snapshot;
      const actor = curSeats[seatId];
      if (!actor || actor.folded || actor.allIn) return;

      let addedToPot = 0;
      let nextHighestBet = curBet;
      let label = '';
      let isRaise = false;
      let folded = false;
      let allIn = false;

      if (action.type === 'fold') {
        folded = true;
        label = 'FOLD';
        sfx.playPokerFold?.();
      } else if (action.type === 'check') {
        label = 'CHECK';
        sfx.playPokerCheck?.();
      } else {
        const toCall = Math.max(0, curBet - actor.bet);
        let commit;
        if (action.type === 'call') {
          commit = Math.min(actor.chips, toCall);
          label = commit >= actor.chips ? `ALL IN ${actor.chips}` : `CALL ${commit}`;
        } else {
          // bet or raise
          commit = Math.min(actor.chips, Math.max(toCall, action.amount));
          if (actor.bet + commit > curBet) {
            isRaise = true;
            nextHighestBet = actor.bet + commit;
            label =
              commit >= actor.chips
                ? `🔥 ALL IN ${actor.chips}`
                : curBet === 0
                  ? `BET ${commit}`
                  : `RAISE TO ${nextHighestBet}`;
          } else {
            label = `CALL ${commit}`;
          }
        }
        addedToPot = commit;
        if (commit >= actor.chips) {
          allIn = true;
          sfx.playPokerAllIn?.();
        } else {
          sfx.playPokerChip?.(isRaise ? 3 : 2);
        }
      }

      const nextPot = curPot + addedToPot;
      const updatedSeats = curSeats.map((s) => {
        if (s.id === seatId) {
          return {
            ...s,
            chips: s.chips - addedToPot,
            bet: s.bet + addedToPot,
            folded,
            allIn,
            acted: true,
            lastAction: label
          };
        }
        // If someone raised, other active non-allin players need to act again
        if (isRaise && !s.folded && !s.allIn) {
          return { ...s, acted: false };
        }
        return s;
      });

      if (seatId === 0) {
        if (practiceMode) setPracticeChips(updatedSeats[0].chips);
        else syncRealStackStorage(updatedSeats[0].chips);
      }

      // Check immediate win by fold
      const unfolded = updatedSeats.filter((s) => !s.folded);
      if (unfolded.length === 1) {
        setSeats(updatedSeats);
        resolveShowdown(updatedSeats, curCommunity, nextPot, unfolded[0].id);
        return;
      }

      // Find next actor who hasn't acted or hasn't matched bet
      let nextActor = null;
      for (let step = 1; step <= 3; step += 1) {
        const candIdx = (seatId + step) % 3;
        const cand = updatedSeats[candIdx];
        if (!cand.folded && !cand.allIn && (!cand.acted || cand.bet < nextHighestBet)) {
          nextActor = candIdx;
          break;
        }
      }

      setSeats(updatedSeats);
      setPot(nextPot);
      setCurrentBet(nextHighestBet);

      if (nextActor === null) {
        turnIdxRef.current = null;
        setTurnIdx(null);
        setStatusBanner(`✨ Betting round complete (${nextPot} ${practiceMode ? 'chips' : '🪙'} in pot)`);
        if (streetTimerRef.current) clearTimeout(streetTimerRef.current);
        streetTimerRef.current = setTimeout(() => {
          advanceStreetOrShowdown(updatedSeats, curCommunity, nextPot, curPhase);
        }, 460);
      } else {
        turnIdxRef.current = nextActor;
        setTurnIdx(nextActor);
        setStatusBanner(`${actor.name}: ${label} • Waiting for ${updatedSeats[nextActor].name}`);
      }
    },
    [advanceStreetOrShowdown, practiceMode, resolveShowdown, syncRealStackStorage]
  );

  // Trigger AI turn cleanly when turnIdx is 1 or 2
  useEffect(() => {
    if (turnIdx !== 1 && turnIdx !== 2) return undefined;
    if (!['preflop', 'flop', 'turn', 'river'].includes(phase)) return undefined;

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const bot = seats[turnIdx];
      const toCall = Math.max(0, currentBet - bot.bet);
      const decision = decideAiPokerAction({
        holeCards: bot.hole,
        communityCards: community,
        toCall,
        aiChips: bot.chips,
        pot,
        minRaiseIncrement: Math.max(5, blindBig * 2),
        personality: INITIAL_BOTS[turnIdx - 1].personality
      });
      applySeatAction(turnIdx, decision, {
        curSeats: seats,
        curCommunity: community,
        curPot: pot,
        curBet: currentBet,
        curPhase: phase
      });
    }, 520);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [applySeatAction, blindBig, community, currentBet, phase, pot, seats, turnIdx]);

  const startNewHand = () => {
    const activeStack = practiceMode ? practiceChips : savedRealStack;
    if (activeStack <= 0) {
      if (practiceMode) {
        setPracticeChips(250);
      } else {
        setStatusBanner('Buy in with 🪙 site tokens below to stack your chips!');
        sfx.playError?.();
        return;
      }
    }

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (streetTimerRef.current) clearTimeout(streetTimerRef.current);
    const deck = createShuffledDeck();
    deckRef.current = deck;

    const nextDealer = phase === 'idle' ? 0 : (dealerIdx + 1) % 3;
    const sbSeat = (nextDealer + 1) % 3;
    const bbSeat = (nextDealer + 2) % 3;

    const baseStack = Math.max(100, (practiceMode ? Math.max(250, practiceChips) : savedRealStack) * 1.4);
    const dealtSeats = seats.map((s, idx) => {
      const startChips =
        idx === 0
          ? practiceMode
            ? Math.max(activeStack, 0) || 250
            : savedRealStack
          : s.chips < 20
            ? Math.round(baseStack / 10) * 10
            : s.chips;

      const blindCost =
        idx === sbSeat ? Math.min(startChips, blindSmall) : idx === bbSeat ? Math.min(startChips, blindBig) : 0;

      return {
        ...s,
        chips: startChips - blindCost,
        hole: [deck.pop(), deck.pop()],
        bet: blindCost,
        folded: false,
        allIn: startChips - blindCost === 0,
        acted: false,
        lastAction: idx === sbSeat ? `SB ${blindCost}` : idx === bbSeat ? `BB ${blindCost}` : ''
      };
    });

    const initialPot = dealtSeats.reduce((sum, s) => sum + s.bet, 0);
    const highBet = Math.max(...dealtSeats.map((s) => s.bet));

    if (!practiceMode) {
      syncRealStackStorage(dealtSeats[0].chips);
    } else {
      setPracticeChips(dealtSeats[0].chips);
    }

    let firstToAct = null;
    for (let step = 1; step <= 3; step += 1) {
      const candIdx = (bbSeat + step) % 3;
      if (!dealtSeats[candIdx].folded && !dealtSeats[candIdx].allIn && dealtSeats[candIdx].chips > 0) {
        firstToAct = candIdx;
        break;
      }
    }

    sfx.playCardDeal?.();
    setDealerIdx(nextDealer);
    setSeats(dealtSeats);
    setCommunity([]);
    setPot(initialPot);
    setCurrentBet(highBet);
    setRaiseStep(Math.max(5, blindBig * 2));
    setWinnerIds([]);
    setShowdownSummary('');
    setPhase('preflop');
    turnIdxRef.current = firstToAct;
    setTurnIdx(firstToAct);
    if (firstToAct === null) {
      setStatusBanner(`⚡ ALL-IN BLINDS — Dealing Flop!`);
      streetTimerRef.current = setTimeout(() => {
        advanceStreetOrShowdown(dealtSeats, [], initialPot, 'preflop');
      }, 460);
    } else {
      setStatusBanner(`🃏 Hole cards dealt! Blinds ${blindSmall}/${blindBig} — ${dealtSeats[firstToAct].name} to act.`);
    }
  };

  const mySeat = seats[0];
  const isPlayerTurn = turnIdx === 0 && ['preflop', 'flop', 'turn', 'river'].includes(phase);
  const toCall = Math.max(0, currentBet - (mySeat?.bet || 0));
  const minRaiseAmount = toCall + Math.max(5, raiseStep);

  return (
    <GameShell
      title="NEON HOLD'EM '86 POKER"
      eyebrow="TEXAS HOLD'EM • CHIPS & TOKEN STAKES"
      tokens={tokens}
      hasPractice
      practiceMode={practiceMode}
      practiceDisabled={phase !== 'idle' && phase !== 'showdown'}
      onTogglePractice={() => {
        if (phase !== 'idle' && phase !== 'showdown') return;
        const next = !practiceMode;
        sfx.playToggle?.();
        setPracticeMode(next);
        setWinnerIds([]);
        setShowdownSummary('');
        setPhase('idle');
        turnIdxRef.current = null;
        setTurnIdx(null);
        setSeats((prev) =>
          prev.map((s) => (s.id === 0 ? { ...s, chips: next ? practiceChips : savedRealStack } : s))
        );
      }}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      onBackToFeed={onBackToFeed}
      statusBanner={statusBanner}
      howToPlay={[
        'In Real 🪙 Tokens mode, convert site tokens into casino chips (1 chip = 1 🪙), play No-Limit Texas Hold’em vs 2 AI sharks, and 💰 Cash Out your chip stack back to your wallet anytime between hands.',
        'Blinds rotate automatically with the Dealer button (D). Check, Call, Raise by +5/+10/+25 or 1/2 Pot, or shove ALL IN!',
        'Best 5-card Hold’em hand using your 2 hole cards + 5 community cards takes the pot.'
      ]}
    >
      <div className="tm-pk-cabinet">
        {/* Top Table Telemetry & Real Token Cashout / Buy-In Bar */}
        <div className="tm-pk-topbar">
          <div className="tm-pk-stat-group">
            <span className="tm-pk-pill">
              YOUR CHIPS: <strong style={{ color: '#facc15' }}>{playerChips} {practiceMode ? 'FREE' : '🪙'}</strong>
            </span>
            <span className="tm-pk-pill">
              POT: <strong style={{ color: '#4ade80' }}>{pot}</strong>
            </span>
            {bestPot > 0 && (
              <span className="tm-pk-pill">
                BEST POT: <strong>{bestPot}</strong>
              </span>
            )}
          </div>

          {!practiceMode && savedRealStack > 0 && (phase === 'idle' || phase === 'showdown') && (
            <button type="button" className="tm-pk-cashout-btn" onClick={handleCashOutChips}>
              💰 Cash Out {savedRealStack} 🪙
            </button>
          )}
        </div>

        {/* AI Opponent Seats Row */}
        <div className="tm-pk-opponents">
          {seats.slice(1).map((bot) => {
            const isTurn = turnIdx === bot.id;
            const isWinner = winnerIds.includes(bot.id);
            const revealBot = phase === 'showdown' && !bot.folded;
            return (
              <div
                key={bot.id}
                className={`tm-pk-seat bot ${isTurn ? 'is-turn' : ''} ${bot.folded ? 'is-folded' : ''} ${isWinner ? 'is-winner' : ''}`}
              >
                <div className="tm-pk-seat-head">
                  <span>
                    {bot.avatar} <strong>{bot.name}</strong>
                    {dealerIdx === bot.id && <span className="tm-pk-dealer-btn">D</span>}
                  </span>
                  <span className="tm-pk-seat-chips">🟡 {bot.chips}</span>
                </div>
                <div className="tm-pk-seat-cards-row">
                  <div className="tm-pk-cards-pair">
                    {bot.hole.length > 0 ? (
                      bot.hole.map((c) => <PokerCard key={c.id} card={c} hidden={!revealBot} />)
                    ) : (
                      <>
                        <div className="tm-pk-card-slot" />
                        <div className="tm-pk-card-slot" />
                      </>
                    )}
                  </div>
                  <div className="tm-pk-seat-meta">
                    {bot.lastAction && <span className="tm-pk-action-tag">{bot.lastAction}</span>}
                    {bot.bet > 0 && <ChipStackVisual amount={bot.bet} compact />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Glowing Synthwave Felt Table Center: Pot + 5 Community Cards */}
        <div className="tm-pk-felt">
          <div className="tm-pk-felt-pot">
            <span className="tm-pk-pot-label">CENTER POT</span>
            <div className="tm-pk-pot-visual">
              <ChipStackVisual amount={pot} />
              {pot === 0 && <span className="tm-pk-pot-empty">Blinds {blindSmall}/{blindBig}</span>}
            </div>
          </div>

          <div className="tm-pk-board" aria-label="Community cards">
            {Array.from({ length: 5 }).map((_, idx) => {
              const card = community[idx];
              return card ? (
                <PokerCard key={card.id} card={card} />
              ) : (
                <div key={idx} className="tm-pk-card-slot board">
                  {idx < 3 ? 'FLOP' : idx === 3 ? 'TURN' : 'RIVER'}
                </div>
              );
            })}
          </div>

          {showdownSummary && <div className="tm-pk-showdown-banner">{showdownSummary}</div>}
        </div>

        {/* Player Seat & Hole Cards */}
        <div
          className={`tm-pk-player-seat ${turnIdx === 0 ? 'is-turn' : ''} ${mySeat.folded ? 'is-folded' : ''} ${winnerIds.includes(0) ? 'is-winner' : ''}`}
        >
          <div className="tm-pk-player-left">
            <div className="tm-pk-seat-head">
              <span>
                ⚡ <strong>YOU</strong>
                {dealerIdx === 0 && <span className="tm-pk-dealer-btn">D</span>}
              </span>
              {mySeat.lastAction && <span className="tm-pk-action-tag">{mySeat.lastAction}</span>}
            </div>
            <div className="tm-pk-cards-pair player">
              {mySeat.hole.length > 0 ? (
                mySeat.hole.map((c) => <PokerCard key={c.id} card={c} highlighted={winnerIds.includes(0)} />)
              ) : (
                <>
                  <div className="tm-pk-card-slot" />
                  <div className="tm-pk-card-slot" />
                </>
              )}
            </div>
            {livePlayerHand && mySeat.hole.length > 0 && (
              <div className="tm-pk-hand-rank-pill">🃏 {livePlayerHand.name}</div>
            )}
          </div>

          <div className="tm-pk-player-chips-area">
            <div className="tm-pk-stack-label">YOUR STACK</div>
            <ChipStackVisual amount={phase === 'idle' ? playerChips : mySeat.chips} />
            {mySeat.bet > 0 && (
              <div className="tm-pk-current-bet-badge">IN POT: {mySeat.bet}</div>
            )}
          </div>
        </div>

        {/* Controls Bar: Buy-In / Deal Hand / Raise / Call / Check / Fold */}
        <div className="tm-pk-controls">
          {phase === 'idle' || phase === 'showdown' ? (
            <div className="tm-pk-idle-controls">
              {!practiceMode && (
                <div className="tm-pk-buyin-row">
                  <span className="tm-pk-buyin-lbl">🪙 Chip Buy-In:</span>
                  {buyInOptions.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`tm-pk-chip-btn ${selectedBuyIn === amt ? 'active' : ''}`}
                      disabled={tokens < amt}
                      onClick={() => {
                        setSelectedBuyIn(amt);
                        handleBuyInTokens(amt);
                      }}
                    >
                      +{amt} 🪙
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="tm-pk-deal-btn"
                disabled={!practiceMode && playerChips <= 0}
                onClick={startNewHand}
              >
                {!practiceMode && playerChips <= 0
                  ? '🪙 Tap +Buy-In Chips Above to Play'
                  : phase === 'showdown'
                    ? '🃏 DEAL NEXT HAND'
                    : '🃏 DEAL TEXAS HOLD’EM HAND'}
              </button>
            </div>
          ) : isPlayerTurn ? (
            <div className="tm-pk-turn-controls">
              <div className="tm-pk-raise-sizes">
                {[5, 10, 25].map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={`tm-pk-size-pill ${raiseStep === step ? 'active' : ''}`}
                    onClick={() => {
                      sfx.playToggle?.();
                      setRaiseStep(step);
                    }}
                  >
                    +{step}
                  </button>
                ))}
                <button
                  type="button"
                  className="tm-pk-size-pill"
                  onClick={() => {
                    sfx.playToggle?.();
                    setRaiseStep(Math.max(5, Math.round(pot / 2 / 5) * 5));
                  }}
                >
                  ½ Pot
                </button>
              </div>

              <div className="tm-pk-action-buttons">
                <button
                  type="button"
                  className="tm-pk-act-btn fold"
                  onClick={() =>
                    applySeatAction(
                      0,
                      { type: 'fold', amount: 0 },
                      { curSeats: seats, curCommunity: community, curPot: pot, curBet: currentBet, curPhase: phase }
                    )
                  }
                >
                  ✖ Fold
                </button>

                <button
                  type="button"
                  className="tm-pk-act-btn check"
                  onClick={() =>
                    applySeatAction(
                      0,
                      toCall > 0 ? { type: 'call', amount: toCall } : { type: 'check', amount: 0 },
                      { curSeats: seats, curCommunity: community, curPot: pot, curBet: currentBet, curPhase: phase }
                    )
                  }
                >
                  {toCall > 0 ? `✅ Call ${Math.min(mySeat.chips, toCall)}` : '✋ Check'}
                </button>

                {mySeat.chips > toCall && (
                  <button
                    type="button"
                    className="tm-pk-act-btn raise"
                    onClick={() =>
                      applySeatAction(
                        0,
                        { type: currentBet === 0 ? 'bet' : 'raise', amount: minRaiseAmount },
                        { curSeats: seats, curCommunity: community, curPot: pot, curBet: currentBet, curPhase: phase }
                      )
                    }
                  >
                    🟡 {currentBet === 0 ? 'Bet' : 'Raise'} {Math.min(mySeat.chips, minRaiseAmount)}
                  </button>
                )}

                {mySeat.chips > 0 && (
                  <button
                    type="button"
                    className="tm-pk-act-btn allin"
                    onClick={() =>
                      applySeatAction(
                        0,
                        { type: 'raise', amount: mySeat.chips },
                        { curSeats: seats, curCommunity: community, curPot: pot, curBet: currentBet, curPhase: phase }
                      )
                    }
                  >
                    🔥 ALL IN ({mySeat.chips})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="tm-pk-waiting-bar">
              ⏳ {turnIdx !== null ? `${seats[turnIdx]?.name} thinking...` : 'Dealing cards...'}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
