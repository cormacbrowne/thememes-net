import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import {
  defaultPixelAvatarForHandle,
  getPixelAvatarById,
  PIXEL_AVATAR_IDS
} from '../src/utils/pixelAvatars.js';

const WIDTH = 1200;
const HEIGHT = 630;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, crcInput, crcBuf]);
}

function hexToRgb(hex) {
  const clean = String(hex || '#00f3ff').replace(/^#/, '');
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Crisp 5x7 pixel font (rows as 5-char strings of '.' and '#')
const FONT_5X7 = {
  A: ['..#..', '.#.#.', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#..##', '#.#.#', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
  2: ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['#...#', '#...#', '#...#', '#####', '....#', '....#', '....#'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '####.', '#...#', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '.': ['.....', '.....', '.....', '.....', '.....', '..##.', '..##.'],
  ':': ['.....', '..##.', '..##.', '.....', '..##.', '..##.', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.', '#####', '.#.#.'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....']
};

function createCanvas() {
  const buf = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    const t = y / (HEIGHT - 1);
    const r = Math.round(7 + t * 20);
    const g = Math.round(6 + t * 4);
    const b = Math.round(20 + t * 32);
    for (let x = 0; x < WIDTH; x += 1) {
      const idx = (y * WIDTH + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

function fillRect(buf, x0, y0, w, h, rgb, alpha = 1) {
  const xStart = Math.max(0, Math.floor(x0));
  const yStart = Math.max(0, Math.floor(y0));
  const xEnd = Math.min(WIDTH, Math.floor(x0 + w));
  const yEnd = Math.min(HEIGHT, Math.floor(y0 + h));
  const inv = 1 - alpha;
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (y * WIDTH + x) * 4;
      if (alpha >= 1) {
        buf[idx] = rgb[0];
        buf[idx + 1] = rgb[1];
        buf[idx + 2] = rgb[2];
        buf[idx + 3] = 255;
      } else {
        buf[idx] = Math.round(buf[idx] * inv + rgb[0] * alpha);
        buf[idx + 1] = Math.round(buf[idx + 1] * inv + rgb[1] * alpha);
        buf[idx + 2] = Math.round(buf[idx + 2] * inv + rgb[2] * alpha);
      }
    }
  }
}

function strokeRect(buf, x, y, w, h, thickness, rgb, alpha = 1) {
  fillRect(buf, x, y, w, thickness, rgb, alpha);
  fillRect(buf, x, y + h - thickness, w, thickness, rgb, alpha);
  fillRect(buf, x, y, thickness, h, rgb, alpha);
  fillRect(buf, x + w - thickness, y, thickness, h, rgb, alpha);
}

function drawText(buf, text, x, y, scale, rgb) {
  const str = String(text || '').toUpperCase();
  let cx = x;
  for (const ch of str) {
    const glyph = FONT_5X7[ch] || FONT_5X7[' '];
    for (let gy = 0; gy < 7; gy += 1) {
      const row = glyph[gy];
      for (let gx = 0; gx < 5; gx += 1) {
        if (row[gx] === '#') {
          fillRect(buf, cx + gx * scale, y + gy * scale, scale, scale, rgb, 1);
        }
      }
    }
    cx += 6 * scale;
    if (cx > WIDTH - 40) break;
  }
}

/**
 * Renders a 1200x630 PNG creator share card using pure Node zlib (zero external image binaries).
 */
export function renderProfileOgPng({
  handle = 'Creator',
  level = 1,
  levelTitle = 'Arcade Lurker',
  battleWins = 0,
  streakDays = 0,
  avatarId = null
} = {}) {
  const cleanHandle = String(handle || 'Creator').trim().replace(/^@+/, '').slice(0, 24) || 'Creator';
  const preset =
    avatarId && PIXEL_AVATAR_IDS.includes(String(avatarId).toLowerCase())
      ? getPixelAvatarById(avatarId)
      : defaultPixelAvatarForHandle(cleanHandle);

  const cyan = [25, 240, 255];
  const pink = [255, 43, 214];
  const amber = [255, 184, 0];
  const white = [248, 250, 252];
  const soft = [165, 159, 196];
  const accentRgb = hexToRgb(preset.accent);
  const avatarBgRgb = hexToRgb(preset.bg);

  const buf = createCanvas();

  // Synthwave grid accent bands
  for (let gx = 60; gx < WIDTH; gx += 80) {
    fillRect(buf, gx, 380, 1, 160, cyan, 0.08);
  }
  for (let gy = 390; gy < 540; gy += 36) {
    fillRect(buf, 40, gy, WIDTH - 80, 1, cyan, 0.1);
  }

  // Outer card frame
  strokeRect(buf, 24, 24, WIDTH - 48, HEIGHT - 48, 4, cyan, 0.8);
  strokeRect(buf, 34, 34, WIDTH - 68, HEIGHT - 68, 2, pink, 0.5);

  // Left pixel avatar box (300x300)
  const boxX = 84;
  const boxY = 128;
  const boxSize = 304;
  fillRect(buf, boxX, boxY, boxSize, boxSize, avatarBgRgb, 1);
  strokeRect(buf, boxX, boxY, boxSize, boxSize, 6, accentRgb, 1);

  const cell = 30;
  const artOriginX = boxX + 32;
  const artOriginY = boxY + 32;
  for (let r = 0; r < 8; r += 1) {
    const rowStr = preset.rows[r] || '';
    for (let c = 0; c < 8; c += 1) {
      const code = rowStr[c];
      if (!code || code === '.') continue;
      const colorHex = preset.palette?.[code];
      if (!colorHex) continue;
      fillRect(buf, artOriginX + c * cell, artOriginY + r * cell, cell, cell, hexToRgb(colorHex), 1);
    }
  }

  // Right profile metadata column
  const colX = 436;
  const handleScale = cleanHandle.length > 15 ? 6 : 7;
  drawText(buf, `@${cleanHandle}`, colX, 134, handleScale, cyan);

  const lvlNum = Math.max(1, Number(level) || 1);
  drawText(buf, `LEVEL ${lvlNum} ${String(levelTitle || 'ARCADE LURKER')}`, colX, 224, 5, amber);

  const winsCount = Math.max(0, Number(battleWins) || 0);
  const winsLabel = `${winsCount} BATTLE ${winsCount === 1 ? 'WIN' : 'WINS'}`;
  const streakCount = Math.max(0, Number(streakDays) || 0);
  fillRect(buf, colX, 304, 670, 68, [255, 255, 255], 0.06);
  strokeRect(buf, colX, 304, 670, 68, 2, pink, 0.65);
  drawText(buf, `${winsLabel}  *  STREAK ${streakCount}D`, colX + 24, 323, 4, white);

  drawText(buf, `THEMEMES.NET/U/${cleanHandle}`, colX, 410, 3, soft);

  // Brand footer bar
  fillRect(buf, 28, 526, WIDTH - 56, 76, [6, 5, 16], 0.96);
  fillRect(buf, 28, 526, WIDTH - 56, 4, pink, 0.95);
  drawText(buf, 'THE MEMES.NET', 68, 548, 5, white);
  drawText(buf, 'MEMES * BATTLES * ARCADE', 620, 553, 3, cyan);

  // Encode raw RGBA scanlines with PNG filter byte 0
  const stride = WIDTH * 4;
  const raw = Buffer.allocUnsafe((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowOff = y * (stride + 1);
    raw[rowOff] = 0;
    raw.set(buf.subarray(y * stride, (y + 1) * stride), rowOff + 1);
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = zlib.deflateSync(raw, { level: 6 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}
