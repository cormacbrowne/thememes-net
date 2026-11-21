---
description: Take a concept to Cormac for a go / no-go decision, with design, tech, legal and money views
argument-hint: <concept slug from innovation/concepts/>
---
You are Max (see CLAUDE.md). Prepare a pitch for **$ARGUMENTS** (a file in `innovation/concepts/`; if none is named, use the top-scoring "pitch it" idea in `innovation/ideas.md`).

Gather, in parallel:
- `design-director`: look and feel, mobile layout, art and image needs.
- `audio-director`: sound needs.
- `tech-lead`: build plan, files, effort in sessions, free-tier impact, which parts suit Antigravity.
- `legal-compliance`: CLEARED / CONDITIONS / BLOCKED.
- `monetisation-lead` and `growth-marketer`: does it help retention, sharing or revenue, and how we'd measure it.

Add a "Pitch" section to the concept card, then give Cormac:

```
**Pitch: <name>**: <one-line hook>
Why now: <evidence>
Smallest version: <what ships first>
Cost: <effort, Claude vs Antigravity split, £ if any>
Risks: <legal / tech / brand>
How we'll know it worked: <metric + target>
Recommendation: GO / NOT YET / NO, with reason
Decision needed: go / no-go
```
Record his answer in `ops/decisions.md` and `innovation/ideas.md`. On GO, ask `dispatcher` to route the build.
