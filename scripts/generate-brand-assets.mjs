import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { ICON_TUBES, SIGN_TUBES } from '../src/components/neonSignPaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const COLORS = {
  night0: [7, 6, 15],
  night1: [17, 13, 34],
  uv: [138, 61, 255],
  pink: { off: [61, 16, 40], core: [255, 46, 136], hot: [255, 217, 234] },
  cyan: { off: [11, 52, 64], core: [25, 240, 255], hot: [226, 253, 255] },
  amber: { off: [61, 44, 5], core: [255, 184, 0], hot: [255, 241, 201] }
};

function buildFaviconSvg() {
  const tubeGroups = ICON_TUBES.map(([colour, x, y, w, d]) => {
    const map = {
      pink: { off: '#3d1028', core: '#ff2e88', hot: '#ffd9ea' },
      amber: { off: '#3d2c05', core: '#ffb800', hot: '#fff1c9' }
    }[colour];
    return `    <g transform="translate(${x} ${y})" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${d}" stroke="${map.off}" stroke-width="${w + 1.8}" />
      <path d="${d}" stroke="${map.core}" stroke-width="${w}" />
      <path d="${d}" stroke="${map.hot}" stroke-width="${(w * 0.36).toFixed(2)}" />
    </g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 92" role="img" aria-label="THE MEMES.net">
  <rect x="0" y="0" width="92" height="92" rx="20" fill="#07060f" />
  <g transform="translate(14 8)">
${tubeGroups}
  </g>
</svg>
`;
}

// Minimal SVG path parser for M, m, H, V, L, l, Q, C, v
function parsePathPolylines(d, ox, oy) {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)/g) || [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  const polylines = [];
  let current = [];

  const nextNum = () => Number(tokens[i++]);

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i++];
    }
    if (cmd === 'M') {
      if (current.length > 0) polylines.push(current);
      cx = nextNum();
      cy = nextNum();
      current = [[cx + ox, cy + oy]];
      cmd = 'L';
    } else if (cmd === 'H') {
      cx = nextNum();
      current.push([cx + ox, cy + oy]);
    } else if (cmd === 'V') {
      cy = nextNum();
      current.push([cx + ox, cy + oy]);
    } else if (cmd === 'v') {
      cy += nextNum();
      current.push([cx + ox, cy + oy]);
    } else if (cmd === 'L') {
      cx = nextNum();
      cy = nextNum();
      current.push([cx + ox, cy + oy]);
    } else if (cmd === 'l') {
      cx += nextNum();
      cy += nextNum();
      current.push([cx + ox, cy + oy]);
    } else if (cmd === 'Q') {
      const x1 = nextNum(), y1 = nextNum(), x2 = nextNum(), y2 = nextNum();
      const x0 = cx, y0 = cy;
      for (let s = 1; s <= 16; s += 1) {
        const t = s / 16;
        const mt = 1 - t;
        const px = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
        const py = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
        current.push([px + ox, py + oy]);
      }
      cx = x2;
      cy = y2;
    } else if (cmd === 'C') {
      const x1 = nextNum(), y1 = nextNum(), x2 = nextNum(), y2 = nextNum(), x3 = nextNum(), y3 = nextNum();
      const x0 = cx, y0 = cy;
      for (let s = 1; s <= 24; s += 1) {
        const t = s / 24;
        const mt = 1 - t;
        const px = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
        const py = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
        current.push([px + ox, py + oy]);
      }
      cx = x3;
      cy = y3;
    } else {
      i += 1;
    }
  }
  if (current.length > 0) polylines.push(current);
  return polylines;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function distToPolylines(px, py, polylines) {
  let minD = Infinity;
  for (const pts of polylines) {
    if (pts.length === 1) {
      minD = Math.min(minD, Math.hypot(px - pts[0][0], py - pts[0][1]));
      continue;
    }
    for (let k = 0; k < pts.length - 1; k += 1) {
      const d = distToSegment(px, py, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

function blendPixel(buf, idx, r, g, b, alpha) {
  if (alpha <= 0) return;
  const a = Math.min(1, alpha);
  buf[idx] = Math.round(buf[idx] * (1 - a) + r * a);
  buf[idx + 1] = Math.round(buf[idx + 1] * (1 - a) + g * a);
  buf[idx + 2] = Math.round(buf[idx + 2] * (1 - a) + b * a);
}

function addGlowPixel(buf, idx, r, g, b, alpha) {
  if (alpha <= 0) return;
  buf[idx] = Math.min(255, Math.round(buf[idx] + r * alpha));
  buf[idx + 1] = Math.min(255, Math.round(buf[idx + 1] + g * alpha));
  buf[idx + 2] = Math.min(255, Math.round(buf[idx + 2] + b * alpha));
}

function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 3;
      const dst = row + 1 + x * 4;
      raw[dst] = rgb[src];
      raw[dst + 1] = rgb[src + 1];
      raw[dst + 2] = rgb[src + 2];
      raw[dst + 3] = 255;
    }
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (b) => {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i += 1) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function renderTubeIcon(size) {
  const buf = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    buf[i * 3] = COLORS.night0[0];
    buf[i * 3 + 1] = COLORS.night0[1];
    buf[i * 3 + 2] = COLORS.night0[2];
  }

  const scale = size / 92;
  const offsetX = (size - 64 * scale) / 2;
  const offsetY = (size - 76 * scale) / 2;
  const prepared = ICON_TUBES.map(([colour, x, y, w, d]) => ({
    pal: COLORS[colour],
    rCore: (w * scale) / 2,
    rHot: (w * 0.34 * scale) / 2,
    rOff: ((w + 1.6) * scale) / 2,
    glowSigma: Math.max(1.5, 4.5 * scale),
    polys: parsePathPolylines(d, x, y).map((pts) =>
      pts.map(([px, py]) => [px * scale + offsetX, py * scale + offsetY])
    )
  }));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 3;
      // Soft UV radial lift
      const dx = (x - size / 2) / (size * 0.6);
      const dy = (y - size * 0.4) / (size * 0.6);
      const rad = Math.max(0, 1 - (dx * dx + dy * dy));
      addGlowPixel(buf, idx, COLORS.uv[0], COLORS.uv[1], COLORS.uv[2], rad * 0.14);

      for (const t of prepared) {
        const d = distToPolylines(x + 0.5, y + 0.5, t.polys);
        if (d > t.glowSigma * 3) continue;
        const glowA = Math.exp(-(d * d) / (2 * t.glowSigma * t.glowSigma)) * 0.42;
        addGlowPixel(buf, idx, t.pal.core[0], t.pal.core[1], t.pal.core[2], glowA);
        const offA = Math.max(0, Math.min(1, t.rOff + 0.7 - d));
        blendPixel(buf, idx, t.pal.off[0], t.pal.off[1], t.pal.off[2], offA);
        const coreA = Math.max(0, Math.min(1, t.rCore + 0.7 - d));
        blendPixel(buf, idx, t.pal.core[0], t.pal.core[1], t.pal.core[2], coreA);
        const hotA = Math.max(0, Math.min(1, t.rHot + 0.6 - d));
        blendPixel(buf, idx, t.pal.hot[0], t.pal.hot[1], t.pal.hot[2], hotA);
      }
    }
  }
  return encodePng(size, size, buf);
}

