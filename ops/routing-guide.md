# Routing guide

The dispatcher applies these rules. They change only through `/retro`, with evidence, logged in `playbook-changelog.md`.

## Lanes

| Lane | Use it for | Don't use it for |
|---|---|---|
| **Claude Code** (Max + specialists) | Judgement, design decisions, invention, writing specs and handoffs, anything touching security / RLS / money / moderation / legal, migrations, review, QA, merging | Long mechanical edits across many files when Claude usage is tight |
| **Antigravity Orchestrator: Neon** | Builds from an approved written spec: a game from its concept card, a feature with a clear file list | Open-ended design, anything without a spec, security-sensitive code |
| **Hydrogen** | Quick and bulk work: renames, repetitive edits, many-file conversions, copy changes, simple tests | Anything needing judgement |
| **Neon in the Gemini app** | Research: trends, competitor scans, docs lookups. Returns notes | Code |
| **Gemini app images (Nano Banana)** | Generating images from `assets/prompts/` batches. Pro: up to ~100 images/day per Google's help page (limits change; check) | Curation, conversion, placement (image-studio does those on Claude) |

## Thinking levels
- **Claude:** normal for most tasks; ask for a careful pass on migrations, RLS/security, money/token economy, legal, and QA of big changes.
- **Gemini:** *low* for Hydrogen bulk work; *medium* for standard builds; *high* for builds touching game engines, multiplayer, or more than ~8 files.

## Always on Claude
Review, QA, merging, migrations, `vercel.json` / CSP, `securityGuard.js`, `tokenEconomy.js`, moderation, anything legal.

## Parallel work
- Split by file ownership, never within a file.
- Claude on `claude/…`, Gemini on `gemini/…`, preferably in `../thememes-net-gemini`. No worktree → strict turn-taking via "Active lane" on the work board.
- Every step ends with tech-lead review (code) and qa-reviewer.

## When Claude usage is tight
Move spec'd builds and bulk edits to Antigravity; use Route A for images; batch reviews. Never skip QA to save usage.

## Routing notes from retros
_(none yet)_
