/**
 * 1000 (Tysiąc) — the game engine. Pure functions over a plain JSON state, so the same code runs
 * the solo table (you vs the computer) and the "play with friends" room (run by the room host).
 *
 * Rules used (Polish "Tysiąc" with the common family variations — see ThousandRules.jsx):
 * - 24 cards (9 J Q K 10 A). 3 in the hand: 7 cards each + a 3-card musik.
 *   2 in the hand: 10 cards each + two 2-card musiks (declarer picks one, blind).
 *   4 players: the dealer sits the hand out.
 * - Bidding starts at a compulsory 100 from the player after the dealer, steps of 10.
 *   Over 120 only with a marriage in hand (max 120 + marriages).
 * - Declarer takes the musik (shown to everyone), then gives one card to each opponent
 *   (2 in the hand: discards 2, which count for the declarer), and may raise the contract.
 * - Follow suit; if you can't, you must trump; otherwise anything. No obligation to beat.
 * - Marriage (K+Q led from hand, not on the first trick): ♥100 ♦80 ♣60 ♠40 and that suit becomes trump.
 * - Declarer makes the contract → +bid, else −bid. Defenders score their points rounded to 10,
 *   except a player on 800+ ("on the barrel") who only scores by winning a bid.
 * - First to 1000 wins.
 */
import {
  ALL_CARD_IDS,
  MARRIAGE_POINTS,
  canDeclareWith,
  card,
  cardPoints,
  legalPlays,
  maxBidFor,
  roundToTen,
  shuffled,
  trickWinnerIndex,
  SUIT_NAMES
} from './thousandRules';
import { aiDecide } from './thousandAI';

export const T1000 = {
  minPlayers: 2,
  maxPlayers: 4,
  target: 1000,
  barrel: 800,
  openingBid: 100,
  bidStep: 10,
  turnMs: 60000,
  awayActMs: 1500,
  botMs: 1000,
  trickMs: 1400,
  handMs: 30000
};

const clone = (s) => JSON.parse(JSON.stringify(s));

function newSeat(p) {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    bot: Boolean(p.bot),
    level: p.level || 'hard',
    score: 0,
    away: false,
    hand: [],
    taken: [],
    marriages: [],
    bidState: null, // null = not yet spoken, number = last bid, 'pass'
    ready: false
  };
}

/**
 * players: [{ id, name, avatar, bot?, level? }] in seat order (2–4).
 * opts.timers: auto-play for humans who run out of time (rooms). Solo play has no clock.
 */
export function thousandStart(players, now = Date.now(), opts = {}) {
  const seats = players.slice(0, T1000.maxPlayers).map(newSeat);
  const s = {
    game: 'thousand',
    phase: 'bidding',
    seats,
    opts: { timers: opts.timers !== false },
    dealer: Math.floor(Math.random() * seats.length),
    handNo: 0,
    scoreSheet: [],
    winnerId: null
  };
  return startHand(s, now);
}

export const activeSeats = (s) => s.seats.map((_, i) => i).filter((i) => s.seats.length < 4 || i !== s.dealer);

export function nextActive(s, idx) {
  const n = s.seats.length;
  for (let k = 1; k <= n; k += 1) {
    const j = (idx + k) % n;
    if (s.seats.length < 4 || j !== s.dealer) return j;
  }
  return idx;
}

function setTurn(s, idx, now) {
  s.turn = idx;
  s.turnStartedAt = now;
  s.deadline = now + T1000.turnMs;
}

