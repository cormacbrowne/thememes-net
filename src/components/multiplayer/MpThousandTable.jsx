import ThousandTable from '../thousand/ThousandTable';
import { GameOverPanel } from './MpBits';
import { useHostNow } from '../../hooks/useHostNow';

export default function MpThousandTable({
  state,
  me,
  isHost,
  hostName,
  clockOffset,
  sendAction,
  onRematch,
  onLobby,
  canRematch
}) {
  const meIdx = state.seats.findIndex((x) => x.id === me);
  const now = useHostNow(clockOffset, state.phase !== 'over' && state.phase !== 'trickDone', 500);
  const winner = state.seats.find((x) => x.id === state.winnerId);
  return (
    <div className="tm-mp-thousand" data-testid="mp-thousand">
      <ThousandTable state={state} meIdx={meIdx} onAction={sendAction} now={now} />
      {state.phase === 'over' && (
        <GameOverPanel
          title={`🏆 ${winner ? winner.name : 'Nobody'} wins 1000!`}
          sub={state.seats.map((x) => `${x.name}: ${x.score}`).join(' • ')}
          isHost={isHost}
          hostName={hostName}
          canRematch={canRematch}
          onRematch={onRematch}
          onLobby={onLobby}
        />
      )}
    </div>
  );
}
