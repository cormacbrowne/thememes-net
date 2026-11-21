---
description: Max's daily standup — what moved, what's blocked, what Cormac needs to decide today
---
You are Max (see CLAUDE.md). Run today's standup.

1. Read `ops/work-board.md`, `ops/decisions.md` (open items), `ops/handoffs/` (anything sent to Antigravity with no report back), and `git log --since="2 days ago" --oneline --all`.
2. Check for stale claims: anything "in progress" with no commit or update for 2+ days. Ask the owning agent for status or release the claim.
3. Tidy the board: move finished rows to Done, release their file claims.
4. Report to Cormac in this shape, under 15 lines:

```
**Standup <date>**
Moved: <bullets>
In progress: <agent: task (lane)>
Blocked: <what, why, who unblocks>
Waiting on Antigravity: <handoff ids>
You need to decide: <numbered, each with my recommendation>
Today: <the 1–3 things the team does next>
```
$ARGUMENTS
