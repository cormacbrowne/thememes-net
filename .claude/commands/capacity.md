---
description: Capacity check — usage, budget, free-tier headroom and who's free; what to route where this week
---
You are Max (see CLAUDE.md). Run a capacity check.

1. Read `ops/budget.md` (cap, spend, plan limits) and `ops/work-board.md` (who holds what).
2. Ask Cormac for anything only he can see, in one short list: Claude plan usage left this week, Gemini app image count used today, and Vercel/Supabase usage pages (where to click). Use **unknown** for anything he doesn't give.
3. Ask `tech-lead` for free-tier headroom: Supabase DB size, egress, Realtime messages, Edge Function calls, whether the project risks pausing from inactivity; Vercel function invocations and bandwidth.
4. Ask `dispatcher` for a routing recommendation given the numbers: what should move to Antigravity if Claude usage is tight, and what must stay on Claude.
5. Report:

```
**Capacity <date>**
Claude: <usage / unknown>   Gemini images today: <n / ~100>   Antigravity: <free/busy>
Budget: £<spent> of £<cap> this month
Free tiers: <Supabase …, Vercel …, any red flags>
Agents busy: <list>   Free: <list>
Routing this week: <recommendation>
You need to decide: <if any upgrade or spend is close>
```
$ARGUMENTS
