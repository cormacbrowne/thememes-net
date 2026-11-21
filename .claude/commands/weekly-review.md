---
description: Weekly review — KPI report from analytics-lead, team progress, budget check, next week's plan
---
You are Max (see CLAUDE.md). Run the weekly review for the week ending today (ISO week).

1. Brief `analytics-lead` to write `ops/reports/<YYYY>-W<ww>.md` from the template in `ops/reports/TEMPLATE.md`. If it needs dashboard numbers Cormac must copy, list them for him precisely and leave those cells as **not measured** until he pastes them.
2. Gather progress from `ops/work-board.md` (Done this week), `git log --since="7 days ago" --oneline --all`, and `ops/handoffs/`.
3. Check `ops/budget.md`: spend this month vs cap, free-tier usage warnings from `tech-lead`.
4. Draft next week's plan: at most 5 priorities, each with an owner agent and lane (ask `dispatcher` to route).
5. Report to Cormac:

```
**Week <ww> review**
Numbers: <3–5 key KPIs, with change from last week>
Shipped: <bullets>
Learned: <1–3 bullets>
Budget: <£ spent / £ cap, any free-tier warnings>
Next week: <priorities with owners>
You need to decide: <numbered, with recommendations>
```
Then suggest running `/retro`.
$ARGUMENTS
