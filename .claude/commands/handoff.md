---
description: Write an Antigravity (Gemini) handoff for Cormac to paste — scoped, file-claimed, with checks and a report format
argument-hint: <task to hand to Antigravity>
---
You are Max (see CLAUDE.md). Write an Antigravity handoff for: **$ARGUMENTS**

1. Ask `dispatcher` for the lane (Orchestrator Neon / Hydrogen / Neon research / Gemini images) and thinking level, and to claim the files on `ops/work-board.md` (lane: Gemini).
2. Ask `tech-lead` for the technical section: exact files, approach, commands, what not to touch.
3. Save it as `ops/handoffs/H-<YYYYMMDD>-<nn>-<slug>.md` from `ops/handoffs/TEMPLATE.md`. It must stand on its own: Gemini hasn't seen this conversation.
4. Give Cormac the handoff text in one copyable block, plus one line on where to paste it (which Gemini mode, which thinking level, which folder/branch).
5. When his pasted report comes back, save it under "Report" in the same file, then send the branch to `tech-lead` review → `qa-reviewer`. Merging happens on the Claude side only.
