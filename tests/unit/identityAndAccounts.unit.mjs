// Unit tests for honest accounts, anonymous handles, username validation, and bans (Phase 33 task 33.6).
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FALLBACK_AUTHOR,
  ANON_ADJECTIVES,
  ANON_ANIMALS,
  USERNAME_RE,
  anonymousHandleFor,
  isGeneratedAnonHandle,
  validateUsername,
  authorNameFor,
  isProfileSuspended
} from '../../supabase/functions/_shared/identity.js';
import { ENCODED_BLOCKLIST, rot13 } from '../../supabase/functions/_shared/textBlocklist.js';

const slurFromList = () => rot13(ENCODED_BLOCKLIST[0][0]);

test('anonymousHandleFor is deterministic and falls back cleanly', () => {
  const idA = 'e3807291-f57c-4861-b39e-3a132deda449';
  const idB = '76565181-fda4-46f8-aa65-2bb9b6eb3b4c';

  const first = anonymousHandleFor(idA);
  const second = anonymousHandleFor(idA);
  const other = anonymousHandleFor(idB);

  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.match(first, /^[A-Z][a-z]+[A-Z][a-z]+_\d{3}$/);
  assert.ok(ANON_ADJECTIVES.length > 0 && ANON_ANIMALS.length > 0);
  assert.equal(anonymousHandleFor(''), FALLBACK_AUTHOR);
  assert.equal(anonymousHandleFor(null), FALLBACK_AUTHOR);
  assert.equal(anonymousHandleFor(undefined), FALLBACK_AUTHOR);
});

test('isGeneratedAnonHandle recognizes generated handles case-insensitively', () => {
  const generated = anonymousHandleFor('e3807291-f57c-4861-b39e-3a132deda449');
  assert.equal(isGeneratedAnonHandle(generated), true);
  assert.equal(isGeneratedAnonHandle(generated.toLowerCase()), true);
  assert.equal(isGeneratedAnonHandle(FALLBACK_AUTHOR), true);
  assert.equal(isGeneratedAnonHandle('CyberWolf_86'), false);
  assert.equal(isGeneratedAnonHandle('retro-king'), false);
});

test('validateUsername enforces length, characters, reserved names, generated handles, and filter', () => {
  assert.equal(USERNAME_RE.test('CyberWolf_86'), true);
  assert.deepEqual(validateUsername('  CyberWolf_86  '), { ok: true, username: 'CyberWolf_86' });
  assert.deepEqual(validateUsername('retro-king'), { ok: true, username: 'retro-king' });

  assert.equal(validateUsername('ab').error, 'too_short');
  assert.equal(validateUsername('').error, 'too_short');
  assert.equal(validateUsername('a'.repeat(21)).error, 'too_long');

  assert.equal(validateUsername('-leading').error, 'invalid_chars');
  assert.equal(validateUsername('trailing.').error, 'invalid_chars');
  assert.equal(validateUsername('bad name').error, 'invalid_chars');
  assert.equal(validateUsername('bad!name').error, 'invalid_chars');

  assert.equal(validateUsername('admin').error, 'reserved_name');
  assert.equal(validateUsername('TheMemesHQ').error, 'reserved_name');

  const generated = anonymousHandleFor('e3807291-f57c-4861-b39e-3a132deda449');
  assert.equal(validateUsername(generated).error, 'reserved_name');

  const badText = validateUsername(`xx_${slurFromList()}`);
  assert.equal(badText.ok, false);
  assert.equal(badText.error, 'rejected');
});

test('authorNameFor ignores client spoofed metadata for anonymous users and prefers profile.username', () => {
  const anonUser = {
    id: 'e3807291-f57c-4861-b39e-3a132deda449',
    is_anonymous: true,
    user_metadata: { username: 'Admin', full_name: 'TheMemesHQ' }
  };
  assert.equal(
    authorNameFor(anonUser, { username: 'ShouldNotApplyIfAnon' }),
    anonymousHandleFor(anonUser.id)
  );

  const realUser = {
    id: '11111111-2222-3333-4444-555555555555',
    is_anonymous: false,
    email: 'creator@example.com',
    user_metadata: { full_name: 'Meta Fallback' }
  };
  assert.equal(authorNameFor(realUser, { username: 'VerifiedCreator' }), 'VerifiedCreator');
  assert.equal(authorNameFor(realUser, null), 'Meta_Fallback');
  assert.equal(
    authorNameFor({ id: '11111111-2222-3333-4444-555555555555', is_anonymous: false, email: 'pixel@example.com' }, null),
    'pixel'
  );
  assert.equal(authorNameFor(null, null), FALLBACK_AUTHOR);
});

test('isProfileSuspended checks future timestamps accurately', () => {
  const now = 1_700_000_000_000;
  assert.equal(isProfileSuspended(null, now), false);
  assert.equal(isProfileSuspended({}, now), false);
  assert.equal(isProfileSuspended({ suspended_until: null }, now), false);
  assert.equal(isProfileSuspended({ suspended_until: new Date(now - 1000).toISOString() }, now), false);
  assert.equal(isProfileSuspended({ suspended_until: new Date(now + 60_000).toISOString() }, now), true);
});
