# Work board

The dispatcher claims files here **before** work starts and releases them when a step ends. Two lanes never hold the same file. Hot files (`src/App.jsx`, `src/index.css`, `vercel.json`, `index.html`, `package.json`, `package-lock.json`, `supabase/migrations/`) are held by one lane at a time, and Gemini gets them only with tech-lead's OK.

**Active lane** (only used if there's no Gemini worktree, for strict turn-taking): `Claude`

**Gemini worktree:** not set up yet. Set up with:
`git worktree add ../thememes-net-gemini -b gemini/<task-slug> main`

Statuses: `claimed` → `in progress` → `in review` → `done`

## Active

| ID | Task | Agent | Lane (model / thinking) | Branch | Files claimed | Status | Updated |
|---|---|---|---|---|---|---|---|
| T-001 | First AI image batch: feed seed images (dank 01–04 pilot) | image-studio | Claude (prompts) → Gemini app images (Route A) | claude/… | `assets/prompts/B001-feed-dank-pilot.md`, `assets/inbox/B001/` | claimed | 2026-11-21 |
| T-002 | Check Gemini image terms (commercial use, watermarks) before images publish at scale | legal-compliance | Claude | — | `ops/decisions.md` (D-003 only) | claimed | 2026-11-21 |

## Done (last 2 weeks)

| ID | Task | Agent | Lane | Finished |
|---|---|---|---|---|
| T-000 | Agent team set up | Max | Claude | 2026-11-21 |
