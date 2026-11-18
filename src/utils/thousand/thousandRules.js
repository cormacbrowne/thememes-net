/**
 * 1000 (Tysiąc / Тысяча) — card data and the pure rule helpers shared by the engine, the AI and the UI.
 *
 * 24-card deck: 9, J, Q, K, 10, A in each suit. Cards are passed around as ids like "A♥" / "10♠".
 */

export const SUITS = ['♠', '♣', '♦', '♥'];
export const RANKS = ['9', 'J', 'Q', 'K', '10', 'A']; // weakest → strongest
export const CARD_POINTS = { 9: 0, J: 2, Q: 3, K: 4, 10: 10, A: 11 };
export const MARRIAGE_POINTS = { '♥': 100, '♦': 80, '♣': 60, '♠': 40 };
export const SUIT_NAMES = {
  '♥': 'Hearts',
  '♦': 'Diamonds',
  '♣': 'Clubs',
  '♠': 'Spades'
};
export const RANK_NAMES = {
  9: 'Nine',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
  10: 'Ten',
  A: 'Ace'
};

const CARDS = {};
SUITS.forEach((suit) => {
  RANKS.forEach((rank, power) => {
    const id = `${rank}${suit}`;
    CARDS[id] = {
      id,
      rank,
      suit,
      power,
      pts: CARD_POINTS[rank],
      isRed: suit === '♥' || suit === '♦'
    };
  });
});

export const ALL_CARD_IDS = Object.keys(CARDS);

export function card(id) {
  return CARDS[id] || null;
}

export function shuffled(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const cardPoints = (ids) => (ids || []).reduce((a, id) => a + (CARDS[id]?.pts || 0), 0);

/** Sort a hand by suit (♥ ♦ ♣ ♠, or trump first) then strongest first. */
export function sortHand(ids, trump = null) {
  const order = ['♥', '♣', '♦', '♠'];
  const rank = (s) => (s === trump ? -1 : order.indexOf(s));
  return [...ids].sort((a, b) => {
    const ca = CARDS[a];
    const cb = CARDS[b];
    return rank(ca.suit) - rank(cb.suit) || cb.power - ca.power;
  });
}

/** Suits in which the hand holds both the King and the Queen. */
export function marriagesIn(hand) {
  const set = new Set(hand);
  return SUITS.filter((s) => set.has(`K${s}`) && set.has(`Q${s}`));
}

export const marriageTotal = (hand) => marriagesIn(hand).reduce((a, s) => a + MARRIAGE_POINTS[s], 0);

/** You may only bid over 120 if you hold a marriage, and never more than 120 + your marriages. */
export function maxBidFor(hand) {
  return 120 + marriageTotal(hand);
}

/** Cards that may legally be played: follow suit; if you can't, you must trump; otherwise anything. */
export function legalPlays(hand, trick, trump) {
  if (!trick || trick.length === 0) return [...hand];
  const led = CARDS[trick[0].card].suit;
  const follow = hand.filter((id) => CARDS[id].suit === led);
  if (follow.length) return follow;
  if (trump) {
    const trumps = hand.filter((id) => CARDS[id].suit === trump);
    if (trumps.length) return trumps;
  }
  return [...hand];
}

/** Does card `a` beat card `b` (b is currently winning)? */
export function beats(a, b, trump) {
  const ca = CARDS[a];
  const cb = CARDS[b];
  if (ca.suit === cb.suit) return ca.power > cb.power;
  return ca.suit === trump;
}

/** Index (into trick) of the card currently winning the trick. */
export function trickWinnerIndex(trick, trump) {
  let best = 0;
  for (let i = 1; i < trick.length; i += 1) {
    if (beats(trick[i].card, trick[best].card, trump)) best = i;
  }
  return best;
}

/** A marriage is declared by leading its K or Q — never on the first trick of the hand. */
export function canDeclareWith(hand, cardId, trickNo, trickEmpty) {
  if (!trickEmpty || trickNo < 1) return false;
  const c = CARDS[cardId];
  if (!c || (c.rank !== 'K' && c.rank !== 'Q')) return false;
  const other = `${c.rank === 'K' ? 'Q' : 'K'}${c.suit}`;
  return hand.includes(cardId) && hand.includes(other);
}

/** Defenders' points are rounded to the nearest 10 (5 rounds up). */
export const roundToTen = (n) => Math.round(n / 10) * 10;

export function cardLabel(id) {
  const c = CARDS[id];
  return c ? `${c.rank}${c.suit}` : '?';
}