function renderOgCard() {
  const W = 1200;
  const H = 630;
  const buf = new Uint8Array(W * H * 3);

  // Night-0 background + UV horizon glow + perspective synthwave grid
  const horizonY = Math.round(H * 0.56);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const idx = (y * W + x) * 3;
      buf[idx] = COLORS.night0[0];
      buf[idx + 1] = COLORS.night0[1];
      buf[idx + 2] = COLORS.night0[2];

      // UV horizon glow
      const gx = (x - W / 2) / 520;
      const gy = (y - horizonY * 0.88) / 240;
      const gRad = Math.max(0, 1 - (gx * gx + gy * gy));
      addGlowPixel(buf, idx, COLORS.uv[0], COLORS.uv[1], COLORS.uv[2], gRad * gRad * 0.25);

      // Perspective grid below horizon
      if (y > horizonY) {
        const depth = (y - horizonY) / (H - horizonY);
        const z = 1 / (depth + 0.08);
        const worldX = ((x - W / 2) / W) * z * 2.2;
        const gxLine = Math.abs((worldX * 5) - Math.round(worldX * 5)) < 0.035;
        const gzLine = Math.abs((z * 2.2) - Math.round(z * 2.2)) < 0.045;
        if (gxLine || gzLine) {
          const fade = Math.min(1, depth * 1.4) * 0.18;
          addGlowPixel(buf, idx, COLORS.cyan.core[0], COLORS.cyan.core[1], COLORS.cyan.core[2], fade);
        }
      }
    }
  }

  // Centered hero NeonSign (298x126 -> scaled 3.1x)
  const scale = 3.1;
  const signW = 298 * scale;
  const signH = 126 * scale;
  const ox = (W - signW) / 2;
  const oy = (H - signH) / 2 - 14;

  const prepared = SIGN_TUBES.map(([colour, x, y, w, d]) => {
    const polys = parsePathPolylines(d, x, y).map((pts) =>
      pts.map(([px, py]) => [px * scale + ox, py * scale + oy])
    );
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pts of polys) {
      for (const [px, py] of pts) {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }
    const glowSigma = w * 1.15 * scale;
    const pad = glowSigma * 3.2;
    return {
      pal: COLORS[colour],
      rCore: (w * scale) / 2,
      rHot: (w * 0.34 * scale) / 2,
      rOff: ((w + 1.5) * scale) / 2,
      glowSigma,
      minX: Math.max(0, Math.floor(minX - pad)),
      minY: Math.max(0, Math.floor(minY - pad)),
      maxX: Math.min(W - 1, Math.ceil(maxX + pad)),
      maxY: Math.min(H - 1, Math.ceil(maxY + pad)),
      polys
    };
  });

  for (const t of prepared) {
    for (let y = t.minY; y <= t.maxY; y += 1) {
      for (let x = t.minX; x <= t.maxX; x += 1) {
        const d = distToPolylines(x + 0.5, y + 0.5, t.polys);
        if (d > t.glowSigma * 3) continue;
        const idx = (y * W + x) * 3;
        const glowA = Math.exp(-(d * d) / (2 * t.glowSigma * t.glowSigma)) * 0.38;
        addGlowPixel(buf, idx, t.pal.core[0], t.pal.core[1], t.pal.core[2], glowA);
        const offA = Math.max(0, Math.min(1, t.rOff + 0.7 - d));
        blendPixel(buf, idx, t.pal.off[0], t.pal.off[1], t.pal.off[2], offA);
        const coreA = Math.max(0, Math.min(1, t.rCore + 0.7 - d));
        blendPixel(buf, idx, t.pal.core[0], t.pal.core[1], t.pal.core[2], coreA);
        const hotA = Math.max(0, Math.min(1, t.rHot + 0.6 - d));
        blendPixel(buf, idx, t.pal.hot[0], t.pal.hot[1], t.pal.hot[2], hotA);
      }
    }
  }

  return encodePng(W, H, buf);
}

