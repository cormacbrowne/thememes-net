import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INDEXNOW_KEY,
  buildIndexNowPayload,
  memeUrl,
  submitIndexNow
} from '../../supabase/functions/_shared/indexNow.js';

test('key file in public/ matches the key', () => {
  const body = readFileSync(new URL(`../../public/${INDEXNOW_KEY}.txt`, import.meta.url), 'utf8');
  assert.equal(body.trim(), INDEXNOW_KEY);
});

test('payload keeps only our host and dedupes', () => {
  const p = buildIndexNowPayload([memeUrl('abc'), memeUrl('abc'), 'https://evil.example/x', 'nonsense']);
  assert.deepEqual(p.urlList, ['https://www.thememes.net/m/abc']);
  assert.equal(p.host, 'www.thememes.net');
  assert.equal(p.keyLocation, `https://www.thememes.net/${INDEXNOW_KEY}.txt`);
});

test('submit posts JSON and treats 202 as accepted; never throws', async () => {
  let seen;
  const ok = await submitIndexNow([memeUrl('1')], async (url, init) => {
    seen = { url, body: JSON.parse(init.body) };
    return { status: 202 };
  });
  assert.equal(ok.ok, true);
  assert.equal(seen.url, 'https://api.indexnow.org/indexnow');
  assert.equal(seen.body.key, INDEXNOW_KEY);

  const boom = await submitIndexNow([memeUrl('1')], async () => {
    throw new Error('network');
  });
  assert.deepEqual(boom, { ok: false, status: 0 });
  assert.deepEqual(await submitIndexNow([]), { ok: false, status: 0 });
});
