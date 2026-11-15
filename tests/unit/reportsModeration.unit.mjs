// Unit tests for reports and the moderator queue (Phase 33 task 33.5). No network.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  REPORT_REASONS,
  REPORT_REASON_IDS,
  reasonWeight,
  shouldAutoHide,
  parseDecisionRequest,
  publicObjectFromUrl,
  removedArchivePath,
  reportErrorMessage
} from '../../supabase/functions/_shared/moderationQueue.js';

const SB = 'https://otvvphmjojqyjaznjzyo.supabase.co';
const MEME = '6f1c2a34-1b2c-4d5e-8f90-123456789abc';
const COMMENT = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

test('report sheet offers the seven required reasons', () => {
  assert.deepEqual(REPORT_REASON_IDS, ['sexual', 'violence', 'hate', 'child', 'spam', 'copyright', 'other']);
  assert.ok(REPORT_REASONS.every((r) => r.label && r.emoji));
});

test('reason weights match the SQL report_reason_weight() and put child first', () => {
  const sql = fs.readFileSync(new URL('../../supabase/migrations/20261115000005_33_5_reports_and_moderation.sql', import.meta.url), 'utf8');
  for (const r of REPORT_REASONS) {
    if (r.id === 'other') continue;
    assert.match(sql, new RegExp(`when '${r.id}' then ${r.weight}\\b`), `weight for ${r.id}`);
  }
  const sorted = [...REPORT_REASONS].sort((a, b) => b.weight - a.weight);
  assert.equal(sorted[0].id, 'child');
  assert.equal(reasonWeight('unknown'), 10);
});

test('auto-hide: 3 distinct reporters, or 1 report for "Involves a child"', () => {
  assert.equal(shouldAutoHide(1, 'spam'), false);
  assert.equal(shouldAutoHide(2, 'sexual'), false);
  assert.equal(shouldAutoHide(3, 'other'), true);
  assert.equal(shouldAutoHide(1, 'child'), true);
});

test('decision requests: exactly one target and a known decision', () => {
  assert.deepEqual(parseDecisionRequest({ memeId: MEME, decision: 'approve' }), {
    ok: true, memeId: MEME, commentId: null, decision: 'approve', note: null
  });
  assert.equal(parseDecisionRequest({ commentId: COMMENT, decision: 'remove_suspend', note: '  spam bot ' }).note, 'spam bot');
  assert.equal(parseDecisionRequest({ memeId: MEME, commentId: COMMENT, decision: 'remove' }).ok, false);
  assert.equal(parseDecisionRequest({ decision: 'remove' }).ok, false);
  assert.equal(parseDecisionRequest({ memeId: 'not-a-uuid', decision: 'remove' }).ok, false);
  assert.equal(parseDecisionRequest({ memeId: MEME, decision: 'delete_everything' }).error, 'bad_decision');
  assert.equal(parseDecisionRequest({ commentId: COMMENT, decision: 'remove_ban_hash' }).ok, false, 'comments have no image hash');
  assert.equal(parseDecisionRequest({ memeId: MEME, decision: 'remove', note: 'x'.repeat(900) }).note.length, 300);
  assert.equal(parseDecisionRequest(null).ok, false);
});

test('only our own public bucket files are taken down', () => {
  assert.deepEqual(publicObjectFromUrl(`${SB}/storage/v1/object/public/memes/u/abc.webp`, SB), { bucket: 'memes', path: 'u/abc.webp' });
  assert.deepEqual(publicObjectFromUrl(`${SB}/storage/v1/object/public/meme-images/x%20y.png`, SB), { bucket: 'meme-images', path: 'x y.png' });
  assert.equal(publicObjectFromUrl(`${SB}/storage/v1/object/public/quarantine/u/abc.webp`, SB), null);
  assert.equal(publicObjectFromUrl('https://evil.example/storage/v1/object/public/memes/u/abc.webp', SB), null);
  assert.equal(publicObjectFromUrl('/seed/seed-doge.webp', SB), null);
  assert.equal(publicObjectFromUrl(`${SB}/storage/v1/object/public/memes/../secret`, SB), null);
  assert.equal(publicObjectFromUrl(null, SB), null);
});

test('removed files are archived under removed/<memeId>/', () => {
  assert.equal(removedArchivePath(MEME, 'u/abc.webp'), `removed/${MEME}/abc.webp`);
});

test('every report error has friendly copy', () => {
  for (const code of ['sign_in_required', 'rate_limited', 'suspended', 'not_found', 'bad_reason']) {
    assert.notEqual(reportErrorMessage(code), reportErrorMessage('network'));
  }
  assert.equal(reportErrorMessage('weird'), reportErrorMessage('network'));
});
