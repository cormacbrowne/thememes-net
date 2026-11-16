import { useEffect, useRef, useState } from 'react';
import { ICON_TUBES, ICON_VIEWBOX, SIGN_TUBES, SIGN_VIEWBOX } from './neonSignPaths';
import './NeonSign.css';

// Track once-per-session power-on stutter so navigation does not re-flicker every mount.
let hasPoweredOnThisSession = false;

const FLOW_DURATIONS = [2.4, 2.7, 3.0, 3.3, 3.6, 3.9];

export default function NeonSign({
  size = 'nav',
  flow,
  powerOn,
  title = 'THE MEMES.net',
  className = ''
}) {
  const svgRef = useRef(null);
  const [offscreen, setOffscreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden'
  );

  const [shouldPowerOn] = useState(() => {
    if (powerOn === false) return false;
    if (hasPoweredOnThisSession) return false;
    hasPoweredOnThisSession = true;
    return true;
  });

  const showFlow = flow !== undefined ? Boolean(flow) : size === 'hero';

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !showFlow || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setOffscreen(!entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [showFlow]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVis = () => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const tubes = size === 'icon' ? ICON_TUBES : SIGN_TUBES;
  const viewBox = size === 'icon' ? ICON_VIEWBOX : SIGN_VIEWBOX;
  const paused = offscreen || tabHidden;

  return (
    <svg
      ref={svgRef}
      className={`tm-neon-sign tm-neon-sign--${size} ${shouldPowerOn ? 'is-power-on' : ''} ${
        paused ? 'is-paused' : ''
      } ${className}`.trim()}
      viewBox={viewBox}
      role="img"
      aria-label={title}
    >
      {tubes.map(([colour, x, y, w, d, extra], idx) => {
        const flowDur = FLOW_DURATIONS[idx % FLOW_DURATIONS.length];
        return (
          <g
            key={`${colour}-${idx}`}
            className={`t-${colour} ${extra || ''}`.trim()}
            transform={`translate(${x} ${y})`}
            style={{
              '--d': `${idx * 70}ms`,
              '--flow': `${flowDur}s`
            }}
          >
            <path className="l-glass" pathLength="100" strokeWidth={w + 1.5} d={d} />
            <g className="lit">
              <path className="l-glow" pathLength="100" strokeWidth={w + 2} d={d} />
              <path className="l-core" pathLength="100" strokeWidth={w} d={d} />
              <path className="l-hot" pathLength="100" strokeWidth={w * 0.34} d={d} />
              {showFlow && (
                <path className="l-flow" pathLength="100" strokeWidth={w * 0.5} d={d} />
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
