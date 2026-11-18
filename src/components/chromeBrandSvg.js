// Pure-JS Chrome Outrun SVG builders & shared geometry (browser + Node safe).
// Used by NeonSign.jsx, scripts/prerender-seo.mjs, and scripts/generate-brand-assets.mjs.

export const CHROME_SIGN_VIEWBOX = '64 8 552 208';
export const CHROME_ICON_VIEWBOX = '0 0 92 92';

export const CHROME_PULSE_PATH = 'M98 188 L372 188 L386 174 L402 200 L416 188 L466 188';
export const CHROME_ICON_M_PATH =
  'M15 66 V19 L20 14 H31 L46 36 L61 14 H72 L77 19 V66 H64 V34 L46 56 L28 34 V66 Z';
export const CHROME_ICON_PULSE_PATH = 'M14 76 H44 L49 69 L55 82 L60 76 H78';

export const CHROME_STAR_1_PATH =
  'M122 61 L125 73 L137 76 L125 79 L122 91 L119 79 L107 76 L119 73 Z';
export const CHROME_STAR_2_PATH =
  'M558 68 L560.5 77.5 L570 80 L560.5 82.5 L558 92 L555.5 82.5 L546 80 L555.5 77.5 Z';

export const CHROME_FILL_STOPS = [
  ['0%', '#2c1d6e'],
  ['28%', '#45e3ff'],
  ['47%', '#ffffff'],
  ['51%', '#22082e'],
  ['58%', '#ff2e88'],
  ['82%', '#ff8a3d'],
  ['100%', '#ffe787']
];

export const CHROME_RIM_STOPS = [
  ['0%', '#c9fbff'],
  ['48%', '#ffffff'],
  ['54%', '#ff6cb0'],
  ['100%', '#ffd269']
];

export const CHROME_EXTRUDE_STOPS = [
  ['0%', '#5a198f'],
  ['100%', '#ff1a75']
];

export const CHROME_BAR_STOPS = [
  ['0%', '#ffb800', '0.15'],
  ['20%', '#ffb800', '1'],
  ['55%', '#ff2e88', '1'],
  ['100%', '#19f0ff', '1']
];

