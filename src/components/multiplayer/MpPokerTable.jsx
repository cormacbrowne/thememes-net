import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../utils/soundEngine';
import { MP_POKER, pokerOptions, potTotal } from '../../utils/multiplayer/mpPokerEngine';
import { MpCard, TurnTimer, GameOverPanel } from './MpBits';
import { useHostNow } from '../../hooks/useHostNow';

function Seat({ seat, isMe, isTurn, isDealer, reveal, winner, bestIds, now, deadline }) {
  const showCards = isMe || reveal;
  return (
    <div
      className={`tm-mp-pk-seat ${isTurn ? 'is-turn' : ''} ${seat.folded ? 'is-folded' : ''} ${winner ? 'is-winner' : ''} ${isMe ? 'is-me' : ''}`}
      data-testid={isMe ? 'mp-pk-my-seat' : undefined}
    >
      <div className="tm-mp-pk-seat-head">
        <span className="tm-mp-avatar">{seat.avatar}</span>
        <span className="tm-mp-pk-name">
          {seat.name}
          {isMe && <span className="tm-mp-tag is-you">YOU</span>}
        </span>
        {isDealer && <span className="tm-mp-pk-dealer" title="Dealer button">D</span>}
      </div>
      <div className="tm-mp-pk-cards">
        {seat.hole.length > 0 ? (
          seat.hole.map((c, i) => (
            <MpCard key={i} card={showCards ? c : null} hidden={!showCards} small={!isMe} glow={bestIds?.has(c.id)} />
          ))
        ) : (
          <span className="tm-mp-pk-sitout">{seat.out ? 'Out of chips' : seat.away ? 'Away' : 'Next hand'}</span>
        )}
      </div>
      <div className="tm-mp-pk-meta">
        <span className="tm-mp-pk-chips">{seat.chips} chips</span>
        {seat.bet > 0 && <span className="tm-mp-pk-bet">bet {seat.bet}</span>}
        {seat.last && <span className="tm-mp-pk-last">{seat.last}</span>}
        {seat.away && seat.hole.length > 0 && <span className="tm-mp-pk-last is-away">AWAY</span>}
      </div>
      {isTurn && <TurnTimer deadline={deadline} totalMs={MP_POKER.turnMs} now={now} />}
    </div>
  );
}

