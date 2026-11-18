/**
 * Multiplayer Texas Hold'em (2–4 players), run by the room host. Pure functions:
 * every call returns a new state (or null when nothing changed). Table chips only.
 */
import { createShuffledDeck, evaluateBestHoldemHand, compareHandScores } from '../pokerEngine';

export const MP_POKER = {
  minPlayers: 2,
  maxPlayers: 4,
  startChips: 1000,
  smallBlind: 10,
  bigBlind: 20,
  turnMs: 30000,
  awayActMs: 1500,
  showdownMs: 6500
};

const clone = (s) => JSON.parse(JSON.stringify(s));

function newSeat(p) {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    chips: MP_POKER.startChips,
    hole: [],
    bet: 0,
    total: 0,
    folded: false,
    allIn: false,
    acted: false,
    last: '',
    away: false,
    out: false,
    inHand: false
  };
}

export const potTotal = (s) => s.seats.reduce((sum, x) => sum + x.total, 0);
const canAct = (x) => x.inHand && !x.folded && !x.allIn;
const live = (x) => x.inHand && !x.folded;

function nextIdx(s, from, pred) {
  const n = s.seats.length;
  for (let k = 1; k <= n; k += 1) {
    const i = (from + k + n) % n;
    if (pred(s.seats[i], i)) return i;
  }
  return -1;
}

function commit(seat, amount) {
  const put = Math.max(0, Math.min(seat.chips, Math.floor(amount)));
  seat.chips -= put;
  seat.bet += put;
  seat.total += put;
  if (seat.chips === 0) seat.allIn = true;
  return put;
}

function log(s, line) {
  s.log = [...(s.log || []), line].slice(-6);
}

export function pokerStart(players, now = Date.now(), rng = Math.random) {
  const seats = players.slice(0, MP_POKER.maxPlayers).map(newSeat);
  const s = {
    game: 'poker',
    phase: 'hand',
    handNo: 0,
    dealer: Math.floor(rng() * seats.length),
    seats,
    deck: [],
    board: [],
    street: 'preflop',
    currentBet: 0,
    minRaise: MP_POKER.bigBlind,
    turn: -1,
    deadline: 0,
    nextAt: 0,
    result: null,
    winnerId: null,
    log: []
  };
  // dealHand moves the button one seat on, so start one seat back.
  s.dealer = (s.dealer - 1 + seats.length) % seats.length;
  return dealHand(s, now);
}

export function dealHand(prev, now = Date.now()) {
  const s = clone(prev);
  s.seats.forEach((x) => {
    if (x.chips <= 0) x.out = true;
    x.hole = [];
    x.bet = 0;
    x.total = 0;
    x.folded = false;
    x.allIn = false;
    x.acted = false;
    x.last = x.out ? 'OUT' : x.away ? 'AWAY' : '';
    x.inHand = !x.out && !x.away;
  });
  const players = s.seats.filter((x) => !x.out);
  if (players.length < 2) {
    const winner = [...s.seats].sort((a, b) => b.chips - a.chips)[0];
    s.phase = 'over';
    s.winnerId = winner?.id || null;
    s.turn = -1;
    log(s, `🏆 ${winner?.name || 'Nobody'} takes the table!`);
    return s;
  }
  const dealt = s.seats.filter((x) => x.inHand);
  if (dealt.length < 2) {
    // Everyone else is away: wait and try again shortly.
    s.phase = 'showdown';
    s.result = { lines: [], winners: [], note: 'Waiting for players to come back…' };
    s.nextAt = now + 3000;
    s.turn = -1;
    return s;
  }

  s.handNo += 1;
  s.phase = 'hand';
  s.street = 'preflop';
  s.result = null;
  s.board = [];
  s.deck = createShuffledDeck();
  s.dealer = nextIdx(s, s.dealer, (x) => x.inHand);
  for (let r = 0; r < 2; r += 1) {
    for (let k = 1; k <= s.seats.length; k += 1) {
      const seat = s.seats[(s.dealer + k) % s.seats.length];
      if (seat.inHand) seat.hole.push(s.deck.pop());
    }
  }

  const headsUp = dealt.length === 2;
  const sbIdx = headsUp ? s.dealer : nextIdx(s, s.dealer, (x) => x.inHand);
  const bbIdx = nextIdx(s, sbIdx, (x) => x.inHand);
  commit(s.seats[sbIdx], MP_POKER.smallBlind);
  s.seats[sbIdx].last = 'SB';
  commit(s.seats[bbIdx], MP_POKER.bigBlind);
  s.seats[bbIdx].last = 'BB';
  s.currentBet = Math.max(s.seats[sbIdx].bet, s.seats[bbIdx].bet);
  s.minRaise = MP_POKER.bigBlind;
  s.turn = bbIdx; // advance() looks for the next seat that still needs to act
  log(s, `Hand #${s.handNo} — ${s.seats[s.dealer].name} has the button`);
  return advance(s, now, true);
}

