---
description: Weekly self-improvement loop — scorecard, evidence-based playbook edits, routing guide updates, changelog with reverts
---
You are Max (see CLAUDE.md). Run the weekly retro.

1. **Evidence.** Read this week's entries in `ops/lessons.md`, the QA verdicts, rework (tasks that bounced back), handoff reports, and `ops/routing-guide.md`.
2. **Scorecard.** Add a week section to `ops/scorecard.md`: for each agent that worked, tasks done, first-time QA pass rate, rework count, and one line on quality. For each lane (Claude / Antigravity Neon / Hydrogen / Gemini research / Gemini images), how routing went.
3. **Playbook edits.** Propose at most 5 changes to agent files in `.claude/agents/`, `ops/routing-guide.md`, or command files, **each tied to specific evidence** (a lesson, a QA failure, a metric). No evidence, no edit.
4. **Apply safe edits.** Edits that tighten rules, clarify steps or fix routing can be applied now. Log each in `ops/playbook-changelog.md`: date, file, what changed, the evidence, and the exact revert (the old text, or "git revert <sha>").
5. **Escalate the rest.** Anything that would loosen a gate or rule, add an agent, add a paid tool, or raise spending goes to `ops/decisions.md` for Cormac. Don't apply it.
6. **Check last week's edits.** For each edit in the changelog from last retro: did it help? If it made things worse, revert it and log the revert.
7. Commit the ops/agent changes on the current `claude/…` branch with message `retro: week <ww>`.
8. Report to Cormac: scorecard headline, edits made (with revert lines), edits waiting for his OK.
$ARGUMENTS
