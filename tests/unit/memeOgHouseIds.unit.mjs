// /m/seed-* and /m/tpl-*: only real house pages exist. Unknown ids are 404s, never invented pages.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/meme-og.js';
import { STARTER_MEMES, STUDIO_TEMPLATES } from '../../src/data/starterMemes.js';

const realFetch = globalThis.fetch;
let fetchCalls = 0;

beforeEach(() => {
  fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('house ids must not reach the network');
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function visit(id) {
  const headers = {};
  const res = {
    statusCode: 0,
    body: '',
    setHeader: (k, v) => {
      headers[k.toLowerCase()] = v;
    },
    end(html) {
      this.body = html;
    }
  };
  await handler({ query: { id } }, res);
  return { status: res.statusCode, html: res.body, headers };
}

test('unknown seed and template ids return 404 noindex without a database call', async () => {
  for (const id of ['seed-invented-page', 'seed-dank-99', 'tpl-sad-keanu', 'TPL-drake-compare']) {
    const page = await visit(id);
    assert.equal(page.status, 404, id);
    assert.equal(page.headers['x-robots-tag'], 'noindex', id);
    assert.doesNotMatch(page.html, /data-meme-id=/, id);
    assert.match(page.html, /<title>Page not found/, id);
  }
  assert.equal(fetchCalls, 0);
});

test('every studio template page is noindex with a neutral title', async () => {
  for (const { id } of STUDIO_TEMPLATES) {
    const page = await visit(id);
    assert.equal(page.status, 200, id);
    assert.equal(page.headers['x-robots-tag'], 'noindex', id);
    assert.match(page.html, /<meta name="robots" content="noindex" \/>/, id);
    assert.doesNotMatch(page.html, /index, follow/, id);
    assert.doesNotMatch(page.html, /id="tm-dynamic-jsonld"/, id);
    const title = page.html.match(/<title>([\s\S]*?)<\/title>/i)[1];
    assert.match(title, /meme template/, id);
    assert.doesNotMatch(title, /drake|spider|stonks|gigachad|this is fine|change my mind|woman|galaxy brain/i, id);
  }
  assert.equal(fetchCalls, 0);
});

test('a real starter meme still renders as an indexable page', async () => {
  const page = await visit(STARTER_MEMES[0].id);
  assert.equal(page.status, 200);
  assert.equal(page.headers['x-robots-tag'], undefined);
  assert.match(page.html, /id="tm-dynamic-jsonld"/);
});
