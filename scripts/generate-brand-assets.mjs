import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildChromeFaviconSvg, buildChromeSignSvg } from '../src/components/chromeBrandSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const FONTS_DIR = path.join(PUBLIC_DIR, 'fonts');

function fontDataUri(fileName) {
  const buf = fs.readFileSync(path.join(FONTS_DIR, fileName));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
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

async function launchBrowser() {
  for (const opts of [
    { headless: true },
    { headless: true, channel: 'chrome' },
    { headless: true, channel: 'msedge' }
  ]) {
    try {
      return await chromium.launch(opts);
    } catch {
      // Try next available Chromium channel
    }
  }
  throw new Error('No Chromium, Chrome, or Edge browser executable available for Playwright.');
}

async function renderIconPng(page, size) {
  await page.setViewportSize({ width: size, height: size });
  const svg = buildChromeFaviconSvg({
    uid: `tmr${size}`,
    rounded: false,
    includeFrame: false,
    boostTinyStroke: size <= 32
  });
  await page.setContent(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>*{margin:0;padding:0}html,body{width:100%;height:100%;overflow:hidden;background:#07060f}svg{display:block;width:100%;height:100%}</style></head><body>${svg}</body></html>`,
    { waitUntil: 'load' }
  );
  return page.screenshot({ type: 'png' });
}

async function renderOgCardPng(page) {
  const orbitronUri = fontDataUri('orbitron-latin-wght.woff2');
  const oxaniumUri = fontDataUri('oxanium-latin-wght.woff2');
  const signSvg = buildChromeSignSvg({ uid: 'tmog', showFlow: false });

  await page.setViewportSize({ width: 1200, height: 630 });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Orbitron';
    font-style: normal;
    font-weight: 400 900;
    src: url('${orbitronUri}') format('woff2');
  }
  @font-face {
    font-family: 'Oxanium';
    font-style: normal;
    font-weight: 200 800;
    src: url('${oxaniumUri}') format('woff2');
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: #07060f;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sky {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 64% 58% at 50% 44%, rgba(138, 61, 255, 0.28), transparent 72%),
      radial-gradient(ellipse 46% 36% at 50% 42%, rgba(255, 46, 136, 0.16), transparent 74%),
      linear-gradient(180deg, #07060f 0%, #120d26 56%, #07060f 100%);
  }
  .sun {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 440px;
    height: 440px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: linear-gradient(180deg, #ffb800 0%, #ff2e88 55%, #8a3dff 100%);
    opacity: 0.24;
    -webkit-mask-image: repeating-linear-gradient(180deg, #000 0 14px, transparent 14px 21px);
    mask-image: repeating-linear-gradient(180deg, #000 0 14px, transparent 14px 21px);
  }
  .grid-floor {
    position: absolute;
    left: -140px;
    right: -140px;
    bottom: -8px;
    height: 225px;
    background-image:
      linear-gradient(rgba(255, 46, 136, 0.34) 2px, transparent 2px),
      linear-gradient(90deg, rgba(25, 240, 255, 0.26) 2px, transparent 2px);
    background-size: 62px 34px;
    transform: perspective(300px) rotateX(62deg);
    transform-origin: bottom center;
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 55%, #000 100%);
    mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 55%, #000 100%);
  }
  .logo-wrap {
    position: relative;
    z-index: 2;
    width: 900px;
    transform: translateY(-16px);
    filter: drop-shadow(0 0 32px rgba(255, 46, 136, 0.32));
  }
  .logo-wrap svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .scanlines {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px);
    pointer-events: none;
  }
</style>
</head>
<body>
  <div class="sky"></div>
  <div class="sun"></div>
  <div class="grid-floor"></div>
  <div class="logo-wrap">${signSvg}</div>
  <div class="scanlines"></div>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ type: 'png' });
}

async function main() {
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'favicon.svg'),
    buildChromeFaviconSvg({ uid: 'tmf', rounded: true, includeFrame: true }),
    'utf8'
  );
  console.log('Wrote public/favicon.svg');

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

    const iconPngBySize = new Map();
    for (const size of [16, 32, 48, 180, 192, 512]) {
      iconPngBySize.set(size, await renderIconPng(page, size));
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

    fs.writeFileSync(path.join(PUBLIC_DIR, 'og-card.png'), await renderOgCardPng(page));
    console.log('Wrote public/og-card.png');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
