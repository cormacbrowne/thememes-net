// Unit tests for Phase 2.6 moderation & safety gaps. No network.
// Run: node --test tests/unit/moderationGaps.unit.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  shouldAutoHide,
  parseDecisionRequest
} from '../../supabase/functions/_shared/moderationQueue.js';
import { checkText } from '../../supabase/functions/_shared/textFilter.js';
import {
  moderateText,
  moderateImage,
  DEFAULT_IMAGE_MODERATION_ENABLED
} from '../../supabase/functions/_shared/moderation.js';
import { FEATURE_IMAGE_MODERATION } from '../../src/config/featureFlags.js';

const MEME = '6f1c2a34-1b2c-4d5e-8f90-123456789abc';
const ENTRY = '11111111-2222-4333-8444-555555555555';

test('shouldAutoHide respects configurable report thresholds and child-safety override', () => {
  assert.equal(shouldAutoHide(1, 'spam', 2), false);
  assert.equal(shouldAutoHide(2, 'spam', 2), true);
  assert.equal(shouldAutoHide(4, 'hate', 5), false);
  assert.equal(shouldAutoHide(5, 'hate', 5), true);
  assert.equal(shouldAutoHide(1, 'child', 10), true);
});

test('parseDecisionRequest handles battleEntryId, reportedHandle, single-target & meme-only hash bans', () => {
  assert.deepEqual(parseDecisionRequest({ battleEntryId: ENTRY, decision: 'remove' }), {
    ok: true,
    memeId: null,
    commentId: null,
    battleEntryId: ENTRY,
    decision: 'remove',
    note: null
  });
  assert.deepEqual(parseDecisionRequest({ reportedHandle: '@NeonOtter_482', decision: 'approve' }), {
    ok: true,
    memeId: null,
    commentId: null,
    reportedHandle: 'NeonOtter_482',
    decision: 'approve',
    note: null
  });
  assert.equal(
    parseDecisionRequest({ battleEntryId: ENTRY, reportedHandle: 'NeonOtter_482', decision: 'remove' }).ok,
    false
  );
  assert.equal(parseDecisionRequest({ battleEntryId: ENTRY, decision: 'remove_ban_hash' }).error, 'bad_decision');
  assert.equal(parseDecisionRequest({ reportedHandle: 'NeonOtter_482', decision: 'remove_ban_hash' }).error, 'bad_decision');
  assert.deepEqual(parseDecisionRequest({ memeId: MEME, decision: 'approve' }), {
    ok: true,
    memeId: MEME,
    commentId: null,
    decision: 'approve',
    note: null
  });
});

test('configurable extraTerms catch direct and leetspeak/spaced evasions while allowing benign text', async () => {
  assert.equal(checkText('free glitchcoin airdrop', { blockLinks: true, blockPersonalInfo: true, blockImpersonation: false, allowedDomains: [], reservedNames: [], extraTerms: ['glitchcoin'] }).decision, 'reject');
  assert.equal(checkText('f r e e  g1itchc0in  now', { blockLinks: true, blockPersonalInfo: true, blockImpersonation: false, allowedDomains: [], reservedNames: [], extraTerms: ['glitchcoin'] }).decision, 'reject');
  assert.equal(checkText('funny cat on a keyboard', { blockLinks: true, blockPersonalInfo: true, blockImpersonation: false, allowedDomains: [], reservedNames: [], extraTerms: ['glitchcoin'] }).decision, 'approve');

  const res = await moderateText({
    texts: ['check out gl!tchc0in'],
    extraTerms: ['glitchcoin']
  });
  assert.equal(res.decision, 'reject');
  assert.equal(res.provider, 'blocklist');
  assert.equal(res.category, 'custom_blocklist');
});

test('image moderation feature flag defaults to false and disabled check holds for review', async () => {
  assert.equal(FEATURE_IMAGE_MODERATION, false);
  assert.equal(DEFAULT_IMAGE_MODERATION_ENABLED, false);
  const res = await moderateImage({ samples: [{ data: new Uint8Array([1, 2, 3]), contentType: 'image/webp' }], enabled: false });
  assert.equal(res.decision, 'review');
  assert.equal(res.reason, 'image_moderation_flag_disabled');
});

test('2.6 migrations avoid destructive SQL statements and define moderation gap objects', () => {
  const gapSql = fs.readFileSync(
    new URL('../../supabase/migrations/20261120160014_moderation_gaps_2_6.sql', import.meta.url),
    'utf8'
  );
  const grantsSql = fs.readFileSync(
    new URL('../../supabase/migrations/20261120160204_moderation_grants_2_6.sql', import.meta.url),
    'utf8'
  );
  for (const sql of [gapSql, grantsSql]) {
    assert.equal(/\b(drop|delete|truncate)\b/i.test(sql), false);
  }
  for (const symbol of [
    'moderation_settings',
    'content_reports',
    'report_content',
    'mod_apply_decision_v2',
    'admin_get_moderation_settings',
    'admin_update_moderation_settings'
  ]) {
    assert.equal(gapSql.includes(symbol), true, `missing ${symbol}`);
  }
  assert.equal(grantsSql.includes('from public, anon, authenticated'), true);
});
