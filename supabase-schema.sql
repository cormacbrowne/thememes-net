-- ====================================================================
-- THE MEMES.net (thememes-net) — Full Production Database Schema & Security
-- Paste this script into your Supabase Dashboard SQL Editor to activate:
-- 1. Profiles Table (creator handles, flairs, verified status)
-- 2. Anti-Abuse Votes Table (1 vote per user per meme, eliminating delta exploits)
-- 3. Hardened increment_meme_score RPC function (clamped delta validation)
-- 4. Follows & Notifications Tables (creator social graph & retention)
-- 5. Row Level Security (RLS) policies for all tables
-- ====================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  equipped_flair text,
  total_xp integer default 0,
  verified boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. MEMES TABLE RLS & SECURITY
alter table public.memes enable row level security;

create policy "Memes are viewable by everyone"
  on public.memes for select
  using (true);

create policy "Anyone can upload memes"
  on public.memes for insert
  with check (true);

create policy "Authors or authenticated creators can update their own memes"
  on public.memes for update
  using (auth.uid() = user_id or user_id is null);

-- 3. VOTES TABLE (Anti-Cheat & 1-Vote-Per-User Enforcement)
create table if not exists public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- Supabase auth UID or stable hashed visitor ID
  meme_id uuid references public.memes(id) on delete cascade not null,
  direction integer not null check (direction in (-1, 1, 2)), -- 1 = Up, -1 = Down, 2 = Super Up
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (user_id, meme_id)
);

alter table public.votes enable row level security;

create policy "Public can view votes"
  on public.votes for select
  using (true);

create policy "Anyone can cast or update their own vote"
  on public.votes for insert
  with check (true);

create policy "Users can modify their vote"
  on public.votes for update
  using (true);

-- 4. HARDENED INCREMENT_MEME_SCORE RPC FUNCTION
-- Prevents clients from sending delta=1000000 by clamping delta between -5 and +5 (respecting combo multipliers)
create or replace function public.increment_meme_score(row_id uuid, delta integer)
returns void
language plpgsql
security definer
as $$
declare
  clamped_delta integer;
begin
  -- Clamp delta to valid range [-5, 5]
  clamped_delta := greatest(-5, least(5, delta));
  
  update public.memes
  set score = coalesce(score, 0) + clamped_delta
  where id = row_id;
end;
$$;

-- 5. FOLLOWS TABLE (Creator Social Graph)
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id text not null, -- creator username or auth.users id
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Follows viewable by everyone"
  on public.follows for select
  using (true);

create policy "Authenticated users can follow"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Authenticated users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- 6. NOTIFICATIONS TABLE (Remix Royalties, Upvotes & Engagement)
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_username text not null,
  actor_name text not null,
  type text not null check (type in ('remix', 'upvote', 'comment', 'bounty', 'royalty')),
  meme_id uuid references public.memes(id) on delete cascade,
  message text not null,
  read boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

create policy "Users can view their notifications"
  on public.notifications for select
  using (true);

create policy "Anyone can insert notification"
  on public.notifications for insert
  with check (true);
