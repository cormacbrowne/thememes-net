# THE MEMES.net — Phase 0 Audit (20 Nov 2026)

Phase 0 of `THEMEMES_IMPLEMENTATION_PLAN.md`. Nothing in the app or database was changed. I checked the live data with read-only SQL against Supabase project `otvvphmjojqyjaznjzyo`.

---

## 1. Stack map

| Area | What's actually there |
|---|---|
| Framework | **React 19 + Vite 8**, plain JavaScript (no TypeScript), single-page app. `src/App.jsx` (~2,400 lines) is the coordinator. |
| Routing | **No router library.** A custom path → `viewMode` mapper lives in `src/hooks/useViewMode.js`. Each SEO route is defined in `src/data/seoRoutes.js`. |
| Server rendering | None at runtime for the app. **Build-time prerender** (`scripts/prerender-seo.mjs`) writes a static HTML shell per route into `dist/`. Vercel serverless functions in `api/` render meme pages (`meme-og.js`), creator pages (`creator-og.js`), the sitemap and 404s. |
| Styling | Tailwind v4 plus large hand-written CSS (`src/index.css` is ~5,100 lines, plus one CSS file per component). Neon tokens come from Phase 35.2. |
| State | React state and hooks (`useFeed`, `useTokenEconomy`, `useAuth`, `useRadio`…), with a lot of `localStorage` (`tm_*` keys). No Redux/Zustand. |
| Database | **Supabase Postgres** with RLS on every table. Migrations live in `supabase/migrations/` (32 files). All writes go through RPCs or Edge Functions. |
| Auth | Supabase Auth: email/password, magic link, Google, Discord. Profiles are in `public.profiles` with roles `user` / `moderator` / `admin`. |
| Storage | Supabase buckets: `memes` (public, WebP/GIF), `quarantine` (private staging), `share-cards`, and a legacy `meme-images`. Seed memes are static files in `public/seed/`. |
| Server functions | Supabase Edge Functions: `publish-meme`, `moderate`, `post-comment`, `submit-caption-entry`, `profile`, `delete-account`, `share-card`, `ai-caption`. |
| Scheduled jobs | `pg_cron`: moderation digest (08:00 UTC), Pulse salt rotate, daily rollup and weekly digest. **There are no battle open/close jobs.** |
| Hosting | **Vercel** (`vercel.json`: rewrites, CSP and security headers). The GitHub Actions are `safety-ci.yml` and `indexnow.yml`. |
| Analytics | Three things are in use today: **Vercel Analytics** (`@vercel/analytics`), **Pulse** (first-party, cookieless, in Supabase, migration 35.1) and **Microsoft Clarity** (inline script in `index.html`, which sets cookies and records sessions). `src/utils/analytics.js` already has a `safeTrack()` wrapper that sends to Pulse and Vercel. |
| Feature flags | `src/config/featureFlags.js` (plain constants, not environment variables): `PUBLIC_UPLOADS_ENABLED = true`, `REMIX_ENABLED = false`. |
| Tests | `node:test` (21 files in `tests/unit`), Vitest (21 files in `tests/vitest`), Playwright smoke and security specs. Run them with `npm run test:unit`, `npm run lint` and `npm run build`. |

**Repo conventions.** `instructions.md` holds the existing agent rules and the open roadmap, and `docs/HISTORY.md` holds completed work. These rules still apply: put each component's CSS in its own file, keep the CSP the same in **both** `index.html` and `vercel.json`, and never commit a static `sitemap.xml`.

---

## 2. Where things live

