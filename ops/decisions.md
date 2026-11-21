# Decisions

Max collects decisions here. Open ones go into every report to Cormac until they're answered. Each has a recommendation.

## Open

### D-002: Monthly spending cap
Set a monthly cap for new spend in `budget.md` (currently £0).
**Recommendation:** keep £0 until there's a specific need; decide per item.

### D-003: Gemini AI images: commercial use and watermarks
Before images from the Gemini app are published on the site at scale, legal-compliance checks Google's current terms: may outputs be used commercially on a site that later carries ads, who owns them, are visible watermarks or SynthID marks present and must they stay, and is any AI-content labelling needed.
**Status:** check pending (T-001/T-002 on the work board). The pilot batch (4 images) can be generated and curated, but **not published** until this is CLEARED.
**Finding:** _(legal-compliance fills in, with sources and date)_

### D-004: Gemini worktree
Set up `../thememes-net-gemini` as a git worktree for Antigravity (recommended), or use strict turn-taking in one folder.
**Recommendation:** worktree. One command, `git worktree add ../thememes-net-gemini -b gemini/<task-slug> main`, then open that folder in Antigravity.

### D-005: Recognisable meme template names
Some existing template files reference real people or characters by name (for example `tpl-spiderman-point`, `tpl-gigachad-verdict`, `tpl-woman-yelling-cat`). legal-compliance to review whether the names, the images, or both should change as part of the image replacement.
**Recommendation:** replace with original AI images and neutral names during the feed image work.

## Decided

### D-001: The stack is Vite + React, not Next.js (21 Nov 2026)
The team brief said "Next.js/Vercel/Supabase". The code is a Vite 8 + React 19 single-page app with Vercel serverless functions in `api/` and Supabase. The agent files describe the real stack. Moving to Next.js would be a big migration and is **not** planned; it would need its own pitch and Cormac's OK.
