import { useEffect, useState } from 'react';

/** Re-render every `ms` while `active`, returning the host-clock time. */
export function useHostNow(clockOffset = 0, active = true, ms = 250) {
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now() + clockOffset), ms);
    return () => clearInterval(id);
  }, [clockOffset, active, ms]);
  return now;
}
