# AGENTS.md: rules for any coding agent that isn't Claude Code

This file is for **Google Antigravity (Gemini)** and any other agent working in this repo. Claude Code reads `CLAUDE.md`. Both files describe the same team.

thememes.net is run by an agent team. **Max** (the Director, in Claude Code) plans and assigns all work. Cormac (the owner) pastes Max's handoffs into Antigravity. **You only do the task in the handoff you were given.**

## The stack (what the code really is)
- Vite 8 + React 19 single-page app in `src/` (not Next.js). Tailwind 4, design tokens `--tm-*` in `src/index.css`.
- Vercel serverless functions in `api/`, rewrites and CSP in `vercel.json`.
- Supabase: migrations in `supabase/migrations/`, Edge Functions in `supabase/functions/`.
- Checks: `npm run lint`, `npm run build`, `npm run test:unit`.

## Working in the shared folder
1. **Use your own worktree and branch.** Preferred setup (once, by Cormac):
   ```
   git worktree add ../thememes-net-gemini -b gemini/<task-slug> main
   ```
   Open `../thememes-net-gemini` in Antigravity. Branch names always start with `gemini/`.
   If there is no worktree, **strict turn-taking**: only work while `ops/work-board.md` shows the Gemini lane active and Claude idle.
2. **Only touch the files the handoff lists.** They are claimed for you on `ops/work-board.md`. If you need another file, stop and say so in your report; don't edit it.
3. **Never** push to `main`, merge, deploy, run production migrations, change `vercel.json` CSP, change secrets, or install new dependencies unless the handoff says so explicitly.
4. **Never** edit `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.claude/`, or anything in `ops/` except your row on `ops/work-board.md` (status only).
5. Review, QA and merging happen on the Claude side. You hand back; you don't ship.

## Repo rules you must keep
Read `instructions.md` → "HOW AGENTS MUST WORK". The short version:
- `src/App.jsx` is huge: targeted edits only, never reformat it.
- Component styles go in that component's own CSS file (cascade rule).
- New CSS uses tokens only: no raw hex, raw px font sizes, raw z-index, or `!important`.
- Don't break the token economy (`validateStakedGamePayout`), lazy loading, `prefers-reduced-motion`, lite mode, or the CSP.
- No audio before a user gesture (`touchend`/`click`/`pointerup`/`keydown`).
- Every new public route goes in the SEO routes and sitemap, with a `vercel.json` rewrite before the catch-all.
- Images: never real people, copyrighted characters, logos or brands.

## Before you hand back
- `npm run lint` and `npm run build` exit 0 (and `npm run test:unit` if you touched logic).
- For anything visual: screenshots at 390×844 and 1280×800 saved under `docs/ui/<task-slug>/`.
- Commit on your `gemini/…` branch with a clear message. Push the branch only if the handoff says to.

## Report format (paste this back to Cormac, who gives it to Max)
```
HANDOFF REPORT: <handoff id>
Branch: gemini/<slug>   Last commit: <sha>
Done: <bullets>
Files changed: <list>  (anything outside the claimed list? say why)
Checks: lint <pass/fail>, build <pass/fail>, unit <pass/fail/n.a.>
Screenshots: <paths or "n.a.">
Not done / problems: <bullets>
Questions for Max: <bullets or "none">
```
