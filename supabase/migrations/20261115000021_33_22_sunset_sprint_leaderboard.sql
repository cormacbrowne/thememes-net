-- ============================================================================
-- Migration 20261115000021 — Phase 33 task 33.22
-- Register "Sunset Sprint" ('sunset') on public.scores and
-- arcade_game_limits() for real 33.14 cabinet leaderboards.
-- ============================================================================

ALTER TABLE public.scores
  DROP CONSTRAINT IF EXISTS scores_game_check;

ALTER TABLE public.scores
  ADD CONSTRAINT scores_game_check CHECK (
    game = ANY (ARRAY[
      'pinball'::text,
      'crush'::text,
      'stocks'::text,
      'pusher'::text,
      'blackjack'::text,
      'roulette'::text,
      'slots'::text,
      'poker'::text,
      'bingo'::text,
      'derby'::text,
      'hilow'::text,
      'invaders'::text,
      'serpent'::text,
      'blaster'::text,
      'sunset'::text
    ])
  );

CREATE OR REPLACE FUNCTION public.arcade_game_limits(p_game text)
RETURNS TABLE(base_score integer, per_sec integer, hard_max integer)
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  select l.base_score, l.per_sec, l.hard_max
  from (
    values
      ('pinball',   15000, 3000, 1000000),
      ('crush',      8000, 1800,  500000),
      ('pusher',     6000, 1500,  500000),
      ('stocks',     2000,  400,  250000),
      ('slots',      6000, 1200,  250000),
      ('blackjack',  5000, 1000,  250000),
      ('roulette',   8000, 1500,  250000),
      ('poker',      6000, 1200,  250000),
      ('bingo',      3000,  600,  100000),
      ('derby',      4000,  900,  150000),
      ('hilow',       100,   12,    5000),
      ('invaders',   6000, 1500,  500000),
      ('serpent',    4000,  900,  250000),
      ('blaster',    5000, 1200,  400000),
      ('sunset',     8000, 1800,  600000)
  ) as l(game, base_score, per_sec, hard_max)
  where l.game = p_game;
$function$;
