// Unit tests for image moderation (Phase 33 task 33.3).
// No real images and no network: provider replies are synthetic JSON fixtures shaped like the
// providers' documented responses, and fetch is mocked. Run: npm run test:unit
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as Magick from '@imagemagick/magick-wasm';
import { moderateImage, scoresToVerdict, ADAPTERS } from '../../supabase/functions/_shared/moderation.js';
import { IMAGE_MODERATION } from '../../supabase/functions/_shared/moderationConfig.js';
import { transcodeImage } from '../../supabase/functions/_shared/imageCodec.js';
import { decideStatus } from '../../supabase/functions/_shared/publishCore.js';

const require = createRequire(import.meta.url);
before(async () => {
  await Magick.initializeImageMagick(fs.readFileSync(require.resolve('@imagemagick/magick-wasm/magick.wasm')));
});

const env = (vars) => ({ get: (k) => vars[k] });
const SAMPLE = [{ data: new Uint8Array([1, 2, 3]), contentType: 'image/webp' }];
const SE_ENV = env({ IMAGE_MODERATION_PROVIDER: 'sightengine', SIGHTENGINE_API_USER: 'u', SIGHTENGINE_API_SECRET: 's' });
const OA_ENV = env({ IMAGE_MODERATION_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' });

// --- Synthetic provider replies -------------------------------------------------------
const seClean = {
  status: 'success',
  nudity: { sexual_activity: 0.001, sexual_display: 0.001, erotica: 0.002, very_suggestive: 0.01, none: 0.98 },
  gore: { prob: 0.01 },
  offensive: { nazi: 0.001, confederate: 0.001, supremacist: 0.001, terrorist: 0.001, middle_finger: 0.95 },
  'self-harm': { prob: 0.01 },
  recreational_drug: { prob: 0.02 },
  weapon: { firearm_action: { aiming_threat: 0.01 } }
};
const se = (patch) => ({ ...seClean, ...patch });
const oaReply = (scores) => ({
  results: [{ flagged: false, category_scores: { sexual: 0.001, 'sexual/minors': 0, violence: 0.01, 'violence/graphic': 0.01, 'self-harm': 0.001, ...scores } }]
});

function mockFetch(replies) {
  const calls = [];
  let i = 0;
  const fn = async (url, init) => {
    calls.push({ url, init });
    const r = Array.isArray(replies) ? replies[Math.min(i++, replies.length - 1)] : replies;
    if (r instanceof Error) throw r;
    return { ok: (r.httpStatus ?? 200) < 400, status: r.httpStatus ?? 200, json: async () => r.body };
  };
  fn.calls = calls;
  return fn;
}

// --- Decision table ----------------------------------------------------------------------
test('normal meme (even with a middle finger) is approved', async () => {
  const v = await moderateImage({ samples: SAMPLE, env: SE_ENV, fetchImpl: mockFetch({ body: seClean }) });
  assert.equal(v.decision, 'approve');
  assert.equal(v.reason, 'clear');
});

const sightengineCases = [
  ['sexual', { nudity: { sexual_activity: 0.92 } }],
  ['gore', { gore: { prob: 0.93 } }],
  ['hate_symbols', { offensive: { nazi: 0.97 } }],
  ['self_harm', { 'self-harm': { prob: 0.9 } }],
  ['drugs', { recreational_drug: { prob: 0.95 } }],
  ['weapon_threat', { weapon: { firearm_action: { aiming_threat: 0.9 } } }]
];
for (const [cat, patch] of sightengineCases) {
  test(`sightengine: clear ${cat} hit is rejected`, async () => {
    const v = await moderateImage({ samples: SAMPLE, env: SE_ENV, fetchImpl: mockFetch({ body: se(patch) }) });
    assert.equal(v.decision, 'reject');
    assert.ok(v.flagged.includes(cat));
  });
}

test('sightengine: borderline score goes to review (pending), not approve', async () => {
  const v = await moderateImage({ samples: SAMPLE, env: SE_ENV, fetchImpl: mockFetch({ body: se({ gore: { prob: 0.5 } }) }) });
  assert.equal(v.decision, 'review');
});

test('sightengine sends the API credentials and models, never in the URL', async () => {
  const f = mockFetch({ body: seClean });
  await moderateImage({ samples: SAMPLE, env: SE_ENV, fetchImpl: f });
  assert.equal(f.calls[0].url, 'https://api.sightengine.com/1.0/check.json');
  const form = f.calls[0].init.body;
  assert.equal(form.get('api_user'), 'u');
  assert.equal(form.get('models'), ADAPTERS.sightengine.models);
});

test('openai: sexual / graphic violence rejected; minors score is zero tolerance when supported', async () => {
  const sexual = await moderateImage({ samples: SAMPLE, env: OA_ENV, fetchImpl: mockFetch({ body: oaReply({ sexual: 0.9 }) }) });
  assert.equal(sexual.decision, 'reject');
  const gore = await moderateImage({ samples: SAMPLE, env: OA_ENV, fetchImpl: mockFetch({ body: oaReply({ 'violence/graphic': 0.95 }) }) });
  assert.equal(gore.decision, 'reject');
  const clean = await moderateImage({ samples: SAMPLE, env: OA_ENV, fetchImpl: mockFetch({ body: oaReply({}) }) });
  assert.equal(clean.decision, 'approve');
  assert.ok(clean.unsupported.includes('hate_symbols'), 'gaps are reported, not hidden');
});

test('zero-tolerance category: even a "review" score becomes reject + incident flag', () => {
  const adapterBackup = ADAPTERS.test;
  ADAPTERS.test = { supports: Object.keys(IMAGE_MODERATION.thresholds), toScores: (x) => x };
  try {
    const scores = { sexual: 0, sexual_minors: 0.05, gore: 0, hate_symbols: 0, self_harm: 0, drugs: 0, weapon_threat: 0 };
    const v = scoresToVerdict('test', scores);
    assert.equal(v.decision, 'reject');
    assert.equal(v.zeroTolerance, true);
  } finally {
    if (adapterBackup) ADAPTERS.test = adapterBackup;
    else delete ADAPTERS.test;
  }
});

// --- Fail closed -------------------------------------------------------------------------
const failClosedCases = [
  ['no provider configured', env({}), mockFetch({ body: seClean })],
  ['unknown provider', env({ IMAGE_MODERATION_PROVIDER: 'mystery' }), mockFetch({ body: seClean })],
  ['missing API key', env({ IMAGE_MODERATION_PROVIDER: 'sightengine' }), mockFetch({ body: seClean })],
  ['HTTP 500', SE_ENV, mockFetch({ httpStatus: 500, body: {} })],
  ['over quota (429)', SE_ENV, mockFetch({ httpStatus: 429, body: { status: 'failure' } })],
  ['provider says failure', SE_ENV, mockFetch({ body: { status: 'failure', error: { message: 'bad key' } } })],
  ['network error', SE_ENV, mockFetch(new TypeError('fetch failed'))],
  ['timeout', SE_ENV, mockFetch(Object.assign(new Error('aborted'), { name: 'AbortError' }))],
  ['reply missing a category', SE_ENV, mockFetch({ body: { status: 'success', nudity: seClean.nudity } })],
  ['openai garbage reply', OA_ENV, mockFetch({ body: { nope: true } })]
];
for (const [name, e, f] of failClosedCases) {
  test(`fail closed: ${name} → review (pending), never approve`, async () => {
    const v = await moderateImage({ samples: SAMPLE, env: e, fetchImpl: f });
    assert.equal(v.decision, 'review');
    assert.equal(decideStatus(v, { decision: 'approve' }), 'pending');
  });
}

test('no samples → review', async () => {
  assert.equal((await moderateImage({ samples: [], env: SE_ENV, fetchImpl: mockFetch({ body: seClean }) })).decision, 'review');
});

// --- Multi-frame (GIF) -------------------------------------------------------------------
test('worst frame wins: a bad middle frame rejects the GIF', async () => {
  const f = mockFetch([{ body: seClean }, { body: se({ nudity: { sexual_activity: 0.95 } }) }, { body: seClean }]);
  const v = await moderateImage({ samples: [SAMPLE[0], SAMPLE[0], SAMPLE[0]], env: SE_ENV, fetchImpl: f });
  assert.equal(v.decision, 'reject');
  assert.equal(f.calls.length, 2, 'stops calling the API once a frame is rejected');
});

test('one unavailable frame makes the whole GIF pending', async () => {
  const f = mockFetch([{ body: seClean }, { httpStatus: 503, body: {} }]);
  const v = await moderateImage({ samples: [SAMPLE[0], SAMPLE[0], SAMPLE[0]], env: SE_ENV, fetchImpl: f });
  assert.equal(v.decision, 'review');
});

test('codec gives moderation the first, middle and last GIF frame (synthetic GIF)', () => {
  const { ImageMagick, MagickImageCollection, MagickImage, MagickColor, MagickFormat } = Magick;
  const gif = (() => {
    const coll = MagickImageCollection.create();
    for (const c of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 255, 255]]) {
      const img = MagickImage.create(new MagickColor(...c), 20, 20);
      coll.push(img);
    }
    const out = coll.write(MagickFormat.Gif, (d) => new Uint8Array(d));
    coll.dispose();
    return out;
  })();
  void ImageMagick;
  const out = transcodeImage(Magick, gif, 'gif');
  assert.equal(out.frames, 5);
  assert.equal(out.samples.length, 3);
  for (const s of out.samples) assert.equal(s.contentType, 'image/webp');
});

test('a still is moderated on exactly the bytes that get published', () => {
  const { ImageMagick, MagickColor, MagickFormat } = Magick;
  const png = ImageMagick.read(new MagickColor(10, 20, 30), 30, 30, (i) => i.write(MagickFormat.Png, (d) => new Uint8Array(d)));
  const out = transcodeImage(Magick, png, 'png');
  assert.equal(out.samples.length, 1);
  assert.equal(out.samples[0].data, out.data);
});
