// ==========================================
// CUSTOM 80s NEON TUBE SVG GRAPHICS PER GAME & PRANK SCREEN
// Every game and prank screen has a unique stylized neon-tube silhouette.
// ==========================================

const NEON_PALETTES = {
  bingo: { main: '#ff2e88', sec: '#19f0ff', hot: '#ffd9ea' },
  pusher: { main: '#ffb800', sec: '#19f0ff', hot: '#fff1c9' },
  roulette: { main: '#ff2e88', sec: '#ffb800', hot: '#ffd9ea' },
  blackjack: { main: '#19f0ff', sec: '#ff2e88', hot: '#e2fdff' },
  poker: { main: '#ffb800', sec: '#ff2e88', hot: '#fff1c9' },
  thousand: { main: '#ffb800', sec: '#19f0ff', hot: '#fff1c9' },
  slots: { main: '#ff2e88', sec: '#ffb800', hot: '#ffd9ea' },
  eightball: { main: '#19f0ff', sec: '#8a3dff', hot: '#e2fdff' },
  derby: { main: '#19f0ff', sec: '#ffb800', hot: '#e2fdff' },
  invaders: { main: '#19f0ff', sec: '#ff2e88', hot: '#e2fdff' },
  serpent: { main: '#3dff9a', sec: '#19f0ff', hot: '#d9ffec' },
  blaster: { main: '#ff2e88', sec: '#19f0ff', hot: '#ffd9ea' },
  sunset: { main: '#ffb800', sec: '#ff2e88', hot: '#fff1c9' },
  void: { main: '#19f0ff', sec: '#8a3dff', hot: '#e2fdff' },
  riders: { main: '#19f0ff', sec: '#ff2e88', hot: '#e2fdff' },
  pinball: { main: '#8a3dff', sec: '#19f0ff', hot: '#efe2ff' },
  crush: { main: '#ff2e88', sec: '#ffb800', hot: '#ffd9ea' },
  guess: { main: '#3dff9a', sec: '#ffb800', hot: '#d9ffec' },
  hilow: { main: '#19f0ff', sec: '#ff2e88', hot: '#e2fdff' },
  swipe: { main: '#ff2e88', sec: '#19f0ff', hot: '#ffd9ea' },
  battle: { main: '#ff2e88', sec: '#ffb800', hot: '#ffd9ea' },
  stocks: { main: '#3dff9a', sec: '#19f0ff', hot: '#d9ffec' },
  // Prank / Boss-Key Screens
  zoom: { main: '#8a3dff', sec: '#19f0ff', hot: '#efe2ff' },
  excel: { main: '#3dff9a', sec: '#19f0ff', hot: '#d9ffec' },
  bsod: { main: '#19f0ff', sec: '#8a3dff', hot: '#e2fdff' },
  update: { main: '#19f0ff', sec: '#3dff9a', hot: '#e2fdff' },
  terminal: { main: '#3dff9a', sec: '#ffb800', hot: '#d9ffec' },
  ai: { main: '#8a3dff', sec: '#ff2e88', hot: '#efe2ff' },
  crackphone: { main: '#19f0ff', sec: '#ffb800', hot: '#e2fdff' },
  crackpad: { main: '#8a3dff', sec: '#ffb800', hot: '#efe2ff' }
};

function TubePath({ d, color, hot = '#ffffff', width = 2.4 }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={color} strokeOpacity="0.34" strokeWidth={width + 3} />
      <path d={d} stroke={color} strokeWidth={width} />
      <path d={d} stroke={hot} strokeOpacity="0.82" strokeWidth={Math.max(0.7, width * 0.34)} />
    </g>
  );
}

