/**
 * 1000 — computer players and the "Hint" coach.
 *
 * 'hard': Monte Carlo. Deal the cards this seat can't see at random (respecting what it does know:
 *         the shown musik, cards it gave away, declared marriages and suits players have shown out
 *         of), play each world out with a fast greedy policy and pick the move that does best.
 * 'easy': the greedy policy alone, plus cautious hand-reading for bids.
 * Only information the seat could legitimately know is used — no peeking at other hands.
 */
import {
  ALL_CARD_IDS,
  MARRIAGE_POINTS,
  SUIT_NAMES,
  beats,
  canDeclareWith,
  card,
  cardLabel,
  cardPoints,
  legalPlays,
  marriagesIn,
  maxBidFor,
  shuffled,
  trickWinnerIndex
} from './thousandRules';

const BARREL = 800;
const STEP = 10;

const nextIn = (active, seat) => active[(active.indexOf(seat) + 1) % active.length];
const suitOf = (id) => card(id).suit;

// ───────────────────────────── knowledge ─────────────────────────────

function buildView(s, me) {
  const mine = [...s.seats[me].hand];
  const gone = new Set(s.log.map((e) => e.card));
  const others = s.active.filter((i) => i !== me);
  const known = {};
  const voids = {};
  others.forEach((i) => {
    known[i] = new Set();
    voids[i] = new Set();
  });
  const held = (id) => !gone.has(id) && !mine.includes(id);
  // The musik is turned face up for everyone; assume the declarer kept what they didn't give us.
  if (s.musikShown && s.declarer !== me && s.declarer != null) {
    s.musikShown.forEach((id) => held(id) && known[s.declarer]?.add(id));
  }
  if (s.declarer === me) {
    Object.entries(s.gave || {}).forEach(([seat, id]) => held(id) && known[Number(seat)]?.add(id));
  }
  // A declared marriage tells everyone where the other half is.
  s.seats.forEach((x, i) => {
    if (i === me || !known[i]) return;
    (x.marriages || []).forEach((suit) => {
      [`K${suit}`, `Q${suit}`].forEach((id) => held(id) && known[i].add(id));
    });
  });
  s.log.forEach((e) => {
    if (!e.led || !voids[e.seat]) return;
    const led = suitOf(e.led);
    const played = suitOf(e.card);
    if (played !== led) {
      voids[e.seat].add(led);
      if (e.trump && played !== e.trump) voids[e.seat].add(e.trump);
    }
  });
  const counts = {};
  others.forEach((i) => {
    counts[i] = s.seats[i].hand.length;
    // Never "know" more cards than a player holds (e.g. the declarer gave a musik card away).
    if (known[i].size > counts[i]) known[i] = new Set([...known[i]].slice(0, counts[i]));
  });
  const knownAll = new Set(others.flatMap((i) => [...known[i]]));
  const ownDiscards = s.declarer === me ? s.discards || [] : [];
  const pool = ALL_CARD_IDS.filter(
    (id) => !mine.includes(id) && !gone.has(id) && !knownAll.has(id) && !ownDiscards.includes(id)
  );
  return { me, mine, gone, others, known, voids, counts, pool };
}

function sampleHands(view) {
  const { others, known, voids, counts, pool } = view;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const loose = attempt >= 20;
    const need = {};
    const hands = {};
    let needSum = 0;
    others.forEach((i) => {
      hands[i] = [...known[i]];
      need[i] = Math.max(0, counts[i] - hands[i].length);
      needSum += need[i];
    });
    let sinkLeft = Math.max(0, pool.length - needSum);
    const sink = [];
    let ok = true;
    for (const id of shuffled(pool)) {
      const su = suitOf(id);
      const cands = others.filter((i) => need[i] > 0 && (loose || !voids[i].has(su)));
      const total = cands.reduce((a, i) => a + need[i], 0) + sinkLeft;
      if (total <= 0) {
        ok = false;
        break;
      }
      let r = Math.random() * total;
      let pick = -1;
      for (const i of cands) {
        r -= need[i];
        if (r < 0) {
          pick = i;
          break;
        }
      }
      if (pick < 0) {
        sink.push(id);
        sinkLeft -= 1;
      } else {
        hands[pick].push(id);
        need[pick] -= 1;
      }
    }
    if (ok && others.every((i) => need[i] === 0)) return { hands, sink };
  }
  return null;
}

