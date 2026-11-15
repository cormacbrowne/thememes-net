// Unit tests for Phase 33 task 33.10 — Own-storage media allow-list & strict CSP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeMediaUrl,
  isAllowedMediaUrl,
  OWN_MEDIA_STORAGE_PREFIX
} from '../../src/utils/securityGuard.js';
import { toAbsoluteUrl } from '../../api/meme-og.js';
import { DEFAULT_OG_IMAGE, SITE_ORIGIN } from '../../src/data/seoRoutes.js';

function extractDirective(csp, name) {
  const match = csp.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]+)`, 'i'));
  return match ? match[1].trim() : '';
}

test('33.10: sanitizeMediaUrl allows only own Supabase memes storage, /seed/, blob:, and safe raster data:', () => {
  const ownImg = `${OWN_MEDIA_STORAGE_PREFIX}u/123.webp`;
  assert.equal(sanitizeMediaUrl(ownImg), ownImg);
  assert.equal(sanitizeMediaUrl('/seed/seed-tech-01.webp'), '/seed/seed-tech-01.webp');
  assert.equal(sanitizeMediaUrl(`${SITE_ORIGIN}/seed/tpl-drake-compare.webp`), `${SITE_ORIGIN}/seed/tpl-drake-compare.webp`);
  assert.equal(sanitizeMediaUrl('blob:https://www.thememes.net/abc-123'), 'blob:https://www.thememes.net/abc-123');
  assert.equal(sanitizeMediaUrl('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');

  assert.equal(sanitizeMediaUrl('https://evil.example.com/meme.png'), '');
  assert.equal(sanitizeMediaUrl('https://i.imgflip.com/1bij.jpg', 'fallback'), 'fallback');
  assert.equal(sanitizeMediaUrl('https://otherproject.supabase.co/storage/v1/object/public/memes/a.webp'), '');
  assert.equal(sanitizeMediaUrl('/seed/../secret.png'), '');
  assert.equal(sanitizeMediaUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeMediaUrl('data:image/svg+xml;base64,PHN2Zz4='), '');
  assert.equal(isAllowedMediaUrl('https://images.unsplash.com/photo-1'), false);
});

test('33.10: api/meme-og toAbsoluteUrl enforces same storage & /seed/ allow-list', () => {
  const ownImg = `${OWN_MEDIA_STORAGE_PREFIX}u/og-test.webp`;
  assert.equal(toAbsoluteUrl(ownImg), ownImg);
  assert.equal(toAbsoluteUrl('/seed/seed-dank-01.webp'), `${SITE_ORIGIN}/seed/seed-dank-01.webp`);
  assert.equal(toAbsoluteUrl(`${SITE_ORIGIN}/seed/seed-dank-01.webp`), `${SITE_ORIGIN}/seed/seed-dank-01.webp`);

  assert.equal(toAbsoluteUrl('https://evil.example.com/phish.png'), DEFAULT_OG_IMAGE);
  assert.equal(toAbsoluteUrl('https://other.supabase.co/storage/v1/object/public/memes/x.png'), DEFAULT_OG_IMAGE);
  assert.equal(toAbsoluteUrl('/other/path.png'), DEFAULT_OG_IMAGE);
  assert.equal(toAbsoluteUrl('/seed/../etc/passwd'), DEFAULT_OG_IMAGE);
  assert.equal(toAbsoluteUrl('javascript:alert(1)'), DEFAULT_OG_IMAGE);
});

test('33.10: index.html and vercel.json tighten img-src, media-src, connect-src, and script-src', () => {
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const metaMatch = indexHtml.match(/http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/i);
  assert.ok(metaMatch, 'index.html should have a CSP meta tag');

  const vercelJson = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
  const cspHeader = vercelJson.headers?.[0]?.headers?.find((h) => h.key === 'Content-Security-Policy')?.value;
  assert.ok(cspHeader, 'vercel.json should have a Content-Security-Policy header');

  for (const [label, csp] of [
    ['index.html', metaMatch[1]],
    ['vercel.json', cspHeader]
  ]) {
    const scriptSrc = extractDirective(csp, 'script-src');
    const imgSrc = extractDirective(csp, 'img-src');
    const mediaSrc = extractDirective(csp, 'media-src');
    const connectSrc = extractDirective(csp, 'connect-src');

    assert.doesNotMatch(scriptSrc, /unsafe-inline/, `${label} script-src should not allow unsafe-inline`);
    assert.match(scriptSrc, /challenges\.cloudflare\.com/, `${label} script-src allows Turnstile`);
    assert.doesNotMatch(imgSrc, /(^|\s)https:(\s|$)/, `${label} img-src must not allow arbitrary https:`);
    assert.match(imgSrc, /otvvphmjojqyjaznjzyo\.supabase\.co/, `${label} img-src allows own Supabase storage`);
    assert.doesNotMatch(mediaSrc, /(^|\s)https:(\s|$)/, `${label} media-src must not allow arbitrary https:`);
    assert.match(mediaSrc, /otvvphmjojqyjaznjzyo\.supabase\.co/, `${label} media-src allows own Supabase storage`);
    assert.doesNotMatch(connectSrc, /imgflip\.com|unsplash\.com/, `${label} connect-src removes unused third parties`);
  }
});
