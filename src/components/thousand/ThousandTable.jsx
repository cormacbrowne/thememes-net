import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../utils/soundEngine';
import {
  MARRIAGE_POINTS,
  SUIT_NAMES,
  canDeclareWith,
  card,
  cardLabel,
  legalPlays,
  marriagesIn,
  maxBidFor,
  sortHand,
  trickWinnerIndex
} from '../../utils/thousand/thousandRules';
import { T1000, maxContractFor } from '../../utils/thousand/thousandEngine';
import { aiHint } from '../../utils/thousand/thousandAI';
import { PlayingCard, CardBacks } from './ThousandCards';
import ThousandModal from './ThousandModal';
import './ThousandGame.css';

const ThousandRules = lazy(() => import('./ThousandRules'));

function SeatChip({ seat, idx, state, isMe }) {
  const isDealer = state.dealer === idx;
  const sitOut = !state.active.includes(idx);
  const isTurn =
    ((state.phase === 'bidding' || state.phase === 'play') && state.turn === idx) ||
    ((state.phase === 'exchange' || state.phase === 'musikPick') && state.declarer === idx);
  const barrel = seat.score >= T1000.barrel;
  return (
    <div className={`tk-chip ${isTurn ? 'is-turn' : ''} ${isMe ? 'is-me' : ''} ${sitOut ? 'is-out' : ''}`}>
      <span className="tk-chip-av">{seat.avatar}</span>
      <span className="tk-chip-name">{isMe ? 'You' : seat.name}</span>
      <span className="tk-chip-score" data-testid={isMe ? 'tk-my-score' : undefined}>
        {seat.score}
      </span>
      {barrel && (
        <span className="tk-chip-tag" title="On the barrel: only scores by winning a bid">
          🛢️
        </span>
      )}
      {isDealer && (
        <span className="tk-chip-tag is-dealer" title="Dealer">
          D
        </span>
      )}
      {seat.away && <span className="tk-chip-tag is-away">away</span>}
    </div>
  );
}

function OppStatus({ seat, idx, state }) {
  if (!state.active.includes(idx)) return <span className="tk-opp-status">Sitting out (dealer)</span>;
  const bits = [];
  if (state.phase === 'bidding') {
    if (seat.bidState === 'pass')
      bits.push(
        <span key="b" className="tk-bubble is-pass">
          Pass
        </span>
      );
    else if (typeof seat.bidState === 'number')
      bits.push(
        <span key="b" className="tk-bubble">
          {seat.bidState}
        </span>
      );
  }
  if (state.declarer === idx && state.phase !== 'bidding')
    bits.push(
      <span key="d" className="tk-bubble is-decl">
        👑 {state.contract}
      </span>
    );
  seat.marriages.forEach((m) =>
    bits.push(
      <span
        key={`m${m}`}
        className={`tk-bubble is-mar ${m === '♥' || m === '♦' ? 'is-red' : ''}`}
        title={`${SUIT_NAMES[m]} marriage +${MARRIAGE_POINTS[m]}`}
      >
        💍{m}
      </span>
    )
  );
  if (state.phase === 'play' || state.phase === 'trickDone') {
    const tricks = seat.taken.length / state.active.length;
    if (tricks > 0)
      bits.push(
        <span key="t" className="tk-opp-tricks">
          {tricks} trick{tricks === 1 ? '' : 's'}
        </span>
      );
  }
  return <span className="tk-opp-status">{bits}</span>;
}