function startHand(s, now) {
  s.handNo += 1;
  const active = activeSeats(s);
  const deck = shuffled(ALL_CARD_IDS);
  s.seats.forEach((x) => {
    x.hand = [];
    x.taken = [];
    x.marriages = [];
    x.bidState = null;
    x.ready = false;
  });
  const per = active.length === 3 ? 7 : 10;
  active.forEach((i) => {
    s.seats[i].hand = deck.splice(0, per);
  });
  s.musik = active.length === 3 ? [deck.splice(0, 3)] : [deck.splice(0, 2), deck.splice(0, 2)];
  s.active = active;
  s.musikShown = null;
  s.musikIndex = null;
  s.discards = [];
  s.gave = {};
  s.declarer = null;
  s.contract = 0;
  s.trump = null;
  s.trick = [];
  s.trickNo = 0;
  s.leader = null;
  s.lastTrick = null;
  s.trickWinner = null;
  s.log = [];
  s.handResult = null;
  s.nextAt = 0;
  s.phase = 'bidding';
  const opener = nextActive(s, s.dealer);
  s.seats[opener].bidState = T1000.openingBid;
  s.bid = { value: T1000.openingBid, seat: opener };
  setTurn(s, nextActive(s, opener), now);
  s.headline = `${s.seats[opener].name} opens the bidding at 100`;
  return s;
}

/** Whose decision the table is waiting for (-1 = nobody / everyone). */
export function actorOf(s) {
  if (s.phase === 'bidding' || s.phase === 'play') return s.turn;
  if (s.phase === 'musikPick' || s.phase === 'exchange') return s.declarer;
  return -1;
}

function stillBidding(s) {
  return s.active.filter((i) => s.seats[i].bidState !== 'pass');
}

function endBidding(s, now) {
  s.declarer = s.bid.seat;
  s.contract = s.bid.value;
  const d = s.seats[s.declarer];
  if (s.active.length === 3) {
    s.musikShown = [...s.musik[0]];
    d.hand.push(...s.musik[0]);
    s.phase = 'exchange';
    s.headline = `${d.name} wins the bid at ${s.contract} and takes the musik`;
  } else {
    s.phase = 'musikPick';
    s.headline = `${d.name} wins the bid at ${s.contract} — pick a musik`;
  }
  setTurn(s, s.declarer, now);
  return s;
}

/** Highest contract the declarer may announce after the exchange (never lower than the bid). */
export function maxContractFor(s) {
  const d = s.seats[s.declarer];
  return Math.max(s.contract, maxBidFor(d.hand));
}

function finishTrick(s) {
  const w = trickWinnerIndex(s.trick, s.trump);
  const winner = s.trick[w].seat;
  s.trickWinner = winner;
  s.seats[winner].taken.push(...s.trick.map((t) => t.card));
  s.lastTrick = { cards: [...s.trick], winner };
  s.phase = 'trickDone';
  return s;
}

function scoreHand(s, now) {
  const results = [];
  s.seats.forEach((x, i) => {
    if (!s.active.includes(i)) {
      results.push({
        seat: i,
        sitOut: true,
        delta: 0,
        cardPts: 0,
        marriagePts: 0,
        total: 0,
        note: 'Dealer — sat out'
      });
      return;
    }
    let cardPts = cardPoints(x.taken);
    if (i === s.declarer) cardPts += cardPoints(s.discards);
    const marriagePts = x.marriages.reduce((a, m) => a + MARRIAGE_POINTS[m], 0);
    const total = cardPts + marriagePts;
    let delta;
    let note;
    if (i === s.declarer) {
      const made = total >= s.contract;
      delta = made ? s.contract : -s.contract;
      note = made ? `Made it! ${total} ≥ ${s.contract}` : `Went down: ${total} < ${s.contract}`;
    } else if (x.score >= T1000.barrel) {
      delta = 0;
      note = `On the barrel (${T1000.barrel}+) — only scores by winning a bid`;
    } else {
      delta = roundToTen(total);
      note = total === delta ? `${total} points` : `${total} rounds to ${delta}`;
    }
    results.push({
      seat: i,
      delta,
      cardPts,
      marriagePts,
      total,
      note,
      declarer: i === s.declarer
    });
  });
  results.forEach((r) => {
    s.seats[r.seat].score += r.delta;
  });
  s.scoreSheet.push({
    hand: s.handNo,
    declarer: s.declarer,
    contract: s.contract,
    deltas: results.map((r) => r.delta),
    scores: s.seats.map((x) => x.score)
  });
  s.handResult = results;
  const d = s.seats[s.declarer];
  const dr = results[s.declarer];
  s.headline =
    dr.delta > 0
      ? `${d.name} made ${s.contract}! (+${s.contract})`
      : `${d.name} went down on ${s.contract} (−${s.contract})`;
  const top = Math.max(...s.seats.map((x) => x.score));
  if (top >= T1000.target) {
    const leaders = s.seats.map((x, i) => ({ x, i })).filter(({ x }) => x.score === top);
    const pick = leaders.find(({ i }) => i === s.declarer) || leaders[0];
    s.phase = 'over';
    s.winnerId = pick.x.id;
    s.headline = `🏆 ${pick.x.name} reaches ${pick.x.score} and wins!`;
    s.turn = -1;
    return s;
  }
  s.phase = 'handDone';
  s.turn = -1;
  s.deadline = now + T1000.handMs;
  s.seats.forEach((x) => {
    x.ready = x.bot;
  });
  return s;
}

