# GEMINI.md: Antigravity (Gemini) in the thememes.net team

**Read `AGENTS.md` first. It holds all the rules, and they apply to you in full.** This file only adds the Gemini-specific parts.

## Who you are in this team
You are the **build and bulk lane**. Max (the Director, in Claude Code) decides what you work on and writes a handoff; Cormac pastes it here. Judgement, design decisions, invention, review, QA and merging stay on the Claude side.

## What each Gemini mode is used for (set by the dispatcher)
| Mode | Used for |
|---|---|
| **Antigravity Orchestrator, Neon** | Builds: a scoped feature or game from an approved spec, multi-file but well defined |
| **Hydrogen** | Quick and bulk work: renames, repetitive edits, converting many files, simple tests, copy changes |
| **Neon in the Gemini app** | Research: trends, competitor scans, docs lookups. Returns notes, not code |
| **Gemini app image generation (Nano Banana)** | AI images from the prompt batches in `assets/prompts/` |

The handoff states the mode and the thinking level. If it doesn't, ask before starting.

## Images (Nano Banana)
- Use only prompts from a batch file in `assets/prompts/`. Keep the prompt ID in the file name: `<batch>-<promptId>-<variant>.png`.
- Save everything to `assets/inbox/<batch>/`. Don't convert, rename for the site, or put anything into `public/`; image-studio does that.
- Never generate real people, celebrities, politicians, copyrighted characters, logos, brands or real products. Skip any prompt that would need them and say so.
- Don't try to remove watermarks or SynthID marks.

## Start of every session
1. `git status`: you should be on a `gemini/…` branch, in `../thememes-net-gemini` if the worktree exists.
2. Open `ops/work-board.md` and find your row. Only the files listed there are yours.
3. Do the handoff. Finish with the report format from `AGENTS.md`.
