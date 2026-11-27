// Keeps Playwright runs from downloading real files from live Supabase Storage.
//
// Why: on 26 Nov 2026 about 60% of a day's Supabase "cached egress" came from
// headless test and screenshot runs pulling user videos (one was 8.6 MB) from
// the live bucket, which pushed the Free plan past its 5 GB monthly limit.
//
// Every spec imports `test` from here instead of '@playwright/test'. The auto
// fixture answers any /storage/v1/object/ request with a tiny placeholder, and
// keeps tests off live sign-up and the live hot feed (isolateSupabase below).
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

const JSON_HEADERS = { 'access-control-allow-origin': '*' };

// Keeps tests from writing to the live project (T-016, 27 Nov 2026): test runs
// created 21 real anonymous accounts in one day and hit the sign-up rate limit.
// Default fakes, registered on the context so a spec's own page.route wins:
//  - anonymous sign-up returns a fake session. Any write a test forgets to fake
//    then carries a fake token, which the live server rejects.
//  - Realtime websockets are answered locally (presence, broadcasts never go live).
//  - get_hot_feed answers "function not found", so the feed falls back to the
//    memes_feed_view query that the specs fake (see feedPagination.js).
// Set PW_LIVE_SUPABASE=1 to skip these for a one-off check against live data.
export async function isolateSupabase(target) {
  if (process.env.PW_LIVE_SUPABASE === '1') return;
  await target.route('**/auth/v1/signup*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        access_token: 'fixture-anon-jwt',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fixture-refresh',
        user: {
          id: '00000000-0000-4000-8000-00000000f100',
          is_anonymous: true,
          aud: 'authenticated',
          role: 'authenticated'
        }
      })
    })
  );
  await target.route('**/rest/v1/rpc/get_hot_feed*', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        code: 'PGRST202',
        message: 'Faked as missing by tests/storageStub.js; feed falls back to memes_feed_view'
      })
    })
  );
  // Realtime is a websocket, which page.route never sees. Without this, parallel test browsers
  // joined live presence together and the "people here now" pill counted them (T-016).
  // Join and heartbeat messages get an "ok" reply locally; nothing reaches the live server.
  await target.routeWebSocket('**/realtime/v1/**', (ws) => {
    ws.onMessage((raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      // realtime-js speaks Phoenix v1 objects or v2 arrays: [join_ref, ref, topic, event, payload]
      const isArray = Array.isArray(msg);
      const event = isArray ? msg[3] : msg?.event;
      if (event !== 'phx_join' && event !== 'heartbeat') return;
      const reply = { status: 'ok', response: {} };
      ws.send(
        JSON.stringify(
          isArray
            ? [msg[0], msg[1], msg[2], 'phx_reply', reply]
            : { topic: msg.topic, event: 'phx_reply', payload: reply, ref: msg.ref, join_ref: msg.join_ref }
        )
      );
    });
  });
}

export const test = base.extend({
  stubStorage: [
    async ({ context }, use) => {
      await blockStorage(context);
      await isolateSupabase(context);
      await use();
    },
    { auto: true }
  ]
});

export { expect };