/**
 * Apply one player action. Returns the new state, or null if the action is not allowed.
 * Actions: bid {value} | pass | pickMusik {index} | exchange {cards:[a,b], contract} |
 *          play {card, marriage} | next
 */
export function thousandReduce(prev, { from, type, data }, now = Date.now()) {
  const idx = prev.seats.findIndex((x) => x.id === from);
  if (idx < 0) return null;
  const s = clone(prev);
  const me = s.seats[idx];

  if (type === 'next') {
    if (s.phase !== 'handDone' || me.ready) return null;
    me.ready = true;
    if (s.seats.every((x) => x.ready || x.away)) return nextHand(s, now);
    return s;
  }

  if (s.phase === 'bidding') {
    if (idx !== s.turn) return null;
    if (type === 'pass') {
      me.bidState = 'pass';
    } else if (type === 'bid') {
      const value = Math.floor(Number(data?.value) || 0);
      if (value % T1000.bidStep !== 0 || value <= s.bid.value || value > maxBidFor(me.hand)) return null;
      me.bidState = value;
      s.bid = { value, seat: idx };
    } else {
      return null;
    }
    const left = stillBidding(s);
    if (left.length <= 1) return endBidding(s, now);
    let j = nextActive(s, idx);
    while (s.seats[j].bidState === 'pass') j = nextActive(s, j);
    setTurn(s, j, now);
    s.headline = type === 'pass' ? `${me.name} passes` : `${me.name} bids ${s.bid.value}`;
    return s;
  }

  if (s.phase === 'musikPick') {
    if (idx !== s.declarer || type !== 'pickMusik') return null;
    const k = Number(data?.index) === 1 ? 1 : 0;
    s.musikIndex = k;
    s.musikShown = [...s.musik[k]];
    me.hand.push(...s.musik[k]);
    s.phase = 'exchange';
    s.headline = `${me.name} takes musik ${k + 1}`;
    setTurn(s, idx, now);
    return s;
  }

  if (s.phase === 'exchange') {
    if (idx !== s.declarer || type !== 'exchange') return null;
    const cards = Array.isArray(data?.cards) ? data.cards.map(String) : [];
    if (cards.length !== 2 || cards[0] === cards[1] || !cards.every((c) => me.hand.includes(c))) return null;
    me.hand = me.hand.filter((c) => !cards.includes(c));
    if (s.active.length === 3) {
      const a = nextActive(s, idx);
      const b = nextActive(s, a);
      s.seats[a].hand.push(cards[0]);
      s.seats[b].hand.push(cards[1]);
      s.gave = { [a]: cards[0], [b]: cards[1] };
    } else {
      s.discards = cards;
    }
    const want = Math.floor(Number(data?.contract) || s.contract);
    const max = maxContractFor(s);
    if (want > s.contract && want % T1000.bidStep === 0 && want <= max) s.contract = want;
    s.phase = 'play';
    s.leader = idx;
    s.trickNo = 0;
    s.trick = [];
    setTurn(s, idx, now);
    s.headline = `${me.name} plays for ${s.contract} — ${me.name} leads`;
    return s;
  }

  if (s.phase === 'play') {
    if (idx !== s.turn || type !== 'play') return null;
    const id = String(data?.card || '');
    if (!me.hand.includes(id)) return null;
    if (!legalPlays(me.hand, s.trick, s.trump).includes(id)) return null;
    let declared = null;
    if (data?.marriage && canDeclareWith(me.hand, id, s.trickNo, s.trick.length === 0)) {
      declared = card(id).suit;
      me.marriages.push(declared);
      s.trump = declared;
    }
    me.hand = me.hand.filter((c) => c !== id);
    s.log.push({
      seat: idx,
      card: id,
      trickNo: s.trickNo,
      led: s.trick.length ? s.trick[0].card : null,
      trump: s.trump
    });
    s.trick.push({ seat: idx, card: id, marriage: declared });
    if (declared) {
      s.headline = `💍 ${me.name} declares the ${SUIT_NAMES[declared]} marriage (+${MARRIAGE_POINTS[declared]}) — ${declared} is trump`;
    }
    if (s.trick.length === s.active.length) {
      finishTrick(s);
      s.nextAt = now + T1000.trickMs;
      s.turn = -1;
      if (!declared) s.headline = `${s.seats[s.trickWinner].name} takes the trick`;
      return s;
    }
    setTurn(s, nextActive(s, idx), now);
    return s;
  }
  return null;
}