| Feature | Files |
|---|---|
| Homepage (first screen) | `src/components/DualDirectionHero.jsx` (MEMES / PLAY buttons), `NeonSign.jsx`. The prerendered boot shell is the `/` branch in `scripts/prerender-seo.mjs`. |
| Feed / meme cards | `src/hooks/useFeed.js`, `VirtualizedMemeGrid.jsx`, `MemeCard.jsx`, `MemeMedia.jsx`, `SwipeDeck.jsx`. The DB view is `memes_feed_view`. |
| Meme maker (PNG + GIF) | `src/components/forge/` (`MemeForge.jsx`, `forgeEngine.js`), `MemeStudioModal.jsx`, `QuickUploadBar.jsx`, `utils/publishMeme.js`, `utils/mediaPipeline.js` (uses gifenc/gifuct). |
| Reels | `src/components/VerticalReelsView.jsx` |
| Caption Battle | `DailyCaptionBattleModal.jsx`, `utils/dailyCaptionBattle.js`, migration `…14_33_15_daily_caption_battle.sql`, Edge Function `submit-caption-entry` |
| Bounties | `DailyBountyBanner.jsx`, `DAILY_BOUNTIES` in `data/starterMemes.js`, and `memes.is_bounty` / `bounty_id` |
| Remix | `forge/MemeForge.jsx` (remix mode), `MemeEvolutionModal.jsx`, `memes.parent_meme_id` / `root_meme_id`. **Switched off** by `REMIX_ENABLED = false` (owner decision, 17 Nov). |
| Hall of Fame | `HallOfFamePage.jsx`, `LeaderboardModal.jsx`, RPC `get_caption_hall_of_fame` |
| Guess the Meme | `GuessTheMemeGame.jsx` |
| Arcade and games | `ArcadeLobby.jsx`, `GameRouter.jsx`, catalog in `data/arcadeGamesCatalog.js` (22 games, 4 groups), one component per game (`Vegas*.jsx`, `NeonBingoGame.jsx`, `MemeInvadersGame.jsx`…), multiplayer in `components/multiplayer/` and `utils/multiplayer/` |
| MemeDollarz wallet | `utils/tokenEconomy.js` (rules, balance key `tm_tokens_balance_v2`), `hooks/useTokenEconomy.js`, `scripts/check-currency.mjs` (lint check) |
| Prank screens | `BossKeyOverlay.jsx` (Excel, Zoom/Teams, BSOD, Update, Terminal, AI), `CrackedScreenPrank.jsx` (iPhone/iPad), `PrankScreensPage.jsx`, `BOSS_SCREENS_CATALOG` |
| Profile | `CreatorProfilePage.jsx` (public `/u/<handle>`), `PlayerProfileModal.jsx`, `SettingsSheet.jsx`, `PixelAvatarPicker.jsx` |
| House Rules / Terms / Privacy / Takedown / Contact | `data/legalPages.js` → `LegalInfoPage.jsx` (`/rules`, `/terms`, `/privacy`, `/takedown`, `/contact`) |
| Moderation | `ModerationPage.jsx` (`/admin/moderation`), `ReportSheet.jsx`, RPCs `report_item`, `mod_queue`, `mod_apply_decision` |

---

## 3. Vote and reaction counts: real or fake?

**How real counts work.** `memes.score = base_score + net votes`, and `memes.reactions = base_reactions + active reaction rows`. Both are kept in sync by DB triggers from the `votes` and `reactions` tables (migration 33.8). The browser can't write them.

**Finding A: the big numbers are client-side seed memes.** `src/data/starterMemes.js` defines **60 hard-coded @TheMemesHQ memes** with scores of **440–1,680**, reactions of 14–190 each, and `mutation_count` of 1–4. Two things make them look fake:
- `created_at` is set to `Date.now() − 35 min − idx × 42 min` (`SEED_BASE_TIME`, line ~272), so the newest always reads **"35m ago"** whenever the page is loaded.
- They are merged into the feed in `useFeed.js` (lines ~137–142 and ~437), and also used in the prerendered homepage, `api/meme-og.js`, Higher or Lower and Meme Invaders.

Because these scores are ≥ 500, `getMemeRarityTier()` (`starterMemes.js:735`) gives most of them **⚡ HEATING UP** or **🔥 VIRAL SUPERNOVA**. Votes on seed memes are only stored locally and never reach the DB. The tier thresholds (500 / 1,500 points, or any remix) are hard-coded.

**Finding B: small baseline inflation in the database.** Migration 33.8 froze older client-side score bumps into `base_score` / `base_reactions`:
- Approved memes: 6 rows with `base_score > 1` (17 extra points in total) and 11 rows with non-zero `base_reactions`.
- Removed memes: 13 rows (57 points) and 18 rows.
- New memes also start at `base_score = 1`, so every meme shows one "upvote" that nobody cast.

**What this means for Phase 1.1:**
- The "reset @TheMemesHQ counts" migration isn't a DB migration. Those posts only exist in code, so the fix is to set their scores and reactions to 0 (or hide the counts) and give them a fixed, honest date.
- A **separate, small reversible DB migration** is needed to zero `base_score` / `base_reactions`, with the old values backed up first. It touches 19 score rows and 29 reaction rows.

Other number checks:
- `ViralTickerBar` has no `Math.random`.
- There are no "online now" counts.
- `upvotes_last_hour` comes from a real RPC.

---

## 4. Test and junk data in production

