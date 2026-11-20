# House agents (Workstream 1: "Never look empty")

MemeBot is the site's AI house account (`profiles.is_house`). It is always labelled "🤖 House" and never wins prizes, M$, XP, Hall of Fame spots or leaderboard places. Everything runs inside the Supabase project `thememes-net` (`otvvphmjojqyjaznjzyo`).

```
pg_cron ─► public.house_agent_call(task) ─(pg_net + Vault bearer)─► Edge Function house-agent
           daily_memes 08:15/13:15/18:15 UTC · seed_battle every 10 min · weekly_bounty Mon 09:15 UTC
```

| Piece | Where |
|---|---|
| Function | `supabase/functions/house-agent/index.ts` |
| Pure helpers (unit-tested) | `_shared/houseAgentCore.js`, `_shared/houseTemplates.js`, `_shared/houseTopics.js`, `_shared/llm.js` |
| Schema, RPCs, digest | `supabase/migrations/20261120220011_house_agents.sql` (+ `…220148_house_agent_secret.sql`, `…220235_house_agents_grants.sql`) |
| Schedule (apply last) | `supabase/migrations/20261121090100_house_agent_cron.sql` |
| Review queue and switches | `/admin/house` (`src/components/AdminHousePage.jsx`) |
| Account script | `scripts/create-house-account.ts` |
| Tests | `tests/unit/houseAgent.unit.mjs`, `tests/vitest/houseOverlay.test.js` |

## How each run works

1. It checks the shared secret (Vault `house_agent_secret`, verified by `house_agent_check_secret`).
2. If `agent_settings.enabled` is off, it logs one `skipped` run per slot and stops.
3. It checks the daily caps and the token budget (`daily_token_budget`, summed from `agent_runs`).
4. It claims `run_key = task:London-date:slot` in `agent_runs`, which is unique. A second run with the same key does nothing.
5. It does the work. Every text goes through `moderateText`, and anything other than `approve` is skipped and logged. That includes the case where moderation is unavailable.
6. It writes the result to the `agent_runs` row.

`{ "task": "...", "dry_run": true }` returns what the run would post. It inserts nothing and writes no `agent_runs` row.

House memes are **not re-rendered**. `image_url` is the `/seed/` template, and the caption is an overlay with `live: true` that the feed draws using `MemeOverlay`, the same way the Forge layouts are drawn.

## Switches

The admin page `/admin/house` has an **Agents on** toggle (the kill switch) and a **Review mode** toggle.

You can do the same in SQL:

```sql
update public.agent_settings set enabled = false;      -- kill switch: every task stops on its next run
update public.agent_settings set review_mode = false;  -- after two clean weeks: posts that pass moderation go live
```

## Dry runs

```sql
select public.house_agent_call('daily_memes', true);   -- returns a request id
select status_code, content::jsonb from net._http_response where id = <id>;
```

## Cost

The default settings are 6 memes, 3 battle entries and 1 bounty per week. That comes to about 4 LLM calls per meme run, 1 per battle and 1 per week. At roughly 1.5–3k tokens per call, a month is about 0.3–0.5 M tokens.

- On Claude Haiku 5.5 ($0.10 / $0.50 per M tokens in/out), that is well under $0.50 a month.
- On the OpenAI fallback (gpt-5-nano), the cost is similar.
- The moderation endpoint is free.
- The `daily_token_budget` (200k) is a hard ceiling.
