import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../utils/soundEngine';
import { MP_21, handTotal } from '../../utils/multiplayer/mpTwentyOneEngine';
import { MpCard, TurnTimer, GameOverPanel } from './MpBits';
import { useHostNow } from '../../hooks/useHostNow';

const STATUS_LABEL = { bust: 'BUST', blackjack: 'BLACKJACK', stand: 'STAND' };

function PlayerBox({ seat, isMe, isTurn, phase, now, deadline, roundWinner }) {
  const total = seat.hand.length ? handTotal(seat.hand).total : 0;
  return (
    <div
      className={`tm-mp-bj-player ${isTurn ? 'is-turn' : ''} ${isMe ? 'is-me' : ''} ${roundWinner ? 'is-winner' : ''}`}
      data-testid={isMe ? 'mp-bj-my-box' : undefined}
    >
      <div className="tm-mp-pk-seat-head">
        <span className="tm-mp-avatar">{seat.avatar}</span>
        <span className="tm-mp-pk-name">
          {seat.name}
          {isMe && <span className="tm-mp-tag is-you">YOU</span>}
        </span>
        <span className="tm-mp-bj-wins" title="Rounds won head-to-head">
          🏅 {seat.wins}
        </span>
      </div>
      <div className="tm-mp-pk-cards">
        {seat.hand.length ? (
          seat.hand.map((c, i) => <MpCard key={i} card={c} />)
        ) : (
          <span className="tm-mp-pk-sitout">
            {seat.out ? 'Out of chips' : seat.away ? 'Away' : phase === 'betting' ? (seat.ready ? `✓ Bet ${seat.bet}` : 'Choosing bet…') : ''}
          </span>
        )}
      </div>
      <div className="tm-mp-pk-meta">
        <span className="tm-mp-pk-chips">{seat.chips} chips</span>
        {seat.hand.length > 0 && <span className="tm-mp-pk-bet">bet {seat.bet}</span>}
        {total > 0 && <span className="tm-mp-bj-total">{total}</span>}
        {STATUS_LABEL[seat.status] && !seat.result && <span className="tm-mp-pk-last">{STATUS_LABEL[seat.status]}</span>}
        {seat.result && (
          <span className={`tm-mp-pk-last ${seat.delta > 0 ? 'is-win' : seat.delta < 0 ? 'is-lose' : ''}`}>
            {seat.result} {seat.delta > 0 ? `+${seat.delta}` : seat.delta < 0 ? seat.delta : ''}
          </span>
        )}
        {seat.away && <span className="tm-mp-pk-last is-away">AWAY</span>}
      </div>
      {isTurn && <TurnTimer deadline={deadline} totalMs={MP_21.turnMs} now={now} />}
    </div>
  );
}

