// ==========================================
// ARCADE LOBBY CATALOG (Phase 29.12)
// Shared metadata, categories, recent play history, and favourites.
// ==========================================

import { FEATURE_CASINO_GAMES } from '../config/featureFlags.js';

export const RECENT_GAMES_KEY = 'tm_recent_games_v1';
export const FAV_GAMES_KEY = 'tm_fav_games_v1';

export const ARCADE_LOBBY_GROUPS = [
  { id: 'skill', label: 'Skill Cabinets', desc: 'Free reflex, shooter & puzzle cabinets' },
  { id: 'meme', label: 'Meme Games', desc: 'Daily challenges & crowd battles' },
  { id: 'sim', label: 'Market Sim', desc: 'Live MEMEDAQ ticker trading' },
  {
    id: 'casino',
    label: 'Retro Casino',
    desc: 'Slots, cards, roulette, bingo and racing'
  }
];

export const ARCADE_GAMES_CATALOG = [
  // Skill
  {
    id: 'thousand',
    group: 'skill',
    icon: '🃏',
    label: '1000 (Tysiąc)',
    pitch: 'The classic bidding card game: musik, marriages & race to 1000. Free vs computer or 2–4 friends.',
    badge: '2–4 Players',
    isNew: true,
    accent: '#ffb800',
    path: '/games/1000-card-game'
  },
  {
    id: 'invaders',
    group: 'skill',
    icon: '👾',
    label: "Meme Invaders '86",
    pitch: 'Blast descending emoji waves, crumbling shields & Wave-5 Meme Bosses (free to play).',
    badge: 'Shooter',
    isNew: true,
    accent: '#00f3ff',
    path: '/games/meme-invaders'
  },
  {
    id: 'serpent',
    group: 'skill',
    icon: '🐍',
    label: 'Neon Serpent',
    pitch: 'Swipe through a neon reaction grid—eat 🔥 Speed, 🗿 Slow-Mo & 💀 Shrink emojis (free to play).',
    badge: 'Snake',
    isNew: true,
    accent: '#4ade80',
    path: '/games/neon-serpent'
  },
  {
    id: 'blaster',
    group: 'skill',
    icon: '🧱',
    label: 'Brick Blaster',
    pitch: 'Break word-art & pixel-face levels with Multi-Ball, Twin Laser & Wide Paddle orbs (free to play).',
    badge: 'Breaker',
    isNew: true,
    accent: '#f472b6',
    path: '/games/brick-blaster'
  },
  {
    id: 'sunset',
    group: 'skill',
    icon: '🌅',
    label: 'Sunset Sprint',
    pitch: 'Pseudo-3D synthwave highway racer—dodge traffic, hit checkpoints & grab 📼 FM cassettes (free to play).',
    badge: 'Racer',
    isNew: true,
    accent: '#fb923c',
    path: '/games/sunset-sprint'
  },
  {
    id: 'void',
    group: 'skill',
    icon: '🛸',
    label: 'Vector Void',
    pitch: 'Twin-stick vector space shooter with wrap-around edges & splitting rocks (free to play).',
    badge: 'Twin-Stick',
    isNew: true,
    accent: '#38bdf8',
    path: '/games/vector-void'
  },
  {
    id: 'riders',
    group: 'skill',
    icon: '🏍️',
    label: 'Grid Riders',
    pitch: 'Neon light-trail arena duel vs. AI or 2-player local split controls (free to play).',
    badge: '1P / 2P Duel',
    isNew: true,
    accent: '#00f3ff',
    path: '/games/grid-riders'
  },
  {
    id: 'pinball',
    group: 'skill',
    icon: '🎱',
    label: 'Neon Pinball',
    pitch: 'Flippers, multiball & 5 retro tables.',
    badge: '5 Tables',
    isNew: false,
    accent: '#c084fc',
    path: '/games/pinball'
  },
  {
    id: 'crush',
    group: 'skill',
    icon: '🍬',
    label: 'Meme Crush Saga',
    pitch: 'Match meme tiles and chain combos.',
    badge: 'Match-3',
    isNew: false,
    accent: '#fb7185',
    path: '/games/meme-crush'
  },

  // Meme Games
  {
    id: 'guess',
    group: 'meme',
    icon: '🧠',
    label: 'Guess The Meme',
    pitch: 'Spot 5 pixelated formats each day.',
    badge: 'Daily',
    isNew: true,
    accent: '#4ade80',
    path: '/games/guess-the-meme'
  },
  {
    id: 'hilow',
    group: 'meme',
    icon: '⬆️',
    label: 'Higher or Lower',
    pitch: 'Guess which meme earned more votes.',
    badge: 'Endless',
    isNew: true,
    accent: '#fbbf24',
    path: '/games/higher-or-lower'
  },
  {
    id: 'swipe',
    group: 'meme',
    icon: '⚡',
    label: 'Speed Swipe',
    pitch: 'Rate fresh feed memes at lightning pace.',
    badge: 'Fast',
    isNew: false,
    accent: '#60a5fa',
    path: '/games/speed-swipe'
  },
  {
    id: 'battle',
    group: 'meme',
    icon: '⚔️',
    label: '1v1 Meme Arena',
    pitch: 'Vote head-to-head to crown a king.',
    badge: 'Versus',
    isNew: false,
    accent: '#f97316',
    path: '/games/meme-battle-arena'
  },

  // Sim
  {
    id: 'stocks',
    group: 'sim',
    icon: '📈',
    label: "MEMEDAQ '86",
    pitch: 'Trade viral meme stocks before close.',
    badge: 'Trade',
    isNew: false,
    accent: '#34d399',
    path: '/games/meme-stock-market'
  },

  // Retro Casino — always LAST in the lobby, behind FEATURE_CASINO_GAMES (plan 1.6).
  // Play-money MemeDollarz only: never bought, transferred or cashed out.
  {
    id: 'bingo',
    group: 'casino',
    icon: '🎱',
    label: "Neon Bingo '86",
    pitch: 'All 90 comedy calls (Two Little Ducks 22!), UV dabber pen, cheers/boos & M$ jackpots.',
    badge: '90-Ball',
    isNew: true,
    accent: '#ff2a85',
    path: '/games/neon-bingo'
  },
  {
    id: 'pusher',
    group: 'casino',
    icon: '🎰',
    label: "Neon Coin Dozer '86",
    pitch: 'Drop coins & shove 3D prize towers.',
    badge: '3D',
    isNew: false,
    accent: '#facc15',
    path: '/games/coin-pusher'
  },
  {
    id: 'roulette',
    group: 'casino',
    icon: '🎡',
    label: 'Neon Strike Roulette',
    pitch: 'European wheel with Strike numbers.',
    badge: 'Strike',
    isNew: false,
    accent: '#ef4444',
    path: '/games/roulette'
  },
  {
    id: 'blackjack',
    group: 'casino',
    icon: '🃏',
    label: "Neon 21's",
    pitch: 'Beat the synth dealer to 21.',
    badge: 'Cards',
    isNew: false,
    accent: '#38bdf8',
    path: '/games/blackjack'
  },
  {
    id: 'poker',
    group: 'casino',
    icon: '🟡',
    label: "Neon Hold'em '86 Poker",
    pitch: 'Texas Hold’em with play-money M$ chips. No real money, ever.',
    badge: 'Hold’em',
    isNew: true,
    accent: '#ff2a85',
    path: '/games/poker'
  },
  {
    id: 'slots',
    group: 'casino',
    icon: '🎰',
    label: "Neon Slots '86",
    pitch: "5 machines (25¢ min): Bandit '85, Neon Special '86, Midnight Diner '86, Thunder Vault & Cyber Herd.",
    badge: '5 Slots',
    isNew: true,
    accent: '#f472b6',
    path: '/games/slots'
  },
  {
    id: 'eightball',
    group: 'casino',
    icon: '🎱',
    label: "80s Magic 8-Ball",
    pitch: 'Ask the neon oracle a yes/no question (play-money M$ only).',
    badge: 'Oracle',
    isNew: true,
    accent: '#00f5ff',
    path: '/games/magic-8-ball'
  },
  {
    id: 'derby',
    group: 'casino',
    icon: '🏇',
    label: "Neon Derby '86",
    pitch: '8 meme horses sprint synthwave turf.',
    badge: 'Race',
    isNew: true,
    accent: '#22d3ee',
    path: '/games/horse-racing'
  }
];

