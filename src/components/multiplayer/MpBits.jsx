export function MpCard({ card, hidden = false, small = false, glow = false }) {
  if (hidden || !card) {
    return (
      <span className={`tm-mp-card is-back ${small ? 'is-small' : ''}`} aria-label="Hidden card">
        <span className="tm-mp-card-back">TM</span>
      </span>
    );
  }
  return (
    <span
      className={`tm-mp-card ${card.isRed ? 'is-red' : 'is-black'} ${small ? 'is-small' : ''} ${glow ? 'is-glow' : ''}`}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span className="tm-mp-card-rank">{card.rank}</span>
      <span className="tm-mp-card-suit">{card.suit}</span>
    </span>
  );
}

export function TurnTimer({ deadline, totalMs, now }) {
  const left = Math.max(0, deadline - now);
  const pct = Math.max(0, Math.min(100, (left / totalMs) * 100));
  return (
    <span className={`tm-mp-timer ${left < 8000 ? 'is-low' : ''}`} aria-label={`${Math.ceil(left / 1000)} seconds left`}>
      <span className="tm-mp-timer-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function GameOverPanel({ title, sub, canRematch, hostName, onRematch, onLobby, isHost }) {
  return (
    <div className="tm-mp-over" role="status" data-testid="mp-game-over">
      <p className="tm-mp-over-title">{title}</p>
      {sub && <p className="tm-mp-over-sub">{sub}</p>}
      {isHost ? (
        <div className="tm-mp-over-actions">
          <button type="button" className="tm-mp-go" onClick={onRematch} disabled={!canRematch}>
            🔁 Rematch
          </button>
          <button type="button" className="tm-mp-chip-btn" onClick={onLobby}>
            Back to room
          </button>
        </div>
      ) : (
        <p className="tm-mp-waiting">Waiting for {hostName} to start a rematch…</p>
      )}
    </div>
  );
}
