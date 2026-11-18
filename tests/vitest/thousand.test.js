import { describe, it, expect } from 'vitest';
import {
  ALL_CARD_IDS,
  cardPoints,
  legalPlays,
  maxBidFor,
  trickWinnerIndex,
  canDeclareWith,
  roundToTen
} from '../../src/utils/thousand/thousandRules';
import {
  thousandStart,
  thousandReduce,
  thousandTick,
  thousandSyncPlayers,
  T1000
} from '../../src/utils/thousand/thousandEngine';
import { aiDecide, aiHint } from '../../src/utils/thousand/thousandAI';

const bots = (n, level = 'hard') =>
  Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    name: `Bot ${i}`,
    avatar: '🤖',
    bot: true,
    level
  }));

/** Run the host clock far enough ahead that every pending bot move / pause resolves. */
function runHand(s, maxSteps = 400) {
  let t = 1_000_000;
  const startHand = s.handNo;
  for (let i = 0; i < maxSteps; i += 1) {
    if (s.phase === 'over' || (s.phase === 'handDone' && s.handNo === startHand)) return s;
    t += 5000;
    const next = thousandTick(s, t);
    if (next) s = next;
  }
  throw new Error(`hand did not finish (phase ${s.phase})`);
}

describe('1000 rules', () => {
  it('has a 24 card deck worth 120 points', () => {
    expect(ALL_CARD_IDS).toHaveLength(24);
    expect(cardPoints(ALL_CARD_IDS)).toBe(120);
  });

  it('follow suit, else trump, else anything', () => {
    const hand = ['A♥', '9♠', 'K♣'];
    expect(legalPlays(hand, [{ seat: 0, card: '10♥' }], null)).toEqual(['A♥']);
    expect(legalPlays(hand, [{ seat: 0, card: '10♦' }], '♠')).toEqual(['9♠']);
    expect(legalPlays(hand, [{ seat: 0, card: '10♦' }], null)).toHaveLength(3);
  });

  it('ten beats king, trump beats everything', () => {
    expect(trickWinnerIndex([{ card: 'K♥' }, { card: '10♥' }, { card: 'A♠' }], null)).toBe(1);
    expect(trickWinnerIndex([{ card: 'A♥' }, { card: '9♣' }, { card: '10♥' }], '♣')).toBe(1);
  });

  it('marriages raise the bidding ceiling and need a lead after the first trick', () => {
    expect(maxBidFor(['K♥', 'Q♥', '9♠'])).toBe(220);
    expect(maxBidFor(['K♥', 'Q♠'])).toBe(120);
    expect(canDeclareWith(['K♥', 'Q♥'], 'K♥', 0, true)).toBe(false);
    expect(canDeclareWith(['K♥', 'Q♥'], 'Q♥', 1, true)).toBe(true);
    expect(canDeclareWith(['K♥', 'Q♥'], 'Q♥', 1, false)).toBe(false);
    expect(roundToTen(45)).toBe(50);
    expect(roundToTen(44)).toBe(40);
  });
});

