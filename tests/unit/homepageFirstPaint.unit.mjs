// Plan 1.3 — the homepage's logo, MEMES / PLAY doors and quick links are in the static HTML
// (first paint, no JavaScript), and heavy below-the-fold code stays out of the main bundle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('prerendered home portal has the sign, both doors and the quick links as real links', () => {
  const src = read('scripts/prerender-seo.mjs');
  const start = src.indexOf('function homePortalHtml()');
  assert.ok(start > 0, 'homePortalHtml() missing');
  const fn = src.slice(start, src.indexOf('\n}\n', start));
  assert.match(fn, /buildChromeSignSvg/);
  assert.match(fn, /class="tm-boot-door is-memes" href="\//);
  assert.match(fn, /class="tm-boot-door is-play" href="\/games"/);
  for (const href of ['/meme-generator', '/hall-of-fame', '/prank-screens']) {
    assert.ok(fn.includes(`href="${href}"`), `quick link ${href} missing`);
  }
  // The sun/grid fade in behind the content, and reduced motion is respected.
  assert.match(fn, /tmBootSkyIn/);
  assert.match(fn, /prefers-reduced-motion:reduce/);
  assert.match(src, /route\.path === '\/' \? homePortalHtml\(\) : bootSplashHtml\(\)/);
});

test('below-the-fold components are lazy-loaded, not in the main bundle', () => {
  const app = read('src/App.jsx');
  for (const name of ['WinCelebrationOverlay', 'DeLoreanTimeMachine', 'SeoDiscoveryFooter']) {
    assert.doesNotMatch(app, new RegExp(`^import .*'./components/${name}'`, 'm'), `${name} is statically imported`);
    assert.match(app, new RegExp(`import\\('./components/${name}'\\)`), `${name} is not lazy-loaded`);
  }
});

test('long SEO intro copy is not imported by the app bundle', () => {
  const routes = read('src/data/seoRoutes.js');
  assert.doesNotMatch(routes, /introParagraphs/);
  const srcFiles = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter((f) => /\.(js|jsx)$/.test(f));
  for (const f of srcFiles) {
    if (f.replace(/\\/g, '/') === 'data/seoRouteCopy.js') continue;
    assert.doesNotMatch(read(path.join('src', f)), /seoRouteCopy/, `src/${f} imports seoRouteCopy`);
  }
});
