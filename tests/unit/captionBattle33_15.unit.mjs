// Unit tests for Daily Caption Battle shared server helpers (Phase 33 task 33.15).
// Run: npm run test:unit   (node --test; no browser, no network, no live database)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPTION_LIMITS,
  todayUtcDateString,
  validateCaptionEntryRequest,
  decideCaptionEntryStatus
} from '../../supabase/functions/_shared/captionBattleCore.js';
import {
  buildQuarantinePath,
  parsePublishRequest
} from '../../supabase/functions/_shared/publishCore.js';

const UID = '11111111-2222-4333-8444-555555555555';
const OBJ = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

test('validateCaptionEntryRequest accepts valid UTC battle caption and sanitizes HTML brackets', () => {
  const now = new Date('2026-11-15T14:22:00Z');
  assert.equal(todayUtcDateString(now), '2026-11-15');

  const res = validateCaptionEntryRequest(
    {
      battleDate: '2026-11-15',
      templateId: 'tpl-drake-compare',
      topText: '  <b>SKIPPING</b>   TESTS  ',
      bottomText: 'SHIPPING ON FRIDAY  '
    },
    now
  );

  assert.equal(res.ok, true);
  assert.equal(res.value.battleDate, '2026-11-15');
  assert.equal(res.value.templateId, 'tpl-drake-compare');
  assert.equal(res.value.topText, 'bSKIPPING/b TESTS');
  assert.equal(res.value.bottomText, 'SHIPPING ON FRIDAY');
  assert.deepEqual(res.value.texts, ['bSKIPPING/b TESTS', 'SHIPPING ON FRIDAY']);
});

test('validateCaptionEntryRequest enforces battleDate == UTC today, valid templateId, non-empty caption, and max len', () => {
  const now = new Date('2026-11-15T14:22:00Z');

  assert.deepEqual(validateCaptionEntryRequest(null, now), { ok: false, error: 'bad_request' });
  assert.deepEqual(
    validateCaptionEntryRequest(
      { battleDate: '2026-11-14', templateId: 'tpl-drake-compare', topText: 'hi' },
      now
    ),
    { ok: false, error: 'battle_day_mismatch' }
  );
  assert.deepEqual(
    validateCaptionEntryRequest(
      { battleDate: '2026-11-15', templateId: '../bad/path', topText: 'hi' },
      now
    ),
    { ok: false, error: 'bad_request' }
  );
  assert.deepEqual(
    validateCaptionEntryRequest(
      { battleDate: '2026-11-15', templateId: 'tpl-drake-compare', topText: '   ', bottomText: '' },
      now
    ),
    { ok: false, error: 'empty_caption' }
  );

  const clamped = validateCaptionEntryRequest(
    {
      battleDate: '2026-11-15',
      templateId: 'tpl-drake-compare',
      topText: 'A'.repeat(250)
    },
    now
  );
  assert.equal(clamped.ok, true);
  assert.equal(clamped.value.topText.length, CAPTION_LIMITS.TOP_MAX);
});

test('decideCaptionEntryStatus fails closed to pending/rejected unless approved', () => {
  assert.equal(decideCaptionEntryStatus(null), 'pending');
  assert.equal(decideCaptionEntryStatus({ decision: 'pending' }), 'pending');
  assert.equal(decideCaptionEntryStatus({ decision: 'reject' }), 'rejected');
  assert.equal(decideCaptionEntryStatus({ decision: 'approve' }), 'approved');
});

test('parsePublishRequest preserves valid battle bounty metadata and drops malformed ids', () => {
  const qPath = buildQuarantinePath(UID, OBJ);

  const battleReq = parsePublishRequest(
    {
      path: qPath,
      title: 'Battle submission',
      category: 'dank',
      isBounty: true,
      bountyId: 'battle-2026-11-15'
    },
    UID
  );
  assert.equal(battleReq.ok, true);
  assert.equal(battleReq.value.isBounty, true);
  assert.equal(battleReq.value.bountyId, 'battle-2026-11-15');

  const badBounty = parsePublishRequest(
    {
      path: qPath,
      title: 'Bad bounty id',
      category: 'dank',
      isBounty: true,
      bountyId: 'drop table memes;'
    },
    UID
  );
  assert.equal(badBounty.ok, true);
  assert.equal(badBounty.value.isBounty, false);
  assert.equal(badBounty.value.bountyId, null);
});