// ───────────────────────────── simulation ─────────────────────────────

function makeWorld(s, handsBySeat, extraDeclarerPts = 0) {
  const pts = s.seats.map((x, i) => {
    if (!s.active.includes(i)) return 0;
    let p = cardPoints(x.taken) + (x.marriages || []).reduce((a, m) => a + MARRIAGE_POINTS[m], 0);
    if (i === s.declarer) p += extraDeclarerPts;
    return p;
  });
  // Cards in the current trick are already in the log, so they count as gone.
  return {
    hands: s.seats.map((_, i) => [...(handsBySeat[i] || [])]),
    trick: s.trick.map((t) => ({ seat: t.seat, card: t.card })),
    trump: s.trump,
    trickNo: s.trickNo,
    leader: s.trick.length ? s.trick[0].seat : s.turn,
    active: s.active,
    declarer: s.declarer,
    contract: s.contract,
    pts,
    gone: new Set(s.log.map((e) => e.card))
  };
}

function cloneWorld(w) {
  return {
    ...w,
    hands: w.hands.map((h) => [...h]),
    trick: w.trick.map((t) => ({ ...t })),
    pts: [...w.pts],
    gone: new Set(w.gone)
  };
}

function isMaster(id, w, hand) {
  const c = card(id);
  for (const r of ['A', '10', 'K', 'Q', 'J', '9']) {
    const other = `${r}${c.suit}`;
    if (other === id) return true;
    if (!w.gone.has(other) && !hand.includes(other)) return false;
  }
  return true;
}

/** How much it hurts to part with a card beyond its points (breaking an unplayed marriage). */
function keepPenalty(id, hand) {
  const c = card(id);
  if (c.rank !== 'K' && c.rank !== 'Q') return 0;
  const other = `${c.rank === 'K' ? 'Q' : 'K'}${c.suit}`;
  return hand.includes(other) ? MARRIAGE_POINTS[c.suit] / 4 : 0;
}

function cheapest(list, hand, trump) {
  let best = null;
  let bestCost = Infinity;
  list.forEach((id) => {
    const c = card(id);
    const cost = c.pts + keepPenalty(id, hand) + (c.suit === trump ? 9 : 0) + c.power * 0.1;
    if (cost < bestCost) {
      bestCost = cost;
      best = id;
    }
  });
  return best;
}

/** The fast policy every player uses inside simulations (and 'easy' bots use for real). */
function greedyMove(w, seat) {
  const hand = w.hands[seat];
  const legal = legalPlays(hand, w.trick, w.trump);
  const declare = (id) => canDeclareWith(hand, id, w.trickNo, w.trick.length === 0);
  if (legal.length === 1) return { card: legal[0], marriage: declare(legal[0]), why: 'only' };

  if (w.trick.length === 0) {
    if (w.trickNo > 0) {
      const m = marriagesIn(hand).sort((a, b) => MARRIAGE_POINTS[b] - MARRIAGE_POINTS[a]);
      if (m.length) return { card: `Q${m[0]}`, marriage: true, why: 'marriage' };
    }
    const masters = hand.filter((id) => isMaster(id, w, hand) && keepPenalty(id, hand) === 0);
    if (w.trump && seat === w.declarer) {
      const tm = masters.filter((id) => suitOf(id) === w.trump);
      if (tm.length) return { card: tm[0], marriage: false, why: 'drawTrump' };
    }
    const side = masters.filter((id) => suitOf(id) !== w.trump && card(id).pts >= 10);
    if (side.length) {
      side.sort((a, b) => card(b).pts - card(a).pts);
      return { card: side[0], marriage: false, why: 'master' };
    }
    return {
      card: cheapest(legal, hand, w.trump),
      marriage: false,
      why: 'lowLead'
    };
  }

  const wi = trickWinnerIndex(w.trick, w.trump);
  const winCard = w.trick[wi].card;
  const winSeat = w.trick[wi].seat;
  const isLast = w.trick.length === w.active.length - 1;
  const friendWinning = seat !== w.declarer && winSeat !== w.declarer;
  const trickPts = w.trick.reduce((a, t) => a + card(t.card).pts, 0);
  const winners = legal.filter((id) => beats(id, winCard, w.trump));

  if (friendWinning) {
    const safe = isLast || isMaster(winCard, w, hand);
    if (safe) {
      let best = null;
      let bestVal = -Infinity;
      legal.forEach((id) => {
        const c = card(id);
        const v = c.pts - keepPenalty(id, hand) - (c.suit === w.trump ? 12 : 0) - (c.rank === 'A' && !isLast ? 4 : 0);
        if (v > bestVal) {
          bestVal = v;
          best = id;
        }
      });
      return { card: best, marriage: false, why: 'smear' };
    }
    return {
      card: cheapest(legal, hand, w.trump),
      marriage: false,
      why: 'dump'
    };
  }
  if (winners.length) {
    if (isLast)
      return {
        card: cheapest(winners, hand, w.trump),
        marriage: false,
        why: 'winLast'
      };
    const sure = winners.filter((id) => isMaster(id, w, hand));
    if (sure.length)
      return {
        card: cheapest(sure, hand, w.trump),
        marriage: false,
        why: 'win'
      };
    if (trickPts >= 10)
      return {
        card: cheapest(winners, hand, w.trump),
        marriage: false,
        why: 'winGamble'
      };
  }
  return { card: cheapest(legal, hand, w.trump), marriage: false, why: 'dump' };
}

