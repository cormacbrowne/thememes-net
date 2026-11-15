// Unit tests for text moderation (Phase 33 task 33.4). No network: OpenAI replies are synthetic.
// Evasion spellings are GENERATED from the ROT13 blocklist so no slur appears in plain text here.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkText, checkTexts, isReservedName, wordsForm } from '../../supabase/functions/_shared/textFilter.js';
import { ENCODED_BLOCKLIST, rot13 } from '../../supabase/functions/_shared/textBlocklist.js';
import { moderateText, textScoresToVerdict } from '../../supabase/functions/_shared/moderation.js';
import { authorNameFor } from '../../supabase/functions/_shared/identity.js';
import { TEXT_MODERATION } from '../../supabase/functions/_shared/textModerationConfig.js';

const ch = (code) => String.fromCharCode(code);
const ZWSP = ch(0x200b);
const ACUTE = ch(0x0301);
const CYRILLIC = { a: ch(0x430), e: ch(0x435), o: ch(0x43e), c: ch(0x441), p: ch(0x440), i: ch(0x456) };
const term = (plain) => ENCODED_BLOCKLIST.map(([e]) => rot13(e)).find((t) => t === plain) ?? plain;

// --- Evasions ------------------------------------------------------------------------------
const transforms = {
  plain: (t) => t,
  upper: (t) => t.toUpperCase(),
  leet: (t) => t.replace(/a/g, '4').replace(/e/g, '3').replace(/i/g, '1').replace(/o/g, '0').replace(/s/g, '$').replace(/g/g, '9'),
  symbols: (t) => t.replace(/a/g, '@').replace(/i/g, '!').replace(/s/g, '5'),
  spaced: (t) => t.split('').join(' '),
  dotted: (t) => t.split('').join('.'),
  dashed: (t) => t.split('').join('-'),
  repeated: (t) => t.replace(/[aeiou]/g, (v) => v.repeat(4)),
  zeroWidth: (t) => t.split('').join(ZWSP),
  fullwidth: (t) => Array.from(t, (c) => (c >= 'a' && c <= 'z' ? ch(c.charCodeAt(0) + 0xfee0) : c)).join(''),
  accents: (t) => t.replace(/[aeiou]/g, (v) => v + ACUTE),
  cyrillic: (t) => Array.from(t, (c) => CYRILLIC[c] ?? c).join(''),
  inSentence: (t) => `lol you are such a ${t} honestly`,
  plural: (t) => `${t}s`
};

// Pick distinctive single-word terms from each category, decoded at runtime.
const decoded = ENCODED_BLOCKLIST.map(([e, category, mode]) => ({ t: rot13(e), category, mode }));
const singleWord = decoded.filter((d) => !d.t.includes(' ') && d.t.length >= 4);
const evasionCases = [];
for (const d of singleWord.slice(0, 6)) {
  for (const [name, fn] of Object.entries(transforms)) evasionCases.push([`${d.category}#${singleWord.indexOf(d)} ${name}`, fn(d.t)]);
}
// Phrases (threats) with their own evasions.
for (const d of decoded.filter((x) => x.category === 'threat' && x.t.includes(' ')).slice(0, 4)) {
  evasionCases.push([`threat phrase`, d.t]);
  evasionCases.push([`threat phrase squashed`, d.t.replace(/ /g, '')]);
  evasionCases.push([`threat phrase leet`, transforms.leet(d.t)]);
  evasionCases.push([`threat phrase extra spaces`, d.t.replace(/ /g, '   ')]);
}

test(`at least 50 generated evasion spellings`, () => {
  assert.ok(evasionCases.length >= 50, `only ${evasionCases.length}`);
});

for (const [name, text] of evasionCases) {
  test(`blocked: ${name}`, () => {
    assert.equal(checkText(text).decision, 'reject', `normalised as "${wordsForm(text)}"`);
  });
}

