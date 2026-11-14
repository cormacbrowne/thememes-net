// ==========================================
// ARCADE LOBBY CATALOG (Phase 29.12)
// Shared metadata, categories, recent play history, and favourites.
// ==========================================

export const RECENT_GAMES_KEY = 'tm_recent_games_v1';
export const FAV_GAMES_KEY = 'tm_fav_games_v1';

export const ARCADE_LOBBY_GROUPS = [
  { id: 'casino', label: '🎰 Casino & Oracle', desc: 'MemeDollarz ($) tables & odds games' },
  { id: 'skill', label: '🕹️ Skill', desc: 'Reflex & puzzle arcade cabinets' },
  { id: 'meme', label: '🧠 Meme Games', desc: 'Daily challenges & crowd battles' },
  { id: 'sim', label: '📈 Sim', desc: 'Live market & ticker chaos' }
];

export const ARCADE_GAMES_CATALOG = [
  // Casino
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
    icon: '🪙',
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
    label: 'Lightning Roulette',
    pitch: 'European wheel with 150x strikes.',
    badge: '150x',
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
    pitch: 'Texas Hold’em with casino chips & token buy-ins.',
    badge: 'Hold’em',
    isNew: true,
    accent: '#ff2a85',
    path: '/games/poker'
  },
  {
    id: 'slots',
    group: 'casino',
    icon: '🎰',
    label: 'Vegas Slot Arcade',
    pitch: "5 machines (25¢ min): Bandit '85, Neon Special '86, Mustang, Lightning & Buffalo.",
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
    pitch: 'Ask the neon oracle & wager MemeDollarz on destiny.',
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
  },

  // Skill
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
  }
];

export const BOSS_SCREENS_CATALOG = [
  {
    id: 'zoom',
    icon: '📹',
    label: 'Fake Microsoft Teams & Zoom Call',
    pitch: 'Realistic 4-person standup meeting, incoming Boss Call ringtone & bad Wi-Fi camera freeze.',
    path: '/fake-teams-zoom-call-screen',
    accent: '#6366f1'
  },
  {
    id: 'excel',
    icon: '📊',
    label: 'Fake Excel Q4 Boss Spreadsheet',
    pitch: 'Interactive Q4 Cloud Synergy financial sheet with clickable cells & Monte Carlo audit.',
    path: '/fake-excel-boss-screen',
    accent: '#10b981'
  },
  {
    id: 'bsod',
    icon: '💀',
    label: 'Fake Blue Screen of Death (BSOD)',
    pitch: 'Classic Windows ":(" crash screen with live % recovery & IT support QR prank.',
    path: '/fake-blue-screen-prank',
    accent: '#0284c7'
  },
  {
    id: 'update',
    icon: '🔄',
    label: 'Fake Windows Update Screen',
    pitch: 'Fullscreen "Working on updates 69% complete" prank — click anywhere to advance %.',
    path: '/fake-windows-update-screen',
    accent: '#0ea5e9'
  },
  {
    id: 'terminal',
    icon: '💻',
    label: 'Fake Hacker & DevOps Terminal',
    pitch: 'Tap any key to compile fake Rust/Kubernetes microservices in fullscreen green text.',
    path: '/fake-hacker-terminal-screen',
    accent: '#22c55e'
  },
  {
    id: 'ai',
    icon: '🤖',
    label: 'Fake Enterprise AI Copilot',
    pitch: 'SynergyGPT Q4 Executive Workspace generating ultra-convincing corporate memos.',
    path: '/fake-ai-workspace-boss-screen',
    accent: '#8b5cf6'
  }
];

const GAME_BY_ID = new Map(ARCADE_GAMES_CATALOG.map((g) => [g.id, g]));

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
