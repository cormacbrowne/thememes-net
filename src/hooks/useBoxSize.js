import { useEffect, useState } from 'react';

/**
 * Measures its parent box with ResizeObserver.
 */
export default function useBoxSize(ref) {
  const [size, setSize] = useState({ W: 0, H: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setSize({ W: el.clientWidth, H: el.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