function renderGameGlyph(id, p) {
  switch (id) {
    case 'bingo':
      // Bingo cage sphere + 90-ball sparkle & number ring
      return (
        <>
          <TubePath d="M24 7 A15 15 0 1 1 23.9 7 Z" color={p.main} hot={p.hot} />
          <TubePath d="M24 14 A8 8 0 1 1 23.9 14 Z" color={p.sec} hot="#e2fdff" width={2} />
          <TubePath d="M15 41 L33 41 M18 36 L20 41 M30 36 L28 41" color={p.sec} hot="#e2fdff" width={2} />
          <TubePath d="M22 19.5 C22 18 26 18 26 19.5 C26 21 22 21.5 22 23.5 C22 25 26 25 26 23.5 C26 21.8 22 21.5 22 19.5 Z" color={p.main} hot={p.hot} width={1.8} />
        </>
      );

    case 'pusher':
      // Coin pusher stepped tray + falling gold coins
      return (
        <>
          <TubePath d="M8 31 L40 31 L43 39 L5 39 Z" color={p.sec} hot="#e2fdff" width={2.1} />
          <TubePath d="M12 22 L36 22 L38 28 L10 28 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M17 12 A4.5 4.5 0 1 1 16.9 12 Z" color={p.main} hot={p.hot} width={2} />
          <TubePath d="M30 10 A4.5 4.5 0 1 1 29.9 10 Z" color={p.main} hot={p.hot} width={2} />
          <TubePath d="M24 15 A4.5 4.5 0 1 1 23.9 15 Z" color={p.main} hot={p.hot} width={2} />
        </>
      );

    case 'roulette':
      // Roulette wheel spokes + lightning strike
      return (
        <>
          <TubePath d="M24 6 A18 18 0 1 1 23.9 6 Z" color={p.main} hot={p.hot} />
          <TubePath d="M24 12 A12 12 0 1 1 23.9 12 Z" color={p.sec} hot="#fff1c9" width={1.8} />
          <TubePath d="M10 17 L16 20 M38 17 L32 20 M10 31 L16 28 M38 31 L32 28" color={p.sec} hot="#fff1c9" width={1.7} />
          <TubePath d="M26 14 L20 24 L25 24 L22 34 L29 22 L24 22 Z" color={p.sec} hot="#fff1c9" width={2.1} />
        </>
      );

    case 'blackjack':
      // Twin fanned neon 21's cards + Ace diamond/spade pip
      return (
        <>
          <TubePath d="M10 12 L25 9 L29 34 L14 37 Z" color={p.sec} hot={p.hot} width={2.1} />
          <TubePath d="M21 10 L37 13 L33 38 L17 35 Z" color={p.main} hot="#ffd9ea" width={2.2} />
          <TubePath d="M28 19 L31 24 L28 29 L25 24 Z" color={p.sec} hot={p.hot} width={1.8} />
          <TubePath d="M15 16 L18 16 M16.5 14.5 L16.5 17.5" color={p.main} hot="#ffd9ea" width={1.7} />
        </>
      );

    case 'poker':
      // Notched casino chip ring + royal spade
      return (
        <>
          <TubePath d="M24 6 A18 18 0 1 1 23.9 6 Z" color={p.main} hot={p.hot} />
          <TubePath d="M24 6 L24 10 M24 38 L24 42 M6 24 L10 24 M38 24 L42 24 M11 11 L14 14 M34 34 L37 37 M37 11 L34 14 M14 34 L11 37" color={p.sec} hot="#ffd9ea" width={2} />
          <TubePath d="M24 15 C20 20 17 22 17 25.5 C17 28 19.5 29.5 22 28.5 L21 33 L27 33 L26 28.5 C28.5 29.5 31 28 31 25.5 C31 22 28 20 24 15 Z" color={p.sec} hot="#ffd9ea" width={1.9} />
        </>
      );

    case 'thousand':
      // Fanned pair of cards (King + Queen = a marriage) with a heart
      return (
        <>
          <TubePath d="M8 14 L22 10 L27 36 L13 40 Z" color={p.sec} hot="#e2fdff" width={2.1} />
          <TubePath d="M21 10 L36 12 L34 38 L19 36 Z" color={p.main} hot={p.hot} width={2.2} />
          <TubePath d="M27.5 28 C23 24.5 23 20.5 25.5 20 C26.8 19.8 27.5 21 27.5 21 C27.5 21 28.3 19.8 29.6 20.1 C32 20.8 31.8 24.6 27.5 28 Z" color="#ff2e88" hot="#ffd9ea" width={1.8} />
        </>
      );

    case 'slots':
      // Classic 3-reel slot cabinet + 777 + pull lever
      return (
        <>
          <TubePath d="M8 12 L34 12 L34 36 L8 36 Z" color={p.main} hot={p.hot} />
          <TubePath d="M16 16 L16 32 M26 16 L26 32" color={p.main} hot={p.hot} width={1.4} />
          <TubePath d="M10.5 20 L14 20 L11.5 28 M20 20 L23.5 20 L21 28 M28.5 20 L32 20 L29.5 28" color={p.sec} hot="#fff1c9" width={1.9} />
          <TubePath d="M34 26 L40 26 L40 16" color={p.sec} hot="#fff1c9" width={2.1} />
          <TubePath d="M40 12 A2.8 2.8 0 1 1 39.9 12 Z" color={p.sec} hot="#fff1c9" width={2} />
        </>
      );

    case 'eightball':
      // Cyber 8-Ball orb with oracle triangle window
      return (
        <>
          <TubePath d="M24 6 A18 18 0 1 1 23.9 6 Z" color={p.main} hot={p.hot} />
          <TubePath d="M24 14 L34 31 L14 31 Z" color={p.sec} hot="#efe2ff" width={2} />
          <TubePath d="M24 20.5 A2.2 2.2 0 1 1 23.9 20.5 Z M24 25 A2.5 2.5 0 1 1 23.9 25 Z" color={p.main} hot={p.hot} width={1.7} />
        </>
      );

    case 'derby':
      // Geometric synthwave racing stallion head + speed streaks
      return (
        <>
          <TubePath d="M16 37 L18 24 L13 21 L18 13 L26 9 L28 14 L37 17 L34 23 L27 24 L29 37" color={p.main} hot={p.hot} />
          <TubePath d="M7 18 L12 18 M6 25 L11 25 M8 32 L13 32" color={p.sec} hot="#fff1c9" width={1.9} />
          <TubePath d="M25 14.5 L26 14.5" color={p.sec} hot="#fff1c9" width={2.4} />
        </>
      );

    case 'invaders':
      // Classic neon cyber-invader sprite + laser shot
      return (
        <>
          <TubePath d="M14 14 L18 18 M34 14 L30 18 M12 20 L36 20 L38 28 L32 28 L32 33 L26 33 L26 28 L22 28 L22 33 L16 33 L16 28 L10 28 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M17 24 L20 24 M28 24 L31 24" color={p.sec} hot="#ffd9ea" width={2.4} />
          <TubePath d="M24 36 L24 41" color={p.sec} hot="#ffd9ea" width={2.1} />
        </>
      );

    case 'serpent':
      // Winding neon S-serpent + glowing power orb
      return (
        <>
          <TubePath d="M11 36 C11 28 26 32 26 24 C26 16 13 20 13 13 C13 9 20 9 24 11" color={p.main} hot={p.hot} width={2.5} />
          <TubePath d="M24 11 L28 10 M24 11 L26 15" color={p.main} hot={p.hot} width={2} />
          <TubePath d="M36 16 A4 4 0 1 1 35.9 16 Z" color={p.sec} hot="#e2fdff" width={2.2} />
        </>
      );

    case 'blaster':
      // Neon brick rows + bouncing ball + energy paddle
      return (
        <>
          <TubePath d="M8 10 L18 10 L18 15 L8 15 Z M21 10 L31 10 L31 15 L21 15 Z M34 10 L40 10 L40 15 L34 15 Z" color={p.main} hot={p.hot} width={1.9} />
          <TubePath d="M13 18 L25 18 L25 23 L13 23 Z M28 18 L38 18 L38 23 L28 23 Z" color={p.sec} hot="#e2fdff" width={1.9} />
          <TubePath d="M25 29 A2.5 2.5 0 1 1 24.9 29 Z" color={p.main} hot={p.hot} width={2.2} />
          <TubePath d="M13 38 L35 38" color={p.sec} hot="#e2fdff" width={3} />
        </>
      );

    case 'sunset':
      // Outrun striped sun + perspective highway lines
      return (
        <>
          <TubePath d="M12 27 A12 12 0 0 1 36 27" color={p.main} hot={p.hot} width={2.4} />
          <TubePath d="M14 23 L34 23 M17 19 L31 19" color={p.main} hot={p.hot} width={1.6} />
          <TubePath d="M5 27 L43 27 M21 27 L9 41 M27 27 L39 41 M24 30 L24 41" color={p.sec} hot="#ffd9ea" width={2} />
        </>
      );

    case 'void':
      // Twin-stick vector delta starfighter + asteroid
      return (
        <>
          <TubePath d="M24 8 L34 33 L24 28 L14 33 Z" color={p.main} hot={p.hot} width={2.3} />
          <TubePath d="M24 32 L24 40 M20 35 L24 40 L28 35" color={p.sec} hot="#efe2ff" width={1.9} />
          <TubePath d="M36 10 L41 13 L39 19 L34 17 Z" color={p.sec} hot="#efe2ff" width={1.8} />
        </>
      );

    case 'riders':
      // Light-cycle + sharp 90° neon trail
      return (
        <>
          <TubePath d="M6 34 L20 34 L20 20 L31 20" color={p.sec} hot="#ffd9ea" width={2.2} />
          <TubePath d="M29 14 L38 14 L42 19 L38 23 L29 23 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M30 23 A3 3 0 1 1 29.9 23 Z M39 23 A3 3 0 1 1 38.9 23 Z" color={p.main} hot={p.hot} width={1.8} />
        </>
      );

    case 'pinball':
      // Star bumper + ball + twin angled flippers
      return (
        <>
          <TubePath d="M24 8 L26.5 13 L32 13.5 L28 17 L29 22.5 L24 19.5 L19 22.5 L20 17 L16 13.5 L21.5 13 Z" color={p.main} hot={p.hot} width={1.9} />
          <TubePath d="M33 25 A2.5 2.5 0 1 1 32.9 25 Z" color={p.sec} hot="#e2fdff" width={2.2} />
          <TubePath d="M9 32 L20 38 M39 32 L28 38" color={p.sec} hot="#e2fdff" width={2.8} />
        </>
      );

    case 'crush':
      // Faceted neon diamond candy gem + sparkle
      return (
        <>
          <TubePath d="M15 11 L33 11 L40 20 L24 39 L8 20 Z" color={p.main} hot={p.hot} width={2.3} />
          <TubePath d="M8 20 L40 20 M15 11 L20 20 L24 39 L28 20 L33 11" color={p.sec} hot="#fff1c9" width={1.6} />
          <TubePath d="M38 7 L38 12 M35.5 9.5 L40.5 9.5" color={p.sec} hot="#fff1c9" width={1.7} />
        </>
      );

    case 'guess':
      // Pixel mystery frame + glowing question mark
      return (
        <>
          <TubePath d="M9 9 L39 9 L39 39 L9 39 Z" color={p.main} hot={p.hot} width={2.2} />
          <TubePath d="M19 18 C19 14 29 14 29 19 C29 22.5 24 23 24 27 M24 32 L24 33" color={p.sec} hot="#fff1c9" width={2.5} />
        </>
      );

    case 'hilow':
      // Opposing Up (cyan) & Down (pink) neon arrows
      return (
        <>
          <TubePath d="M16 10 L24 20 L19 20 L19 32 L13 32 L13 20 L8 20 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M32 38 L40 28 L35 28 L35 16 L29 16 L29 28 L24 28 Z" color={p.sec} hot="#ffd9ea" width={2.1} />
        </>
      );

    case 'swipe':
      // Tilted card + electric swipe motion arc
      return (
        <>
          <TubePath d="M14 13 L30 10 L35 33 L19 36 Z" color={p.main} hot={p.hot} width={2.2} />
          <TubePath d="M8 24 C14 15 28 15 39 21 M34 16 L40 21 L34 25" color={p.sec} hot="#e2fdff" width={2.2} />
        </>
      );

    case 'battle':
      // Crossed neon laser blades + center clash spark
      return (
        <>
          <TubePath d="M10 38 L37 11 M12 31 L17 36" color={p.main} hot={p.hot} width={2.4} />
          <TubePath d="M38 38 L11 11 M36 31 L31 36" color={p.sec} hot="#fff1c9" width={2.4} />
          <TubePath d="M24 7 L24 12 M24 36 L24 41" color={p.sec} hot="#fff1c9" width={1.8} />
        </>
      );

    case 'stocks':
      // Skyrocketing MEMEDAQ ticker line + candlesticks
      return (
        <>
          <TubePath d="M9 36 L39 36 M9 10 L9 36" color={p.sec} hot="#e2fdff" width={1.8} />
          <TubePath d="M12 30 L19 22 L25 26 L36 12 M30 12 L36 12 L36 18" color={p.main} hot={p.hot} width={2.4} />
        </>
      );

    // Prank & Boss-Key Screens
    case 'zoom':
      return (
        <>
          <TubePath d="M8 10 L40 10 L40 34 L8 34 Z M24 10 L24 34 M8 22 L40 22" color={p.main} hot={p.hot} width={2} />
          <TubePath d="M19 38 L29 38" color={p.sec} hot="#e2fdff" width={2.2} />
        </>
      );

    case 'excel':
      return (
        <>
          <TubePath d="M9 10 L39 10 L39 38 L9 38 Z M9 18 L39 18 M20 18 L20 38" color={p.main} hot={p.hot} width={2} />
          <TubePath d="M25 33 L25 27 M30 33 L30 23 M35 33 L35 20" color={p.sec} hot="#e2fdff" width={2.2} />
        </>
      );

    case 'bsod':
      return (
        <>
          <TubePath d="M8 11 L40 11 L40 35 L8 35 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M16 19 L16 20 M16 25 L16 26 M26 17 C22 20 22 26 26 29" color={p.sec} hot="#efe2ff" width={2.3} />
        </>
      );

    case 'update':
      return (
        <>
          <TubePath d="M24 9 A15 15 0 1 1 11 31" color={p.main} hot={p.hot} width={2.4} />
          <TubePath d="M9 26 L11 32 L17 30 M20 24 L28 24 M24 20 L24 28" color={p.sec} hot="#d9ffec" width={2} />
        </>
      );

    case 'crackphone':
      return (
        <>
          <TubePath d="M15 6 L33 6 Q36 6 36 9 L36 39 Q36 42 33 42 L15 42 Q12 42 12 39 L12 9 Q12 6 15 6 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M29 31 L24 24 L19 27 M29 31 L33 25 M29 31 L22 37 M24 24 L22 16" color={p.sec} hot="#fff1c9" width={1.7} />
        </>
      );

    case 'crackpad':
      return (
        <>
          <TubePath d="M9 9 L39 9 Q42 9 42 12 L42 36 Q42 39 39 39 L9 39 Q6 39 6 36 L6 12 Q6 9 9 9 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M18 20 L24 26 L31 22 M18 20 L13 15 M18 20 L14 30 M24 26 L27 34 M31 22 L36 17" color={p.sec} hot="#fff1c9" width={1.7} />
        </>
      );

    case 'terminal':
      return (
        <>
          <TubePath d="M8 11 L40 11 L40 37 L8 37 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M14 19 L20 24 L14 29 M23 29 L33 29" color={p.sec} hot="#fff1c9" width={2.4} />
        </>
      );

    case 'ai':
    default:
      return (
        <>
          <TubePath d="M24 8 L37 16 L37 32 L24 40 L11 32 L11 16 Z" color={p.main} hot={p.hot} width={2.1} />
          <TubePath d="M24 18 A6 6 0 1 1 23.9 18 Z" color={p.sec} hot="#ffd9ea" width={2.2} />
        </>
      );
  }
}

export default function GameIcon({ id, size = 40, className = '' }) {
  const palette = NEON_PALETTES[id] || { main: '#19f0ff', sec: '#ff2e88', hot: '#e2fdff' };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`tm-game-neon-icon ${className}`.trim()}
      aria-hidden="true"
    >
      {renderGameGlyph(id, palette)}
    </svg>
  );
}