function escapeAttr(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderStops(stops) {
  return stops
    .map(([offset, color, opacity]) =>
      opacity !== undefined
        ? `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`
        : `<stop offset="${offset}" stop-color="${color}"/>`
    )
    .join('');
}

export function buildChromeSignSvg({
  uid = 'tmc',
  title = 'THE MEMES.net',
  compact = false,
  showFlow = false,
  className = ''
} = {}) {
  const safeTitle = escapeAttr(title);
  const safeUid = escapeAttr(uid);
  const cls = className ? ` class="${escapeAttr(className)}"` : '';
  const pinkBlur = compact ? 5 : 10;
  const cyanBlur = compact ? 2.8 : 4.5;

  const theTransform = compact ? 'translate(98, 18) skewX(-12)' : 'translate(102, 20) skewX(-12)';
  const theW = compact ? 116 : 104;
  const theH = compact ? 36 : 32;
  const theFont = compact ? 21 : 18;
  const theY = compact ? 25.5 : 22.5;
  const theSpacing = compact ? 5 : 6;

  const netTransform = compact ? 'translate(470, 169) skewX(-12)' : 'translate(474, 170) skewX(-12)';
  const netW = compact ? 116 : 102;
  const netH = compact ? 36 : 33;
  const netFont = compact ? 22 : 19;
  const netY = compact ? 25.5 : 23.5;
  const netSpacing = compact ? 2 : 2.5;

  const flowLayer = showFlow
    ? `<g clip-path="url(#${safeUid}-clip)"><rect class="tm-chrome-sheen" x="0" y="50" width="110" height="140" fill="url(#${safeUid}-sheen)"/></g>`
    : '';

  const starLayer =
    showFlow || !compact
      ? `<g class="tm-chrome-star-1" filter="url(#${safeUid}-cyan)"><path d="${CHROME_STAR_1_PATH}" fill="#ffffff"/></g><g class="tm-chrome-star-2" filter="url(#${safeUid}-cyan)"><path d="${CHROME_STAR_2_PATH}" fill="#fff2c2"/></g>`
      : '';

  return `<svg${cls} xmlns="http://www.w3.org/2000/svg" viewBox="${CHROME_SIGN_VIEWBOX}" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="${safeUid}-chrome" x1="0" y1="0" x2="0" y2="1">${renderStops(CHROME_FILL_STOPS)}</linearGradient>
    <linearGradient id="${safeUid}-rim" x1="0" y1="0" x2="0" y2="1">${renderStops(CHROME_RIM_STOPS)}</linearGradient>
    <linearGradient id="${safeUid}-extrude" x1="0" y1="0" x2="0" y2="1">${renderStops(CHROME_EXTRUDE_STOPS)}</linearGradient>
    <linearGradient id="${safeUid}-bar" x1="0" y1="0" x2="1" y2="0">${renderStops(CHROME_BAR_STOPS)}</linearGradient>
    <linearGradient id="${safeUid}-sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="${safeUid}-pink" x="-25%" y="-35%" width="150%" height="170%">
      <feGaussianBlur stdDeviation="${pinkBlur}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${safeUid}-cyan" x="-30%" y="-40%" width="160%" height="180%">
      <feGaussianBlur stdDeviation="${cyanBlur}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="${safeUid}-clip">
      <text transform="translate(340, 156) skewX(-12)" x="0" y="0" text-anchor="middle" font-family="Orbitron, Oxanium, sans-serif" font-weight="900" font-size="108" letter-spacing="4">MEMES</text>
    </clipPath>
  </defs>
  <g transform="${theTransform}">
    <rect x="0" y="0" width="${theW}" height="${theH}" rx="${compact ? 9 : 8}" fill="rgba(12, 34, 52, 0.82)" stroke="#19f0ff" stroke-width="2" filter="url(#${safeUid}-cyan)"/>
    <text x="${theW / 2}" y="${theY}" text-anchor="middle" font-family="Orbitron, Oxanium, sans-serif" font-weight="800" font-size="${theFont}" letter-spacing="${theSpacing}" fill="#e2fdff">THE</text>
  </g>
  <text transform="translate(340, 160) skewX(-12)" x="0" y="0" text-anchor="middle" font-family="Orbitron, Oxanium, sans-serif" font-weight="900" font-size="108" letter-spacing="4" fill="#ff2e88" opacity="0.45" filter="url(#${safeUid}-pink)">MEMES</text>
  <text transform="translate(340, 164) skewX(-12)" x="0" y="0" text-anchor="middle" font-family="Orbitron, Oxanium, sans-serif" font-weight="900" font-size="108" letter-spacing="4" fill="#210938" stroke="#210938" stroke-width="5">MEMES</text>
  <text transform="translate(340, 160) skewX(-12)" x="0" y="0" text-anchor="middle" font-family="Orbitron, Oxanium, sans-serif" font-weight="900" font-size="108" letter-spacing="4" fill="url(#${safeUid}-extrude)" stroke="url(#${safeUid}-extrude)" stroke-width="3">MEMES</text>
  <text transform="translate(340, 156) skewX(-12)" x="0" y="0" text-anchor="middle" font-family="Orbitron, Oxanium, sans-serif" font-weight="900" font-size="108" letter-spacing="4" fill="url(#${safeUid}-chrome)" stroke="url(#${safeUid}-rim)" stroke-width="2.4" paint-order="stroke">MEMES</text>
  ${flowLayer}
  ${starLayer}
  <path d="${CHROME_PULSE_PATH}" fill="none" stroke="url(#${safeUid}-bar)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#${safeUid}-cyan)"/>
  <path d="${CHROME_PULSE_PATH}" fill="none" stroke="#fff7dc" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.88"/>
  <g transform="${netTransform}">
    <rect x="0" y="0" width="${netW}" height="${netH}" rx="${compact ? 9 : 8}" fill="rgba(8, 28, 44, 0.9)" stroke="#19f0ff" stroke-width="2" filter="url(#${safeUid}-cyan)"/>
    <text x="${netW / 2}" y="${netY}" text-anchor="middle" font-family="Orbitron, Oxanium, sans-serif" font-weight="800" font-size="${netFont}" letter-spacing="${netSpacing}" fill="#e2fdff">.NET</text>
  </g>
</svg>`;
}

export function buildChromeFaviconSvg({
  uid = 'tmf',
  rounded = true,
  includeFrame = true,
  boostTinyStroke = false
} = {}) {
  const safeUid = escapeAttr(uid);
  const rx = rounded ? 20 : 0;
  const innerRx = rounded ? 18.5 : 0;
  const rimWidth = boostTinyStroke ? 2.4 : 1.7;
  const pulseWidth = boostTinyStroke ? 4.4 : 3.6;

  const frameRect = includeFrame
    ? `<rect x="1.5" y="1.5" width="89" height="89" rx="${innerRx}" fill="none" stroke="url(#${safeUid}-frame)" stroke-width="2" opacity="0.72"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CHROME_ICON_VIEWBOX}" role="img" aria-label="THE MEMES.net">
  <defs>
    <radialGradient id="${safeUid}-halo" cx="50%" cy="44%" r="52%">
      <stop offset="0%" stop-color="#8a3dff" stop-opacity="0.34"/>
      <stop offset="58%" stop-color="#ff2e88" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#07060f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${safeUid}-sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffb800"/>
      <stop offset="55%" stop-color="#ff2e88"/>
      <stop offset="100%" stop-color="#8a3dff"/>
    </linearGradient>
    <pattern id="${safeUid}-stripes" width="92" height="6" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="92" height="3.8" fill="#ffffff"/>
      <rect x="0" y="3.8" width="92" height="2.2" fill="#000000"/>
    </pattern>
    <mask id="${safeUid}-sunmask">
      <rect x="0" y="0" width="92" height="92" fill="url(#${safeUid}-stripes)"/>
    </mask>
    <linearGradient id="${safeUid}-frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#19f0ff"/>
      <stop offset="50%" stop-color="#8a3dff"/>
      <stop offset="100%" stop-color="#ff2e88"/>
    </linearGradient>
    <linearGradient id="${safeUid}-chrome" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="66">${renderStops(CHROME_FILL_STOPS)}</linearGradient>
    <linearGradient id="${safeUid}-rim" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="66">${renderStops(CHROME_RIM_STOPS)}</linearGradient>
    <linearGradient id="${safeUid}-extrude" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="66">${renderStops(CHROME_EXTRUDE_STOPS)}</linearGradient>
    <linearGradient id="${safeUid}-bar" gradientUnits="userSpaceOnUse" x1="14" y1="76" x2="78" y2="76">
      <stop offset="0%" stop-color="#ffb800"/>
      <stop offset="52%" stop-color="#ff2e88"/>
      <stop offset="100%" stop-color="#19f0ff"/>
    </linearGradient>
    <filter id="${safeUid}-pink" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${safeUid}-cyan" x="-30%" y="-40%" width="160%" height="180%">
      <feGaussianBlur stdDeviation="2.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="92" height="92" rx="${rx}" fill="#07060f"/>
  <circle cx="46" cy="42" r="42" fill="url(#${safeUid}-halo)"/>
  <circle cx="46" cy="41" r="29" fill="url(#${safeUid}-sun)" mask="url(#${safeUid}-sunmask)" opacity="0.24"/>
  ${frameRect}
  <g transform="translate(46 40) skewX(-8) translate(-46 -40)">
    <path d="${CHROME_ICON_M_PATH}" fill="#ff2e88" opacity="0.48" filter="url(#${safeUid}-pink)"/>
    <path transform="translate(0 4.5)" d="${CHROME_ICON_M_PATH}" fill="#210938" stroke="#210938" stroke-width="2" stroke-linejoin="round"/>
    <path transform="translate(0 2.5)" d="${CHROME_ICON_M_PATH}" fill="url(#${safeUid}-extrude)" stroke="url(#${safeUid}-extrude)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${CHROME_ICON_M_PATH}" fill="url(#${safeUid}-chrome)" stroke="url(#${safeUid}-rim)" stroke-width="${rimWidth}" stroke-linejoin="round" paint-order="stroke"/>
  </g>
  <path d="M22 9 L23.8 14.2 L29 16 L23.8 17.8 L22 23 L20.2 17.8 L15 16 L20.2 14.2 Z" fill="#ffffff" filter="url(#${safeUid}-cyan)"/>
  <path d="${CHROME_ICON_PULSE_PATH}" fill="none" stroke="url(#${safeUid}-bar)" stroke-width="${pulseWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${safeUid}-cyan)"/>
  <path d="${CHROME_ICON_PULSE_PATH}" fill="none" stroke="#fff7dc" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
</svg>
`;
}