export default function MpTwentyOneTable({ state, me, isHost, hostName, clockOffset, sendAction, onRematch, onLobby, canRematch }) {
  const myIdx = state.seats.findIndex((x) => x.id === me);
  const mySeat = myIdx >= 0 ? state.seats[myIdx] : null;
  const now = useHostNow(clockOffset, state.phase === 'betting' || state.phase === 'playing');
  const [betPick, setBetPick] = useState(null);
  const bet = Math.min(mySeat?.chips || 0, betPick ?? mySeat?.bet ?? MP_21.minBet);

  const myTurn = state.phase === 'playing' && state.turn === myIdx && myIdx >= 0;
  const prevTurnRef = useRef(false);
  useEffect(() => {
    if (myTurn && !prevTurnRef.current) sfx.playCardFlip?.();
    prevTurnRef.current = myTurn;
  }, [myTurn]);
  const dealtRef = useRef(0);
  const cardsOut = state.dealer.length + state.seats.reduce((a, x) => a + x.hand.length, 0);
  useEffect(() => {
    if (cardsOut > dealtRef.current) sfx.playCardDeal?.();
    dealtRef.current = cardsOut;
  }, [cardsOut]);

  if (state.phase === 'over') {
    const w = state.seats.find((x) => x.id === state.winnerId);
    return (
      <div className="tm-mp-bj">
        <GameOverPanel
          title={`🏆 ${w ? w.name : 'Nobody'} wins at 21's!`}
          sub={state.seats.map((x) => `${x.name}: ${x.chips} chips, ${x.wins} rounds`).join(' • ')}
          isHost={isHost}
          hostName={hostName}
          canRematch={canRematch}
          onRematch={onRematch}
          onLobby={onLobby}
        />
      </div>
    );
  }

  const hideHole = state.phase === 'playing';
  const dealerTotal = state.dealer.length ? handTotal(hideHole ? state.dealer.slice(0, 1) : state.dealer).total : 0;
  const canDouble = myTurn && mySeat.hand.length === 2 && mySeat.chips >= mySeat.bet * 2;

  return (
    <div className="tm-mp-bj" data-testid="mp-21">
      <div className="tm-mp-bj-dealer">
        <span className="tm-mp-bj-dealer-tag">🎩 DEALER {dealerTotal > 0 && <b>{hideHole ? `${dealerTotal}+?` : dealerTotal}</b>}</span>
        <div className="tm-mp-pk-cards">
          {state.dealer.length ? (
            state.dealer.map((c, i) => <MpCard key={i} card={c} hidden={hideHole && i === 1} />)
          ) : (
            <span className="tm-mp-pk-sitout">Round {state.round + 1}</span>
          )}
        </div>
      </div>

      <p className="tm-mp-bj-headline" role="status">
        {state.headline}
      </p>

      <div className="tm-mp-bj-players">
        {state.seats.map((x, i) => (
          <PlayerBox
            key={x.id}
            seat={x}
            isMe={x.id === me}
            isTurn={state.phase === 'playing' && state.turn === i}
            phase={state.phase}
            now={now}
            deadline={state.deadline}
            roundWinner={state.phase === 'settled' && state.roundWinnerId === x.id}
          />
        ))}
      </div>

      <div className="tm-mp-actions">
        {state.phase === 'betting' && mySeat && !mySeat.out && !mySeat.ready && (
          <>
            <div className="tm-mp-actions-row">
              {MP_21.bets.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`tm-mp-chip-btn ${bet === b ? 'is-on' : ''}`}
                  disabled={b > mySeat.chips}
                  onClick={() => {
                    sfx.playChipStack?.();
                    setBetPick(b);
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="tm-mp-actions-row">
              <button
                type="button"
                className="tm-mp-go"
                onClick={() => {
                  sfx.playChipStack?.();
                  sendAction('bet', { amount: bet });
                }}
                data-testid="mp-bj-bet"
              >
                Bet {bet} — deal me in
              </button>
            </div>
            <TurnTimer deadline={state.deadline} totalMs={MP_21.betMs} now={now} />
          </>
        )}
        {state.phase === 'betting' && mySeat?.ready && <p className="tm-mp-waiting">Waiting for the other player to bet…</p>}
        {myTurn && (
          <div className="tm-mp-actions-row">
            <button type="button" className="tm-mp-act" onClick={() => sendAction('hit')} data-testid="mp-bj-hit">
              Hit
            </button>
            <button type="button" className="tm-mp-act is-fold" onClick={() => sendAction('stand')} data-testid="mp-bj-stand">
              Stand
            </button>
            {canDouble && (
              <button type="button" className="tm-mp-act is-raise" onClick={() => sendAction('double')}>
                Double
              </button>
            )}
          </div>
        )}
        {state.phase === 'playing' && !myTurn && state.turn >= 0 && (
          <p className="tm-mp-waiting">{state.seats[state.turn]?.name} is playing…</p>
        )}
        {state.phase === 'settled' && <p className="tm-mp-waiting">Next round in a moment…</p>}
      </div>
    </div>
  );
}
