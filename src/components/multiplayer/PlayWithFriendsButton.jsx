import { sfx } from '../../utils/soundEngine';
import './PlayWithFriendsButton.css';

/** "👥 Play with friends" pill shown on cabinets that have a multiplayer room. */
export default function PlayWithFriendsButton({ onClick, players = '2–4' }) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      className="tm-mp-entry-btn"
      onClick={() => {
        sfx.playToggle?.();
        onClick();
      }}
      title={`Open a room and invite ${players} players with a link`}
      data-testid="mp-entry-btn"
    >
      👥 <span className="tm-mp-entry-long">Play</span> Friends
    </button>
  );
}
