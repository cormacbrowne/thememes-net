// ==========================================
// PHASE 33.17: BUILT-IN ORIGINAL 8-BIT PIXEL-ART AVATARS
// Fixed curated set only — no user avatar uploads (eliminates moderation surface).
// Each avatar uses an 8x8 pixel matrix rendered with crisp SVG <rect> blocks.
// ==========================================

export const PIXEL_AVATARS = [
  {
    id: 'pixel-alien',
    name: 'Neon Invader',
    accent: '#00f3ff',
    bg: '#09192c',
    palette: { '1': '#00f3ff', '2': '#ec4899', '3': '#ffffff' },
    rows: [
      '..1..1..',
      '...11...',
      '..1111..',
      '.131131.',
      '11111111',
      '1.1221.1',
      '1.1..1.1',
      '..1..1..'
    ]
  },
  {
    id: 'neon-cat',
    name: 'Synth Kitty',
    accent: '#ec4899',
    bg: '#1c0b24',
    palette: { '1': '#ec4899', '2': '#00f3ff', '3': '#fde047' },
    rows: [
      '1......1',
      '11....11',
      '11111111',
      '12111121',
      '11133111',
      '.111111.',
      '..1221..',
      '.1....1.'
    ]
  },
  {
    id: 'synth-knight',
    name: 'Cyber Visor',
    accent: '#a855f7',
    bg: '#140f2d',
    palette: { '1': '#a855f7', '2': '#00f3ff', '3': '#f8fafc' },
    rows: [
      '..3333..',
      '.111111.',
      '11222211',
      '11233211',
      '11111111',
      '.112211.',
      '.111111.',
      '.1....1.'
    ]
  },
  {
    id: 'laser-duck',
    name: 'Laser Duck',
    accent: '#facc15',
    bg: '#231906',
    palette: { '1': '#facc15', '2': '#fb923c', '3': '#111827' },
    rows: [
      '..111...',
      '.11111..',
      '.1311222',
      '.111122.',
      '..1111..',
      '.111111.',
      '.111111.',
      '..2..2..'
    ]
  },
  {
    id: 'robo-goblin',
    name: 'Byte Goblin',
    accent: '#22c55e',
    bg: '#081f13',
    palette: { '1': '#22c55e', '2': '#facc15', '3': '#ef4444' },
    rows: [
      '1......1',
      '11111111',
      '.121121.',
      '11111111',
      '.133331.',
      '..1111..',
      '.112211.',
      '.1....1.'
    ]
  },
  {
    id: 'arcade-wizard',
    name: 'Pixel Mage',
    accent: '#818cf8',
    bg: '#111332',
    palette: { '1': '#818cf8', '2': '#facc15', '3': '#38bdf8' },
    rows: [
      '...11...',
      '..1111..',
      '.121121.',
      '11111111',
      '..3113..',
      '..1111..',
      '.112211.',
      '.111111.'
    ]
  },
  {
    id: 'cyber-frog',
    name: 'Vapor Toad',
    accent: '#34d399',
    bg: '#07221d',
    palette: { '1': '#34d399', '2': '#f8fafc', '3': '#ec4899' },
    rows: [
      '.21..12.',
      '12111121',
      '11111111',
      '11333311',
      '.111111.',
      '.122221.',
      '11....11',
      '1......1'
    ]
  },
  {
    id: 'crown-slime',
    name: 'King Slime',
    accent: '#f59e0b',
    bg: '#17142b',
    palette: { '1': '#38bdf8', '2': '#facc15', '3': '#f8fafc' },
    rows: [
      '.2.22.2.',
      '.222222.',
      '..1111..',
      '.111111.',
      '11311311',
      '11111111',
      '11122111',
      '.111111.'
    ]
  },
  {
    id: 'crt-bot',
    name: 'CRT Buddy',
    accent: '#38bdf8',
    bg: '#0b1829',
    palette: { '1': '#94a3b8', '2': '#00f3ff', '3': '#ec4899' },
    rows: [
      '..3..3..',
      '.111111.',
      '11222211',
      '11233211',
      '11222211',
      '.111111.',
      '..1331..',
      '.1....1.'
    ]
  },
  {
    id: 'ghost-86',
    name: 'Phantom 86',
    accent: '#f43f5e',
    bg: '#240915',
    palette: { '1': '#f43f5e', '2': '#ffffff', '3': '#0f172a' },
    rows: [
      '..1111..',
      '.111111.',
      '11231231',
      '11221221',
      '11111111',
      '11111111',
      '11111111',
      '1.11.11.'
    ]
  },
  {
    id: 'star-knight',
    name: 'Astro Star',
    accent: '#fde047',
    bg: '#1c1130',
    palette: { '1': '#fde047', '2': '#ec4899', '3': '#111827' },
    rows: [
      '...11...',
      '...11...',
      '11111111',
      '.131131.',
      '..1221..',
      '.111111.',
      '.11..11.',
      '1......1'
    ]
  },
  {
    id: 'turbo-shiba',
    name: 'Turbo Doge',
    accent: '#fb923c',
    bg: '#231308',
    palette: { '1': '#fb923c', '2': '#fef08a', '3': '#111827' },
    rows: [
      '1......1',
      '11111111',
      '13111131',
      '11222211',
      '12233221',
      '.122221.',
      '..1221..',
      '.1....1.'
    ]
  }
];

export const PIXEL_AVATAR_IDS = PIXEL_AVATARS.map((a) => a.id);

export function getPixelAvatarById(avatarId) {
  const clean = String(avatarId || '').trim().toLowerCase();
  return PIXEL_AVATARS.find((a) => a.id === clean) || PIXEL_AVATARS[0];
}

export function defaultPixelAvatarForHandle(handle) {
  const clean = String(handle || 'anon').trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = Math.abs(hash) % PIXEL_AVATARS.length;
  return PIXEL_AVATARS[idx];
}

export function avatarRectsForPreset(avatar) {
  const preset = typeof avatar === 'string' ? getPixelAvatarById(avatar) : avatar || PIXEL_AVATARS[0];
  const rects = [];
  preset.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.' && preset.palette[ch]) {
        rects.push({ x, y, fill: preset.palette[ch] });
      }
    }
  });
  return rects;
}