| What | Where | State |
|---|---|---|
| `TestOne` posts | `memes.author_name = 'TestOne'` | **2 approved** ("Mundays", and "REMIX: REMIX: REMIX: ME PRETENDING TO LISTEN…"), 3 removed |
| `Sooper2`, `LAZY1`, `AnonMemer`, `MemLege`, `MemeLedge`, `cormac0000` | `memes` | Look like owner/test accounts. Sooper2 has 1 approved ("REMIX: Production deploys…"). AnonMemer has 4 approved. |
| Stacked `REMIX:` titles | `memes.title` | 13 titles start with `REMIX:`; 3 are stacked (`REMIX: REMIX:…`), **1 of those is approved** |
| Where the prefix comes from | `forge/MemeForge.jsx:125` and `:152` | It adds `REMIX: ${parent.title}`, so remixing a remix stacks the prefix. `parent_meme_id` is already stored (10 rows), so the plan's `remix_of_id` already exists as `parent_meme_id`. |
| Test user profiles | `profiles` | No usernames contain "test". These memes' `user_id`s have **no claimed username** (they're older anonymous accounts). There are 159 profile rows, mostly anonymous sign-ins. |
| "Nobody knows who's plan" | Not found in the DB or source code | It's probably **baked into a seed image** in `public/seed/*.webp`. It needs a visual check, and the image would have to be re-rendered. |
| Orphaned Storage test files | `memes/u/…` (4 files, listed in `instructions.md` 33.54e) | Still open |

The live database is small: **13 approved memes, 6 votes, 0 caption-battle entries, 0 winners.**

---

## 5. MemeDollarz: can they be bought, transferred or cashed out?

**No. There is no path for any of the three.**
- The balance only exists in the visitor's **browser `localStorage`** (`tm_tokens_balance_v2`). There's no wallet table, no RPC and no Edge Function for it.
- There's no Stripe, PayPal or other payment code anywhere, and no purchase, transfer, gift, redeem or withdraw code.
- Multiplayer poker and twenty-one use **table-only chips** (`mpPokerEngine.js`: "Table chips only"), which are separate from M$.
- Cosmetics (`data/cosmetics.js`) are unlocked by playing and earning; they aren't sold.
- `scripts/check-currency.mjs` already runs in `npm run lint`.

**Plan mismatch (1.6):** you can't add a "server-side guard" to a wallet that doesn't exist on the server. Proposed instead:
1. A unit test that fails if any migration, Edge Function or `api/` file adds a wallet/balance table, a payment SDK, or a transfer/cash-out RPC.
2. A comment at the top of `tokenEconomy.js` stating the rule.

The upside is that since the balance is local and editable, it obviously has no value. If M$ ever moves to the server (for example the Phase 4.3 shop), the guard must be built then.

---

## 6. Homepage speed

- **HTML:** prerendered. `#root` already contains a **boot screen** (neon logo SVG plus three loading dots, `.tm-boot`). The **MEMES / PLAY buttons and quick links are *not* in the HTML**; they appear only after React boots.
- **JS on the critical path** (raw, before gzip):
  - main `index-*.js` **512 KB**, react-vendor 219 KB, supabase 214 KB
  - modulepreloaded on every visit: `soundEngine` 77 KB, `tokenEconomy`, `cosmetics`, `radioBus`
  - That's roughly **1 MB of JS** before the buttons can show, which matches the "blank sun for about 3 seconds" on mobile.
- **Warm-cache check in the built-in browser at 375×812:** FCP 312 ms, LCP 428 ms, CLS 0. These figures came from a cached repeat visit, so they **don't reflect a first visit on 4G**.
- **Lighthouse was not run.** It needs to launch Edge outside the sandbox, and that permission was refused in this session. To get the baseline, run it yourself, or allow it and I'll run it:
  ```powershell
  npx lighthouse https://www.thememes.net/ --form-factor=mobile --only-categories=performance --view
  ```
- **Microsoft Clarity** loads on first paint as well, adding a third-party script and cookies.

---

## 7. Search foundations

| Item | Status |
|---|---|
| `sitemap.xml` | ✅ Generated live by `api/sitemap.js` (183 URLs, includes meme images and creators). It responded in ~2.0 s, which is slow but works. |
| `robots.txt` | ✅ Exists and points to the sitemap. Only `/admin/` is blocked; **`/api/` and profile-edit routes are not.** |
| Canonical tags | ✅ Set per route by the prerender (`prerender-seo.mjs:162`) and by `meme-og.js` / `creator-og.js`. |
| Open Graph | ✅ 30 static per-route cards in `public/og/` (from `scripts/generate-og-cards.mjs`), plus dynamic per-meme and per-creator OG. `og:site_name` is "THE MEMES.net". |
| Structured data | ✅ `Organization` + `WebSite` (with SearchAction) in `index.html`. Whether `sameAs` is filled in still needs checking in Phase 1.5. |
| IndexNow / Bing | ✅ Key file and GitHub Action are in place. `BingSiteAuth.xml` is present. |

---

## 8. Arcade / casino state