export default function MpPokerTable({ state, me, isHost, hostName, clockOffset, sendAction, onRematch, onLobby, canRematch }) {
  const myIdx = state.seats.findIndex((x) => x.id === me);
  const mySeat = myIdx >= 0 ? state.seats[myIdx] : null;
  const opts = myIdx >= 0 ? pokerOptions(state, myIdx) : null;
  const now = useHostNow(clockOffset, state.phase === 'hand');
  const pot = potTotal(state);
  const [raiseTo, setRaiseTo] = useState(0);

  const minTo = opts?.minTo ?? 0;
  const maxTo = opts?.maxTo ?? 0;
  const raiseValue = Math.min(maxTo, Math.max(minTo, raiseTo || minTo));

  // Order seats so I am at the bottom and the others go round the table in turn order.
  const others = useMemo(() => {
    if (myIdx < 0) return state.seats.map((s, i) => ({ s, i }));
    const out = [];
    for (let k = 1; k < state.seats.length; k += 1) {
      const i = (myIdx + k) % state.seats.length;
      out.push({ s: state.seats[i], i });
    }
    return out;
  }, [state.seats, myIdx]);

  const myTurn = !!opts;
  const prevTurnRef = useRef(false);
  useEffect(() => {
    if (myTurn && !prevTurnRef.current) sfx.playCardFlip?.();
    prevTurnRef.current = myTurn;
  }, [myTurn]);
  const lastBoardRef = useRef(0);
  useEffect(() => {
    if (state.board.length > lastBoardRef.current) sfx.playCardDeal?.();
    lastBoardRef.current = state.board.length;
  }, [state.board.length]);

  const result = state.phase === 'showdown' ? state.result : null;
  const revealIds = new Set(result?.reveal || []);
  const winnerIds = new Set(result?.winners || []);
  const bestIds = useMemo(() => {
    const top = result?.lines?.[0];
    return new Set((top?.won > 0 && top?.best ? top.best : []).map((c) => c.id));
  }, [result]);

  const act = (type, data) => {
    sfx.playChipStack?.();
    sendAction(type, data);
    setRaiseTo(0);
  };

  if (state.phase === 'over') {
    const w = state.seats.find((x) => x.id === state.winnerId);
    return (
      <div className="tm-mp-pk">
        <GameOverPanel
          title={`🏆 ${w ? w.name : 'Nobody'} wins the table!`}
          sub={w ? `${w.chips} chips after ${state.handNo} hand${state.handNo === 1 ? '' : 's'}` : ''}
          isHost={isHost}
          hostName={hostName}
          canRematch={canRematch}
          onRematch={onRematch}
          onLobby={onLobby}
        />
      </div>
    );
  }

  const potQuick = [
    { label: 'Min', to: minTo },
    { label: '½ Pot', to: (state.currentBet || 0) + Math.round(pot / 2) },
    { label: 'Pot', to: (state.currentBet || 0) + pot }
  ];

  return (
    <div className="tm-mp-pk" data-testid="mp-poker">
      <div className="tm-mp-pk-others">
        {others.map(({ s, i }) => (
          <Seat
            key={s.id}
            seat={s}
            isMe={false}
            isTurn={state.turn === i}
            isDealer={state.dealer === i}
            reveal={revealIds.has(s.id)}
            winner={winnerIds.has(s.id)}
            bestIds={bestIds}
            now={now}
            deadline={state.deadline}
          />
        ))}
      </div>

      <div className="tm-mp-pk-felt">
        <div className="tm-mp-pk-board" data-testid="mp-pk-board">
          {Array.from({ length: 5 }, (_, i) => (
            <MpCard key={i} card={state.board[i]} hidden={!state.board[i]} glow={state.board[i] && bestIds.has(state.board[i].id)} />
          ))}
        </div>
        <div className="tm-mp-pk-pot">
          POT <b>{pot}</b> <span className="tm-mp-pk-street">{state.street.toUpperCase()}</span>
        </div>
        {result ? (
          <div className="tm-mp-pk-result" role="status">
            {result.note ||
              result.lines
                .filter((l) => l.won > 0)
                .map((l) => `${l.name} wins ${l.won} — ${l.hand}`)
                .join(' • ')}
          </div>
        ) : (
          <div className="tm-mp-pk-log">{state.log?.[state.log.length - 1] || ''}</div>
        )}
      </div>

      {mySeat && (
        <Seat
          seat={mySeat}
          isMe
          isTurn={state.turn === myIdx}
          isDealer={state.dealer === myIdx}
          reveal
          winner={winnerIds.has(mySeat.id)}
          bestIds={bestIds}
          now={now}
          deadline={state.deadline}
        />
      )}

      <div className="tm-mp-actions" aria-live="polite">
        {myTurn ? (
          <>
            <div className="tm-mp-actions-row">
              <button type="button" className="tm-mp-act is-fold" onClick={() => act('fold')} data-testid="mp-pk-fold">
                Fold
              </button>
              {opts.canCheck ? (
                <button type="button" className="tm-mp-act" onClick={() => act('check')} data-testid="mp-pk-check">
                  Check
                </button>
              ) : (
                <button type="button" className="tm-mp-act" onClick={() => act('call')} data-testid="mp-pk-call">
                  Call {opts.toCall}
                </button>
              )}
              {opts.canRaise && (
                <button
                  type="button"
                  className="tm-mp-act is-raise"
                  onClick={() => act(raiseValue >= maxTo ? 'allin' : 'raise', { to: raiseValue })}
                  data-testid="mp-pk-raise"
                >
                  {raiseValue >= maxTo ? `All in ${maxTo}` : `${opts.raiseLabel} to ${raiseValue}`}
                </button>
              )}
            </div>
            {opts.canRaise && minTo < maxTo && (
              <div className="tm-mp-actions-row is-raise-row">
                <input
                  type="range"
                  className="tm-mp-range"
                  min={minTo}
                  max={maxTo}
                  step={5}
                  value={raiseValue}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                  aria-label="Raise amount"
                />
                {potQuick.map((q) => (
                  <button key={q.label} type="button" className="tm-mp-chip-btn" onClick={() => setRaiseTo(Math.min(maxTo, Math.max(minTo, q.to)))}>
                    {q.label}
                  </button>
                ))}
                <button type="button" className="tm-mp-chip-btn" onClick={() => setRaiseTo(maxTo)}>
                  All in
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="tm-mp-waiting">
            {state.phase === 'showdown'
              ? 'Next hand coming up…'
              : state.turn >= 0
                ? `${state.seats[state.turn]?.name} is thinking…`
                : ''}
          </p>
        )}
      </div>
    </div>
  );
}