/**
 * Every prank listed here shows up (and is searchable) in the lobby's Pranks tab and on
 * /prank-screens. Search reads label, pitch, id, path and the optional `keywords` (nicknames
 * people might type, e.g. "broken" for the cracked screens). Games accept `keywords` too.
 */
export const BOSS_SCREENS_CATALOG = [
  {
    id: 'zoom',
    icon: '📹',
    label: 'Fake Video Call (Teams / Zoom style)',
    pitch: 'Realistic 4-person standup meeting, incoming Boss Call ringtone & bad Wi-Fi camera freeze.',
    path: '/fake-teams-zoom-call-screen',
    keywords: 'meeting webcam video conference standup boss',
    accent: '#6366f1'
  },
  {
    id: 'excel',
    icon: '📊',
    label: 'Fake Boss Spreadsheet (Excel style)',
    pitch: 'Interactive Q4 Cloud Synergy financial sheet with clickable cells & Monte Carlo audit.',
    path: '/fake-excel-boss-screen',
    keywords: 'spreadsheet work office finance boss key',
    accent: '#10b981'
  },
  {
    id: 'bsod',
    icon: '💀',
    label: 'Fake Blue Screen of Death (BSOD)',
    pitch: 'Classic ":(" blue crash screen with live % recovery & IT support QR prank.',
    path: '/fake-blue-screen-prank',
    keywords: 'crash error windows computer broken pc',
    accent: '#0284c7'
  },
  {
    id: 'update',
    icon: '🔄',
    label: 'Fake System Update Screen',
    pitch: 'Fullscreen "Working on updates 69% complete" prank — click anywhere to advance %.',
    path: '/fake-windows-update-screen',
    keywords: 'windows loading installing restart computer pc',
    accent: '#0ea5e9'
  },
  {
    id: 'terminal',
    icon: '💻',
    label: 'Fake Hacker & DevOps Terminal',
    pitch: 'Tap any key to compile fake Rust/Kubernetes microservices in fullscreen green text.',
    path: '/fake-hacker-terminal-screen',
    keywords: 'hacking code coding matrix command line',
    accent: '#22c55e'
  },
  {
    id: 'ai',
    icon: '🤖',
    label: 'Fake Enterprise AI Copilot',
    pitch: 'SynergyGPT Q4 Executive Workspace generating ultra-convincing corporate memos.',
    path: '/fake-ai-workspace-boss-screen',
    keywords: 'chatbot assistant work office',
    accent: '#8b5cf6'
  },
  {
    id: 'crackphone',
    icon: '📱',
    label: 'Cracked iPhone Screen',
    pitch: 'Smashed glass, bleeding ink and live sparks shorting inside the screen. Every tap cracks it more.',
    path: '/fake-cracked-iphone-screen',
    keywords: 'broken smashed shattered glass phone mobile',
    accent: '#ff7a3d',
    isNew: true
  },
  {
    id: 'crackpad',
    icon: '📱',
    label: 'Cracked iPad Screen',
    pitch: 'The big-screen version: a shattered tablet with dead pixel lines and electric arcs.',
    path: '/fake-cracked-ipad-screen',
    keywords: 'broken smashed shattered glass tablet',
    accent: '#b03cff',
    isNew: true
  },
  {
    id: 'secretsanta',
    icon: '🎅',
    label: 'Office Secret Santa Prank',
    pitch: 'A playful parody HR gift-exchange draw that dramatically reveals… your boss.',
    path: '/fake-secret-santa-prank',
    keywords: 'christmas holiday secret santa gift exchange boss hr party',
    accent: '#ef4444',
    isNew: true
  }
];

