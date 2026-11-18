/**
 * Multiplayer 21's (2 players vs the house dealer, plus a head-to-head scoreboard).
 * Run by the room host. Pure functions; table chips only.
 */
import { createShuffledDeck } from '../pokerEngine';

export const MP_21 = {
  minPlayers: 2,
  maxPlayers: 2,
  startChips: 500,
  minBet: 10,
  bets: [10, 25, 50, 100],
  betMs: 30000,
  turnMs: 30000,
  awayActMs: 1500,
  dealerStepMs: 750,
  settleMs: 5500
};

const clone = (s) => JSON.parse(JSON.stringify(s));

export function cardPoints(card) {
  if (!card) return 0;
  if (card.val === 14) return 11;
  if (card.val >= 10) return 10;
  return card.val;
}

export function handTotal(cards) {
  let total = 0;
  let aces = 0;
  (cards || []).forEach((c) => {
    total += cardPoints(c);
    if (c.val === 14) aces += 1;
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards) => cards.length === 2 && handTotal(cards).total === 21;

function newSeat(p) {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    chips: MP_21.startChips,
    bet: MP_21.minBet,
    ready: false,
    hand: [],
    status: 'waiting', // waiting | playing | stand | bust | blackjack
    result: '',
    delta: 0,
    wins: 0,
    away: false,
    out: false
  };
}

function draw(s) {
  if (s.deck.length < 15) s.deck = [...createShuffledDeck(), ...createShuffledDeck()];
  return s.deck.pop();
}

export function twentyOneStart(players, now = Date.now()) {
  const s = {
    game: 'blackjack',
    phase: 'betting',
    round: 0,
    seats: players.slice(0, MP_21.maxPlayers).map(newSeat),
    dealer: [],
    deck: [...createShuffledDeck(), ...createShuffledDeck()],
    turn: -1,
    deadline: now + MP_21.betMs,
    nextAt: 0,
    headline: 'Place your bets!',
    winnerId: null
  };
  return s;
}

function startBetting(s, now) {
  s.phase = 'betting';
  s.dealer = [];
  s.turn = -1;
  s.deadline = now + MP_21.betMs;
  s.headline = 'Place your bets!';
  s.seats.forEach((x) => {
    if (x.chips < MP_21.minBet) x.out = true;
    x.hand = [];
    x.status = 'waiting';
    x.result = '';
    x.delta = 0;
    x.ready = false;
    x.bet = Math.max(MP_21.minBet, Math.min(x.bet || MP_21.minBet, x.chips));
  });
  const alive = s.seats.filter((x) => !x.out);
  if (alive.length < 2) {
    const winner = [...s.seats].sort((a, b) => b.chips - a.chips)[0];
    s.phase = 'over';
    s.winnerId = winner?.id || null;
    s.headline = `🏆 ${winner?.name || 'Nobody'} cleans out the table!`;
  }
  return s;
}

const inRound = (x) => !x.out && !x.away;

function deal(s, now) {
  s.round += 1;
  s.phase = 'playing';
  s.dealer = [];
  const players = s.seats.filter(inRound);
  players.forEach((x) => {
    x.hand = [];
    x.status = 'playing';
  });
  for (let r = 0; r < 2; r += 1) {
    players.forEach((x) => x.hand.push(draw(s)));
    s.dealer.push(draw(s));
  }
  players.forEach((x) => {
    if (isBlackjack(x.hand)) x.status = 'blackjack';
  });
  if (isBlackjack(s.dealer)) {
    s.headline = 'Dealer has Blackjack!';
    return settle(s, now);
  }
  s.turn = -1;
  return nextTurn(s, now);
}

function nextTurn(s, now) {
  const i = s.seats.findIndex((x, idx) => idx > s.turn && x.status === 'playing');
  if (i >= 0) {
    s.turn = i;
    s.deadline = now + MP_21.turnMs;
    s.turnStartedAt = now;
    s.headline = `${s.seats[i].name} to play`;
    return s;
  }
  s.turn = -1;
  s.phase = 'dealer';
  s.nextAt = now + MP_21.dealerStepMs;
  s.headline = 'Dealer reveals…';
  return s;
}

function settle(s, now) {
  const d = handTotal(s.dealer).total;
  const dealerBj = isBlackjack(s.dealer);
  s.seats.forEach((x) => {
    if (x.status === 'waiting' || x.hand.length === 0) return;
    const t = handTotal(x.hand).total;
    let delta;
    let result;
    if (x.status === 'bust') {
      delta = -x.bet;
      result = 'BUST';
    } else if (x.status === 'blackjack' && !dealerBj) {
      delta = Math.floor(x.bet * 1.5);
      result = 'BLACKJACK!';
    } else if (dealerBj && x.status !== 'blackjack') {
      delta = -x.bet;
      result = 'LOSE';
    } else if (d > 21) {
      delta = x.bet;
      result = 'WIN — dealer bust';
    } else if (t > d) {
      delta = x.bet;
      result = 'WIN';
    } else if (t === d) {
      delta = 0;
      result = 'PUSH';
    } else {
      delta = -x.bet;
      result = 'LOSE';
    }
    x.delta = delta;
    x.result = result;
    x.chips += delta;
  });
  // Head-to-head: the better result against the dealer takes the round.
  const played = s.seats.filter((x) => x.hand.length > 0);
  let roundWinner = null;
  if (played.length === 2) {
    const [a, b] = played;
    // Outcome first (win > push > lose > bust), then the higher hand. Against a dealer
    // blackjack the hands never really played, so only the outcome counts.
    const rank = (x) => (x.status === 'bust' ? 0 : x.delta > 0 ? 3 : x.delta === 0 ? 2 : 1);
    const score = (x) => rank(x) * 100 + (dealerBj ? 0 : handTotal(x.hand).total);
    if (score(a) !== score(b)) roundWinner = score(a) > score(b) ? a : b;
  }
  if (roundWinner) roundWinner.wins += 1;
  s.roundWinnerId = roundWinner ? roundWinner.id : null;
  s.phase = 'settled';
  s.turn = -1;
  s.nextAt = now + MP_21.settleMs;
  s.headline = roundWinner ? `${roundWinner.name} takes the round!` : 'Even round!';
  return s;
}

export function twentyOneReduce(prev, { from, type, data }, now = Date.now()) {
  const idx = prev.seats.findIndex((x) => x.id === from);
  if (idx < 0) return null;
  if (prev.phase === 'betting') {
    if (type !== 'bet') return null;
    const s = clone(prev);
    const x = s.seats[idx];
    if (x.out) return null;
    const amount = Math.floor(Number(data?.amount) || 0);
    if (amount < MP_21.minBet || amount > x.chips) return null;
    x.bet = amount;
    x.ready = true;
    const waiting = s.seats.filter((y) => inRound(y) && !y.ready);
    if (waiting.length === 0) return deal(s, now);
    return s;
  }
  if (prev.phase !== 'playing' || idx !== prev.turn) return null;
  const s = clone(prev);
  const x = s.seats[idx];
  if (type === 'hit') {
    x.hand.push(draw(s));
    const t = handTotal(x.hand).total;
    if (t > 21) x.status = 'bust';
    else if (t === 21) x.status = 'stand';
    else return s;
  } else if (type === 'stand') {
    x.status = 'stand';
  } else if (type === 'double') {
    if (x.hand.length !== 2 || x.chips < x.bet * 2) return null;
    x.bet *= 2;
    x.hand.push(draw(s));
    x.status = handTotal(x.hand).total > 21 ? 'bust' : 'stand';
  } else {
    return null;
  }
  return nextTurn(s, now);
}

export function twentyOneTick(prev, now = Date.now()) {
  if (prev.phase === 'settled' && now >= prev.nextAt) return startBetting(clone(prev), now);
  if (prev.phase === 'dealer' && now >= prev.nextAt) {
    const s = clone(prev);
    const anyStanding = s.seats.some((x) => x.status === 'stand' || x.status === 'blackjack');
    const t = handTotal(s.dealer).total;
    if (anyStanding && t < 17) {
      s.dealer.push(draw(s));
      s.nextAt = now + MP_21.dealerStepMs;
      s.headline = `Dealer draws… ${handTotal(s.dealer).total}`;
      return s;
    }
    return settle(s, now);
  }
  if (prev.phase === 'betting') {
    const s = clone(prev);
    let changed = false;
    s.seats.forEach((x) => {
      if (!inRound(x) || x.ready) return;
      if (now >= s.deadline) {
        x.bet = Math.max(MP_21.minBet, Math.min(x.bet, x.chips));
        x.ready = true;
        changed = true;
      }
    });
    const players = s.seats.filter(inRound);
    if (players.length >= 1 && players.every((x) => x.ready)) {
      if (players.length < 2 && s.seats.filter((x) => !x.out).length >= 2) {
        // Opponent is away: keep waiting rather than dealing solo forever.
        if (!changed) return null;
        s.deadline = now + MP_21.betMs;
        return s;
      }
      return deal(s, now);
    }
    return changed ? s : null;
  }
  if (prev.phase === 'playing' && prev.turn >= 0) {
    const x = prev.seats[prev.turn];
    const awayDue = x.away && now - (prev.turnStartedAt || 0) >= MP_21.awayActMs;
    if (now >= prev.deadline || awayDue) return twentyOneReduce(prev, { from: x.id, type: 'stand' }, now);
  }
  return null;
}

export function twentyOneSyncPlayers(prev, players) {
  const present = new Map(players.map((p) => [p.id, p]));
  let changed = false;
  const s = clone(prev);
  s.seats.forEach((x) => {
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
