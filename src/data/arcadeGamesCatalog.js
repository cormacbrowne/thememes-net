// ==========================================
// ARCADE LOBBY CATALOG (Phase 29.12)
// Shared metadata, categories, recent play history, and favourites.
// ==========================================

export const RECENT_GAMES_KEY = 'tm_recent_games_v1';
export const FAV_GAMES_KEY = 'tm_fav_games_v1';

export const ARCADE_LOBBY_GROUPS = [
  { id: 'casino', label: '🎰 Casino', desc: 'Free token tables & odds games' },
  { id: 'skill', label: '🕹️ Skill', desc: 'Reflex & puzzle arcade cabinets' },
  { id: 'meme', label: '🧠 Meme Games', desc: 'Daily challenges & crowd battles' },
  { id: 'sim', label: '📈 Sim', desc: 'Live market & ticker chaos' }
];

export const ARCADE_GAMES_CATALOG = [
  // Casino
  {
    id: 'pusher',
    group: 'casino',
    icon: '🪙',
    label: "Neon Coin Dozer '86",
    pitch: 'Drop coins & shove 3D prize towers.',
    badge: '3D',
    isNew: false,
    accent: '#facc15'
  },
  {
    id: 'roulette',
    group: 'casino',
    icon: '🎡',
    label: 'Lightning Roulette',
    pitch: 'European wheel with 150x strikes.',
    badge: '150x',
    isNew: false,
    accent: '#ef4444'
  },
  {
    id: 'blackjack',
    group: 'casino',
    icon: '🃏',
    label: "Neon 21's",
    pitch: 'Beat the synth dealer to 21.',
    badge: 'Cards',
    isNew: false,
    accent: '#38bdf8'
  },
  {
    id: 'slots',
    group: 'casino',
    icon: '🎰',
    label: 'Vegas 777 Slots',
    pitch: 'Hold reels and chase neon jackpots.',
    badge: 'Jackpot',
    isNew: false,
    accent: '#f472b6'
  },
  {
    id: 'plinko',
    group: 'casino',
    icon: '🎯',
    label: 'Meme Plinko',
    pitch: 'Drop meme balls down 3 risk peg rows.',
    badge: '26x',
    isNew: true,
    accent: '#a78bfa'
  },
  {
    id: 'derby',
    group: 'casino',
    icon: '🏇',
    label: "Neon Derby '86",
    pitch: '8 meme horses sprint synthwave turf.',
    badge: 'Race',
    isNew: true,
    accent: '#22d3ee'
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
    accent: '#c084fc'
  },
  {
    id: 'crush',
    group: 'skill',
    icon: '🍬',
    label: 'Meme Crush Saga',
    pitch: 'Match meme tiles and chain combos.',
    badge: 'Match-3',
    isNew: false,
    accent: '#fb7185'
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
    accent: '#4ade80'
  },
  {
    id: 'hilow',
    group: 'meme',
    icon: '⬆️',
    label: 'Higher or Lower',
    pitch: 'Guess which meme earned more votes.',
    badge: 'Endless',
    isNew: true,
    accent: '#fbbf24'
  },
  {
    id: 'swipe',
    group: 'meme',
    icon: '⚡',
    label: 'Speed Swipe',
    pitch: 'Rate fresh feed memes at lightning pace.',
    badge: 'Fast',
    isNew: false,
    accent: '#60a5fa'
  },
  {
    id: 'battle',
    group: 'meme',
    icon: '⚔️',
    label: '1v1 Meme Arena',
    pitch: 'Vote head-to-head to crown a king.',
    badge: 'Versus',
    isNew: false,
    accent: '#f97316'
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
    accent: '#34d399'
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