- The catalog has **22 games**. The **casino group has 9**: bingo, coin pusher, roulette, blackjack, poker, Thousand (1000), slots, 8-ball oracle and Neon Derby (horse racing). The rest are 8 skill games, 4 meme games and 1 market sim.
- `ARCADE_LOBBY_GROUPS` lists **"Vegas Room" last**, but the catalog array lists the casino games **first**.
- "Las Vegas" / "Vegas" naming appears in SEO titles and H1s (`seoRoutes.js` slots and pinball), component names (`Vegas*.jsx`) and copy ("casino chips & MemeDollarz buy-ins").
- **Game count:** the H1 already uses the computed `ARCADE_GAME_COUNT` (22). Two places are still hard-coded to **"15"**:
  - `seoRoutes.js:169` (lobby description)
  - `scripts/generate-og-cards.mjs:23` and `:61` (the OG card says "15 FREE GAMES")

---

## 9. Risks (short list)

1. **Fake engagement on the most visible content.** The seed memes show 440–1,680 upvotes "35m ago" with VIRAL badges. This is the biggest trust problem and the easiest one to fix.
2. **Microsoft Clarity runs without a consent banner.** It sets cookies and records sessions. In the UK/EU this needs consent, and the privacy page should be checked to see whether it mentions Clarity. Remove it, or put it behind consent, in Phase 1.4.
3. **Junk content is live:** 2 TestOne posts, a stacked REMIX title and an "AnonMemer" set, out of only 13 approved memes in total.
4. **Slow first paint on mobile.** About 1 MB of JS gates the main buttons.
5. **Casino-heavy arcade.** 9 of 22 games use casino framing, with "Vegas" naming, and casino games come first in the catalog order. The M$ rules are sound because the balance is local, but the framing matters for ad networks.
6. **Docs drift.** `instructions.md` tells agents to always `git push origin main` after every task. That **conflicts with this plan's rule 6** ("Don't push or deploy unless I ask"). **I'm following this plan: commits only, no pushes.**

---

## 10. Where the plan doesn't fit the codebase (proposed changes)

| Plan item | Reality | Proposal |
|---|---|---|
| 1.1 "Migration to reset @TheMemesHQ counts" | The seed posts aren't in the DB | Fix them in code (scores and reactions → 0, honest fixed date or "Sample" label), and add a separate reversible migration for the DB `base_score` / `base_reactions` |
| 1.2 Remix titles / `remix_of_id` | Remix is **off** (`REMIX_ENABLED=false`), and `parent_meme_id` already exists | Fix the prefix code and clean the 13 titles; no new column needed. The "Remix of…" link only matters if you switch remix back on. |
| 1.2 `is_test` flag on users | The test memes' accounts have no profile username | Add `memes`-level hiding (status `removed`, which is reversible) or an `is_test` flag on `profiles`. **I'll ask before touching them.** |
| 1.4 Plausible + `track()` wrapper | A wrapper exists (`safeTrack`) and Pulse is already a cookieless first-party provider | Rename/expose it as `track(event, props)`, keep Pulse (and Vercel) as the providers, add the missing events, and drop or gate Clarity. **You choose whether Plausible is still wanted.** |
| 1.4 `?ref=share` | Already on `/m/<id>` shares (`ShareMemeSheet`, `MemeLiveCelebrationModal`) | Add the `m=` parameter and cover the other share points (games, pranks, battle) |
| 1.5 Sitemap / robots / canonical | Mostly done | Small gaps only: block `/api/` in robots, check `sameAs`, add `docs/SEO_SETUP.md` |
| 1.6 Server-side M$ guard | The wallet is browser-only | A code-level test guard (see section 5) |
| 2.1 Battle data model (`battles` table, image uploads, 09:00 London, cron) | The existing battle is **keyed to a UTC date, picks a template automatically, and has no admin queue or cron**. Its tables are `caption_battle_entries` / `_votes` / `_winners`. | Add a `battles` table and point the existing entries/votes at it (`battle_id`), rather than starting from scratch. Add `pg_cron` open/close jobs and a London-time schedule. |
| 2.2 `/m/<shortId>/<slug>` | `/m/<uuid>` already exists (server-rendered with OG) | Add an optional slug segment plus a redirect; keep the old URLs working |
| Feature flags as env vars | Flags are constants in `featureFlags.js` | Keep that file as the single switchboard, adding `FEATURE_ADS`, `FEATURE_PRO`, `FEATURE_PUSH`, `FEATURE_VIDEO_EXPORT`, `FEATURE_CASINO_GAMES`. Use `VITE_` environment overrides only where useful. |

---

## 11. Owner questions before Phase 1

1. **Test content:** may I hide (set status `removed`, which is reversible) the 2 approved TestOne memes, the approved stacked-REMIX meme and the AnonMemer posts? Or should any of them stay?
2. **Seed memes:** keep the 60 @TheMemesHQ samples showing **0 counts and a "Sample" tag**, or drop them from the feed now that real memes exist? There are only 13 real memes, so the feed would look thin without them.
3. **Analytics:** keep Pulse + Vercel, and **remove Clarity**? Or add Plausible?
4. **Lighthouse:** run it yourself (command above), or allow me to run it outside the sandbox.