function applyPlay(w, seat, mv) {
  const hand = w.hands[seat];
  if (mv.marriage && canDeclareWith(hand, mv.card, w.trickNo, w.trick.length === 0)) {
    const su = suitOf(mv.card);
    w.pts[seat] += MARRIAGE_POINTS[su];
    w.trump = su;
  }
  w.hands[seat] = hand.filter((c) => c !== mv.card);
  w.trick.push({ seat, card: mv.card });
  w.gone.add(mv.card);
  if (w.trick.length === w.active.length) {
    const winner = w.trick[trickWinnerIndex(w.trick, w.trump)].seat;
    w.pts[winner] += w.trick.reduce((a, t) => a + card(t.card).pts, 0);
    w.leader = winner;
    w.trick = [];
    w.trickNo += 1;
  }
}

function playout(w) {
  for (let guard = 0; guard < 40; guard += 1) {
    const seat = w.trick.length === 0 ? w.leader : nextIn(w.active, w.trick[w.trick.length - 1].seat);
    if (!w.hands[seat] || w.hands[seat].length === 0) return w;
    applyPlay(w, seat, greedyMove(w, seat));
  }
  return w;
}

function utility(w, me, s) {
  const d = w.declarer;
  const made = w.pts[d] >= w.contract;
  if (me === d) return (made ? 1000 : 0) + w.pts[d];
  const barrel = s.seats[me].score >= BARREL;
  return (made ? -1.6 * w.contract : 0) + w.pts[me] * (barrel ? 0.2 : 1);
}

// ───────────────────────────── decisions ─────────────────────────────

/** Rough value of keeping each card when the declarer chooses what to give away. */
function keepValue(id, hand) {
  const c = card(id);
  const same = hand.filter((h) => suitOf(h) === c.suit);
  let v = { 9: 2, J: 6, Q: 10, K: 14, 10: 30, A: 60 }[c.rank];
  if (c.rank === '10' && hand.includes(`A${c.suit}`)) v += 25;
  if ((c.rank === 'K' || c.rank === 'Q') && keepPenalty(id, hand) > 0) v += 40 + MARRIAGE_POINTS[c.suit] / 4;
  v += same.length * 3;
  return v;
}

function quickExchange(hand) {
  return [...hand].sort((a, b) => keepValue(a, hand) - keepValue(b, hand)).slice(0, 2);
}

