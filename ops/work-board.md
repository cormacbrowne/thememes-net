# Work board

The dispatcher claims files here **before** work starts and releases them when a step ends. Two lanes never hold the same file. Hot files (`src/App.jsx`, `src/index.css`, `vercel.json`, `index.html`, `package.json`, `package-lock.json`, `supabase/migrations/`) are held by one lane at a time, and Gemini gets them only with tech-lead's OK.

**Active lane** (only used if there's no Gemini worktree, for strict turn-taking): `Claude`

**Gemini worktree:** not set up yet. Set up with:
`git worktree add ../thememes-net-gemini -b gemini/<task-slug> main`

Statuses: `claimed` → `in progress` → `in review` → `done`

## Active

| ID | Task | Agent | Lane (model / thinking) | Branch | Files claimed | Status | Updated |
|---|---|---|---|---|---|---|---|
| T-001 | First AI image batch: feed seed images (dank 01–04 pilot) | image-studio | Claude (prompts) → Gemini app images (Route A) | claude/… | `assets/prompts/B001-feed-dank-pilot.md`, `assets/inbox/B001/` | in progress: waiting for Cormac's Gemini run | 2026-11-21 |
| T-002 | Check Gemini image terms (commercial use, watermarks) before images publish at scale | legal-compliance | Claude | — | `ops/decisions.md` (D-003 only) | in review: CLEARED WITH CONDITIONS for new images; Cormac to confirm Media Watermark setting and decide on the 4 flagged library templates | 2026-11-21 |
| T-003 | **Priority over T-001 (Cormac asked for competition and auto-generated images).** Batch B002: replace the 20 flat templates with rich AI images. Order: prompts → design-director review → Cormac generates → image-studio curates → design, legal, QA | image-studio | Claude (prompts, curation, review) → Gemini app images (Route A, Cormac in his browser) | `claude/b002-template-images` | `assets/prompts/B002-templates.md`, `assets/inbox/B002/`, `assets/README.md` (Progress table). **Reserved, not being edited yet:** `public/seed/tpl-*.webp` (for T-003 curation) | live: 20 images in the battle rotation from 09:00 on 22 Nov (commit 3dfcaa3). Migration applied, `house-agent` v5 deployed. Open: replace otter before 7 Dec; move images into Forge and house memes | 2026-11-21 |

| T-004 | Hide the 4 copyright-flagged library templates (Cormac approved 21 Nov). Image files kept | Max, tech checks, qa-reviewer | Claude | `claude/b002-template-images` | `src/data/memeTemplates.js`, `src/utils/templateSeo.js`, `src/components/TemplateLibraryPage.jsx`, `src/components/SeoDiscoveryFooter.jsx`, `tests/unit/memeTemplates.unit.mjs`, `vercel.json` | done: live 21 Nov, redirects checked | 2026-11-21 |
| T-007 | Share text auto-linked "MEMES.net" to the wrong site (memes.net). Share and invite text now says "thememes.net" | Max | Claude | `claude/youthful-mendel-0wx8uf` | `src/utils/shareText.js` (new), `tests/unit/shareText.unit.mjs` (new), share calls in `DailyCaptionBattleModal`, `SeoDiscoveryFooter`, `GameRouter`, `BossKeyOverlay`, `MultiplayerRoom`, `GameShell`, `ArcadeLobby` | in review: lint/build/386 unit tests pass; needs qa-reviewer, then deploy on Cormac's OK | 2026-11-23 |
| T-008 | Slots: fast surge spin stopped working, "SURGE" shown twice | Gemini (Neon, high) | Antigravity | `gemini/slots-surge-fix` | `src/components/slots/reelMotion.js`, `src/components/VegasSlotMachine.jsx`, `src/components/VegasSlotMachine.css`, `tests/unit/slotSurge.unit.mjs`, `docs/ui/slots-surge/` | claimed: handoff H-20261123-01 waiting for Cormac to paste | 2026-11-23 |
| T-009 | Full backlog for prioritising (`ops/backlog.md`) | Max | Claude | — | `ops/backlog.md` | in review: waiting for Cormac's priorities | 2026-11-23 |

## Done (last 2 weeks)

| ID | Task | Agent | Lane | Finished |
|---|---|---|---|---|
| T-000 | Agent team set up | Max | Claude | 2026-11-21 |
| T-005/T-006 | Site polish and safety fixes (commit f65d82c) | team | Claude | 2026-11-22 |
