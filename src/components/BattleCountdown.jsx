import { useState, useEffect } from 'react';
import { formatCountdown, getTimeUntilEndOfDay } from '../utils/dailyCaptionBattle';

/**
 * Isolated countdown clock for the Daily Caption Battle (Phase 28.15, plan 2.1).
 * Counts down to `endsAt` (the battle's real close time) when given; otherwise to UTC midnight.
 * Lives in its own leaf component so ticking never re-renders the parent feed/App.
 */
export default function BattleCountdown({ prefix = '⏳ Ends in ', endsAt = null, className = 'tm-battle-countdown' }) {
  const compute = () => (endsAt ? formatCountdown(endsAt) : getTimeUntilEndOfDay());
  const [label, setLabel] = useState(compute);

  useEffect(() => {
    const update = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setLabel(endsAt ? formatCountdown(endsAt) : getTimeUntilEndOfDay());
    };
    update();
    const id = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, [endsAt]);

  return (
    <span className={className} aria-live="off">
      {prefix}
      {label}
    </span>
  );
}