/** Simulated declarer totals for `hand` if this seat becomes declarer now (bidding phase). */
function bidSamples(s, me, n) {
  const mine = s.seats[me].hand;
  const others = s.active.filter((i) => i !== me);
  const pool = ALL_CARD_IDS.filter((id) => !mine.includes(id));
  const per = mine.length;
  const out = [];
  for (let k = 0; k < n; k += 1) {
    const deck = shuffled(pool);
    const hands = {};
    others.forEach((i) => {
      hands[i] = deck.splice(0, per);
    });
    const musik = deck.splice(0, s.active.length === 3 ? 3 : 2);
    const full = [...mine, ...musik];
    const give = quickExchange(full);
    hands[me] = full.filter((id) => !give.includes(id));
    let extra = 0;
    if (s.active.length === 3) {
      const a = nextIn(s.active, me);
      const b = nextIn(s.active, a);
      hands[a].push(give[0]);
      hands[b].push(give[1]);
    } else {
      extra = cardPoints(give);
    }
    const w = makeWorld(
      {
        ...s,
        declarer: me,
        contract: 0,
        trick: [],
        trickNo: 0,
        trump: null,
        turn: me,
        log: []
      },
      hands,
      extra
    );
    w.pts = w.pts.map((_, i) => (i === me ? extra : 0));
    playout(w);
    out.push(w.pts[me]);
  }
  return out;
}

/** Largest multiple of 10 (≥ floor) that `share` of the samples reach. */
function safeLevel(samples, share, floor = 100) {
  const sorted = [...samples].sort((a, b) => b - a);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * share) - 1));
  const v = Math.floor(sorted[idx] / STEP) * STEP;
  return Math.max(floor - STEP, v);
}

function easyHandValue(hand) {
  let v = 50;
  hand.forEach((id) => {
    const c = card(id);
    if (c.rank === 'A') v += 14;
    if (c.rank === '10' && hand.includes(`A${c.suit}`)) v += 8;
  });
  v += marriagesIn(hand).reduce((a, m) => a + MARRIAGE_POINTS[m] * 0.6, 0);
  return Math.floor(v / STEP) * STEP;
}

function decideBid(s, me, level) {
  const x = s.seats[me];
  const next = s.bid.value + STEP;
  const cap = maxBidFor(x.hand);
  let limit;
  let samples = null;
  if (level === 'easy') {
    limit = easyHandValue(x.hand) + (Math.random() < 0.3 ? STEP : 0);
  } else {
    samples = bidSamples(s, me, 48);
    const keen = x.score >= BARREL || s.seats.some((o, i) => i !== me && o.score >= 880) ? 0.5 : 0.6;
    limit = safeLevel(samples, keen);
  }
  const move = next <= Math.min(limit, cap) ? { type: 'bid', data: { value: next } } : { type: 'pass', data: {} };
  return { move, samples, limit: Math.min(limit, cap), cap };
}

function exchangeSamples(s, me, give, n) {
  const d = s.seats[me];
  const keep = d.hand.filter((id) => !give.includes(id));
  const others = s.active.filter((i) => i !== me);
  const pool = ALL_CARD_IDS.filter((id) => !d.hand.includes(id));
  const out = [];
  for (let k = 0; k < n; k += 1) {
    const deck = shuffled(pool);
    const hands = { [me]: keep };
    others.forEach((i) => {
      hands[i] = deck.splice(0, s.seats[i].hand.length);
    });
    let extra = 0;
    if (s.active.length === 3) {
      const a = nextIn(s.active, me);
      const b = nextIn(s.active, a);
      hands[a].push(give[0]);
      hands[b].push(give[1]);
    } else {
      extra = cardPoints(give);
    }
    const w = makeWorld({ ...s, trick: [], trickNo: 0, trump: null, turn: me, log: [] }, hands, extra);
    playout(w);
    out.push(w.pts[me]);
  }
  return out;
}

