import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PULSE_SQL_PATH = path.join(ROOT, 'supabase', 'migrations', '20261116000001_35_1_pulse.sql');

test('35.1 Pulse migration enables RLS, creates no policies, and locks down tables', () => {
  const raw = fs.readFileSync(PULSE_SQL_PATH, 'utf8');
  const sql = raw.replace(/--.*$/gm, '');

  for (const tbl of ['public.pulse_events', 'public.pulse_salts', 'public.pulse_daily']) {
    const escaped = tbl.replace('.', '\\.');
    assert.match(sql, new RegExp(`create table if not exists ${escaped}`, 'i'));
    assert.match(sql, new RegExp(`alter table ${escaped} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table ${escaped} from public, anon, authenticated`, 'i'));
  }

  assert.doesNotMatch(sql, /create\s+policy/i, 'pulse_* tables must have no RLS policies');

  assert.match(sql, /create or replace function public\.pulse\(p_session text, p_events jsonb\)/i);
  assert.match(sql, /grant execute on function public\.pulse\(text, jsonb\) to anon, authenticated/i);

  assert.match(sql, /create or replace function public\.pulse_report\(p_days int default 14\)/i);
  assert.match(sql, /if not public\.is_moderator\(\) then\s+raise exception 'forbidden'/i);
  assert.match(sql, /grant execute on function public\.pulse_report\(int\) to authenticated/i);

  assert.match(sql, /pulse-rotate-salt/i);
  assert.match(sql, /pulse-daily-rollup/i);
  assert.match(sql, /pulse-weekly-digest/i);
});
