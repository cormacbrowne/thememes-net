import { useState, useEffect } from 'react';
import { getTimeUntilEndOfDay } from '../utils/dailyCaptionBattle';

/**
 * Isolated end-of-day countdown clock for Daily Caption Battle (Phase 28.15).
 * Lives in its own leaf component so ticking never re-renders parent feed/App.
 */
export default function BattleCountdown({ prefix = '⏳ Ends in ' }) {
  const [label, setLabel] = useState(() => getTimeUntilEndOfDay());

  useEffect(() => {
    const update = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setLabel(getTimeUntilEndOfDay());
    };
    const id = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <span className="tm-battle-countdown" aria-live="off">
      {prefix}
      {label}
    </span>
  );
}