describe('1000 engine', () => {
  it('deals 7+7+7+3 for three players and opens at 100', () => {
    const s = thousandStart(bots(3), 0);
    const counts = s.seats.map((x) => x.hand.length);
    expect(counts).toEqual([7, 7, 7]);
    expect(s.musik[0]).toHaveLength(3);
    expect(s.bid.value).toBe(100);
    expect(s.phase).toBe('bidding');
  });

  it('deals 10+10 and two musiks for two players; four players sit the dealer out', () => {
    const two = thousandStart(bots(2), 0);
    expect(two.seats.map((x) => x.hand.length)).toEqual([10, 10]);
    expect(two.musik.map((m) => m.length)).toEqual([2, 2]);
    const four = thousandStart(bots(4), 0);
    expect(four.seats[four.dealer].hand).toHaveLength(0);
    expect(four.active).toHaveLength(3);
  });

  it('rejects out-of-turn and illegal bids', () => {
    const s = thousandStart(bots(3), 0);
    const other = s.seats.find((_, i) => i !== s.turn);
    expect(thousandReduce(s, { from: other.id, type: 'pass' }, 1)).toBeNull();
    const me = s.seats[s.turn];
    expect(thousandReduce(s, { from: me.id, type: 'bid', data: { value: 105 } }, 1)).toBeNull();
    expect(thousandReduce(s, { from: me.id, type: 'bid', data: { value: 100 } }, 1)).toBeNull();
  });

  it('opener wins at 100 when everyone passes, takes the musik and gives a card to each', () => {
    let s = thousandStart(bots(3), 0);
    const opener = s.bid.seat;
    s = thousandReduce(s, { from: s.seats[s.turn].id, type: 'pass' }, 1);
    s = thousandReduce(s, { from: s.seats[s.turn].id, type: 'pass' }, 2);
    expect(s.phase).toBe('exchange');
    expect(s.declarer).toBe(opener);
    expect(s.seats[opener].hand).toHaveLength(10);
    const give = s.seats[opener].hand.slice(0, 2);
    s = thousandReduce(
      s,
      {
        from: s.seats[opener].id,
        type: 'exchange',
        data: { cards: give, contract: 100 }
      },
      3
    );
    expect(s.phase).toBe('play');
    expect(s.seats.map((x) => x.hand.length)).toEqual([8, 8, 8]);
  });

  for (const n of [2, 3, 4]) {
    it(`plays full hands with ${n} computer players and keeps the score sheet straight`, () => {
      let s = thousandStart(bots(n, n === 4 ? 'easy' : 'hard'), 0);
      for (let h = 0; h < 2; h += 1) {
        s = runHand(s);
        if (s.phase === 'over') break;
        const r = s.handResult;
        const d = r.find((x) => x.declarer);
        expect(Math.abs(d.delta)).toBe(s.contract);
        const totalCards = r.reduce((a, x) => a + x.cardPts, 0);
        expect(totalCards).toBeLessThanOrEqual(120);
        if (n === 3) expect(totalCards).toBe(120);
        s.seats.forEach((x) => expect(x.hand).toHaveLength(0));
        // bots are ready; the clock deals the next hand
        s = thousandTick(s, 2_000_000 + h * 1_000_000) || s;
      }
    }, 30000);
  }

  it('away players are auto-played and the hint coach always suggests a legal move', () => {
    const players = [{ id: 'me', name: 'Me', avatar: '😎' }, ...bots(2)];
    let s = thousandStart(players, 0, { timers: true });
    s = thousandSyncPlayers(s, [{ id: 'me', name: 'Me', avatar: '😎' }]) || s;
    for (let i = 0; i < 60 && s.phase !== 'handDone' && s.phase !== 'over'; i += 1) {
      const meIdx = 0;
      if ((s.phase === 'bidding' || s.phase === 'play') && s.turn === meIdx) {
        const hint = aiHint(s, meIdx);
        expect(hint).toBeTruthy();
        const next = thousandReduce(
          s,
          { from: 'me', type: hint.move.type, data: hint.move.data },
          1_000_000 + i * 5000
        );
        expect(next).not.toBeNull();
        s = next;
        continue;
      }
      if ((s.phase === 'exchange' || s.phase === 'musikPick') && s.declarer === meIdx) {
        const hint = aiHint(s, meIdx);
        s = thousandReduce(s, { from: 'me', type: hint.move.type, data: hint.move.data }, 1_000_000 + i * 5000);
        continue;
      }
      s = thousandTick(s, 1_000_000 + (i + 1) * 5000) || s;
    }
    expect(['handDone', 'over', 'play', 'trickDone']).toContain(s.phase);
  }, 30000);

  it('a whole game between computers reaches 1000', () => {
    let s = thousandStart(bots(3, 'easy'), 0);
    let t = 0;
    for (let i = 0; i < 20000 && s.phase !== 'over'; i += 1) {
      t += T1000.handMs + 10;
      s = thousandTick(s, t) || s;
    }
    expect(s.phase).toBe('over');
    expect(Math.max(...s.seats.map((x) => x.score))).toBeGreaterThanOrEqual(1000);
    expect(aiDecide(s, 0)).toBeNull();
  }, 60000);
});
