import { describe, it, expect } from 'vitest';
import {
  generateRoomCode,
  normalizeRoomCode,
  sanitizePlayerName,
  playersFromPresence,
  electHost,
  shouldAcceptState,
  readRoomFromSearch,
  buildInviteUrl
} from '../../src/utils/multiplayer/roomCore';
import {
  pokerStart,
  pokerReduce,
  pokerTick,
  pokerSyncPlayers,
  pokerOptions,
  buildSidePots,
  potTotal,
  MP_POKER
} from '../../src/utils/multiplayer/mpPokerEngine';
import {
  twentyOneStart,
  twentyOneReduce,
  twentyOneTick,
  handTotal,
  MP_21
} from '../../src/utils/multiplayer/mpTwentyOneEngine';
import { serpentStart, serpentTick, serpentReduce, serpentSyncPlayers, MP_SERPENT } from '../../src/utils/multiplayer/mpSerpentEngine';

const P = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}`, avatar: '😎', joinedAt: i }));

const totalChips = (s) => s.seats.reduce((a, x) => a + x.chips, 0) + potTotal(s);

describe('room core', () => {
  it('makes and validates room codes', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z2-9]{5}$/);
    expect(normalizeRoomCode(' k7qzp ')).toBe('K7QZP');
    expect(normalizeRoomCode('</>!!')).toBe(null);
    expect(normalizeRoomCode('AB')).toBe(null);
    expect(readRoomFromSearch('?ref=game&room=abcde')).toBe('ABCDE');
    expect(buildInviteUrl('https://x.net/', '/games/poker', 'ABCDE')).toBe('https://x.net/games/poker?room=ABCDE');
  });

  it('cleans nicknames', () => {
    expect(sanitizePlayerName('  <b>Bob</b>  ')).toBe('bBob/b');
    expect(sanitizePlayerName('x', 'Anon')).toBe('Anon');
    expect(sanitizePlayerName('a'.repeat(40)).length).toBe(16);
  });

  it('orders presence by join time and elects the oldest as host', () => {
    const players = playersFromPresence({
      k2: [{ id: 'b', name: 'Bee', avatar: '🐸', joinedAt: 200 }],
      k1: [{ id: 'a', name: 'Ace', avatar: '😎', joinedAt: 100 }]
    });
    expect(players.map((p) => p.id)).toEqual(['a', 'b']);
    expect(electHost(players)).toBe('a');
    expect(shouldAcceptState({ from: 'a', v: 0 }, { hostId: 'a', lastV: 5 })).toBe(true);
    expect(shouldAcceptState({ from: 'b', v: 3 }, { hostId: 'a', lastV: 5 })).toBe(false);
    expect(shouldAcceptState({ from: 'b', v: 6 }, { hostId: 'a', lastV: 5 })).toBe(true);
  });
});

describe('multiplayer poker', () => {
  it('posts blinds and deals two cards each', () => {
    const s = pokerStart(P(3), 0);
    expect(s.phase).toBe('hand');
    s.seats.forEach((x) => expect(x.hole).toHaveLength(2));
    expect(potTotal(s)).toBe(MP_POKER.smallBlind + MP_POKER.bigBlind);
    expect(totalChips(s)).toBe(3 * MP_POKER.startChips);
    expect(s.turn).toBeGreaterThanOrEqual(0);
  });

  it('only accepts actions from the player whose turn it is', () => {
    const s = pokerStart(P(2), 0);
    const notTurn = s.seats.find((_, i) => i !== s.turn).id;
    expect(pokerReduce(s, { from: notTurn, type: 'fold' }, 1)).toBe(null);
  });

  it('awards the pot when everyone else folds', () => {
    let s = pokerStart(P(3), 0);
    s = pokerReduce(s, { from: s.seats[s.turn].id, type: 'fold' }, 1);
    s = pokerReduce(s, { from: s.seats[s.turn].id, type: 'fold' }, 2);
    expect(s.phase).toBe('showdown');
    expect(s.result.winners).toHaveLength(1);
    expect(totalChips(s) - potTotal(s)).toBe(3 * MP_POKER.startChips);
  });

  it('plays a checked-down hand to showdown and conserves chips', () => {
    let s = pokerStart(P(2), 0);
    let guard = 0;
    while (s.phase === 'hand' && guard < 20) {
      const seat = s.seats[s.turn];
      const opts = pokerOptions(s, s.turn);
      s = pokerReduce(s, { from: seat.id, type: opts.canCheck ? 'check' : 'call' }, guard);
      guard += 1;
    }
    expect(s.phase).toBe('showdown');
    expect(s.board).toHaveLength(5);
    expect(s.seats.reduce((a, x) => a + x.chips, 0)).toBe(2 * MP_POKER.startChips);
  });

  it('runs out the board when both players are all in', () => {
    let s = pokerStart(P(2), 0);
    s = pokerReduce(s, { from: s.seats[s.turn].id, type: 'allin' }, 1);
    s = pokerReduce(s, { from: s.seats[s.turn].id, type: 'call' }, 2);
    expect(s.phase).toBe('showdown');
    expect(s.board).toHaveLength(5);
    expect(s.seats.reduce((a, x) => a + x.chips, 0)).toBe(2 * MP_POKER.startChips);
  });

  it('builds side pots so a short all-in cannot win chips it did not cover', () => {
    const seats = [
      { id: 'a', total: 100, inHand: true, folded: false },
      { id: 'b', total: 300, inHand: true, folded: false },
      { id: 'c', total: 300, inHand: true, folded: false },
      { id: 'd', total: 50, inHand: true, folded: true }
    ];
    const pots = buildSidePots(seats);
    expect(pots.reduce((a, p) => a + p.amount, 0)).toBe(750);
    expect(pots[0]).toEqual({ amount: 50 * 4 + 50 * 3, eligible: ['a', 'b', 'c'] });
    expect(pots[1]).toEqual({ amount: 400, eligible: ['b', 'c'] });
  });

  it('times out to check/fold and deals the next hand after the showdown', () => {
    let s = pokerStart(P(2), 0);
    s = pokerTick(s, MP_POKER.turnMs + 1);
    let guard = 0;
    while (s.phase === 'hand' && guard < 12) {
      s = pokerTick(s, s.deadline + 1);
      guard += 1;
    }
    expect(s.phase).toBe('showdown');
    const next = pokerTick(s, s.nextAt + 1);
    expect(next.handNo).toBe(s.handNo + 1);
  });

  it('seats a newcomer for the next hand and marks leavers away', () => {
    const s = pokerStart(P(2), 0);
    const synced = pokerSyncPlayers(s, [P(3)[0], P(3)[2]]);
    expect(synced.seats).toHaveLength(3);
    expect(synced.seats[1].away).toBe(true);
    expect(synced.seats[2].inHand).toBe(false);
  });
});

describe('multiplayer 21', () => {
  it('counts soft aces', () => {
    expect(handTotal([{ val: 14 }, { val: 13 }]).total).toBe(21);
    expect(handTotal([{ val: 14 }, { val: 14 }, { val: 9 }]).total).toBe(21);
    expect(handTotal([{ val: 10 }, { val: 9 }, { val: 5 }]).total).toBe(24);
  });

  it('deals once both players bet, then settles after the dealer plays', () => {
    let s = twentyOneStart(P(2), 0);
    s = twentyOneReduce(s, { from: 'p0', type: 'bet', data: { amount: 25 } }, 1);
    expect(s.phase).toBe('betting');
    s = twentyOneReduce(s, { from: 'p1', type: 'bet', data: { amount: 50 } }, 2);
    expect(['playing', 'settled', 'dealer']).toContain(s.phase);
    let t = 3;
    while (s.phase === 'playing' && t < 50) {
      s = twentyOneReduce(s, { from: s.seats[s.turn].id, type: 'stand' }, t);
      t += 1;
    }
    while (s.phase === 'dealer' && t < 100) {
      s = twentyOneTick(s, s.nextAt) || s;
      t += 1;
    }
    expect(s.phase).toBe('settled');
    const chips = s.seats.reduce((a, x) => a + x.chips, 0);
    const deltas = s.seats.reduce((a, x) => a + x.delta, 0);
    expect(chips).toBe(2 * MP_21.startChips + deltas);
    const back = twentyOneTick(s, s.nextAt + 1);
    expect(back.phase).toBe('betting');
  });

  it('rejects bets above your chips and moves out of turn', () => {
    const s = twentyOneStart(P(2), 0);
    expect(twentyOneReduce(s, { from: 'p0', type: 'bet', data: { amount: 99999 } }, 1)).toBe(null);
    expect(twentyOneReduce(s, { from: 'p0', type: 'hit' }, 1)).toBe(null);
  });
});

describe('multiplayer serpent', () => {
  it('counts down, then moves every worm one cell per tick', () => {
    let s = serpentStart(P(2), 0);
    expect(s.phase).toBe('countdown');
    s = serpentTick(s, MP_SERPENT.countdownMs + 1);
    expect(s.phase).toBe('playing');
    const before = s.snakes.map((sn) => [sn.body[0], sn.body[1]]);
    s = serpentTick(s, MP_SERPENT.countdownMs + 200);
    s.snakes.forEach((sn, i) => {
      const moved = Math.abs(sn.body[0] - before[i][0]) + Math.abs(sn.body[1] - before[i][1]);
      expect(moved).toBe(1);
    });
  });

  it('kills a worm that hits the wall and gives the round to the survivor', () => {
    let s = serpentStart(P(2), 0);
    s = serpentTick(s, MP_SERPENT.countdownMs + 1);
    s.foods = [];
    // Steer worm 0 up into the top wall; worm 1 keeps going left safely for a while.
    serpentReduce(s, { from: 'p0', type: 'dir', data: { d: 'up' } });
    let t = 0;
    while (s.phase === 'playing' && t < 40) {
      s = serpentTick(s, 10000 + t, () => 0.999);
      t += 1;
    }
    expect(s.phase).toBe('roundover');
    expect(s.roundWinnerId).toBe('p1');
    expect(s.snakes[1].wins).toBe(1);
  });

  it('ignores reversing into yourself', () => {
    const s = serpentStart(P(2), 0);
    expect(serpentReduce(s, { from: 'p0', type: 'dir', data: { d: 'left' } })).toBe(null);
  });

  it('a worm whose player leaves drops out', () => {
    let s = serpentStart(P(3), 0);
    s = serpentTick(s, MP_SERPENT.countdownMs + 1);
    const synced = serpentSyncPlayers(s, P(3).slice(0, 2));
    expect(synced.snakes[2].alive).toBe(false);
  });
});
