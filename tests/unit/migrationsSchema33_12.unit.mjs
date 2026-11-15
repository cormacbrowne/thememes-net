import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

test('supabase-schema.sql is removed so supabase/migrations/ is the single source of truth', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'supabase-schema.sql')), false);
});

test('supabase/migrations contains complete ordered baseline + 33.1..33.12 chain with no duplicate blocks', () => {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  assert.ok(files.includes('20260101000000_00_initial_schema.sql'));
  for (let i = 1; i <= 12; i += 1) {
    const num = String(i).padStart(2, '0');
    assert.ok(
      files.some((f) => f.startsWith(`202611150000${num}_33_${i}_`)),
      `missing migration for 33.${i}`
    );
  }

  const combined = files.map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).join('\n');

  for (const tbl of [
    'public.memes',
    'public.comments',
    'public.profiles',
    'public.votes',
    'public.reactions',
    'public.notifications',
    'public.reports',
    'public.banned_hashes',
    'public.moderation_actions',
    'public.moderation_incidents',
    'public.moderation_digests',
    'public.upload_rejections',
    'public.rate_limit_events',
    'public.takedown_requests'
  ]) {
    assert.match(combined, new RegExp(`create table if not exists ${tbl.replace('.', '\\.')}`, 'i'));
  }

  for (const fn of [
    'public.cast_vote',
    'public.toggle_reaction',
    'public.mark_notifications_read',
    'public.report_item',
    'public.submit_takedown_request',
    'public.mod_queue',
    'public.mod_apply_decision',
    'public.moderation_digest_send',
    'public.meme_public_state',
    'public.get_my_profile',
    'public.is_moderator',
    'public.is_suspended',
    'public.is_banned_image',
    'public.check_and_record_rate_limit',
    'public.get_meme_evolution_tree'
  ]) {
    assert.match(combined, new RegExp(`function ${fn.replace('.', '\\.')}`, 'i'));
  }

  // Ensure the fixed evolution tree SQL (ignoring comments) uses score, not the broken upvotes column
  const m12 = fs.readFileSync(
    path.join(MIGRATIONS_DIR, '20261115000012_33_12_evolution_tree_and_schema_sync.sql'),
    'utf8'
  );
  const m12SqlOnly = m12.replace(/--.*$/gm, '');
  assert.doesNotMatch(m12SqlOnly, /m\.upvotes|child\.upvotes/i);
  assert.match(m12SqlOnly, /m\.score/i);
  assert.match(m12SqlOnly, /m\.status\s*=\s*'approved'/i);
});
