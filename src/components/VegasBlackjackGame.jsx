import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import { checkDailyPerk, consumeDailyPerk } from '../utils/memeFeedBridge';
import { triggerWinCelebration } from '../utils/winCelebration';
import './VegasBlackjackGame.css';

// ==========================================
// 80s NEON CYBER-21 BLACKJACK — HOLOGRAPHIC CARDS, SPLIT, DOUBLE DOWN,
// 5-CARD CHARLIE, PERFECT PAIR + 21+3 SIDE BET & CYBER-VISOR ADVISOR
// ==========================================

const SUITS = [
  { id: 'spades', sym: '♠', color: '#00f3ff', glow: 'rgba(0, 243, 255, 0.45)', name: 'Cyber Spades' },
  { id: 'hearts', sym: '♥', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.45)', name: 'Neon Hearts' },
  { id: 'diamonds', sym: '♦', color: '#facc15', glow: 'rgba(250, 204, 21, 0.45)', name: 'Laser Diamonds' },
  { id: 'clubs', sym: '♣', color: '#4ade80', glow: 'rgba(74, 222, 128, 0.45)', name: 'Matrix Clubs' }
];

const RANKS = [
  { r: 'A', val: 11, order: 14, emblem: '🌟' },
  { r: '2', val: 2, order: 2, emblem: '2' },
  { r: '3', val: 3, order: 3, emblem: '3' },
  { r: '4', val: 4, order: 4, emblem: '4' },
  { r: '5', val: 5, order: 5, emblem: '5' },
  { r: '6', val: 6, order: 6, emblem: '6' },
  { r: '7', val: 7, order: 7, emblem: '🎰' },
  { r: '8', val: 8, order: 8, emblem: '8' },
  { r: '9', val: 9, order: 9, emblem: '9' },
  { r: '10', val: 10, order: 10, emblem: '🔟' },
  { r: 'J', val: 10, order: 11, emblem: '⚡' },
  { r: 'Q', val: 10, order: 12, emblem: '💎' },
  { r: 'K', val: 10, order: 13, emblem: '👑' }
];

