// ==========================================
// PHASE 28.16: ARCADE COSMETICS CATALOG & PERSISTENCE
// Tokens & XP unlock self-expression cosmetics:
//   - Card Frames (holo, gold, VHS-glitch, neon-pink)
//   - Cursor & Touch Trails
//   - Bonus THE MEMES FM Radio Stations
//   - Cassette Deck Skins
//   - Profile Titles / Flairs
// ==========================================

export const COSMETIC_CATEGORIES = [
  { id: 'all', label: '✨ All' },
  { id: 'frame', label: '🖼️ Card Frames' },
  { id: 'trail', label: '🌟 Trails' },
  { id: 'station', label: '📻 Radio Stations' },
  { id: 'skin', label: '📼 Cassette Skins' },
  { id: 'title', label: '👑 Profile Titles' }
];

export const COSMETIC_CATALOG = [
  // Card Frames
  {
    id: 'frame-default',
    type: 'frame',
    value: 'default',
    name: 'Cyber-Slate Glass',
    icon: '🪪',
    desc: 'Standard neon cyber-arcade meme card border.',
    tokenCost: 0,
    unlockXp: 0,
    freeDefault: true
  },
  {
    id: 'frame-neon-pink',
    type: 'frame',
    value: 'neon-pink',
    name: 'Synthwave Laser Frame',
    icon: '💖',
    desc: 'Hot-magenta outrun trim around every meme you publish.',
    tokenCost: 15,
    unlockXp: 250
  },
  {
    id: 'frame-holo',
    type: 'frame',
    value: 'holo',
    name: 'Prismatic Holo Frame',
    icon: '🌈',
    desc: 'Iridescent rainbow foil shimmer on your meme cards & profile.',
    tokenCost: 20,
    unlockXp: 450
  },
  {
    id: 'frame-vhs',
    type: 'frame',
    value: 'vhs',
    name: 'VHS Glitch Scan Frame',
    icon: '📼',
    desc: 'Retro 1986 tracking-line chromatic border on your cards.',
    tokenCost: 30,
    unlockXp: 850
  },
  {
    id: 'frame-gold',
    type: 'frame',
    value: 'gold',
    name: '24K Solid Gold Frame',
    icon: '👑',
    desc: 'Championship bullion gold frame for Hall of Fame creators.',
    tokenCost: 35,
    unlockXp: 1200
  },

  // Cursor & Touch Trails
  {
    id: 'trail-none',
    type: 'trail',
    value: 'none',
    name: 'No Trail',
    icon: '🚫',
    desc: 'Clean pointer with zero particle trail.',
    tokenCost: 0,
    unlockXp: 0,
    freeDefault: true
  },
  {
    id: 'trail-fire',
    type: 'trail',
    value: 'fire',
    name: 'Fire Trail',
    icon: '🔥',
    desc: 'Blazing flame sparks following your cursor and taps.',
    tokenCost: 0,
    unlockXp: 0,
    freeDefault: true
  },
  {
    id: 'trail-star',
    type: 'trail',
    value: 'star',
    name: 'Star Sparkle Trail',
    icon: '🌟',
    desc: 'Golden arcade starlight sparks wherever you tap or glide.',
    tokenCost: 10,
    unlockXp: 200
  },
  {
    id: 'trail-diamond',
    type: 'trail',
    value: 'diamond',
    name: 'Diamond Trail',
    icon: '💎',
    desc: 'Crisp cyan diamond facets trailing your pointer.',
    tokenCost: 15,
    unlockXp: 450
  },
  {
    id: 'trail-duck',
    type: 'trail',
    value: 'duck',
    name: 'Duck Army Trail',
    icon: '🦆',
    desc: 'Tiny rubber ducks marching behind your cursor.',
    tokenCost: 20,
    unlockXp: 700
  },
  {
    id: 'trail-glitch',
    type: 'trail',
    value: 'glitch',
    name: 'Matrix Spark Trail',
    icon: '⚡',
    desc: 'High-voltage cyber lightning bolts on move & touch.',
    tokenCost: 25,
    unlockXp: 950
  },
  {
    id: 'trail-crown',
    type: 'trail',
    value: 'crown',
    name: 'Royal Crown Trail',
    icon: '👑',
    desc: 'Drop golden crowns across the feed as you browse.',
    tokenCost: 30,
    unlockXp: 1400
  },

  // Bonus Radio Stations (8 base stations free + seasonal; 4 bonus unlockable in Shop!)
  {
    id: 'station-retrowave',
    type: 'station',
    value: 'retrowave',
    name: 'Sunset Outrun FM',
    icon: '🌅',
    desc: 'Unlockable 108 BPM uplifting neon outrun radio station.',
    tokenCost: 20,
    unlockXp: 600
  },
  {
    id: 'station-cyberpunk',
    type: 'station',
    value: 'cyberpunk',
    name: 'Dark Cyberbass FM',
    icon: '⚡',
    desc: 'Unlockable 118 BPM driving cyber-electro bass station.',
    tokenCost: 25,
    unlockXp: 1100
  },
  {
    id: 'station-yachtrock',
    type: 'station',
    value: 'yachtrock',
    name: 'Yacht Rock Sunset',
    icon: '🏝️',
    desc: 'Unlockable 102 BPM velvet Rhodes & marina breeze groove.',
    tokenCost: 25,
    unlockXp: 900
  },
  {
    id: 'station-italodisco',
    type: 'station',
    value: 'italodisco',
    name: "Italo Disco '84",
    icon: '🪩',
    desc: 'Unlockable 122 BPM Milanese octave-bass & laser-synth club.',
    tokenCost: 30,
    unlockXp: 1300
  },

  // Cassette Deck Skins (THE MEMES FM)
  {
    id: 'skin-classic',
    type: 'skin',
    value: 'classic',
    name: 'Retro Slate Tape',
    icon: '📼',
    desc: 'Original 1986 studio matte cassette shell.',
    tokenCost: 0,
    unlockXp: 0,
    freeDefault: true
  },
  {
    id: 'skin-vhs-static',
    type: 'skin',
    value: 'vhs-static',
    name: 'Midnight Bootleg Tape',
    icon: '📺',
    desc: 'Neon cyan-violet midnight VHS tape deck skin.',
    tokenCost: 15,
    unlockXp: 350
  },
  {
    id: 'skin-gold-chrome',
    type: 'skin',
    value: 'gold-chrome',
    name: '24K Gold Chrome Tape',
    icon: '✨',
    desc: 'Gleaming metallic gold cassette deck shell.',
    tokenCost: 20,
    unlockXp: 700
  },
  {
    id: 'skin-clear-neon',
    type: 'skin',
    value: 'clear-neon',
    name: 'Transparent Cyber Shell',
    icon: '💎',
    desc: 'Translucent holographic 90s shell with glowing tape reels.',
    tokenCost: 25,
    unlockXp: 1000
  },

  // Profile Titles
  {
    id: 'title-neon-architect',
    type: 'title',
    value: '⚡ Neon Architect',
    name: '⚡ Neon Architect',
    icon: '⚡',
    desc: 'Custom glowing title badge on your profile & leaderboard.',
    tokenCost: 15,
    unlockXp: 300
  },
  {
    id: 'title-synth-royalty',
    type: 'title',
    value: '📼 Synthwave Royalty',
    name: '📼 Synthwave Royalty',
    icon: '📼',
    desc: 'Show off your late-night FM creator status.',
    tokenCost: 25,
    unlockXp: 750
  },
  {
    id: 'title-eternal-sigma',
    type: 'title',
    value: '🗿 Eternal Sigma',
    name: '🗿 Eternal Sigma',
    icon: '🗿',
    desc: 'Refuses to elaborate. Drops peak memes.',
    tokenCost: 30,
    unlockXp: 1100
  },
  {
    id: 'title-certified-memelord',
    type: 'title',
    value: '👑 Certified Memelord',
    name: '👑 Certified Memelord',
    icon: '👑',
    desc: 'Top-shelf arcade prestige title.',
    tokenCost: 40,
    unlockXp: 2000
  }
];

