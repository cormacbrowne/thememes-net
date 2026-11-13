/**
 * Cyber-Hold'em '86 — Pure Texas Hold'em Poker Engine
 * 52-card deck, deterministic 7-card best-5 evaluator, and AI shark decisions.
 */

export const POKER_SUITS = ['♠', '♥', '♦', '♣'];
export const POKER_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createShuffledDeck() {
  const deck = [];
  for (const suit of POKER_SUITS) {
    for (let i = 0; i < POKER_RANKS.length; i += 1) {
      deck.push({
        rank: POKER_RANKS[i],
        suit,
        val: i + 2,
        isRed: suit === '♥' || suit === '♦',
        id: `${POKER_RANKS[i]}${suit}`
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

const RANK_LABELS = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A'
};

export const HAND_CATEGORY_NAMES = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush'
];

export function compareHandScores(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

function getStraightHigh(sortedUniqueValsDesc) {
  for (let i = 0; i <= sortedUniqueValsDesc.length - 5; i += 1) {
    const hi = sortedUniqueValsDesc[i];
    if (
      sortedUniqueValsDesc[i + 1] === hi - 1 &&
      sortedUniqueValsDesc[i + 2] === hi - 2 &&
      sortedUniqueValsDesc[i + 3] === hi - 3 &&
      sortedUniqueValsDesc[i + 4] === hi - 4
    ) {
      return hi;
    }
  }
  // Wheel straight A-2-3-4-5
  if (
    sortedUniqueValsDesc.includes(14) &&
    sortedUniqueValsDesc.includes(5) &&
    sortedUniqueValsDesc.includes(4) &&
    sortedUniqueValsDesc.includes(3) &&
    sortedUniqueValsDesc.includes(2)
  ) {
    return 5;
  }
  return 0;
}

export function evaluateFiveCardHand(cards) {
  const valsDesc = cards.map((c) => c.val).sort((a, b) => b - a);
  const counts = {};
  const suitCounts = {};
  for (const c of cards) {
    counts[c.val] = (counts[c.val] || 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  }
  const isFlush = Object.keys(suitCounts).length === 1;
  const uniqueVals = [...new Set(valsDesc)];
  const straightHigh = uniqueVals.length === 5 ? getStraightHigh(uniqueVals) : 0;

  if (isFlush && straightHigh === 14) {
    return { score: [9, 14], category: 9, name: 'Royal Flush' };
  }
  if (isFlush && straightHigh > 0) {
    return {
      score: [8, straightHigh],
      category: 8,
      name: `Straight Flush (${RANK_LABELS[straightHigh]}-High)`
    };
  }

  const groups = Object.entries(counts)
    .map(([v, cnt]) => ({ v: Number(v), cnt }))
    .sort((a, b) => b.cnt - a.cnt || b.v - a.v);

  if (groups[0].cnt === 4) {
    return {
      score: [7, groups[0].v, groups[1].v],
      category: 7,
      name: `Four of a Kind (${RANK_LABELS[groups[0].v]}s)`
    };
  }
  if (groups[0].cnt === 3 && groups[1]?.cnt === 2) {
    return {
      score: [6, groups[0].v, groups[1].v],
      category: 6,
      name: `Full House (${RANK_LABELS[groups[0].v]}s full)`
    };
  }
  if (isFlush) {
    return {
      score: [5, ...valsDesc],
      category: 5,
      name: `Flush (${RANK_LABELS[valsDesc[0]]}-High)`
    };
  }
  if (straightHigh > 0) {
    return {
      score: [4, straightHigh],
      category: 4,
      name: `Straight (${RANK_LABELS[straightHigh]}-High)`
    };
  }
  if (groups[0].cnt === 3) {
    return {
      score: [3, groups[0].v, groups[1].v, groups[2].v],
      category: 3,
      name: `Three of a Kind (${RANK_LABELS[groups[0].v]}s)`
    };
  }
  if (groups[0].cnt === 2 && groups[1]?.cnt === 2) {
    return {
      score: [2, groups[0].v, groups[1].v, groups[2].v],
      category: 2,
      name: `Two Pair (${RANK_LABELS[groups[0].v]}s & ${RANK_LABELS[groups[1].v]}s)`
    };
  }
  if (groups[0].cnt === 2) {
    return {
      score: [1, groups[0].v, groups[1].v, groups[2].v, groups[3].v],
      category: 1,
      name: `Pair of ${RANK_LABELS[groups[0].v]}s`
    };
  }
  return {
    score: [0, ...valsDesc],
    category: 0,
    name: `${RANK_LABELS[valsDesc[0]]}-High`
  };
}

/**
 * Evaluate best 5-card Texas Hold'em hand from any 2..7 available cards.
 */
export function evaluateBestHoldemHand(cards) {
  if (!cards || cards.length < 2) {
    return { score: [0], category: 0, name: 'Waiting...', bestCards: [] };
  }
  if (cards.length < 5) {
    // Pre-flop or incomplete helper estimate
    const sorted = [...cards].sort((a, b) => b.val - a.val);
    const sameSuit = cards.length >= 2 && cards[0].suit === cards[1].suit;
    const isPair = cards.length >= 2 && cards[0].val === cards[1].val;
    if (isPair) {
      return {
        score: [1, sorted[0].val],
        category: 1,
        name: `Pocket ${RANK_LABELS[sorted[0].val]}s`,
        bestCards: sorted
      };
    }
    return {
      score: [0, sorted[0].val, sorted[1]?.val || 0],
      category: 0,
      name: `${RANK_LABELS[sorted[0].val]}-${RANK_LABELS[sorted[1]?.val || 2]}${sameSuit ? ' Suited' : ' High'}`,
      bestCards: sorted
    };
  }

  let best = null;
  let bestCards = cards.slice(0, 5);
  const n = cards.length;
  for (let a = 0; a < n - 4; a += 1) {
    for (let b = a + 1; b < n - 3; b += 1) {
      for (let c = b + 1; c < n - 2; c += 1) {
        for (let d = c + 1; d < n - 1; d += 1) {
          for (let e = d + 1; e < n; e += 1) {
            const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
            const evalRes = evaluateFiveCardHand(five);
            if (!best || compareHandScores(evalRes.score, best.score) > 0) {
              best = evalRes;
              bestCards = five;
            }
          }
        }
      }
    }
  }
  return { ...best, bestCards };
}

/**
 * Compute AI shark action cleanly based on street, hand evaluation, stack, and call cost.
 */
export function decideAiPokerAction({
  holeCards,
  communityCards,
  toCall,
  aiChips,
  pot,
  minRaiseIncrement = 10,
  personality = 'balanced' // 'aggressive' | 'tight'
}) {
  if (aiChips <= 0) return { type: 'check', amount: 0 };

  const allCards = [...holeCards, ...communityCards];
  let strength;

  if (communityCards.length === 0) {
    const hi = Math.max(holeCards[0].val, holeCards[1].val);
    const lo = Math.min(holeCards[0].val, holeCards[1].val);
    const paired = holeCards[0].val === holeCards[1].val;
    const suited = holeCards[0].suit === holeCards[1].suit;
    strength = (hi * 0.035 + lo * 0.015) + (paired ? 0.34 : 0) + (suited ? 0.07 : 0) + (hi - lo <= 3 ? 0.05 : 0);
  } else {
    const evalHand = evaluateBestHoldemHand(allCards);
    strength = Math.min(0.99, 0.22 + evalHand.category * 0.14 + ((evalHand.score[1] || 7) / 14) * 0.12);
  }

  const aggressionMod = personality === 'aggressive' ? 0.09 : -0.04;
  const roll = Math.random();
  const effectiveStrength = strength + aggressionMod + (roll - 0.5) * 0.16;

  // Facing a bet
  if (toCall > 0) {
    const potOddsRatio = toCall / Math.max(1, pot + toCall);
    if (toCall >= aiChips) {
      return effectiveStrength >= 0.52 || potOddsRatio < 0.28
        ? { type: 'call', amount: aiChips }
        : { type: 'fold', amount: 0 };
    }
    if (effectiveStrength < 0.34 && toCall > Math.max(10, pot * 0.45)) {
      return { type: 'fold', amount: 0 };
    }
    if (effectiveStrength >= 0.72 && aiChips > toCall + minRaiseIncrement && roll > 0.38) {
      const raiseBy = Math.min(aiChips - toCall, Math.max(minRaiseIncrement, Math.round((pot * 0.4) / 5) * 5));
      return { type: 'raise', amount: toCall + Math.max(minRaiseIncrement, raiseBy) };
    }
    return { type: 'call', amount: toCall };
  }

  // Checked to AI
  if (effectiveStrength >= 0.62 && aiChips >= minRaiseIncrement && roll > 0.35) {
    const betSize = Math.min(
      aiChips,
      Math.max(minRaiseIncrement, Math.round((pot * (personality === 'aggressive' ? 0.55 : 0.4)) / 5) * 5)
    );
    return { type: 'bet', amount: Math.max(5, betSize) };
  }
  return { type: 'check', amount: 0 };
}