function buildShuffledShoe(decks = 4) {
  const shoe = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) {
      for (const rk of RANKS) {
        shoe.push({
          uid: `${d}-${rk.r}-${s.id}-${Math.random().toString(36).slice(2, 7)}`,
          rank: rk.r,
          val: rk.val,
          order: rk.order,
          emblem: rk.emblem,
          suit: s.sym,
          suitId: s.id,
          color: s.color,
          glow: s.glow
        });
      }
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function evaluateHand(cards = []) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.val;
    if (c.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  const isSoft = aces > 0 && total <= 21;
  const isBlackjack = cards.length === 2 && total === 21;
  const isBust = total > 21;
  const isFiveCardCharlie = cards.length >= 5 && total <= 21;
  return {
    total,
    isSoft,
    isBlackjack,
    isBust,
    isFiveCardCharlie,
    label: isBlackjack
      ? '21 BLACKJACK!'
      : isBust
      ? `${total} BUST`
      : isFiveCardCharlie
      ? `${total} (5-CARD CHARLIE!)`
      : isSoft && total < 21
      ? `${total - 10} / ${total} SOFT`
      : `${total}`
  };
}

function evaluateSideBet(playerCards, dealerUpCard) {
  if (!playerCards || playerCards.length < 2 || !dealerUpCard) return null;
  const [c1, c2] = playerCards;

  // 1. Check Perfect Pair (First 2 Player Cards)
  if (c1.rank === c2.rank) {
    if (c1.suitId === c2.suitId) {
      return { mult: 12, name: '💎 SUITED PERFECT PAIR (12×)!' };
    }
    return { mult: 6, name: '⚡ NEON PAIR BONUS (6×)!' };
  }

  // 2. Check 21+3 Three-Card Poker Hand (Player 2 cards + Dealer Upcard)
  const three = [c1, c2, dealerUpCard];
  const allSameSuit = three.every((c) => c.suitId === c1.suitId);
  const allSameRank = three.every((c) => c.rank === c1.rank);
  const orders = three.map((c) => c.order).sort((a, b) => a - b);
  const isStraight =
    (orders[1] === orders[0] + 1 && orders[2] === orders[1] + 1) ||
    (orders[0] === 2 && orders[1] === 3 && orders[2] === 14); // A-2-3

  if (allSameSuit && isStraight) {
    return { mult: 15, name: '🌈 21+3 STRAIGHT FLUSH (15×)!' };
  }
  if (allSameRank) {
    return { mult: 12, name: '🔥 21+3 THREE OF A KIND (12×)!' };
  }
  if (isStraight) {
    return { mult: 6, name: '⚡ 21+3 CYBER STRAIGHT (6×)!' };
  }
  if (allSameSuit) {
    return { mult: 4, name: '💧 21+3 NEON FLUSH (4×)!' };
  }
  return null;
}

function getCyberVisorAdvice(handCards, dealerUpCard, canDouble, canSplit) {
  if (!handCards || handCards.length === 0 || !dealerUpCard) return null;
  const info = evaluateHand(handCards);
  if (info.isBlackjack || info.isBust || info.total === 21) {
    return { action: 'STAND', reason: 'You have 21 — lock it in!', color: '#4ade80' };
  }
  const dVal = dealerUpCard.val; // 2..11

  if (canSplit && handCards.length === 2 && handCards[0].val === handCards[1].val) {
    const pairVal = handCards[0].val;
    if (pairVal === 11 || pairVal === 8) {
      return {
        action: 'SPLIT',
        reason: `Always split ${handCards[0].rank}s for maximum EV!`,
        color: '#c084fc'
      };
    }
    if (pairVal === 10) {
      return {
        action: 'STAND',
        reason: 'Never split 20 — 20 is a dominant winning hand!',
        color: '#4ade80'
      };
    }
  }

  if (handCards.length === 4 && info.total <= 16) {
    return {
      action: 'HIT (CHARLIE SHOT!)',
      reason: '4 cards at ' + info.total + ' — 1 more safe card triggers 3× 5-Card Charlie!',
      color: '#facc15'
    };
  }

  if (canDouble && (info.total === 11 || (info.total === 10 && dVal < 10))) {
    return {
      action: 'DOUBLE DOWN',
      reason: `Strong ${info.total} vs Dealer ${dealerUpCard.rank} — Double for 2× payout!`,
      color: '#facc15'
    };
  }

  if (info.isSoft) {
    if (info.total >= 19) {
      return { action: 'STAND', reason: `Soft ${info.total} is strong — Stand!`, color: '#4ade80' };
    }
    if (info.total === 18) {
      return dVal >= 9
        ? { action: 'HIT', reason: `Soft 18 vs strong Dealer ${dealerUpCard.rank} — Hit to improve!`, color: '#00f3ff' }
        : { action: 'STAND', reason: `Soft 18 vs Dealer ${dealerUpCard.rank} — Stand!`, color: '#4ade80' };
    }
    return { action: 'HIT', reason: `Soft ${info.total} cannot bust — Hit freely!`, color: '#00f3ff' };
  }

  if (info.total >= 17) {
    return { action: 'STAND', reason: `Hard ${info.total} — High bust risk, Stand!`, color: '#4ade80' };
  }
  if (info.total >= 13 && info.total <= 16) {
    if (dVal >= 2 && dVal <= 6) {
      return {
        action: 'STAND',
        reason: `Dealer shows bust card (${dealerUpCard.rank}) — Let Dealer bust!`,
        color: '#4ade80'
      };
    }
    return {
      action: 'HIT',
      reason: `Dealer shows strong ${dealerUpCard.rank} — Hit to beat 17+!`,
      color: '#00f3ff'
    };
  }
  if (info.total === 12) {
    return dVal >= 4 && dVal <= 6
      ? { action: 'STAND', reason: `Dealer shows ${dealerUpCard.rank} — Stand on 12!`, color: '#4ade80' }
      : { action: 'HIT', reason: `12 vs Dealer ${dealerUpCard.rank} — Hit!`, color: '#00f3ff' };
  }
  return { action: 'HIT', reason: `Total is ${info.total} — Zero bust risk, Hit!`, color: '#00f3ff' };
}

export default function VegasBlackjackGame({
  tokens = 0,
  onSpendTokens,
  onPayoutTokens,
  onRecordHighScore,
  onOpenUpload,
  onBackToFeed
}) {
  const betOptions = ARCADE_ECONOMY_RULES.ARCADE_STAKES.BLACKJACK_BETS || [5, 10, 25, 50];

  const [shoe, setShoe] = useState(() => buildShuffledShoe(4));
  const shoeRef = useRef(shoe);

  const smallestChip = betOptions[0] || 5;
  const [betAmount, setBetAmount] = useState(() =>
    tokens >= 10 ? 10 : smallestChip
  );
  const [practiceMode, setPracticeMode] = useState(() => tokens < smallestChip);
  const [sideBetOn, setSideBetOn] = useState(false); // 5-Token Perfect Pair + 21+3 side bet
  const [visorOn, setVisorOn] = useState(true);

  // Game phase: 'betting' | 'playing' | 'dealer' | 'settled'
  const [phase, setPhase] = useState('betting');
  const [dealerCards, setDealerCards] = useState([]);
  const [dealerHoleHidden, setDealerHoleHidden] = useState(true);

  // Player hands array (supports Split into 2 hands):
  // [{ cards: [], stake: 10, status: 'playing' | 'stood' | 'bust' | 'blackjack' | 'charlie', outcome: null, payout: 0, doubled: false }]
  const [hands, setHands] = useState([]);
  const [activeHandIdx, setActiveHandIdx] = useState(0);

  const [sideBetResult, setSideBetResult] = useState(null);
  const [dealerMood, setDealerMood] = useState({
    face: '🤖',
    tag: "DEALER BOT '86",
    line: 'PLACE YOUR NEON CHIPS OR PLAY FREE PRACTICE — 5-CARD CHARLIE PAYS 3×!'
  });

  const [winStreak, setWinStreak] = useState(0);
  const [bestWin, setBestWin] = useState(() =>
    Number(localStorage.getItem('tm_blackjack_highscore') || 0)
  );
  const [stats, setStats] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('tm_blackjack_stats')) || {
          handsWon: 0,
          blackjacks: 0,
          charlies: 0
        }
      );
    } catch {
      return { handsWon: 0, blackjacks: 0, charlies: 0 };
    }
  });

  const drawFromShoe = useCallback(() => {
    let current = [...shoeRef.current];
    if (current.length < 18) {
      current = buildShuffledShoe(4);
    }
    const card = current.pop();
    shoeRef.current = current;
    setShoe(current);
    return card;
  }, []);

  const recordWinStats = useCallback(
    (totalPayout, hadBj, hadCharlie) => {
      setStats((prev) => {
        const next = {
          handsWon: prev.handsWon + 1,
          blackjacks: prev.blackjacks + (hadBj ? 1 : 0),
          charlies: prev.charlies + (hadCharlie ? 1 : 0)
        };
        try {
          localStorage.setItem('tm_blackjack_stats', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      if (totalPayout > bestWin) {
        setBestWin(totalPayout);
        try {
          localStorage.setItem('tm_blackjack_highscore', String(totalPayout));
        } catch {
          // ignore
        }
        if (onRecordHighScore) onRecordHighScore('blackjack', totalPayout);
      }
    },
    [bestWin, onRecordHighScore]
  );

  // Settle all hands against final dealer cards
  const settleRound = useCallback(
    (finalDealerCards, currentHands, isFreePractice) => {
      setDealerHoleHidden(false);
      setPhase('settled');

      const dEval = evaluateHand(finalDealerCards);
      let totalPayout = 0;
      let totalStaked = 0;
      let anyWin = false;
      let anyLoss = false;
      let anyBj = false;
      let anyCharlie = false;

      const resolvedHands = currentHands.map((h) => {
        const pEval = evaluateHand(h.cards);
        const st = h.stake;
        totalStaked += st;

        let outcome;
        let payout;
        let badge;

        if (pEval.isBust) {
          outcome = 'lose';
          payout = 0;
          badge = `💥 BUST (${pEval.total})`;
          anyLoss = true;
        } else if (pEval.isBlackjack && !dEval.isBlackjack) {
          outcome = 'blackjack';
          // 3:2 Blackjack payout (2.5x total return, rounded up)
          payout = Math.ceil(st * 2.5);
          badge = `🎰 BLACKJACK 21! (+${payout} 🪙)`;
          anyWin = true;
          anyBj = true;
        } else if (pEval.isFiveCardCharlie) {
          outcome = 'charlie';
          payout = st * 2;
          badge = `⚡ 5-CARD CHARLIE 2×! (+${payout} 🪙)`;
          anyWin = true;
          anyCharlie = true;
        } else if (dEval.isBust) {
          outcome = 'win';
          payout = st * 2;
          badge = `🔥 DEALER BUSTS! (+${payout} 🪙)`;
          anyWin = true;
        } else if (dEval.isBlackjack && !pEval.isBlackjack) {
          outcome = 'lose';
          payout = 0;
          badge = '🤖 DEALER BLACKJACK';
          anyLoss = true;
        } else if (pEval.total > dEval.total) {
          outcome = 'win';
          payout = st * 2;
          badge = `🏆 WIN ${pEval.total} vs ${dEval.total}! (+${payout} 🪙)`;
          anyWin = true;
        } else if (pEval.total === dEval.total) {
          outcome = 'push';
          payout = st;
          badge = `🤝 PUSH (${pEval.total} TIE — STAKE RETURNED)`;
        } else {
          outcome = 'lose';
          payout = 0;
          badge = `🤖 DEALER ${dEval.total} BEATS ${pEval.total}`;
          anyLoss = true;
        }

        totalPayout += payout;
        return {
          ...h,
          status: 'settled',
          outcome,
          payout,
          badge
        };
      });

      setHands(resolvedHands);

      if (anyWin) {
        const nextStreak = winStreak + 1;
        setWinStreak(nextStreak);
        recordWinStats(isFreePractice ? 0 : totalPayout, anyBj, anyCharlie);

        if (!isFreePractice && totalPayout > 0 && onPayoutTokens) {
          const verified = validateStakedGamePayout({
            stakedTokens: totalStaked,
            rawPayout: totalPayout,
            maxMultiplier: 15
          });
          onPayoutTokens(verified, {
            stakedTokens: totalStaked,
            xp: anyBj || anyCharlie ? 55 : 35,
            label: anyCharlie
              ? `⚡ 5-Card Charlie! +${verified} 🪙`
              : anyBj
              ? `🃏 Blackjack 21! +${verified} 🪙`
              : `🃏 Neon 21's Win! +${verified} 🪙`,
            emoji: '🃏'
          });
          triggerWinCelebration({
            amount: verified,
            unit: '🪙',
            game: "Neon 21's Blackjack",
            headline: anyCharlie
              ? '⚡ 5-CARD CHARLIE!'
              : anyBj
              ? '🃏 BLACKJACK 21!'
              : dEval.isBust
              ? '🤯 DEALER BUSTED!'
              : '🃏 YOU BEAT THE DEALER!',
            detail: `${nextStreak}× Hot Streak!`,
            multiplier: anyCharlie || anyBj ? 4 : 2,
            tier: anyCharlie || anyBj ? 'jackpot' : 'win'
          });
        } else {
          triggerWinCelebration({
            amount: totalPayout,
            unit: 'CHIPS',
            game: "Neon 21's Blackjack",
            headline: anyCharlie
              ? '⚡ 5-CARD CHARLIE!'
              : anyBj
              ? '🃏 BLACKJACK 21!'
              : '🃏 PRACTICE HAND WON!',
            detail: `${nextStreak}× Win Streak — Switch to Token Mode for real 🪙!`,
            multiplier: anyCharlie || anyBj ? 4 : 2,
            tier: anyCharlie || anyBj ? 'big' : 'win'
          });
        }

        setDealerMood({
          face: dEval.isBust ? '🤯' : anyBj ? '🎰' : '😱',
          tag: dEval.isBust ? 'SYSTEM OVERLOAD — DEALER BUST!' : 'PLAYER VICTORY!',
          line: isFreePractice
            ? `🎉 YOU WON IN PRACTICE! (${nextStreak}× WIN STREAK — Switch to Token Wager to win real 🪙!)`
            : `🎉 WINNER! PAID +${totalPayout} 🪙 ARCADE TOKENS! (🔥 ${nextStreak}× HOT STREAK!)`
        });
      } else if (!anyLoss) {
        // Push only
        sfx.playCardFlip();
        if (!isFreePractice && totalPayout > 0 && onPayoutTokens) {
          onPayoutTokens(totalPayout, {
            stakedTokens: totalStaked,
            xp: 15,
            label: `🤝 21's Push — ${totalPayout} 🪙 Returned`,
            emoji: '🤝'
          });
        }
        setDealerMood({
          face: '😐',
          tag: 'STANDOFF PUSH',
          line: `🤝 TIE AT ${dEval.total}! Your chips have been returned to your stack.`
        });
      } else {
        setWinStreak(0);
        sfx.playSadTrombone();
        setDealerMood({
          face: '😏',
          tag: 'HOUSE WINS HAND',
          line: dEval.isBlackjack
            ? '🤖 DEALER HIT NATURAL 21! Tap DEAL HAND to strike back!'
            : `🤖 DEALER HOLDS ${dEval.total}. Tap DEAL HAND for a rematch!`
        });
      }
    },
    [winStreak, recordWinStats, onPayoutTokens]
  );

  // Run dealer AI drawing loop (Dealer hits until 17+)
  const runDealerTurn = useCallback(
    (currentDealerCards, currentHands, isFreePractice) => {
      setPhase('dealer');
      setDealerHoleHidden(false);
      sfx.playCardFlip();

      // If all player hands busted or already auto-won via Blackjack/Charlie when single hand
      const allBusted = currentHands.every((h) => evaluateHand(h.cards).isBust);
      if (allBusted) {
        settleRound(currentDealerCards, currentHands, isFreePractice);
        return;
      }

      let dCards = [...currentDealerCards];
      const stepDealer = () => {
        const dEval = evaluateHand(dCards);
        if (dEval.total < 17) {
          setDealerMood({
            face: '😰',
            tag: `DEALER AT ${dEval.total} — DRAWING...`,
            line: '⚡ Dealer Bot must draw on 16 or less and stand on all 17s!'
          });
          setTimeout(() => {
            const nextCard = drawFromShoe();
            dCards = [...dCards, nextCard];
            sfx.playCardDeal();
            setDealerCards(dCards);
            stepDealer();
          }, 460);
        } else {
          setTimeout(() => {
            settleRound(dCards, currentHands, isFreePractice);
          }, 340);
        }
      };

      stepDealer();
    },
    [drawFromShoe, settleRound]
  );

  // Deal a brand new hand
  const handleDealHand = () => {
    if (phase === 'playing' || phase === 'dealer') return;

    const sideCost = sideBetOn ? 5 : 0;
    const totalCost = practiceMode ? 0 : betAmount + sideCost;
    let effectiveStake = practiceMode ? 0 : betAmount;

    if (!practiceMode) {
      const hasFreePerk = checkDailyPerk('blackjack');
      if (hasFreePerk && betAmount <= 10 && !sideBetOn) {
        consumeDailyPerk('blackjack');
        effectiveStake = 10;
        sfx.playLevelUp();
      } else {
        if (tokens < totalCost) {
          sfx.playClownHonk();
          setDealerMood({
            face: '⚠️',
            tag: 'LOW TOKEN STACK!',
            line: `Need ${totalCost} 🪙 for this wager! Switch to Free Practice or Upload a Meme (+45 🪙)!`
          });
          return;
        }
        if (onSpendTokens) {
          const ok = onSpendTokens(totalCost, "Neon 21's Blackjack Wager");
          if (!ok) return;
        }
      }
      sfx.playChipStack();
    } else {
      sfx.playCardDeal();
    }

    const p1 = drawFromShoe();
    const d1 = drawFromShoe();
    const p2 = drawFromShoe();
    const d2 = drawFromShoe();

    const initialPlayerCards = [p1, p2];
    const initialDealerCards = [d1, d2];

    setDealerCards(initialDealerCards);
    setDealerHoleHidden(true);
    setActiveHandIdx(0);
    setSideBetResult(null);

    // Check Perfect Pair / 21+3 Side Bet immediately!
    if (sideBetOn) {
      const sbWin = evaluateSideBet(initialPlayerCards, d1);
      if (sbWin) {
        const sbPayout = 5 * sbWin.mult;
        setSideBetResult({ won: true, text: `${sbWin.name} +${sbPayout} 🪙!` });
        sfx.playLightningStrike();
        if (!practiceMode && onPayoutTokens) {
          onPayoutTokens(sbPayout, {
            stakedTokens: 5,
            xp: 45,
            label: `${sbWin.name} +${sbPayout} 🪙`,
            emoji: '💎'
          });
        }
      } else {
        setSideBetResult({ won: false, text: 'Side Bet: No Pair / 21+3 this hand' });
      }
    }

    const pEval = evaluateHand(initialPlayerCards);
    const dEval = evaluateHand(initialDealerCards);

    const newHands = [
      {
        cards: initialPlayerCards,
        stake: effectiveStake,
        status: pEval.isBlackjack ? 'blackjack' : 'playing',
        outcome: null,
        payout: 0,
        badge: null,
        doubled: false
      }
    ];

    setHands(newHands);

    // Check immediate Natural Blackjack
    if (pEval.isBlackjack || dEval.isBlackjack) {
      setTimeout(() => {
        settleRound(initialDealerCards, newHands, practiceMode);
      }, 420);
      return;
    }

    setPhase('playing');
    setDealerMood({
      face: '🤖',
      tag: `DEALER SHOWS ${d1.rank}${d1.suit}`,
      line: `You hold ${pEval.label}. Choose HIT, STAND, DOUBLE${
        p1.val === p2.val ? ', or SPLIT' : ''
      }!`
    });
  };

  // Move to next split hand or trigger dealer turn
  const advanceOrFinishHand = useCallback(
    (updatedHands, currentIdx) => {
      if (currentIdx + 1 < updatedHands.length) {
        const nextIdx = currentIdx + 1;
        setActiveHandIdx(nextIdx);
        sfx.playCardFlip();
        const nextEval = evaluateHand(updatedHands[nextIdx].cards);
        setDealerMood({
          face: '🤖',
          tag: `PLAYING SPLIT HAND #${nextIdx + 1}`,
          line: `Hand #${nextIdx + 1} holds ${nextEval.label} — HIT or STAND!`
        });
      } else {
        runDealerTurn(dealerCards, updatedHands, practiceMode);
      }
    },
    [dealerCards, practiceMode, runDealerTurn]
  );

  // Player Action: HIT
  const handleHit = useCallback(() => {
    if (phase !== 'playing') return;
    const targetHand = hands[activeHandIdx];
    if (!targetHand || targetHand.status !== 'playing') return;

    const newCard = drawFromShoe();
    sfx.playCardDeal();

    const nextCards = [...targetHand.cards, newCard];
    const ev = evaluateHand(nextCards);

    const nextStatus = ev.isBust
      ? 'bust'
      : ev.isFiveCardCharlie
      ? 'charlie'
      : ev.total === 21
      ? 'stood'
      : 'playing';

    const updatedHands = hands.map((h, idx) =>
      idx === activeHandIdx ? { ...h, cards: nextCards, status: nextStatus } : h
    );
    setHands(updatedHands);

    if (nextStatus !== 'playing') {
      if (ev.isBust) {
        sfx.playDamageGong();
      } else if (ev.isFiveCardCharlie) {
        sfx.playLightningStrike();
      }
      setTimeout(() => {
        advanceOrFinishHand(updatedHands, activeHandIdx);
      }, 360);
    } else {
      setDealerMood({
        face: ev.total >= 19 ? '😰' : '🤖',
        tag: `HAND TOTAL: ${ev.label}`,
        line:
          nextCards.length === 4 && ev.total <= 17
            ? '⚡ 4 CARDS! Survive 1 more card without busting for an automatic 2× 5-CARD CHARLIE!'
            : `Drew ${newCard.rank}${newCard.suit} — Total is ${ev.label}.`
      });
    }
  }, [phase, hands, activeHandIdx, drawFromShoe, advanceOrFinishHand]);

  // Player Action: STAND
  const handleStand = useCallback(() => {
    if (phase !== 'playing') return;
    const targetHand = hands[activeHandIdx];
    if (!targetHand || targetHand.status !== 'playing') return;

    sfx.playToggle();
    const updatedHands = hands.map((h, idx) =>
      idx === activeHandIdx ? { ...h, status: 'stood' } : h
    );
    setHands(updatedHands);
    advanceOrFinishHand(updatedHands, activeHandIdx);
  }, [phase, hands, activeHandIdx, advanceOrFinishHand]);

  // Player Action: DOUBLE DOWN (2x stake, draw 1 final card, auto-stand)
  const handleDoubleDown = useCallback(() => {
    if (phase !== 'playing') return;
    const targetHand = hands[activeHandIdx];
    if (!targetHand || targetHand.status !== 'playing' || targetHand.cards.length !== 2) return;

    const extraStake = targetHand.stake;
    if (!practiceMode && extraStake > 0) {
      if (tokens < extraStake) {
        sfx.playClownHonk();
        setDealerMood({
          face: '⚠️',
          tag: 'NEED TOKENS TO DOUBLE',
          line: `Need ${extraStake} 🪙 more to Double Down!`
        });
        return;
      }
      if (onSpendTokens) {
        const ok = onSpendTokens(extraStake, "Neon 21's Double Down");
        if (!ok) return;
      }
    }

    sfx.playChipStack();
    const newCard = drawFromShoe();
    sfx.playCardDeal();

    const nextCards = [...targetHand.cards, newCard];
    const ev = evaluateHand(nextCards);

    const updatedHands = hands.map((h, idx) =>
      idx === activeHandIdx
        ? {
            ...h,
            cards: nextCards,
            stake: h.stake + extraStake,
            doubled: true,
            status: ev.isBust ? 'bust' : 'stood'
          }
        : h
    );

    setHands(updatedHands);
    setTimeout(() => {
      advanceOrFinishHand(updatedHands, activeHandIdx);
    }, 420);
  }, [phase, hands, activeHandIdx, practiceMode, tokens, onSpendTokens, drawFromShoe, advanceOrFinishHand]);

  // Player Action: SPLIT PAIRS
  const handleSplit = useCallback(() => {
    if (phase !== 'playing' || hands.length > 1) return;
    const targetHand = hands[0];
    if (!targetHand || targetHand.cards.length !== 2) return;
    const [c1, c2] = targetHand.cards;
    if (c1.val !== c2.val) return;

    const extraStake = targetHand.stake;
    if (!practiceMode && extraStake > 0) {
      if (tokens < extraStake) {
        sfx.playClownHonk();
        setDealerMood({
          face: '⚠️',
          tag: 'NEED TOKENS TO SPLIT',
          line: `Need ${extraStake} 🪙 to match your stake on Split Hand #2!`
        });
        return;
      }
      if (onSpendTokens) {
        const ok = onSpendTokens(extraStake, "Neon 21's Split Pair");
        if (!ok) return;
      }
    }

    sfx.playChipStack();
    const draw1 = drawFromShoe();
    const draw2 = drawFromShoe();
    sfx.playCardDeal();

    const splitHands = [
      {
        cards: [c1, draw1],
        stake: targetHand.stake,
        status: 'playing',
        outcome: null,
        payout: 0,
        badge: null,
        doubled: false
      },
      {
        cards: [c2, draw2],
        stake: extraStake,
        status: 'playing',
        outcome: null,
        payout: 0,
        badge: null,
        doubled: false
      }
    ];

    setHands(splitHands);
    setActiveHandIdx(0);
    setDealerMood({
      face: '✂️',
      tag: 'NEON SPLIT ACTIVATED!',
      line: 'Playing Split Hand #1 first — then Hand #2!'
    });
  }, [phase, hands, practiceMode, tokens, onSpendTokens, drawFromShoe]);

  // Keyboard shortcuts for snappy desktop/iPad keyboard play
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (phase === 'betting' || phase === 'settled') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleDealHand();
        }
      } else if (phase === 'playing') {
        if (e.code === 'KeyH' || e.code === 'Space') {
          e.preventDefault();
          handleHit();
        } else if (e.code === 'KeyS') {
          e.preventDefault();
          handleStand();
        } else if (e.code === 'KeyD') {
          e.preventDefault();
          handleDoubleDown();
        } else if (e.code === 'KeyP') {
          e.preventDefault();
          handleSplit();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const activeHand = hands[activeHandIdx] || hands[0] || null;
  const canDouble =
    phase === 'playing' &&
    activeHand &&
    activeHand.cards.length === 2 &&
    (practiceMode || tokens >= activeHand.stake);
  const canSplit =
    phase === 'playing' &&
    hands.length === 1 &&
    activeHand &&
    activeHand.cards.length === 2 &&
    activeHand.cards[0].val === activeHand.cards[1].val &&
    (practiceMode || tokens >= activeHand.stake);

  const dealerVisibleCards = dealerHoleHidden ? dealerCards.slice(0, 1) : dealerCards;
  const dealerEval = evaluateHand(dealerVisibleCards);

  const visorTip =
    visorOn && phase === 'playing' && activeHand && dealerCards[0]
      ? getCyberVisorAdvice(activeHand.cards, dealerCards[0], canDouble, canSplit)
      : null;

  return (
    <section className="tm-bj-stage" aria-label="80s Neon 21's Blackjack Casino Table">
      <div className="tm-bj-cabinet">
        {/* 1. COMPACT TOP MARQUEE & STATS */}
        <header className="tm-bj-header">
          <div className="tm-pin2-title-wrap">
            {onBackToFeed && (
              <button type="button" className="tm-bandit-back-btn" onClick={onBackToFeed}>
                ← Memes
              </button>
            )}
            <div>
              <div className="tm-bj-eyebrow">3:2 blackjack • 5-Card Charlie pays 3×</div>
              <h2 className="tm-bj-title">NEON 21&apos;s BLACKJACK</h2>
            </div>
          </div>

          <div className="tm-bj-hud-pills">
            <span className="tm-crush2-wallet">🪙 {tokens}</span>
            <span className="tm-bj-streak-pill" title="Consecutive Winning Hands">
              🔥 Streak: <strong>{winStreak}</strong>
            </span>
            <span className="tm-bj-streak-pill" title="Career 21's Wins & Blackjacks">
              🏆 Wins: <strong>{stats.handsWon}</strong> ({stats.blackjacks} BJ)
            </span>
            <button
              type="button"
              className={`tm-bj-visor-toggle ${visorOn ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setVisorOn((v) => !v);
              }}
              title="Toggle Cyber-Visor Optimal Basic Strategy AI Helper"
            >
              🥽 Visor AI: {visorOn ? 'ON' : 'OFF'}
            </button>
          </div>
        </header>

        {/* 2. COMPACT SINGLE-LINE DEALER STATUS STRIP (Never expands or covers Dealer Cards!) */}
        <div className="tm-bj-dealer-bar">
          <div className="tm-bj-dealer-avatar">{dealerMood.face}</div>
          <div className="tm-bj-dealer-speech">
            <span className="tm-bj-dealer-tag">{dealerMood.tag}:</span>{' '}
            <span className="tm-bj-dealer-line">{dealerMood.line}</span>
          </div>
        </div>

        {/* 3. NEON CASINO FELT PLAYFIELD (DEALER ZONE + PLAYER HANDS ZONE) */}
        <div className="tm-bj-felt-table">
          <div className="tm-bj-felt-arc-text">
            ★ BLACKJACK PAYS 3 TO 2 ★ DEALER STANDS ON ALL 17s ★ 5-CARD CHARLIE PAYS 3 TO 1 ★
          </div>

          {/* DEALER HAND AREA — UNOBSTRUCTED AT TOP OF FELT */}
          <div className="tm-bj-zone tm-bj-dealer-cards-zone">
            <div className="tm-bj-zone-head">
              <span className="tm-bj-zone-label">🤖 DEALER HAND</span>
              {dealerCards.length > 0 && (
                <span className="tm-bj-score-pill dealer">
                  {dealerHoleHidden ? `${dealerEval.total} + ?` : dealerEval.label}
                </span>
              )}
            </div>

            <div className="tm-bj-cards-row">
              {dealerCards.length === 0 ? (
                <div className="tm-bj-empty-slot">DEALER CARDS APPEAR HERE</div>
              ) : (
                dealerCards.map((c, idx) => {
                  const isHidden = idx === 1 && dealerHoleHidden;
                  if (isHidden) {
                    return (
                      <div key={c.uid || idx} className="tm-bj-card hole-card">
                        <div className="tm-bj-hole-pattern">
                          <span>🃏</span>
                          <small>CYBER &apos;86</small>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={c.uid || idx}
                      className="tm-bj-card"
                      style={{ '--card-col': c.color, '--card-glow': c.glow }}
                    >
                      <div className="tm-bj-card-corner top">
                        <span>{c.rank}</span>
                        <span>{c.suit}</span>
                      </div>
                      <div className="tm-bj-card-center">
                        <span className="tm-bj-card-suit">{c.suit}</span>
                        <span className="tm-bj-card-emblem">{c.emblem}</span>
                      </div>
                      <div className="tm-bj-card-corner bot">
                        <span>{c.rank}</span>
                        <span>{c.suit}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SIDE BET RESULT BANNER */}
          {sideBetResult && (
            <div className={`tm-bj-sidebet-toast ${sideBetResult.won ? 'won' : ''}`}>
              {sideBetResult.text}
            </div>
          )}

          {/* PLAYER HANDS AREA (Supports Single Hand or Split Dual Hands) */}
          <div className={`tm-bj-player-hands-grid ${hands.length > 1 ? 'split-mode' : ''}`}>
            {hands.length === 0 ? (
              <div className="tm-bj-zone player-zone">
                <div className="tm-bj-zone-head">
                  <span className="tm-bj-zone-label">🕹️ YOUR NEON HAND</span>
                  <span className="tm-bj-score-pill">READY TO DEAL</span>
                </div>
                <div className="tm-bj-cards-row">
                  <div className="tm-bj-empty-slot">
                    SELECT YOUR CHIP WAGER BELOW &amp; TAP <strong>🃏 DEAL HAND</strong>!
                  </div>
                </div>
              </div>
            ) : (
              hands.map((h, hIdx) => {
                const ev = evaluateHand(h.cards);
                const isActive = phase === 'playing' && hIdx === activeHandIdx;
                return (
                  <div
                    key={hIdx}
                    className={`tm-bj-zone player-zone ${isActive ? 'active-hand' : ''} ${
                      h.outcome === 'win' || h.outcome === 'blackjack' || h.outcome === 'charlie'
                        ? 'won-hand'
                        : h.outcome === 'lose'
                        ? 'lost-hand'
                        : ''
                    }`}
                  >
                    <div className="tm-bj-zone-head">
                      <span className="tm-bj-zone-label">
                        {hands.length > 1 ? `🕹️ HAND #${hIdx + 1}` : '🕹️ YOUR HAND'}{' '}
                        {h.stake > 0 ? `(${h.stake} 🪙${h.doubled ? ' 2×' : ''})` : '(FREE)'}
                      </span>
                      <span
                        className={`tm-bj-score-pill ${
                          ev.isBlackjack || ev.isFiveCardCharlie
                            ? 'blackjack'
                            : ev.isBust
                            ? 'bust'
                            : ''
                        }`}
                      >
                        {ev.label}
                      </span>
                    </div>

                    <div className="tm-bj-cards-row">
                      {h.cards.map((c, cIdx) => (
                        <div
                          key={c.uid || cIdx}
                          className="tm-bj-card"
                          style={{ '--card-col': c.color, '--card-glow': c.glow }}
                        >
                          <div className="tm-bj-card-corner top">
                            <span>{c.rank}</span>
                            <span>{c.suit}</span>
                          </div>
                          <div className="tm-bj-card-center">
                            <span className="tm-bj-card-suit">{c.suit}</span>
                            <span className="tm-bj-card-emblem">{c.emblem}</span>
                          </div>
                          <div className="tm-bj-card-corner bot">
                            <span>{c.rank}</span>
                            <span>{c.suit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {h.badge && <div className="tm-bj-hand-outcome-badge">{h.badge}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. BOTTOM CONTROL DECK: CYBER-VISOR HINT BAR + CHIP SELECTOR OR HIT / STAND / DOUBLE / SPLIT */}
        <div className="tm-bj-controls">
          {visorTip && (
            <div
              className="tm-bj-visor-bottom-pill"
              style={{ '--visor-col': visorTip.color }}
            >
              <span className="tm-bj-visor-badge">🥽 HINT: {visorTip.action}</span>
              <span className="tm-bj-visor-sub">{visorTip.reason}</span>
            </div>
          )}
          {phase === 'playing' ? (
            <div className="tm-bj-action-row">
              <button
                type="button"
                className="tm-bj-act-btn hit"
                onClick={handleHit}
              >
                🃏 HIT <small>(Space / H)</small>
              </button>
              <button
                type="button"
                className="tm-bj-act-btn stand"
                onClick={handleStand}
              >
                🛑 STAND <small>(S)</small>
              </button>
              <button
                type="button"
                className="tm-bj-act-btn double"
                disabled={!canDouble}
                onClick={handleDoubleDown}
              >
                ⚡ DOUBLE 2× <small>(D)</small>
              </button>
              {canSplit && (
                <button
                  type="button"
                  className="tm-bj-act-btn split"
                  onClick={handleSplit}
                >
                  ✂️ SPLIT PAIR <small>(P)</small>
                </button>
              )}
            </div>
          ) : (
            <div className="tm-bj-betting-deck">
              <div className="tm-bj-chips-row">
                <button
                  type="button"
                  className={`tm-bj-mode-pill ${practiceMode ? 'active' : ''}`}
                  onClick={() => {
                    sfx.playToggle();
                    setPracticeMode(true);
                  }}
                >
                  🆓 Free Practice
                </button>
                {betOptions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`tm-bj-chip-btn ${!practiceMode && betAmount === amt ? 'active' : ''}`}
                    onClick={() => {
                      sfx.playChipStack();
                      setPracticeMode(false);
                      setBetAmount(amt);
                    }}
                  >
                    🪙 {amt}
                  </button>
                ))}
                <button
                  type="button"
                  className={`tm-bj-sidebet-btn ${sideBetOn ? 'active' : ''}`}
                  onClick={() => {
                    sfx.playToggle();
                    setSideBetOn((s) => !s);
                  }}
                  title="Optional +5 Token Side Bet: Pays up to 15× if your first 2 cards are a Pair or make a 3-Card Poker Flush/Straight with the Dealer's upcard!"
                >
                  💎 Pair / 21+3 (+5 🪙): {sideBetOn ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="tm-bj-deal-cta-row">
                <button
                  type="button"
                  className="tm-bj-deal-btn"
                  disabled={phase === 'dealer'}
                  onClick={handleDealHand}
                >
                  {practiceMode
                    ? '🃏 DEAL FREE PRACTICE HAND'
                    : `🃏 DEAL NEON 21's HAND (${betAmount + (sideBetOn ? 5 : 0)} 🪙)`}
                </button>
                {!practiceMode && tokens < betAmount && onOpenUpload && (
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    onClick={onOpenUpload}
                  >
                    📸 Upload Meme (+12 🪙)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