function nextHand(s, now) {
  s.dealer = (s.dealer + 1) % s.seats.length;
  return startHand(s, now);
}

/** Host clock: computer players, timeouts, away players and the pauses between tricks/hands. */
export function thousandTick(prev, now = Date.now()) {
  if (prev.phase === 'over') return null;
  if (prev.phase === 'trickDone') {
    if (now < prev.nextAt) return null;
    const s = clone(prev);
    s.trick = [];
    s.trickNo += 1;
    const w = s.trickWinner;
    s.trickWinner = null;
    if (s.seats[w].hand.length === 0) return scoreHand(s, now);
    s.phase = 'play';
    s.leader = w;
    setTurn(s, w, now);
    return s;
  }
  if (prev.phase === 'handDone') {
    const everyone = prev.seats.every((x) => x.ready || x.away);
    if (everyone || (prev.opts.timers && now >= prev.deadline)) return nextHand(clone(prev), now);
    return null;
  }
  const actor = actorOf(prev);
  if (actor < 0) return null;
  const x = prev.seats[actor];
  const since = now - (prev.turnStartedAt || 0);
  const due =
    (x.bot && since >= T1000.botMs) ||
    (!x.bot && x.away && since >= T1000.awayActMs) ||
    (!x.bot && prev.opts.timers && now >= prev.deadline);
  if (!due) return null;
  const move = aiDecide(prev, actor, x.bot ? x.level : 'hard');
  if (!move) return null;
  return thousandReduce(prev, { from: x.id, type: move.type, data: move.data }, now);
}

export function thousandSyncPlayers(prev, players) {
  const present = new Map(players.map((p) => [p.id, p]));
  let changed = false;
  const s = clone(prev);
  s.seats.forEach((x) => {
    if (x.bot) return;
    const p = present.get(x.id);
    if (x.away !== !p) {
      x.away = !p;
      changed = true;
    }
    if (p && (p.name !== x.name || p.avatar !== x.avatar)) {
      x.name = p.name;
      x.avatar = p.avatar;
      changed = true;
    }
  });
  return changed ? s : null;
}