function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(entries.length * 16);
  let offset = header.length + dir.length;
  const images = [];

  for (let i = 0; i < entries.length; i += 1) {
    const { size, png } = entries[i];
    const base = i * 16;
    dir[base] = size >= 256 ? 0 : size;
    dir[base + 1] = size >= 256 ? 0 : size;
    dir[base + 2] = 0;
    dir[base + 3] = 0;
    dir.writeUInt16LE(1, base + 4);
    dir.writeUInt16LE(32, base + 6);
    dir.writeUInt32LE(png.length, base + 8);
    dir.writeUInt32LE(offset, base + 12);
    offset += png.length;
    images.push(png);
  }

  return Buffer.concat([header, dir, ...images]);
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), buildFaviconSvg(), 'utf8');
console.log('Wrote public/favicon.svg');

const iconPngBySize = new Map();
for (const size of [16, 32, 48, 180, 192, 512]) {
  iconPngBySize.set(size, renderTubeIcon(size));
}

fs.writeFileSync(
  path.join(PUBLIC_DIR, 'favicon.ico'),
  encodeIco([
    { size: 16, png: iconPngBySize.get(16) },
    { size: 32, png: iconPngBySize.get(32) },
    { size: 48, png: iconPngBySize.get(48) }
  ])
);
console.log('Wrote public/favicon.ico');

for (const [name, sz] of [
  ['favicon-48.png', 48],
  ['apple-touch-icon.png', 180],
  ['favicon-192.png', 192],
  ['logo-512.png', 512]
]) {
  fs.writeFileSync(path.join(PUBLIC_DIR, name), iconPngBySize.get(sz));
  console.log(`Wrote public/${name}`);
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'og-card.png'), renderOgCard());
console.log('Wrote public/og-card.png');
