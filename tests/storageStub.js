// Keeps Playwright runs from downloading real files from live Supabase Storage.
//
// Why: on 26 Nov 2026 about 60% of a day's Supabase "cached egress" came from
// headless test and screenshot runs pulling user videos (one was 8.6 MB) from
// the live bucket, which pushed the Free plan past its 5 GB monthly limit.
//
// Every spec imports `test` from here instead of '@playwright/test'. The auto
// fixture answers any /storage/v1/object/ request with a tiny placeholder.
// Set PW_REAL_STORAGE=1 to let real files through for a one-off check.
//
// Ad-hoc screenshot scripts can call `blockStorage(page)` (or a context).
import { test as base, expect } from '@playwright/test';

const STORAGE_GLOB = '**/storage/v1/{object,render}/**';

// 1x1 transparent GIF: every browser decodes it as an image of any type.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function blockStorage(target) {
  if (process.env.PW_REAL_STORAGE === '1') return;
  await target.route(STORAGE_GLOB, (route) => {
    const req = route.request();
    if (req.method() !== 'GET' && req.method() !== 'HEAD') return route.fallback();
    const path = new URL(req.url()).pathname.toLowerCase();
    // Real Supabase sends ACAO *; canvas code loads images with crossOrigin.
    const headers = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' };
    if (/\.(mp4|webm|mov|m4v|mp3|ogg|oga|wav|m4a|aac)$/.test(path)) {
      // Empty body: the <video>/<audio> fails to load and the poster/fallback shows.
      return route.fulfill({ status: 404, contentType: 'text/plain', headers, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'image/gif',
      headers,
      body: PIXEL
    });
  });
}

export const test = base.extend({
  stubStorage: [
    async ({ context }, use) => {
      await blockStorage(context);
      await use();
    },
    { auto: true }
  ]
});

export { expect };