function decideExchange(s, me, level) {
  const hand = s.seats[me].hand;
  if (level === 'easy') {
    return {
      move: {
        type: 'exchange',
        data: { cards: quickExchange(hand), contract: s.contract }
      },
      samples: null
    };
  }
  const ranked = [...hand].sort((a, b) => keepValue(a, hand) - keepValue(b, hand));
  const pool = ranked.slice(0, s.active.length === 3 ? 5 : 7);
  if (s.active.length !== 3) {
    // Discards count for the declarer: an unguarded ten is a great discard.
    hand.forEach((id) => {
      if (card(id).rank === '10' && !hand.includes(`A${suitOf(id)}`) && !pool.includes(id)) pool.push(id);
    });
  }
  let best = null;
  for (let i = 0; i < pool.length; i += 1) {
    for (let j = i + 1; j < pool.length; j += 1) {
      const give = [pool[i], pool[j]];
      const sm = exchangeSamples(s, me, give, 14);
      const made = sm.filter((v) => v >= s.contract).length / sm.length;
      const score = made * 1000 + sm.reduce((a, v) => a + v, 0) / sm.length;
      if (!best || score > best.score) best = { give, score };
    }
  }
  // Give the cheaper card to the player right after you (they lead into you less often).
  const give = best.give.sort((a, b) => card(a).pts - card(b).pts);
  const samples = exchangeSamples(s, me, give, 48);
  const keep = hand.filter((id) => !give.includes(id));
  const cap = Math.max(s.contract, maxBidFor(keep));
  const target = Math.min(cap, Math.max(s.contract, safeLevel(samples, 0.8, s.contract)));
  return {
    move: { type: 'exchange', data: { cards: give, contract: target } },
    samples
  };
}

function decidePlay(s, me, level) {
  const hand = s.seats[me].hand;
  const legal = legalPlays(hand, s.trick, s.trump);
  const declare = (id) => canDeclareWith(hand, id, s.trickNo, s.trick.length === 0);
  const view = buildView(s, me);
  if (level === 'easy' || legal.length === 1) {
    const w = makeWorld(s, { [me]: hand });
    const g = greedyMove(w, me);
    return {
      move: {
        type: 'play',
        data: { card: g.card, marriage: g.marriage || declare(g.card) }
      },
      why: g.why,
      stats: null
    };
  }
  const moves = legal.map((id) => ({ card: id, marriage: declare(id) }));
  const worlds = Math.max(14, Math.floor(360 / moves.length));
  const totals = moves.map(() => 0);
  const makes = moves.map(() => 0);
  let used = 0;
  for (let k = 0; k < worlds; k += 1) {
    const sample = sampleHands(view);
    if (!sample) continue;
    used += 1;
    const handsBySeat = { ...sample.hands, [me]: hand };
    let extra = 0;
    if (s.declarer === me) extra = cardPoints(s.discards);
    else if (s.active.length === 2) extra = cardPoints(sample.sink.slice(0, 2));
    const base = makeWorld(s, handsBySeat, extra);
    moves.forEach((mv, mi) => {
      const w = cloneWorld(base);
      applyPlay(w, me, mv);
      playout(w);
      totals[mi] += utility(w, me, s);
      if (w.pts[w.declarer] >= w.contract) makes[mi] += 1;
    });
  }
  if (!used) {
    const w = makeWorld(s, { [me]: hand });
    const g = greedyMove(w, me);
    return {
      move: { type: 'play', data: { card: g.card, marriage: g.marriage } },
      why: g.why,
      stats: null
    };
  }
  let bi = 0;
  totals.forEach((t, i) => {
    if (t > totals[bi]) bi = i;
  });
  const w = makeWorld(s, { [me]: hand });
  const g = greedyMove(w, me);
  const why = g.card === moves[bi].card ? g.why : 'sim';
  return {
    move: { type: 'play', data: moves[bi] },
    why,
    stats: { makeRate: makes[bi] / used, worlds: used }
  };
}

export function aiDecide(s, seat, level = 'hard') {
  const x = s.seats[seat];
  if (!x) return null;
  if (s.phase === 'handDone') return { type: 'next', data: {} };
  if (s.phase === 'bidding' && s.turn === seat) return decideBid(s, seat, level).move;
  if (s.phase === 'musikPick' && s.declarer === seat)
    return { type: 'pickMusik', data: { index: Math.random() < 0.5 ? 0 : 1 } };
  if (s.phase === 'exchange' && s.declarer === seat) return decideExchange(s, seat, level).move;
  if (s.phase === 'play' && s.turn === seat) return decidePlay(s, seat, level).move;
  return null;
}