// --- Ordinary meme phrases must pass ----------------------------------------------------
const ordinary = [
  'this is fine', "I'm dead 💀", 'kill it with fire', 'what the hell is this', 'fuck mondays',
  'this slaps so hard', 'bruh moment', 'Scunthorpe United fans be like', 'grape juice hits different',
  'my therapist said I need hobbies', 'Pakistan vs England cricket', 'raccoon gang rise up',
  'the Niger river is long', 'stop sniggering at the back', 'PS5 2ND HAND BARGAIN',
  'there is 1 more way to do it', 'top 10 anime betrayals', '2024 was wild', 'skill yourself up king',
  'lollipop', 'made with thememes.net', 'cocktail hour', "assassin's creed", 'class analysis',
  'spice girls reunion', 'when the wifi drops', 'L + ratio', 'big brain time', 'NPC energy',
  'go diet coke', 'damn that is crazy', 'shit post of the year', 'the bass drop killed me',
  'I could die of cringe', 'my code is a crime scene', 'cat.exe has stopped working', 'version 2.0 dropped',
  'Mr. Bean energy', 'pls like 🙏', 'me at 3 a.m.'
];
for (const t of ordinary) {
  test(`passes: ${JSON.stringify(t)}`, () => assert.equal(checkText(t).decision, 'approve', wordsForm(t)));
}

// --- Links, personal info, impersonation ----------------------------------------------------
const categoryCases = [
  ['links', 'check https://example.com'], ['links', 'www.example.org'], ['links', 'go to example dot com'],
  ['links', 'example(dot)net'], ['links', 'join discord.gg/abc'], ['links', 'my site: memes.xyz'],
  ['personal_info', 'call me on 07700 900123'], ['personal_info', 'ring +44 7700 900123'],
  ['personal_info', 'email jo.bloggs@example.co.uk'], ['personal_info', 'jo (at) example dot com'],
  ['personal_info', '(555) 010-0199'], ['personal_info', 'I live at 12 Acacia Avenue'],
  ['impersonation', '@TheMemesHQ says hi'], ['impersonation', 'official @admin notice'],
  ['impersonation', '@the_memes_hq'], ['impersonation', 'TheMemesHQ approved this']
];
for (const [cat, text] of categoryCases) {
  test(`${cat}: ${JSON.stringify(text)}`, () => {
    const r = checkText(text);
    assert.equal(r.decision, 'reject');
    assert.equal(r.category, cat);
  });
}

test('our own domain is allowed (watermark line)', () => {
  assert.equal(checkText('www.thememes.net').decision, 'approve');
});

test('checkTexts: first problem wins across title + captions', () => {
  assert.equal(checkTexts(['nice title', 'top text', 'visit www.example.com']).category, 'links');
  assert.equal(checkTexts(['nice title', 'top text']).decision, 'approve');
});

test('reserved names', () => {
  for (const n of ['TheMemesHQ', 'the_memes_hq', 'ADMIN', 'Moderator', 'support', 'th3m3m3sfan']) assert.ok(isReservedName(n), n);
  for (const n of ['NeonOtter_482', 'MemeLord99', 'adminton_fan']) assert.ok(!isReservedName(n), n);
});

// --- Server author names --------------------------------------------------------------------
test('author name is server-derived and safe', () => {
  assert.equal(authorNameFor({ is_anonymous: true, user_metadata: { username: 'Cool' } }), 'AnonMemer');
  assert.equal(authorNameFor({ user_metadata: { username: 'TheMemesHQ' } }), 'AnonMemer');
  assert.equal(authorNameFor({ user_metadata: { full_name: 'Neon Otter' } }), 'Neon_Otter');
  assert.equal(authorNameFor({ user_metadata: { username: `x ${term(decoded[0].t)}` } }), 'AnonMemer');
  assert.equal(authorNameFor(null), 'AnonMemer');
});