function roundComplete(s) {
  const actors = s.seats.filter(canAct);
  if (actors.length === 0) return true;
  if (actors.length === 1 && actors[0].bet >= s.currentBet && s.seats.filter(live).length > 1) {
    // Last player able to bet already matches: nobody left to bet against.
    const others = s.seats.filter((x) => live(x) && x !== actors[0]);
    if (others.every((x) => x.allIn)) return true;
  }
  return actors.every((x) => x.acted && x.bet === s.currentBet);
}

function advance(s, now, fromDeal = false) {
  const liveSeats = s.seats.filter(live);
  if (liveSeats.length === 1) {
    const w = liveSeats[0];
    const pot = potTotal(s);
    w.chips += pot;
    s.result = {
      winners: [w.id],
      lines: [{ id: w.id, name: w.name, hand: 'Everyone folded', won: pot }],
      reveal: [],
      pot
    };
    log(s, `${w.name} wins ${pot} — everyone folded`);
    return finishHand(s, now);
  }

  if (!roundComplete(s)) {
    const start = fromDeal ? s.turn : s.turn;
    const i = nextIdx(s, start, (x) => canAct(x) && (!x.acted || x.bet < s.currentBet));
    s.turn = i;
    s.deadline = now + MP_POKER.turnMs;
    s.turnStartedAt = now;
    return s;
  }

  // Betting round over: next street (or run the board out when nobody can bet).
  s.seats.forEach((x) => {
    x.bet = 0;
    x.acted = false;
  });
  s.currentBet = 0;
  s.minRaise = MP_POKER.bigBlind;
  if (s.street === 'river') return showdown(s, now);
  if (s.street === 'preflop') {
    s.board.push(s.deck.pop(), s.deck.pop(), s.deck.pop());
    s.street = 'flop';
  } else if (s.street === 'flop') {
    s.board.push(s.deck.pop());
    s.street = 'turn';
  } else {
    s.board.push(s.deck.pop());
    s.street = 'river';
  }
  if (s.seats.filter(canAct).length <= 1) {
    return advance(s, now);
  }
  s.turn = s.dealer; // first to act is the first live seat after the button
  return advance(s, now);
}

/** Side pots from each seat's total contribution. Folded chips stay in, folded seats can't win. */
export function buildSidePots(seats) {
  const levels = [...new Set(seats.map((x) => x.total).filter((t) => t > 0))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    seats.forEach((x) => {
      amount += Math.min(x.total, level) - Math.min(x.total, prev);
    });
    let eligible = seats.filter((x) => live(x) && x.total >= level).map((x) => x.id);
    if (eligible.length === 0) {
      const top = Math.max(...seats.filter(live).map((x) => x.total));
      eligible = seats.filter((x) => live(x) && x.total === top).map((x) => x.id);
    }
    const last = pots[pots.length - 1];
    if (last && last.eligible.join() === eligible.join()) last.amount += amount;
    else pots.push({ amount, eligible });
    prev = level;
  }
  return pots;
}

function showdown(s, now) {
  const contenders = s.seats.filter(live);
  const evals = {};
  contenders.forEach((x) => {
    evals[x.id] = evaluateBestHoldemHand([...x.hole, ...s.board]);
  });
  const won = {};
  const pots = buildSidePots(s.seats);
  pots.forEach((pot) => {
    let best = null;
    let winners = [];
    pot.eligible.forEach((id) => {
      const e = evals[id];
      const c = best ? compareHandScores(e.score, best.score) : 1;
      if (c > 0) {
        best = e;
        winners = [id];
      } else if (c === 0) winners.push(id);
    });
    const share = Math.floor(pot.amount / winners.length);
    let rem = pot.amount - share * winners.length;
    // Odd chips go to the first winner after the button.
    const ordered = [];
    for (let k = 1; k <= s.seats.length; k += 1) {
      const seat = s.seats[(s.dealer + k) % s.seats.length];
      if (winners.includes(seat.id)) ordered.push(seat.id);
    }
    ordered.forEach((id) => {
      const extra = rem > 0 ? 1 : 0;
      rem -= extra;
      won[id] = (won[id] || 0) + share + extra;
    });
  });
  s.seats.forEach((x) => {
    if (won[x.id]) x.chips += won[x.id];
  });
  const pot = potTotal(s);
  const winners = Object.keys(won);
  s.result = {
    winners,
    reveal: contenders.map((x) => x.id),
    pot,
    lines: contenders
      .map((x) => ({ id: x.id, name: x.name, hand: evals[x.id].name, won: won[x.id] || 0, best: evals[x.id].bestCards }))
      .sort((a, b) => b.won - a.won)
  };
  const top = s.result.lines[0];
  log(s, `${top.name} wins ${top.won} with ${top.hand}`);
  return finishHand(s, now);
}

