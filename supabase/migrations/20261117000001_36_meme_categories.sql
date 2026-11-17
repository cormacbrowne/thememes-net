-- Owner brief 17 Nov 2026, item 8: categories the owner can add from /admin (e.g. trending
-- TikTok topics, Black Friday) without a code change.
--   * anyone can read active categories (feed chips, upload pickers)
--   * only moderators/admins can add, rename, reorder or switch them off
--   * publish-meme checks the posted category against this table (falls back to 'dank')

create table if not exists public.meme_categories (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,23}$'),
  label text not null check (char_length(label) between 2 and 32),
  emoji text not null default '' check (char_length(emoji) <= 8),
  sort int not null default 100,
  trending boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meme_categories enable row level security;

drop policy if exists meme_categories_read on public.meme_categories;
create policy meme_categories_read on public.meme_categories
  for select to anon, authenticated
  using (active or public.is_moderator());

drop policy if exists meme_categories_mod_insert on public.meme_categories;
create policy meme_categories_mod_insert on public.meme_categories
  for insert to authenticated
  with check (public.is_moderator());

drop policy if exists meme_categories_mod_update on public.meme_categories;
create policy meme_categories_mod_update on public.meme_categories
  for update to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

revoke all on public.meme_categories from anon, authenticated;
grant select on public.meme_categories to anon, authenticated;
grant insert, update on public.meme_categories to authenticated;

insert into public.meme_categories (id, label, emoji, sort, trending) values
  ('dank',          'Dank',            '😂', 10, false),
  ('relatable',     'Relatable',       '🫠', 20, false),
  ('tech',          'Tech',            '💻', 30, false),
  ('gaming',        'Gaming',          '🎮', 40, false),
  ('black-friday',  'Black Friday',    '🛍️', 1,  true),
  ('christmas',     'Christmas',       '🎄', 2,  true),
  ('tiktok-trends', 'TikTok Trends',   '📱', 3,  true),
  ('ai',            'AI',              '🤖', 50, false),
  ('work',          'Work & Office',   '💼', 60, false),
  ('school',        'School',          '🎒', 70, false),
  ('sports',        'Sports',          '⚽', 80, false),
  ('animals',       'Animals',         '🐶', 90, false),
  ('movies-tv',     'Movies & TV',     '🎬', 100, false),
  ('music',         'Music',           '🎵', 110, false),
  ('food',          'Food',            '🍕', 120, false),
  ('wholesome',     'Wholesome',       '🥹', 130, false),
  ('retro',         'Retro & 80s',     '📼', 140, false)
on conflict (id) do nothing;
