// Unit tests for rate limits & Cloudflare Turnstile helper (Phase 33 task 33.7).
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RATE_LIMIT_TIERS,
  BOT_ERROR_MESSAGES,
  formatRateLimitMessage,
  extractClientIp,
  ipHashFor,
  verifyTurnstile
} from '../../supabase/functions/_shared/rateLimitAndBot.js';

test('RATE_LIMIT_TIERS sets stricter quotas on standard than linked accounts', () => {
  const std = RATE_LIMIT_TIERS.standard;
  const lnk = RATE_LIMIT_TIERS.linked;

  assert.equal(std.upload[0].max, 5);
  assert.equal(std.upload[0].windowSeconds, 3600);
  assert.equal(std.upload[1].max, 20);
  assert.equal(std.upload[1].windowSeconds, 86400);

  assert.equal(std.comment[0].max, 1);
  assert.equal(std.comment[0].windowSeconds, 10);
  assert.equal(std.comment[1].max, 60);

  assert.equal(std.vote[0].max, 120);
  assert.equal(std.report[1].max, 20);

  assert.ok(lnk.upload[0].max > std.upload[0].max);
  assert.ok(lnk.comment[1].max > std.comment[1].max);
  assert.ok(lnk.vote[0].max > std.vote[0].max);
  assert.ok(lnk.report[1].max > std.report[1].max);
});

test('formatRateLimitMessage formats seconds, minutes, and hours in arcade voice', () => {
  assert.equal(formatRateLimitMessage(0), '⏳ Cool your jets, speed racer. Try again in 1 sec.');
  assert.equal(formatRateLimitMessage(9), '⏳ Cool your jets, speed racer. Try again in 9 sec.');
  assert.equal(formatRateLimitMessage(60), '⏳ Cool your jets, speed racer. Try again in 1 min.');
  assert.equal(formatRateLimitMessage(215), '⏳ Cool your jets, speed racer. Try again in 4 min.');
  assert.equal(formatRateLimitMessage(3600), '⏳ Cool your jets, speed racer. Try again in 1 hr.');
  assert.equal(formatRateLimitMessage(7200), '⏳ Cool your jets, speed racer. Try again in 2 hr.');
});

test('extractClientIp and ipHashFor handle proxy headers deterministically without exposing raw IP', async () => {
  assert.equal(extractClientIp(null), null);
  assert.equal(extractClientIp({}), null);
  assert.equal(
    extractClientIp({
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.1, 198.51.100.2'
    }),
    '203.0.113.9'
  );
  assert.equal(
    extractClientIp(new Headers({ 'x-forwarded-for': ' 198.51.100.5 , 10.0.0.1 ' })),
    '198.51.100.5'
  );
  assert.equal(extractClientIp(new Headers({ 'x-real-ip': '192.0.2.44' })), '192.0.2.44');

  const h1 = await ipHashFor(new Headers({ 'x-real-ip': '192.0.2.44' }));
  const h2 = await ipHashFor({ headers: new Headers({ 'x-forwarded-for': '192.0.2.44' }) });
  const hOther = await ipHashFor(new Headers({ 'x-real-ip': '192.0.2.45' }));

  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.equal(h1, h2);
  assert.notEqual(h1, hOther);
  assert.equal(await ipHashFor(new Headers()), null);
});

test('verifyTurnstile passes when unconfigured, validates token when configured, and fails closed on errors', async () => {
  const unconfigured = await verifyTurnstile({ token: '', env: {} });
  assert.deepEqual(unconfigured, { ok: true, mode: 'unconfigured' });

  const env = { get: (k) => (k === 'TURNSTILE_SECRET_KEY' ? 'test-secret' : undefined) };

  const missing = await verifyTurnstile({ token: '', env });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, 'bot_check_required');
  assert.ok(BOT_ERROR_MESSAGES[missing.error]);

  let sentBody = '';
  const valid = await verifyTurnstile({
    token: 'tok-ok',
    remoteIp: '203.0.113.9',
    env,
    fetchImpl: async (_url, init) => {
      sentBody = init.body;
      return { ok: true, json: async () => ({ success: true }) };
    }
  });
  assert.deepEqual(valid, { ok: true, mode: 'verified' });
  assert.match(sentBody, /secret=test-secret/);
  assert.match(sentBody, /response=tok-ok/);
  assert.match(sentBody, /remoteip=203\.0\.113\.9/);

  const invalid = await verifyTurnstile({
    token: 'tok-bad',
    env,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] })
    })
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, 'bot_check_failed');
  assert.deepEqual(invalid.codes, ['invalid-input-response']);

  const outage = await verifyTurnstile({
    token: 'tok-ok',
    env,
    fetchImpl: async () => ({ ok: false, status: 500 })
  });
  assert.equal(outage.ok, false);
  assert.equal(outage.error, 'bot_check_unavailable');

  const threw = await verifyTurnstile({
    token: 'tok-ok',
    env,
    fetchImpl: async () => {
      throw new Error('network down');
    }
  });
  assert.equal(threw.ok, false);
  assert.equal(threw.error, 'bot_check_unavailable');
});
