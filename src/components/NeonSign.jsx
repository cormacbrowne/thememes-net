import { useEffect, useId, useRef, useState } from 'react';
import {
  CHROME_BAR_STOPS,
  CHROME_EXTRUDE_STOPS,
  CHROME_FILL_STOPS,
  CHROME_ICON_M_PATH,
  CHROME_ICON_PULSE_PATH,
  CHROME_ICON_VIEWBOX,
  CHROME_PULSE_PATH,
  CHROME_RIM_STOPS,
  CHROME_SIGN_VIEWBOX,
  CHROME_STAR_1_PATH,
  CHROME_STAR_2_PATH
} from './chromeBrandSvg';
import './NeonSign.css';

// Track once-per-session entrance glide so navigation does not replay it every mount.
let hasPoweredOnThisSession = false;

function renderStops(stops, keyPrefix) {
  return stops.map(([offset, color, opacity], idx) => (
    <stop
      key={`${keyPrefix}-${idx}`}
      offset={offset}
      stopColor={color}
      stopOpacity={opacity}
    />
  ));
}

export default function NeonSign({
  size = 'nav',
  flow,
  powerOn,
  title = 'THE MEMES.net',
  className = ''
}) {
  const svgRef = useRef(null);
  const rawId = useId();
  const uid = `tmc-${rawId.replace(/:/g, '')}`;

  const [offscreen, setOffscreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden'
  );

  const [shouldPowerOn] = useState(() => {
    if (powerOn === false) return false;
    if (powerOn !== true && size !== 'hero') return false;
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

  const paused = offscreen || tabHidden;
  const cls = `tm-neon-sign tm-neon-sign--${size} ${shouldPowerOn ? 'is-power-on' : ''} ${
    paused ? 'is-paused' : ''
  } ${className}`.trim();

  if (size === 'icon') {
    return (
      <svg
        ref={svgRef}
        className={cls}
        viewBox={CHROME_ICON_VIEWBOX}
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={`${uid}-chrome`} gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="66">
            {renderStops(CHROME_FILL_STOPS, 'ifill')}
          </linearGradient>
          <linearGradient id={`${uid}-rim`} gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="66">
            {renderStops(CHROME_RIM_STOPS, 'irim')}
          </linearGradient>
          <linearGradient id={`${uid}-extrude`} gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="66">
            {renderStops(CHROME_EXTRUDE_STOPS, 'iext')}
          </linearGradient>
          <linearGradient id={`${uid}-bar`} gradientUnits="userSpaceOnUse" x1="14" y1="76" x2="78" y2="76">
            <stop offset="0%" stopColor="#ffb800" />
            <stop offset="52%" stopColor="#ff2e88" />
            <stop offset="100%" stopColor="#19f0ff" />
          </linearGradient>
          <filter id={`${uid}-pink`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}-cyan`} x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform="translate(46 40) skewX(-8) translate(-46 -40)">
          <path d={CHROME_ICON_M_PATH} fill="#ff2e88" opacity="0.48" filter={`url(#${uid}-pink)`} />
          <path
            transform="translate(0 4.5)"
            d={CHROME_ICON_M_PATH}
            fill="#210938"
            stroke="#210938"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            transform="translate(0 2.5)"
            d={CHROME_ICON_M_PATH}
            fill={`url(#${uid}-extrude)`}
            stroke={`url(#${uid}-extrude)`}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d={CHROME_ICON_M_PATH}
            fill={`url(#${uid}-chrome)`}
            stroke={`url(#${uid}-rim)`}
            strokeWidth="1.8"
            strokeLinejoin="round"
            paintOrder="stroke"
          />
        </g>
        <path
          d="M22 9 L23.8 14.2 L29 16 L23.8 17.8 L22 23 L20.2 17.8 L15 16 L20.2 14.2 Z"
          fill="#ffffff"
          filter={`url(#${uid}-cyan)`}
        />
        <path
          d={CHROME_ICON_PULSE_PATH}
          fill="none"
          stroke={`url(#${uid}-bar)`}
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${uid}-cyan)`}
        />
        <path
          d={CHROME_ICON_PULSE_PATH}
          fill="none"
          stroke="#fff7dc"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    );
  }

  const isNav = size === 'nav';
  const pinkBlur = isNav ? 5 : 10;
  const cyanBlur = isNav ? 2.8 : 4.5;

  const theTransform = isNav ? 'translate(98, 18) skewX(-12)' : 'translate(102, 20) skewX(-12)';
  const theW = isNav ? 116 : 104;
  const theH = isNav ? 36 : 32;
  const theFont = isNav ? 21 : 18;
  const theY = isNav ? 25.5 : 22.5;
  const theSpacing = isNav ? 5 : 6;

  const netTransform = isNav ? 'translate(470, 169) skewX(-12)' : 'translate(474, 170) skewX(-12)';
  const netW = isNav ? 116 : 102;
  const netH = isNav ? 36 : 33;
  const netFont = isNav ? 22 : 19;
  const netY = isNav ? 25.5 : 23.5;
  const netSpacing = isNav ? 2 : 2.5;

  const showSparkles = showFlow || !isNav;

  return (
    <svg
      ref={svgRef}
      className={cls}
      viewBox={CHROME_SIGN_VIEWBOX}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${uid}-chrome`} x1="0" y1="0" x2="0" y2="1">
          {renderStops(CHROME_FILL_STOPS, 'fill')}
        </linearGradient>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
          {renderStops(CHROME_RIM_STOPS, 'rim')}
        </linearGradient>
        <linearGradient id={`${uid}-extrude`} x1="0" y1="0" x2="0" y2="1">
          {renderStops(CHROME_EXTRUDE_STOPS, 'ext')}
        </linearGradient>
        <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="1" y2="0">
          {renderStops(CHROME_BAR_STOPS, 'bar')}
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-pink`} x="-25%" y="-35%" width="150%" height="170%">
          <feGaussianBlur stdDeviation={pinkBlur} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${uid}-cyan`} x="-30%" y="-40%" width="160%" height="180%">
          <feGaussianBlur stdDeviation={cyanBlur} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`${uid}-clip`}>
          <text
            transform="translate(340, 156) skewX(-12)"
            x="0"
            y="0"
            textAnchor="middle"
            fontFamily="Orbitron, Oxanium, sans-serif"
            fontWeight="900"
            fontSize="108"
            letterSpacing="4"
          >
            MEMES
          </text>
        </clipPath>
      </defs>

      {/* Top Cyan Badge: THE */}
      <g transform={theTransform}>
        <rect
          x="0"
          y="0"
          width={theW}
          height={theH}
          rx={isNav ? 9 : 8}
          fill="rgba(12, 34, 52, 0.82)"
          stroke="#19f0ff"
          strokeWidth="2"
          filter={`url(#${uid}-cyan)`}
        />
        <text
          x={theW / 2}
          y={theY}
          textAnchor="middle"
          fontFamily="Orbitron, Oxanium, sans-serif"
          fontWeight="800"
          fontSize={theFont}
          letterSpacing={theSpacing}
          fill="#e2fdff"
        >
          THE
        </text>
      </g>

      {/* Ambient Pink Backlight */}
      <text
        transform="translate(340, 160) skewX(-12)"
        x="0"
        y="0"
        textAnchor="middle"
        fontFamily="Orbitron, Oxanium, sans-serif"
        fontWeight="900"
        fontSize="108"
        letterSpacing="4"
        fill="#ff2e88"
        opacity="0.45"
        filter={`url(#${uid}-pink)`}
      >
        MEMES
      </text>

      {/* 3D Extrusion Layers */}
      <text
        transform="translate(340, 164) skewX(-12)"
        x="0"
        y="0"
        textAnchor="middle"
        fontFamily="Orbitron, Oxanium, sans-serif"
        fontWeight="900"
        fontSize="108"
        letterSpacing="4"
        fill="#210938"
        stroke="#210938"
        strokeWidth="5"
      >
        MEMES
      </text>
      <text
        transform="translate(340, 160) skewX(-12)"
        x="0"
        y="0"
        textAnchor="middle"
        fontFamily="Orbitron, Oxanium, sans-serif"
        fontWeight="900"
        fontSize="108"
        letterSpacing="4"
        fill={`url(#${uid}-extrude)`}
        stroke={`url(#${uid}-extrude)`}
        strokeWidth="3"
      >
        MEMES
      </text>

      {/* Primary Chrome Wordmark */}
      <text
        transform="translate(340, 156) skewX(-12)"
        x="0"
        y="0"
        textAnchor="middle"
        fontFamily="Orbitron, Oxanium, sans-serif"
        fontWeight="900"
        fontSize="108"
        letterSpacing="4"
        fill={`url(#${uid}-chrome)`}
        stroke={`url(#${uid}-rim)`}
        strokeWidth="2.4"
        paintOrder="stroke"
      >
        MEMES
      </text>

      {/* Animated Specular Sheen Sweep */}
      {showFlow && (
        <g clipPath={`url(#${uid}-clip)`}>
          <rect
            className="tm-chrome-sheen"
            x="0"
            y="50"
            width="110"
            height="140"
            fill={`url(#${uid}-sheen)`}
          />
        </g>
      )}

      {/* Chrome Star Glints */}
      {showSparkles && (
        <>
          <g className="tm-chrome-star-1" filter={`url(#${uid}-cyan)`}>
            <path d={CHROME_STAR_1_PATH} fill="#ffffff" />
          </g>
          <g className="tm-chrome-star-2" filter={`url(#${uid}-cyan)`}>
            <path d={CHROME_STAR_2_PATH} fill="#fff2c2" />
          </g>
        </>
      )}

      {/* Horizon Speed-Bar + .NET Pill */}
      <path
        d={CHROME_PULSE_PATH}
        fill="none"
        stroke={`url(#${uid}-bar)`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${uid}-cyan)`}
      />
      <path
        d={CHROME_PULSE_PATH}
        fill="none"
        stroke="#fff7dc"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.88"
      />

      <g transform={netTransform}>
        <rect
          x="0"
          y="0"
          width={netW}
          height={netH}
          rx={isNav ? 9 : 8}
          fill="rgba(8, 28, 44, 0.9)"
          stroke="#19f0ff"
          strokeWidth="2"
          filter={`url(#${uid}-cyan)`}
        />
        <text
          x={netW / 2}
          y={netY}
          textAnchor="middle"
          fontFamily="Orbitron, Oxanium, sans-serif"
          fontWeight="800"
          fontSize={netFont}
          letterSpacing={netSpacing}
          fill="#e2fdff"
        >
          .NET
        </text>
      </g>
    </svg>
  );
}