function TurnBar({ state, now }) {
  if (!state.opts?.timers || !state.deadline) return null;
  const left = Math.max(0, state.deadline - now);
  const pct = Math.max(0, Math.min(100, (left / T1000.turnMs) * 100));
  return (
    <span className={`tk-timer ${left < 15000 ? 'is-low' : ''}`} aria-label={`${Math.ceil(left / 1000)} seconds left`}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

function HandResult({ state, meIdx }) {
  const r = state.handResult || [];
  return (
    <div className="tk-result" data-testid="tk-hand-result">
      <table className="tk-result-table">
        <thead>
          <tr>
            <th />
            <th>Cards</th>
            <th>💍</th>
            <th>Total</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {r.map((row) => {
            const x = state.seats[row.seat];
            return (
              <tr key={row.seat} className={row.declarer ? 'is-decl' : ''}>
                <td>
                  {x.avatar} {row.seat === meIdx ? 'You' : x.name}
                  {row.declarer && <span className="tk-dim"> 👑 {state.contract}</span>}
                </td>
                <td className="tk-num">{row.sitOut ? '—' : row.cardPts}</td>
                <td className="tk-num">{row.sitOut ? '—' : row.marriagePts || ''}</td>
                <td className="tk-num">{row.sitOut ? '—' : row.total}</td>
                <td className={`tk-num tk-delta ${row.delta > 0 ? 'is-up' : row.delta < 0 ? 'is-down' : ''}`}>
                  {row.delta > 0 ? `+${row.delta}` : row.delta}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="tk-result-notes">
        {r
          .filter((row) => !row.sitOut)
          .map((row) => (
            <li key={row.seat}>
              <b>{row.seat === meIdx ? 'You' : state.seats[row.seat].name}:</b> {row.note}
            </li>
          ))}
      </ul>
    </div>
  );
}

function ScoreSheet({ state, meIdx, onClose }) {
  return (
    <ThousandModal label="Score sheet" title="📋 Score sheet" onClose={onClose}>
      <div className="tk-sheet-wrap">
        <table className="tk-result-table tk-sheet">
          <thead>
            <tr>
              <th>#</th>
              <th>Bid</th>
              {state.seats.map((x, i) => (
                <th key={x.id}>
                  {x.avatar}
                  <br />
                  {i === meIdx ? 'You' : x.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.scoreSheet.map((row) => (
              <tr key={row.hand}>
                <td className="tk-num">{row.hand}</td>
                <td>
                  {state.seats[row.declarer]?.avatar} {row.contract}
                </td>
                {row.scores.map((sc, i) => (
                  <td key={i} className="tk-num">
                    <span className={`tk-delta ${row.deltas[i] > 0 ? 'is-up' : row.deltas[i] < 0 ? 'is-down' : ''}`}>
                      {row.deltas[i] > 0 ? `+${row.deltas[i]}` : row.deltas[i]}
                    </span>
                    <br />
                    <b>{sc}</b>
                  </td>
                ))}
              </tr>
            ))}
            {state.scoreSheet.length === 0 && (
              <tr>
                <td colSpan={state.seats.length + 2} className="tk-dim">
                  No hands finished yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ThousandModal>
  );
}

/**
 * The 1000 table. Used by the solo game (you vs the computer) and by "play with friends" rooms.
 * meIdx: your seat (-1 = watching). onAction(type, data) sends a move.
 */
export default function ThousandTable({ state, meIdx, onAction, now = 0, showHints = true, footer = null }) {
  const me = meIdx >= 0 ? state.seats[meIdx] : null;
  const [selected, setSelected] = useState([]);
  const [bidPick, setBidPick] = useState(null);
  const [contractPick, setContractPick] = useState(null);
  const [hint, setHint] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  const [showPts, setShowPts] = useState(true);

  // Reset local picks whenever the table moves on.
  const stepKey = `${state.handNo}:${state.phase}:${state.turn}:${state.trickNo}:${state.trick.length}`;
  const [prevKey, setPrevKey] = useState(stepKey);
  if (prevKey !== stepKey) {
    setPrevKey(stepKey);
    setSelected([]);
    setHint(null);
    setBidPick(null);
    if (state.phase !== 'exchange') setContractPick(null);
  }

  const myTurn =
    meIdx >= 0 &&
    (((state.phase === 'bidding' || state.phase === 'play') && state.turn === meIdx) ||
      ((state.phase === 'exchange' || state.phase === 'musikPick') && state.declarer === meIdx));

  const prevTurnRef = useRef(false);
  useEffect(() => {
    if (myTurn && !prevTurnRef.current) sfx.playCardFlip?.();
    prevTurnRef.current = myTurn;
  }, [myTurn]);
  const playedRef = useRef(0);
  const playedCount = state.log.length + state.handNo * 100;
  useEffect(() => {
    if (playedCount !== playedRef.current) sfx.playCardDeal?.();
    playedRef.current = playedCount;
  }, [playedCount]);

  const hand = useMemo(() => (me ? sortHand(me.hand, state.trump) : []), [me, state.trump]);
  const legal = useMemo(
    () => (me && state.phase === 'play' && state.turn === meIdx ? legalPlays(me.hand, state.trick, state.trump) : []),
    [me, state.phase, state.turn, meIdx, state.trick, state.trump]
  );

  const others = useMemo(() => {
    const n = state.seats.length;
    const start = meIdx >= 0 ? meIdx : -1;
    return Array.from({ length: n }, (_, k) => (start + 1 + k) % n).filter((i) => i !== meIdx);
  }, [state.seats.length, meIdx]);

  const askHint = () => {
    sfx.playToggle?.();
    const h = aiHint(state, meIdx);
    setHint(h || { title: 'Nothing to do', text: 'Wait for the other players.' });
    if (h?.move?.type === 'play') setSelected([h.move.data.card]);
    if (h?.move?.type === 'exchange') {
      setSelected(h.move.data.cards);
      setContractPick(h.move.data.contract);
    }
    if (h?.move?.type === 'bid') setBidPick(h.move.data.value);
  };

  const send = (type, data = {}) => {
    setHint(null);
    onAction(type, data);
  };

  // ── action area per phase ──
  let actions = null;
  const declarer = state.declarer != null ? state.seats[state.declarer] : null;
  const nameOf = (i) => (i === meIdx ? 'You' : state.seats[i]?.name);

  if (state.phase === 'bidding' && myTurn) {
    const min = state.bid.value + T1000.bidStep;
    const cap = maxBidFor(me.hand);
    const val = Math.min(cap, Math.max(min, bidPick ?? min));
    const canBid = min <= cap;
    const m = marriagesIn(me.hand);
    actions = (
      <div className="tk-actions" data-testid="tk-bid-panel">
        <p className="tk-actions-note">
          Current bid <b>{state.bid.value}</b> ({nameOf(state.bid.seat)}).{' '}
          {m.length
            ? `Your marriage${m.length > 1 ? 's' : ''} ${m.join(' ')} let${m.length > 1 ? '' : 's'} you bid up to ${cap}.`
            : 'No marriage — you can bid up to 120.'}
        </p>
        <div className="tk-row">
          {canBid && (
            <div className="tk-stepper">
              <button
                type="button"
                className="tk-btn"
                disabled={val <= min}
                onClick={() => setBidPick(val - T1000.bidStep)}
                aria-label="Lower bid"
              >
                −
              </button>
              <span className="tk-stepper-val">{val}</span>
              <button
                type="button"
                className="tk-btn"
                disabled={val >= cap}
                onClick={() => setBidPick(val + T1000.bidStep)}
                aria-label="Raise bid"
              >
                +
              </button>
            </div>
          )}
          {canBid && (
            <button
              type="button"
              className="tk-btn is-go"
              onClick={() => send('bid', { value: val })}
              data-testid="tk-bid-btn"
            >
              Bid {val}
            </button>
          )}
          <button type="button" className="tk-btn is-pass" onClick={() => send('pass')} data-testid="tk-pass-btn">
            Pass
          </button>
        </div>
      </div>
    );
  } else if (state.phase === 'musikPick' && myTurn) {
    actions = (
      <div className="tk-actions">
        <p className="tk-actions-note">You won the bid! Pick one of the two face-down musiks.</p>
        <div className="tk-row">
          {[0, 1].map((k) => (
            <button key={k} type="button" className="tk-btn is-go" onClick={() => send('pickMusik', { index: k })}>
              Musik {k + 1}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (state.phase === 'exchange' && myTurn) {
    const three = state.active.length === 3;
    const oppA = three ? state.active[(state.active.indexOf(meIdx) + 1) % 3] : null;
    const oppB = three ? state.active[(state.active.indexOf(meIdx) + 2) % 3] : null;
    const keep = me.hand.filter((c) => !selected.includes(c));
    const maxC = selected.length === 2 ? Math.max(state.contract, maxBidFor(keep)) : maxContractFor(state);
    const cVal = Math.min(maxC, Math.max(state.contract, contractPick ?? state.contract));
    actions = (
      <div className="tk-actions" data-testid="tk-exchange-panel">
        <p className="tk-actions-note">
          {three ? (
            <>
              Pick <b>2 cards to give away</b> — one to each opponent.
              {selected[0] && (
                <>
                  {' '}
                  <b>{cardLabel(selected[0])}</b> → {nameOf(oppA)}
                </>
              )}
              {selected[1] && (
                <>
                  , <b>{cardLabel(selected[1])}</b> → {nameOf(oppB)}
                </>
              )}
            </>
          ) : (
            <>
              Pick <b>2 cards to discard</b> (their points count for you).
            </>
          )}
        </p>
        <div className="tk-row">
          {three && selected.length === 2 && (
            <button type="button" className="tk-btn" onClick={() => setSelected([selected[1], selected[0]])}>
              ⇄ Swap
            </button>
          )}
          <span className="tk-actions-label">Contract</span>
          <div className="tk-stepper">
            <button
              type="button"
              className="tk-btn"
              disabled={cVal <= state.contract}
              onClick={() => setContractPick(cVal - T1000.bidStep)}
              aria-label="Lower contract"
            >
              −
            </button>
            <span className="tk-stepper-val">{cVal}</span>
            <button
              type="button"
              className="tk-btn"
              disabled={cVal >= maxC}
              onClick={() => setContractPick(cVal + T1000.bidStep)}
              aria-label="Raise contract"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="tk-btn is-go"
            disabled={selected.length !== 2}
            onClick={() => send('exchange', { cards: selected, contract: cVal })}
            data-testid="tk-exchange-btn"
          >
            {selected.length === 2 ? `Play for ${cVal}` : `Pick ${2 - selected.length} more`}
          </button>
        </div>
      </div>
    );
  } else if (state.phase === 'play' && myTurn) {
    const pick = selected[0] && legal.includes(selected[0]) ? selected[0] : null;
    const canMarry = pick && canDeclareWith(me.hand, pick, state.trickNo, state.trick.length === 0);
    const firstTrickMarriage =
      !pick && state.trickNo === 0 && state.trick.length === 0 && marriagesIn(me.hand).length > 0;
    actions = (
      <div className="tk-actions" data-testid="tk-play-panel">
        {!pick && (
          <p className="tk-actions-note">
            {state.trick.length === 0
              ? 'Your lead — tap a card.'
              : `Your turn — ${legal.length < me.hand.length ? 'you must follow suit (or trump). ' : ''}Tap a card.`}
            {firstTrickMarriage && ' (Marriages can be declared from the 2nd trick on.)'}
          </p>
        )}
        {pick && (
          <div className="tk-row">
            {canMarry ? (
              <>
                <button
                  type="button"
                  className="tk-btn is-go"
                  onClick={() => send('play', { card: pick, marriage: true })}
                  data-testid="tk-play-marriage"
                >
                  💍 Play {cardLabel(pick)} + declare (+
                  {MARRIAGE_POINTS[card(pick).suit]})
                </button>
                <button type="button" className="tk-btn" onClick={() => send('play', { card: pick, marriage: false })}>
                  Play without declaring
                </button>
              </>
            ) : (
              <button
                type="button"
                className="tk-btn is-go"
                onClick={() => send('play', { card: pick })}
                data-testid="tk-play-btn"
              >
                Play {cardLabel(pick)}
              </button>
            )}
          </div>
        )}
      </div>
    );
  } else if (state.phase === 'handDone' && me) {
    actions = (
      <div className="tk-actions">
        <div className="tk-row">
          {me.ready ? (
            <p className="tk-actions-note">
              Waiting for{' '}
              {state.seats
                .filter((x) => !x.ready && !x.away)
                .map((x) => x.name)
                .join(', ')}
              …
            </p>
          ) : (
            <button type="button" className="tk-btn is-go" onClick={() => send('next')} data-testid="tk-next-hand">
              Next hand ▶
            </button>
          )}
        </div>
      </div>
    );
  } else if (state.phase !== 'over' && state.phase !== 'handDone' && state.phase !== 'trickDone') {
    const actor = state.phase === 'exchange' || state.phase === 'musikPick' ? state.declarer : state.turn;
    if (actor >= 0 && actor !== meIdx) {
      const x = state.seats[actor];
      const doing =
        state.phase === 'bidding'
          ? 'is bidding'
          : state.phase === 'play'
            ? 'is playing'
            : state.phase === 'musikPick'
              ? 'is picking a musik'
              : 'is choosing cards to give away';
      actions = (
        <div className="tk-actions">
          <p className="tk-actions-note tk-thinking">
            {x.avatar} {x.name} {doing}
            {x.bot ? ' 🤔' : '…'}
          </p>
        </div>
      );
    }
  }

  const onCardTap = (id) => {
    if (state.phase === 'play' && myTurn) {
      if (!legal.includes(id)) return;
      sfx.playClick?.();
      if (selected[0] === id) {
        // Second tap plays it (declaring a marriage needs the button, so the choice is explicit).
        if (!canDeclareWith(me.hand, id, state.trickNo, state.trick.length === 0)) send('play', { card: id });
        return;
      }
      setSelected([id]);
      return;
    }
    if (state.phase === 'exchange' && myTurn) {
      sfx.playClick?.();
      setSelected((cur) =>
        cur.includes(id) ? cur.filter((c) => c !== id) : cur.length >= 2 ? [cur[1], id] : [...cur, id]
      );
    }
  };

  const tappable = myTurn && (state.phase === 'play' || state.phase === 'exchange');
  const showTrick = state.phase === 'play' || state.phase === 'trickDone';
  const winIdx = state.trick.length ? trickWinnerIndex(state.trick, state.trump) : -1;

  return (
    <div className="tk-table" data-testid="tk-table">
      <div className="tk-scores">
        {state.seats.map((x, i) => (
          <SeatChip key={x.id} seat={x} idx={i} state={state} isMe={i === meIdx} />
        ))}
      </div>

      <div className="tk-opps">
        {others.map((i) => {
          const x = state.seats[i];
          const isTurn =
            ((state.phase === 'bidding' || state.phase === 'play') && state.turn === i) ||
            ((state.phase === 'exchange' || state.phase === 'musikPick') && state.declarer === i);
          return (
            <div key={x.id} className={`tk-opp ${isTurn ? 'is-turn' : ''}`}>
              <div className="tk-opp-head">
                <span className="tk-chip-av">{x.avatar}</span>
                <span className="tk-opp-name">{x.name}</span>
                {x.bot && <span className="tk-chip-tag">CPU</span>}
              </div>
              {state.active.includes(i) && <CardBacks count={x.hand.length} />}
              <OppStatus seat={x} idx={i} state={state} />
            </div>
          );
        })}
      </div>

      <div className="tk-felt">
        <div className="tk-contract">
          <span>Hand {state.handNo}</span>
          {declarer && state.phase !== 'bidding' ? (
            <span>
              👑 <b>{state.declarer === meIdx ? 'You' : declarer.name}</b> {state.declarer === meIdx ? 'play' : 'plays'}{' '}
              for <b>{state.contract}</b>
            </span>
          ) : (
            <span>
              Bid: <b>{state.bid?.value}</b> ({nameOf(state.bid?.seat)})
            </span>
          )}
          <span className={`tk-trump ${state.trump === '♥' || state.trump === '♦' ? 'is-red' : ''}`}>
            Trump: {state.trump ? <b>{state.trump}</b> : <i>none yet</i>}
          </span>
        </div>

        <p className="tk-headline" role="status" aria-live="polite" data-testid="tk-headline">
          {state.headline}
        </p>

        {state.phase === 'musikPick' && (
          <div className="tk-musik">
            {state.musik.map((m, k) => (
              <div key={k} className="tk-musik-pile">
                {m.map((_, j) => (
                  <PlayingCard key={j} back size="sm" />
                ))}
                <span className="tk-dim">Musik {k + 1}</span>
              </div>
            ))}
          </div>
        )}

        {state.phase === 'exchange' && state.musikShown && (
          <div className="tk-musik">
            <span className="tk-dim">The musik:</span>
            {state.musikShown.map((id) => (
              <PlayingCard key={id} id={id} size="sm" showPts={showPts} />
            ))}
          </div>
        )}

        {showTrick && (
          <div className="tk-trick" data-testid="tk-trick">
            {state.trick.length === 0 && (
              <span className="tk-dim tk-trick-empty">
                Trick {state.trickNo + 1} of {state.active.length === 3 ? 8 : 10}
              </span>
            )}
            {state.trick.map((t, i) => (
              <div key={t.card} className={`tk-trick-slot ${i === winIdx ? 'is-winning' : ''}`}>
                <PlayingCard id={t.card} size="lg" glow={i === winIdx} showPts={showPts} />
                <span className="tk-trick-name">
                  {t.marriage ? '💍 ' : ''}
                  {nameOf(t.seat)}
                </span>
              </div>
            ))}
          </div>
        )}

        {(state.phase === 'handDone' || state.phase === 'over') && <HandResult state={state} meIdx={meIdx} />}

        <TurnBar state={state} now={now} />
      </div>

      {hint && showHints && (
        <div className="tk-hint" role="status" data-testid="tk-hint">
          <b>💡 {hint.title}</b>
          <span>{hint.text}</span>
          <button type="button" className="tk-hint-x" onClick={() => setHint(null)} aria-label="Close hint">
            ✕
          </button>
        </div>
      )}

      {actions}

      {me && state.active.includes(meIdx) && (
        <div
          className={`tk-hand ${hand.length > 10 ? 'is-tight is-tighter' : hand.length > 8 ? 'is-tight' : ''}`}
          data-testid="tk-hand"
        >
          {hand.map((id) => {
            const isLegal = !(state.phase === 'play' && myTurn) || legal.includes(id);
            return (
              <PlayingCard
                key={id}
                id={id}
                size="lg"
                selected={selected.includes(id)}
                dim={state.phase === 'play' && myTurn && !isLegal}
                showPts={showPts}
                onClick={tappable ? () => onCardTap(id) : undefined}
              />
            );
          })}
        </div>
      )}
      {me && !state.active.includes(meIdx) && state.phase !== 'over' && (
        <p className="tk-actions-note">You're the dealer — you sit this hand out.</p>
      )}

      <div className="tk-tools">
        <button type="button" className="tk-btn" onClick={() => setRulesOpen(true)} data-testid="tk-rules-btn">
          📖 Rules
        </button>
        {showHints && myTurn && (
          <button type="button" className="tk-btn is-hint" onClick={askHint} data-testid="tk-hint-btn">
            💡 Hint
          </button>
        )}
        {state.lastTrick && (state.phase === 'play' || state.phase === 'trickDone') && (
          <button type="button" className="tk-btn" onClick={() => setLastOpen((v) => !v)} aria-expanded={lastOpen}>
            🕘 Last trick
          </button>
        )}
        <button type="button" className="tk-btn" onClick={() => setSheetOpen(true)}>
          📋 Scores
        </button>
        <button
          type="button"
          className={`tk-btn ${showPts ? 'is-on' : ''}`}
          onClick={() => setShowPts((v) => !v)}
          aria-pressed={showPts}
        >
          🔢 Card points
        </button>
        {footer}
      </div>

      {lastOpen && state.lastTrick && (
        <div className="tk-last" onClick={() => setLastOpen(false)}>
          <span className="tk-dim">Last trick — won by {nameOf(state.lastTrick.winner)}:</span>
          {state.lastTrick.cards.map((t) => (
            <span key={t.card} className="tk-last-item">
              <PlayingCard id={t.card} size="sm" showPts={showPts} />
              <span className="tk-trick-name">{nameOf(t.seat)}</span>
            </span>
          ))}
        </div>
      )}

      {rulesOpen && (
        <Suspense fallback={null}>
          <ThousandRules onClose={() => setRulesOpen(false)} />
        </Suspense>
      )}
      {sheetOpen && <ScoreSheet state={state} meIdx={meIdx} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