function finishHand(s, now) {
  s.phase = 'showdown';
  s.turn = -1;
  s.nextAt = now + MP_POKER.showdownMs;
  return s;
}

/** Legal options for the seat whose turn it is (used by the UI). */
export function pokerOptions(s, seatIdx) {
  const x = s.seats[seatIdx];
  if (!x || s.phase !== 'hand' || s.turn !== seatIdx) return null;
  const toCall = Math.max(0, s.currentBet - x.bet);
  const maxTo = x.bet + x.chips;
  const minTo = Math.min(maxTo, s.currentBet + s.minRaise);
  return {
    toCall: Math.min(toCall, x.chips),
    canCheck: toCall === 0,
    canRaise: x.chips > toCall,
    minTo,
    maxTo,
    raiseLabel: s.currentBet === 0 ? 'Bet' : 'Raise'
  };
}

export function pokerReduce(prev, { from, type, data }, now = Date.now()) {
  if (type === 'rematch') {
    if (prev.phase !== 'over') return null;
    return null; // handled by the room (needs the live player list)
  }
  if (prev.phase !== 'hand') return null;
  const idx = prev.seats.findIndex((x) => x.id === from);
  if (idx < 0 || idx !== prev.turn) return null;
  const s = clone(prev);
  const x = s.seats[idx];
  const toCall = Math.max(0, s.currentBet - x.bet);

  if (type === 'fold') {
    x.folded = true;
    x.last = 'FOLD';
  } else if (type === 'check') {
    if (toCall > 0) return null;
    x.last = 'CHECK';
  } else if (type === 'call') {
    if (toCall === 0) return null;
    commit(x, toCall);
    x.last = x.allIn ? 'ALL IN' : `CALL ${toCall}`;
  } else if (type === 'raise' || type === 'allin') {
    const maxTo = x.bet + x.chips;
    let target = type === 'allin' ? maxTo : Math.floor(Number(data?.to) || 0);
    target = Math.min(target, maxTo);
    const raiseBy = target - s.currentBet;
    if (raiseBy <= 0) {
      if (type !== 'allin') return null;
      commit(x, target - x.bet); // all-in for less than a call
      x.last = 'ALL IN';
    } else {
      if (raiseBy < s.minRaise && target < maxTo) return null;
      commit(x, target - x.bet);
      if (raiseBy >= s.minRaise) s.minRaise = raiseBy;
      const wasBet = s.currentBet === 0;
      s.currentBet = target;
      x.last = x.allIn ? 'ALL IN' : `${wasBet ? 'BET' : 'RAISE'} ${target}`;
    }
  } else {
    return null;
  }
  x.acted = true;
  log(s, `${x.name}: ${x.last.toLowerCase()}`);
  return advance(s, now);
}

/** Host timer: turn timeouts, away players, next hand after the showdown. */
export function pokerTick(prev, now = Date.now()) {
  if (prev.phase === 'showdown' && now >= prev.nextAt) return dealHand(prev, now);
  if (prev.phase !== 'hand' || prev.turn < 0) return null;
  const x = prev.seats[prev.turn];
  const timedOut = now >= prev.deadline;
  const awayDue = x.away && now - (prev.turnStartedAt || 0) >= MP_POKER.awayActMs;
  if (!timedOut && !awayDue) return null;
  const type = prev.currentBet - x.bet <= 0 ? 'check' : 'fold';
  return pokerReduce(prev, { from: x.id, type }, now);
}

/** Presence changed: mark seats away / back, give empty seats to newcomers (dealt next hand). */
export function pokerSyncPlayers(prev, players) {
  const present = new Map(players.map((p) => [p.id, p]));
  let changed = false;
  const s = clone(prev);
  s.seats.forEach((x) => {
    const p = present.get(x.id);
    const away = !p;
    if (x.away !== away) {
      x.away = away;
      changed = true;
    }
    if (p && (p.name !== x.name || p.avatar !== x.avatar)) {
      x.name = p.name;
      x.avatar = p.avatar;
      changed = true;
    }
  });
  if (s.phase !== 'over') {
    players.forEach((p) => {
      if (s.seats.length >= MP_POKER.maxPlayers) return;
      if (s.seats.some((x) => x.id === p.id)) return;
      const seat = newSeat(p);
      seat.last = 'NEXT HAND';
      s.seats.push(seat);
      log(s, `${p.name} sat down`);
      changed = true;
    });
  }
  return changed ? s : null;
}
