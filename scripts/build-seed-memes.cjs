// Builds the 64 starter-feed memes (public/seed/seed-<cat>-<nn>.webp) from the
// AI battle pictures (public/seed/battle-*.webp, batch B002) plus the captions in
// scripts/seed-captions.json. Every image carries a visible "AI-generated image"
// tag (D-003 C5) and the thememes.net footer.
// Run: node scripts/build-seed-memes.cjs [tech-01]   (needs Playwright + Chromium;
// set CHROME_PATH to use a system Chromium)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const W = 1080;
const H = 960;
const QUALITY = 0.8;

const captions = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/seed-captions.json'), 'utf8'));
const font = (f) => fs.readFileSync(path.join(ROOT, 'public/fonts', f)).toString('base64');
const fonts = {
  caption: font('oxanium-latin-wght.woff2'),
  pixel: font('press-start-2p-latin-400.woff2')
};

async function main() {
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
  );
  const page = await browser.newPage();
  await page.setContent('<html><body style="margin:0;background:#000"></body></html>');
  await page.evaluate(async ({ fonts }) => {
    const toBuf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
    const cap = new FontFace('TmCaption', toBuf(fonts.caption), { weight: '200 800' });
    const pix = new FontFace('TmPixel', toBuf(fonts.pixel));
    document.fonts.add(await cap.load());
    document.fonts.add(await pix.load());
  }, { fonts });

  const only = process.argv[2];
  for (const [key, [pic, top, bottom]] of Object.entries(captions)) {
    if (only && key !== only) continue;
    const [cat] = key.split('-');
    const picB64 = fs.readFileSync(path.join(ROOT, `public/seed/battle-${pic}.webp`)).toString('base64');
    const dataUrl = await page.evaluate(
      async ({ picB64, top, bottom, cat, panel, W, H, QUALITY }) => {
        const img = new Image();
        img.src = `data:image/webp;base64,${picB64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        // cover-fit the picture
        const s = Math.max(W / img.width, H / img.height);
        ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);

        const FOOT = 64;
        // readability scrims
        if (!panel) {
        let g = ctx.createLinearGradient(0, 0, 0, 260);
        g.addColorStop(0, 'rgba(7,6,15,0.72)');
        g.addColorStop(1, 'rgba(7,6,15,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, 260);
        g = ctx.createLinearGradient(0, H - FOOT - 280, 0, H - FOOT);
        g.addColorStop(0, 'rgba(7,6,15,0)');
        g.addColorStop(1, 'rgba(7,6,15,0.78)');
        ctx.fillStyle = g;
        ctx.fillRect(0, H - FOOT - 280, W, 280);
        }

        const wrap = (text, size) => {
          ctx.font = `800 ${size}px TmCaption`;
          const words = text.split(' ');
          const lines = [];
          let line = '';
          for (const w of words) {
            const t = line ? `${line} ${w}` : w;
            if (ctx.measureText(t).width > maxW && line) {
              lines.push(line);
              line = w;
            } else line = t;
          }
          if (line) lines.push(line);
          return lines;
        };
        // Two lines are split where their widths are closest, so no word is left alone.
        const balance = (lines) => {
          if (lines.length !== 2) return lines;
          const words = lines.join(' ').split(' ');
          let best = lines;
          let bestDiff = Infinity;
          for (let i = 1; i < words.length; i++) {
            const a = words.slice(0, i).join(' ');
            const b = words.slice(i).join(' ');
            const wa = ctx.measureText(a).width;
            const wb = ctx.measureText(b).width;
            if (Math.max(wa, wb) > maxW) continue;
            if (Math.abs(wa - wb) < bestDiff) {
              bestDiff = Math.abs(wa - wb);
              best = [a, b];
            }
          }
          return best;
        };
        let maxW = W - 96;
        const fit = (text, big = 66, small = 38) => {
          for (let size = big; size >= small; size -= 2) {
            const lines = wrap(text, size);
            if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxW)) return { size, lines: balance(lines) };
          }
          return { size: small, lines: wrap(text, small) };
        };
        const draw = (text, anchorY, fromBottom) => {
          const { size, lines } = fit(text);
          ctx.font = `800 ${size}px TmCaption`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.lineJoin = 'round';
          const lh = size * 1.12;
          const startY = fromBottom ? anchorY - (lines.length - 1) * lh : anchorY + size;
          lines.forEach((l, i) => {
            const y = startY + i * lh;
            ctx.lineWidth = Math.round(size * 0.2);
            ctx.strokeStyle = '#07060f';
            ctx.strokeText(l, W / 2, y);
            ctx.shadowColor = 'rgba(25,240,255,0.55)';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(l, W / 2, y);
            ctx.shadowBlur = 0;
          });
        };
        if (panel) {
          // Two-panel picture: captions go in the empty right-hand panels.
          maxW = W / 2 - 80;
          const panelText = (text, cy) => {
            const { size, lines } = fit(text, 52, 30);
            ctx.font = `800 ${size}px TmCaption`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#07060f';
            const lh = size * 1.12;
            lines.forEach((l, i) => ctx.fillText(l, W * 0.75, cy + (i - (lines.length - 1) / 2) * lh));
          };
          panelText(top, (H - FOOT) * 0.25);
          panelText(bottom, (H - FOOT) * 0.75);
        } else {
          draw(top, 30, false);
          draw(bottom, H - FOOT - 34, true);
        }

        // footer strip
        ctx.fillStyle = '#07060f';
        ctx.fillRect(0, H - FOOT, W, FOOT);
        ctx.fillStyle = '#19f0ff';
        ctx.fillRect(0, H - FOOT, W, 3);
        ctx.font = '20px TmPixel';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#19f0ff';
        ctx.fillText(`THEMEMES.NET  @THEMEMESHQ  #${cat.toUpperCase()}`, 28, H - FOOT / 2 + 2);
        // AI label pill (D-003 C5)
        ctx.font = '600 22px TmCaption';
        const label = 'AI-generated image';
        const lw = ctx.measureText(label).width + 28;
        const lx = W - 24 - lw;
        const ly = H - FOOT / 2 - 17;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeStyle = 'rgba(226,253,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, 34, 17);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e2fdff';
        ctx.textAlign = 'center';
        ctx.fillText(label, lx + lw / 2, H - FOOT / 2 + 1);

        return c.toDataURL('image/webp', QUALITY);
      },
      { picB64, top, bottom, cat, panel: pic === 'otter-nope-yes', W, H, QUALITY }
    );
    const out = path.join(ROOT, `public/seed/seed-${key}.webp`);
    fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
