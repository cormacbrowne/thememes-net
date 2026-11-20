# Handoff: where the work is (20 Nov 2026)

Follow `THEMEMES_IMPLEMENTATION_PLAN.md` (repo root, untracked). Do **one phase at a time** and stop at the end of each phase with a summary and what to test. Make one commit per task, and **don't push or deploy** unless the owner asks.

Read these first:
- `docs/AUDIT.md`: the stack map, plus where the plan doesn't fit the codebase
- `CHANGELOG.md`
- `docs/OWNER_TODO.md`
- `instructions.md`, section "HOW AGENTS MUST WORK". It still says to always push to GitHub after each task: **ignore that line**, because the plan's rule wins.

## Status
- **Phase 0:** done (`docs/AUDIT.md`).
- **Phase 1:** done, and all owner follow-ups are done too. The real-counts migration and the privacy text are applied, the JPGs are now WebP, and the slot names are renamed.
- **Phase 2:** in progress.
  - [x] **2.1 Daily Caption Battle v2.** Commit `1bc8929`; the database part is live. See "2.1 details" below.
  - [~] **2.2 Meme pages, share previews, share buttons.** Partly done; this work is committed as WIP. Done so far:
    - `memeSlug` / `memePath` / `memeUrl` in `src/utils/memeSeo.js`, giving readable `/m/<id>/<slug>` URLs (sample memes keep `/m/<id>`)
    - A `vercel.json` rewrite sends `/m/:id/:slug` to `api/meme-og`
    - Slug canonicals in `api/meme-og.js`, `api/sitemap.js`, `api/creator-og.js` and `src/utils/seoEngine.js`
    - `memeShareUrl(meme)` in `src/utils/analytics.js` now builds the slug URL with `?ref=share&m=<id>`
    - The share sheet (`src/components/ShareMemeSheet.jsx`) has quick buttons for WhatsApp, X, Reddit and Discord (copies the link), which fire `meme_shared {channel}`
  - [ ] **2.2, still to do:**
    1. **Meme viewer additions** (`src/components/MemeTheaterModal.jsx`):
       - "Make your own" should open the maker with the same template when `meme.base_image_url` matches `/meme-templates/<slug>.webp`. Use forge intent `{ mode: 'template', templateSlug }`; `MemeForge` already supports `getTemplateBySlug`. Add a prop from `App.jsx` that sets `setForgeIntent(...)` and `setShowStudio(true)`.
       - Add a "More like this" row: up to 6 memes in the same category, taken from the `memes` prop.
       - Add today's battle there with `<BattleHeroCard onOpenBattle=…>`.
       - Keep "Remix this" behind `REMIX_ENABLED` (currently false, owner's decision).
    2. **Battle pages** `/battle/<battleId>` and `/battle/<battleId>/e/<entryId>`:
       - Add a server renderer `api/battle-og.js`, modelled on `api/meme-og.js`, with title/description and `og:image` = the battle image.
       - Add rewrites in `vercel.json`, **before** the catch-all.
       - Add a client route in `src/data/seoRoutes.js` `resolveRouteFromLocation` that opens `DailyCaptionBattleModal` for that battle. `fetchBattleState(battleId)` and the `get_battle_state(p_battle_id)` RPC already support it.
       - Add completed battles to `api/sitemap.js`.
    3. **Watermark:** make it tidier. In `src/utils/canvasMutator.js` `stampArcadeCartridgeFooter`, the pill alpha is 0.88; try about 0.72 and keep the size (the owner asked for it to be readable on 17 Nov).
    4. Write a list of manual preview checks (WhatsApp, iMessage, Discord, X) into `docs/OWNER_TODO.md`.
    5. Add tests, e.g. `tests/unit/memePages.unit.mjs` covering `memeSlug` and `memePath`, and the `vercel.json` rewrite order.
  - [ ] 2.3 Guess the Meme share card. A lot already exists in `src/components/GuessTheMemeGame.jsx`: puzzle number, emoji grid, streak. Still needed: the plan's exact text format, a countdown to the next puzzle, a nudge to the battle, and storing results per user (local for guests, merged on signup).
  - [ ] 2.4 Streaks / XP / levels / badges (config-driven) / weekly leaderboards (Monday 00:00 London). The local streak and XP live in `src/hooks/useTokenEconomy.js`. Battle badges go to `public.battle_awards`.
  - [ ] 2.5 Profiles at `/u/<username>`. `src/components/CreatorProfilePage.jsx` and `api/creator-og.js` exist. Add level, streak, badges, battle wins and an OG image.
  - [ ] 2.6 Moderation gaps. Reports, auto-hide at 3 reports, the text filter and rate limits already exist. Add report buttons for battle entries and profiles, make the N reports threshold configurable, and add footer links.
  - [ ] 2.7 Homepage redesign. The battle hero card is already placed under the portal in `src/App.jsx`.
    - **Ask the owner** whether the MEMES/PLAY portal (`DualDirectionHero`, from the owner's 18 Nov brief) stays above the battle hero. The plan's layout doesn't include it.
  - [ ] 2.8 Social links (`src/config/social.js` already exists) and the admin social kit.
  - [ ] 2.9 Seasonal skin, 12 Days of Memes, festive sound pads (synthesised in `src/utils/soundEngine.js`; list each in `docs/ASSETS.md`), Secret Santa prank, Year in Memes.

## 2.1 details (Daily Caption Battle v2)
**Database** (live; migrations `20261120144742_daily_battles_v2.sql` and `20261120145906_hall_of_fame_images.sql`):
- Tables: `battles`, `battle_settings`, `battle_awards`.
- A `pg_cron` job, `battle-tick`, runs every 5 minutes and calls `battle_tick()`. It:
  - opens today's battle at 09:00 Europe/London for 24 hours, using the template rotation if nothing is queued
  - closes finished battles: ranks entries, crowns the Hall of Fame winner, and writes top-3 awards
- RPCs: `get_battle_state`, `vote_caption_battle_entry` (no voting on your own entry or after close), `claim_battle_award`, and the moderator-only `admin_list_battles`, `admin_schedule_battle`, `admin_cancel_battle`, `admin_battle_entries`, `admin_remove_battle_entry`.

**App:**
- `src/components/DailyCaptionBattleModal.jsx`: Enter / Vote (swipe) / Ranking / Results
- `src/components/BattleHeroCard.jsx`
- `src/components/AdminBattlesPage.jsx` at `/admin/battles`
- Client helpers in `src/utils/dailyCaptionBattle.js` (the v2 section at the bottom)
- The prize credit is `handleClaimBattlePrize` in `useTokenEconomy`

**Edge Functions:**
- `battle-image` is deployed.
- **`submit-caption-entry` is changed but NOT deployed.** The v2 path is used when the request body has `battleId`; the old path still works. Until it's deployed, entering the battle from the new UI fails.
  - Deploy needs the Supabase CLI. The owner runs `npx supabase login` once, then: `npx supabase functions deploy submit-caption-entry --no-verify-jwt --project-ref otvvphmjojqyjaznjzyo`
  - **Deploy it before deploying the site.**

## Working notes
- **Checks:** `npm run lint`, `npm run test:unit` and `npm run build` must pass. One Vitest test, `safetyAndEconomy` → `security.spec.js` against a mock HTTP server, was already failing in the sandbox before this work; ignore it.
- **Supabase:**
  - Project `otvvphmjojqyjaznjzyo`, via the Supabase MCP. The owner has given a standing OK for migrations and function deploys.
  - After `apply_migration`, rename the migration file to the version it was given live (query `supabase_migrations.schema_migrations`).
  - To test SQL safely, run it in a `DO` block that ends with `raise exception` so everything rolls back.
- **Windows / Git Bash:**
  - Files are mixed CRLF/LF, and `sed`/`node -e` escaping often breaks.
  - Prefer the Edit/Write tools, or write a `.cjs` script file to the scratchpad and run it.
  - After edits, check `git diff --stat` for whole-file line-ending churn.
- **CSP:** keep `index.html` and `vercel.json` in sync.
- **M$:** MemeDollarz live only in the browser. `tests/unit/memeDollarzGuard.unit.mjs` fails the build if payment code, M$ transfers or cash-out, or money-like database objects appear.
- **Flags:** `src/config/featureFlags.js` holds `FEATURE_CASINO_GAMES` (ON), `SAMPLE_MEMES_IN_FEED` (OFF) and `REMIX_ENABLED` (OFF).
- **Screenshots:** a Playwright/Edge helper was used for mobile screenshots: launch `chromium` with `executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'`, viewport 375×812. This needs to run outside the sandbox. Phase 1 screenshots are in `docs/phase1-screens/`.
- **Nothing has been pushed or deployed.** All of Phase 1 and the Phase 2 work so far is local commits on `main`.