const UNLOCKED_COSMETICS_KEY = 'tm_unlocked_cosmetics_v1';
const EQUIPPED_FRAME_KEY = 'tm_equipped_frame_v1';
const EQUIPPED_SKIN_KEY = 'tm_cassette_skin_v1';

const DEFAULT_UNLOCKED_IDS = COSMETIC_CATALOG.filter((c) => c.freeDefault).map((c) => c.id);

export function loadUnlockedCosmetics() {
  if (typeof window === 'undefined') return [...DEFAULT_UNLOCKED_IDS];
  try {
    const raw = JSON.parse(localStorage.getItem(UNLOCKED_COSMETICS_KEY) || '[]');
    const set = new Set([...DEFAULT_UNLOCKED_IDS, ...(Array.isArray(raw) ? raw : [])]);
    // Preserve any existing trail already selected prior to Phase 28.16
    const existingTrail = localStorage.getItem('tm_cursor_trail');
    if (existingTrail) {
      const match = COSMETIC_CATALOG.find((c) => c.type === 'trail' && c.value === existingTrail);
      if (match) set.add(match.id);
    }
    return Array.from(set);
  } catch {
    return [...DEFAULT_UNLOCKED_IDS];
  }
}

export function saveUnlockedCosmetics(ids) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UNLOCKED_COSMETICS_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // ignore quota errors
  }
}

export function loadEquippedFrame() {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem(EQUIPPED_FRAME_KEY) || 'default';
}

export function saveEquippedFrame(frameId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EQUIPPED_FRAME_KEY, frameId || 'default');
  } catch {
    // ignore
  }
}

export function loadEquippedCassetteSkin() {
  if (typeof window === 'undefined') return 'classic';
  return localStorage.getItem(EQUIPPED_SKIN_KEY) || 'classic';
}

export function saveEquippedCassetteSkin(skinId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EQUIPPED_SKIN_KEY, skinId || 'classic');
  } catch {
    // ignore
  }
}

export function isCosmeticUnlocked(cosmeticId, unlockedIds = []) {
  const item = COSMETIC_CATALOG.find((c) => c.id === cosmeticId);
  if (!item) return false;
  if (item.freeDefault) return true;
  return unlockedIds.includes(cosmeticId);
}

export function pickRandomLockedCosmetic(unlockedIds = []) {
  const locked = COSMETIC_CATALOG.filter((c) => !c.freeDefault && !unlockedIds.includes(c.id));
  if (locked.length === 0) return null;
  return locked[Math.floor(Math.random() * locked.length)];
}