const GAME_BY_ID = new Map(ARCADE_GAMES_CATALOG.map((g) => [g.id, g]));

export const CASINO_GROUP_ID = 'casino';

export function isCasinoGame(gameOrId) {
  const g = typeof gameOrId === 'string' ? getArcadeGameById(gameOrId) : gameOrId;
  return Boolean(g && g.group === CASINO_GROUP_ID);
}

/** Games the arcade shows: casino games only while FEATURE_CASINO_GAMES is on (plan 1.6). */
export function getVisibleArcadeGames(includeCasino = FEATURE_CASINO_GAMES) {
  return ARCADE_GAMES_CATALOG.filter((g) => includeCasino || g.group !== CASINO_GROUP_ID);
}

export const VISIBLE_ARCADE_GAMES = getVisibleArcadeGames();

export const VISIBLE_ARCADE_LOBBY_GROUPS = ARCADE_LOBBY_GROUPS.filter(
  (g) => FEATURE_CASINO_GAMES || g.id !== CASINO_GROUP_ID
);

export function getArcadeGameById(id) {
  return GAME_BY_ID.get(id) || null;
}

export function getRecentArcadeGames() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_GAMES_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((id) => GAME_BY_ID.get(id)).filter(Boolean).slice(0, 3);
  } catch {
    return [];
  }
}

export function recordRecentArcadeGame(gameId) {
  if (typeof window === 'undefined' || !GAME_BY_ID.has(gameId)) return;
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_GAMES_KEY) || '[]');
    const prev = Array.isArray(raw) ? raw.filter((id) => GAME_BY_ID.has(id) && id !== gameId) : [];
    const next = [gameId, ...prev].slice(0, 3);
    localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function getFavoriteArcadeGameIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_GAMES_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((id) => GAME_BY_ID.has(id));
  } catch {
    return [];
  }
}

export function toggleFavoriteArcadeGameId(gameId) {
  if (!GAME_BY_ID.has(gameId)) return getFavoriteArcadeGameIds();
  const prev = getFavoriteArcadeGameIds();
  const exists = prev.includes(gameId);
  const next = exists ? prev.filter((id) => id !== gameId) : [gameId, ...prev];
  try {
    localStorage.setItem(FAV_GAMES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}