// ───────────────────────────── coach ─────────────────────────────

const avg = (a) => (a.length ? a.reduce((p, v) => p + v, 0) / a.length : 0);

/** The coach: what the computer would do in your seat, and why. */
export function aiHint(s, seat) {
  const x = s.seats[seat];
  if (s.phase === 'bidding' && s.turn === seat) {
    const { move, samples, limit, cap } = decideBid(s, seat, 'hard');
    const worth = Math.round(avg(samples) / 5) * 5;
    const m = marriagesIn(x.hand);
    const mText = m.length
      ? ` Your marriage${m.length > 1 ? 's' : ''} (${m.map((q) => `${q} ${MARRIAGE_POINTS[q]}`).join(', ')}) let you bid up to ${cap}.`
      : ' No marriage, so 120 is your ceiling.';
    if (move.type === 'bid') {
      return {
        move,
        title: `Bid ${move.data.value}`,
        text: `With the musik your hand is worth about ${worth} points in simulations — it's safe to go up to about ${limit}.${mText}`
      };
    }
    return {
      move,
      title: 'Pass',
      text: `Your hand is worth about ${worth} points — not enough to promise ${s.bid.value + STEP}.${mText}`
    };
  }
  if (s.phase === 'musikPick' && s.declarer === seat) {
    return {
      move: { type: 'pickMusik', data: { index: 0 } },
      title: 'Either one',
      text: 'Both musiks are face down — it is pure luck which is better.'
    };
  }
  if (s.phase === 'exchange' && s.declarer === seat) {
    const { move, samples } = decideExchange(s, seat, 'hard');
    const [a, b] = move.data.cards;
    const make = samples.filter((v) => v >= s.contract).length / samples.length;
    const giveWord = s.active.length === 3 ? 'Give away' : 'Discard';
    const raise =
      move.data.contract > s.contract
        ? ` You can safely raise your contract to ${move.data.contract}.`
        : ' Keep the contract where it is.';
    return {
      move,
      title: `${giveWord} ${cardLabel(a)} and ${cardLabel(b)}`,
      text: `Keep your aces, guarded tens and marriages. With this you make ${s.contract} in about ${Math.round(make * 100)}% of simulations (≈${Math.round(avg(samples))} pts).${raise}`
    };
  }
  if (s.phase === 'play' && s.turn === seat) {
    const { move, why, stats } = decidePlay(s, seat, 'hard');
    const id = move.data.card;
    const c = card(id);
    const lines = {
      only: `${cardLabel(id)} is your only legal card.`,
      marriage: `Declare the ${SUIT_NAMES[c.suit]} marriage: +${MARRIAGE_POINTS[c.suit]} points and ${c.suit} becomes trump.`,
      drawTrump: `${cardLabel(id)} is the top trump left — lead it to pull the other players' trumps.`,
      master: `${cardLabel(id)} is the highest ${SUIT_NAMES[c.suit]} card left, so it should win the trick.`,
      lowLead: `Nothing is safe to lead, so lead a cheap card and keep your big cards for later.`,
      smear: `Your fellow defender is winning this trick — add points to it with ${cardLabel(id)}.`,
      dump: `You can't win this trick cheaply — throw your least valuable card.`,
      winLast: `You play last, so ${cardLabel(id)} takes the trick for sure.`,
      win: `${cardLabel(id)} can't be beaten in that suit — grab the points.`,
      winGamble: `There are points in this trick worth fighting for.`,
      sim: `Playing ${cardLabel(id)} gave the best result when the hand was played out many times.`
    };
    let text = lines[why] || lines.sim;
    if (move.data.marriage && why !== 'marriage')
      text += ` It also declares your ${SUIT_NAMES[c.suit]} marriage (+${MARRIAGE_POINTS[c.suit]}).`;
    if (stats)
      text += ` The declarer makes ${s.contract} in ${Math.round(stats.makeRate * 100)}% of playouts after this.`;
    return {
      move,
      title: `Play ${cardLabel(id)}${move.data.marriage ? ' 💍' : ''}`,
      text
    };
  }
  return null;
}