// --- OpenAI layer (synthetic replies) -------------------------------------------------------
const env = (vars) => ({ get: (k) => vars[k] });
const OA = env({ OPENAI_API_KEY: 'test-key' });
const zeros = Object.fromEntries(Object.keys(TEXT_MODERATION.thresholds).map((k) => [k, 0.001]));
const reply = (...scoreSets) => ({ results: scoreSets.map((s) => ({ category_scores: { ...zeros, ...s } })) });
function mockFetch(r) {
  const fn = async (url, init) => {
    fn.calls.push({ url, init });
    if (r instanceof Error) throw r;
    return { ok: (r.httpStatus ?? 200) < 400, status: r.httpStatus ?? 200, json: async () => r.body };
  };
  fn.calls = [];
  return fn;
}

test('openai: clean texts approve; one request for all texts', async () => {
  const f = mockFetch({ body: reply({}, {}) });
  const v = await moderateText({ texts: ['top text', 'bottom text'], env: OA, fetchImpl: f });
  assert.equal(v.decision, 'approve');
  assert.equal(f.calls.length, 1);
  assert.deepEqual(JSON.parse(f.calls[0].init.body).input, ['top text', 'bottom text']);
});

test('openai: lenient on roast-level harassment and meme violence, strict on threats/hate', async () => {
  const lenient = await moderateText({ texts: ['x'], env: OA, fetchImpl: mockFetch({ body: reply({ harassment: 0.6, violence: 0.7 }) }) });
  assert.equal(lenient.decision, 'approve');
  const threat = await moderateText({ texts: ['x'], env: OA, fetchImpl: mockFetch({ body: reply({ 'harassment/threatening': 0.9 }) }) });
  assert.equal(threat.decision, 'reject');
  assert.equal(threat.category, 'rules');
  const hate = await moderateText({ texts: ['x'], env: OA, fetchImpl: mockFetch({ body: reply({ hate: 0.6 }) }) });
  assert.equal(hate.decision, 'review');
});

test('openai: worst text wins', async () => {
  const v = await moderateText({ texts: ['a', 'b'], env: OA, fetchImpl: mockFetch({ body: reply({}, { sexual: 0.95 }) }) });
  assert.equal(v.decision, 'reject');
});

test('openai: zero tolerance category rejects even at review level', () => {
  const v = textScoresToVerdict({ ...zeros, 'sexual/minors': 0.06 });
  assert.equal(v.decision, 'reject');
  assert.equal(v.zeroTolerance, true);
});

test('local blocklist rejects without calling OpenAI', async () => {
  const f = mockFetch({ body: reply({}) });
  const v = await moderateText({ texts: ['visit www.example.com'], env: OA, fetchImpl: f });
  assert.equal(v.decision, 'reject');
  assert.equal(v.category, 'links');
  assert.equal(f.calls.length, 0);
});

const failClosed = [
  ['no key', env({}), mockFetch({ body: reply({}) })],
  ['provider none', env({ TEXT_MODERATION_PROVIDER: 'none', OPENAI_API_KEY: 'k' }), mockFetch({ body: reply({}) })],
  ['HTTP 500', OA, mockFetch({ httpStatus: 500, body: {} })],
  ['quota 429', OA, mockFetch({ httpStatus: 429, body: { error: { message: 'quota' } } })],
  ['network error', OA, mockFetch(new TypeError('fetch failed'))],
  ['timeout', OA, mockFetch(Object.assign(new Error('aborted'), { name: 'AbortError' }))],
  ['wrong number of results', OA, mockFetch({ body: reply({}) })],
  ['missing category score', OA, mockFetch({ body: { results: [{ category_scores: { sexual: 0 } }, { category_scores: { sexual: 0 } }] } })]
];
for (const [name, e, f] of failClosed) {
  test(`text fail closed: ${name} → review`, async () => {
    const v = await moderateText({ texts: ['hello', 'world'], env: e, fetchImpl: f });
    assert.equal(v.decision, 'review');
  });
}

test('empty text list approves (nothing to check)', async () => {
  assert.equal((await moderateText({ texts: ['  ', ''], env: OA, fetchImpl: mockFetch({ body: {} }) })).decision, 'approve');
});
