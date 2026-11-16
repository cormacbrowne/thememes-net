# THE MEMES.net (`thememes-net`) — Codebase Structure & Update Instructions

> **Purpose of this file:** This document serves as the living architectural reference, key design decisions log, file map, backend contract, and phased roadmap for **THE MEMES.net** (`c:\Users\corma\thememes-net`). Consult and update this file during regular updates until the platform is perfected.

---

## 🤖 HOW AGENTS MUST WORK ON THIS REPO (read before touching code)

1. **One task at a time, in the order listed in Section 0.** Pick the first unticked `[ ]` task, finish it fully, verify it, tick it, commit, then move on. Never do several half-tasks.
2. **Read before editing.** `src/App.jsx` is ~81 KB. Never rewrite or reformat it wholesale. Use targeted edits only. Search for the exact identifier (e.g. `viewMode === 'roulette'`) and edit around it.
3. **Verify every task:** `npm run build` and `npm run lint` must both exit 0 (these run fine inside the sandbox). Then check the UI at **390×844 (iPhone)**, **768×1024 (iPad)**, and **1280×800 (laptop)** with browser dev-tools device mode (`npm run dev`).
4. **⚠️ Playwright / `npm run test:smoke` hangs inside the Windows sandbox (`BypassSandbox: false`):** `playwright.config.js` launches `vite preview` on `127.0.0.1:4173` and falls back to `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` outside the workspace. Inside the standard terminal sandbox, launching `msedge.exe` hangs indefinitely with zero output. **Never run `npm run test:smoke` or `npx playwright test` in sandboxed mode** — always run Playwright commands with `BypassSandbox: true` (or ask user approval) and use `--reporter=line` (and if a Playwright run shows no progress after ~20s, check/kill the task instead of waiting forever).
5. **CSS cascade rule (cause of the Phase 29 roulette bug):** since Phase 28.7, each lazy component imports its own CSS file, which loads **after** `src/index.css`. A rule in a component CSS file beats an `index.css` rule with the same specificity, `!important` included. **Put all styles for a component (mobile media queries too) in that component's own CSS file**, and wrap desktop-only `!important` overrides in `@media (min-width: 861px)`.
6. **Do not break:** the token economy (`src/utils/tokenEconomy.js`, always pass winnings through `validateStakedGamePayout`), security (`src/utils/securityGuard.js`, CSP in **both** `index.html` and `vercel.json`), lazy loading (`React.lazy` + `<Suspense>` for every game/modal), `prefers-reduced-motion`, and `litePerfMode`.
7. **No audio before a user gesture.** iOS Safari only counts `touchend` / `click` / `pointerup` / `keydown` as a gesture, **not** `touchstart`.
8. **When any update/task is done:** if working on a numbered roadmap task, tick its box and add a one-line "Completion Note" (what changed + files). Verify `npm run lint` and `npm run build` exit 0, commit with a clear message, and **always push through to GitHub (`git push origin main`)** once updates are finished (requires `BypassSandbox: true` for network access).
9. **If stuck or a task is ambiguous:** stop and ask the owner. Never delete features, files, or data without asking.

---

## 0AA. 🚀 CURRENT ROUND — Phase 33: "Safe, Real & Ridiculously Fun"

> **Where we are (site review, 16 Nov 2026):** the safety work (P0, 33.1–33.13), "make the fake things real" (P1, 33.14–33.18) and the first six skill cabinets (33.19–33.24) are **built, live and verified**. Their full task text and completion notes were moved word for word to [`docs/HISTORY.md`](docs/HISTORY.md) ("Phase 33 — completed tasks"). This file now lists **only what is still to do**.
>
> **Order:** loose ends below → owner actions → P2 (fun) → P3 (polish/health) → P4 (growth and money).

### ✅ Review result (16 Nov 2026) — what was checked

- **Database (live project `otvvphmjojqyjaznjzyo`):** RLS is on for every public table; no public INSERT/UPDATE/DELETE policy exists on any table or storage bucket; `tests/security.spec.js` run against live with only the publishable key: **6/6 pass** (cannot edit/delete others' memes, cannot insert memes, cannot upload to storage, cannot read/forge notifications, vote replay idempotent, non-moderator cannot read reports or the queue).
- **Code:** `npm run lint` clean, `npm run test:unit` 256 node:test + 45 Vitest pass, `npm audit --omit=dev` 0 vulnerabilities, no secrets in the repo or its git history, GitHub "Safety CI" green.
- **Live site (`www.thememes.net`):** CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` headers all present; `/rules`, `/terms`, `/privacy`, `/takedown`, `/contact`, all six new game routes and the sitemap respond; `.env`/`.git` paths are not served.
- **Fixed during the review (task 33.51, see history):** creator-profile migration (33.17) was never applied and had a broken rate-limit call → fixed and applied; `delete-account` function was never deployed → deployed; unknown URLs (including `/admin/moderation`) returned a Vercel 404 instead of the app → rewrite fixed; `/hall-of-fame` had an empty `<title>`/description → fixed; spare database grants removed (migration `20261115000024`).
- **Public uploads are still switched off** (`PUBLIC_UPLOADS_ENABLED = false` in `src/config/featureFlags.js`). Keep it off until the loose ends and owner actions 1–3 below are done.

### 🔧 Loose ends from finished work (do these first)

- [ ] **33.52 Deploy the three Edge Functions whose repo code is newer than live.** The Supabase CLI on this machine is not logged in, and these are too large to paste safely through the MCP tool. Owner runs `npx supabase login` once, then an agent (or the owner) runs, from the repo root:
  - `npx supabase functions deploy submit-caption-entry --no-verify-jwt --project-ref otvvphmjojqyjaznjzyo` — **not deployed at all**, so Daily Caption Battle entries cannot be submitted on the live site (33.15).
  - `npx supabase functions deploy publish-meme --no-verify-jwt --project-ref otvvphmjojqyjaznjzyo` — live is v12 (33.7); the repo adds the GIF size/length limits and video refusal (33.9) and caption-battle mirroring (33.15). The storage bucket already refuses video MIME types, so this is a second layer, but it must be live before uploads are switched on.
  - `npx supabase functions deploy post-comment --no-verify-jwt --project-ref otvvphmjojqyjaznjzyo` — live is v3; the repo returns `user_id` so the 🗑️ button shows on a comment you have just posted (33.8).
  - **Acceptance:** `list_edge_functions` shows all seven functions; submitting a caption-battle entry works on the live site; a >8 MB GIF is refused with `GIF_TOO_LARGE`.
- [ ] **33.53 Verify the routing fix after deploy.** `vercel.json` catch-all now rewrites to `/` (with `cleanUrls: true` a `/index.html` destination 404s). Check `https://www.thememes.net/admin/moderation` and any made-up path return the app (HTTP 200), not Vercel's `NOT_FOUND`. If still 404, try destination `/index`.
- [ ] **33.54 Small hardening follow-ups (none exploitable today).** (a) Rate-limit `start_game_session` (an account can create unlimited `score_sessions` rows) and add a cron job that deletes `score_sessions`/`rate_limit_events` older than 30 days. (b) `is_suspended(uuid)` lets anyone ask whether a given account id is suspended; restrict to own id / moderators. (c) Move the `pg_net` extension out of `public`. (d) Remove the unused legacy public bucket `meme-images` after confirming no meme row points at it. (e) Delete the orphaned test files in Storage `memes/u/` (`826097b0…`, `be9befb2…`, `75a101d0…`, `7f9b4595…`). (f) `delete-account` should also remove the user's `takedown_requests` and `reports` rows.

### 🙋 Owner actions (agents cannot do these)

1. **Make yourself a moderator — nobody is one yet.** There are 0 moderators, so nothing can be approved or removed and 1 item (the paused video meme) is waiting. Sign in on the site with your real account, then run in the Supabase SQL editor: `insert into public.profiles (id, role) values ('<your auth user id>','moderator') on conflict (id) do update set role='moderator';` Then open `/admin/moderation`.
2. **Read and sign off the five draft pages** (`/rules`, `/terms`, `/privacy`, `/takedown`, `/contact`); they still say "DRAFT – owner to review". Decide the **age position** (e.g. 13+, teen-safe) and add a real contact address. `/privacy` must say uploaded images and text are sent to OpenAI for moderation.
3. **Legal check before promoting the site or switching uploads on.** UK Online Safety Act duties for a small user-to-user service (Ofcom guidance and risk assessment), UK GDPR, and a written procedure for reporting suspected child-abuse images (UK: IWF / NCA). This file is not legal advice; a short session with a solicitor is worth it.
4. **Supabase dashboard:** turn on **leaked-password protection** (Auth → Passwords; the security advisor flags it); confirm which OAuth providers are really configured; create a separate **staging project** and add GitHub secrets `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_TEST_MEME_ID` so CI runs the security spec on every push (it is skipped until they exist).
5. **Bot check keys:** add `VITE_TURNSTILE_SITE_KEY` in Vercel and `TURNSTILE_SECRET_KEY` in Supabase Edge Function secrets. Until then Turnstile is skipped and only the rate limits apply.
6. **Daily moderation digest:** add a Discord webhook: `select vault.create_secret('<url>', 'moderation_digest_webhook_url');`
7. **Then decide when to switch uploads on** (`PUBLIC_UPLOADS_ENABLED = true`), after 33.52 and items 1–3.
8. **Moderation provider upgrade (when the site earns):** the free OpenAI check does not cover hate symbols, drugs or weapons in images and has no child-abuse hash matching; look at Hive / Thorn Safer / Microsoft PhotoDNA.
9. **Search and first traffic:** submit `https://www.thememes.net/sitemap.xml` in Google Search Console and Bing Webmaster Tools; share real `/m/<id>?ref=share` and game links on Reddit, Discord, X, TikTok; list the games on itch.io.

### 🔎 Audit findings still open (the other 13 are fixed, see history)

| # | Finding | Fixed by |
|---|---------|----------|
| F12 | **The "80s arcade" is still casino-heavy.** 6 new skill cabinets shipped, but the lobby still leads with casino-style tables. | 33.31 |
| F15 | **Docs have drifted.** `README.md` is still the Vite template; the Section 3 file tree predates the hooks split. | 33.48 |

### 📏 Extra rules for this phase (in addition to "HOW AGENTS MUST WORK")

1. **Trust nothing from the browser.** Every safety rule must be enforced by Postgres (RLS, constraints, triggers) or a server function. Browser checks stay, but only as a fast, friendly first pass.
2. **Schema changes go in numbered migration files** under `supabase/migrations/` (create the folder in task 33.12 first if doing P0 in a different order). Never tell the owner to "paste this into the SQL editor" without also committing the file.
3. **No invented people or numbers.** No fake rivals, fake online counts, fake comments or fake "verified" badges. Sample content must be labelled as `@TheMemesHQ`.
4. **Never test moderation with real illegal or explicit material.** Use the provider's documented test images/strings and synthetic fixtures only.
5. **Mobile-first for every new screen:** build at 390×844 first, with touch handlers (`onTouchStart` / `onTouchMove` / `onTouchEnd`), `touch-action: none` on game canvases, `position: fixed` full-screen layouts for iOS, and text that scales with viewport. Then check 768×1024 and 1280×800.
6. **Original games only.** New games must use original names, art, sounds and layouts. Do not copy the names, characters, mazes, sprites or music of existing commercial games.
7. **Secrets:** service-role keys and moderation API keys live only in Vercel/Supabase environment variables. Never commit them, never prefix them with `VITE_`.

---

### P2 — 🕹️ Make it immense fun (ship one at a time; each needs lobby entry, SEO route, prerender, sitemap, smoke test)

**New original 80s-style skill cabinets** (each: one lazy component + own CSS, canvas with `touch-action: none`, touch + keyboard + gamepad, 60 fps on a mid-range phone, pause on tab hide, `GameShell`, real leaderboard from 33.14, costs no tokens to play):

> ✅ Shipped and moved to history: **33.19** Meme Invaders '86, **33.20** Neon Serpent, **33.21** Brick Blaster, **33.22** Sunset Sprint, **33.23** Vector Void, **33.24** Grid Riders.

- [ ] **33.25 "Stack Attack".** Falling-block puzzle with original piece shapes and a "meme meter" that clears rows when filled.

**Arcade feel that ties it together:**

- [ ] **33.26 The cabinet experience.** Lobby redesigned as a walkable row of cabinets (horizontal swipe on phones), each showing an **attract mode** (looping gameplay demo + top 3 initials). "Insert coin" sound and CRT power-on when a game starts; optional bezel art around the canvas on desktop; a "fullscreen" button that hides all site chrome.
- [ ] **33.27 Tickets and the Prize Counter.** Skill games pay **tickets** by score; tickets buy cosmetics from `src/data/cosmetics.js` at a prize-counter screen with a glass cabinet look (plush mascots, card frames, trails, cassette skins, radio stations). Tickets are separate from tokens and cannot be wagered.
- [ ] **33.28 Daily Arcade Challenge.** One game, one fixed seed, three attempts, same for everyone that day. Result shares as a spoiler-free emoji strip plus link ("🕹️ Daily #212 — 🟪🟪🟩⬛ 14,300"). Streak counter. This is the single best daily-return hook; build it right after the first two new games.
- [ ] **33.29 "Beat my score" links.** After any run: share `…/games/<game>?challenge=<seed>&score=<n>&by=<initials>`. The friend sees "NEO scored 14,300. Beat it." and plays the same seed. Add a per-score OG image via an `api/score-og` function.
- [ ] **33.30 Controller and feel.** Gamepad API across all skill games, remappable keys, haptic taps on phones where supported, a shared virtual joystick/button component (replacing per-game touch code), left-handed mode, "CRT / scanline / clean" display toggle per game.
- [ ] **33.31 Rebalance the lobby.** Lead with skill cabinets and meme games; move the casino-style tables into one "🎰 Vegas Room" tile further down. Fix the "13 games" count so headline, JSON-LD and list always come from `arcadeGamesCatalog.js` length.

**Meme-side fun:**

- [ ] **33.32 Meme of the Day and Hall of Fame.** Automatic daily winner (top approved meme of the previous day) with a trophy animation, a permanent `/hall-of-fame` archive page (great for SEO), and a "🏆 Yesterday's champion" strip on the homepage.
- [ ] **33.33 Weekly Meme Bracket.** 16 top memes of the week, seeded tournament, a round every day, the community votes each match-up (reuse `BattleArena`). Bracket image shareable at each stage.
- [ ] **33.34 Sticker Book (achievements).** ~60 collectible stickers on a scrapbook page: first upload, 7-day streak, beat a daily challenge, found a secret, "Called it" (upvoted a meme before it reached 100), etc. Unlock animation = sticker slapped on screen with a satisfying sound.
- [ ] **33.35 Secrets and cheat codes.** A hidden code-entry screen (found by tapping the logo 7 times) accepting original codes that unlock silly modes: big-head mode in games, VHS tracking glitch theme, everything-is-ducks cursor, a secret cabinet. One new code released each week in the newsletter/Discord (33.40).
- [ ] **33.36 A 404 page worth finding.** "GAME OVER — page not found" with a tiny playable mini-game and a high score.
- [ ] **33.37 Meme Party Mode — promote task 28.18** to here, once 33.4 exists: all captions pass the text filter before reaching the big screen, the host gets a "family-friendly / anything goes within the rules" toggle and a kick button, room codes are checked against the blocklist.
- [ ] **33.9b Re-enable video meme uploads safely.** Re-open video memes only with server-side transcoding to MP4 (strips container metadata), frame sampling every ~1 s through 33.3 image moderation, audio muted by default, and re-enabling video MIME types in `ACCEPT_MEDIA` and `storage.buckets`.
- Also still wanted from the Phase 28 backlog, in this order after the above: **28.19** (9:16 video export), **28.24** (My Meme Wrapped), **28.23** (seasonal themes), **28.22** (Meme Telephone), **28.25** (web push), **28.26** (Discord bot).

---

### P3 — ✨ Polish, speed and code health

- [ ] **33.41 First 10 seconds.** New visitors should see, above the fold on a phone: one great meme, one obvious "Make a meme" button, one obvious "Play" button. Audit what currently competes for attention (radio pill, pet, ticker, hero, banners) and defer anything non-essential until after the first interaction. Report before/after screenshots at 390×844.
- [ ] **33.42 Do task 28.27 (feature cull) with real analytics.** List every toy/overlay with its usage; propose what moves to Extras. Ask the owner before removing anything.
- [ ] **33.43 Performance budget, enforced in CI.** Targets on a throttled mid-range phone: LCP < 2.5 s, initial JS < 250 KB gzipped, no long task > 200 ms on load. Lazy-load the Supabase client and `soundEngine` until first needed; split `src/index.css` (105 KB) so game/feature styles live with their lazy components; compress the 29 `public/og/*.png` cards (~450–550 KB each) to < 150 KB.
- [ ] **33.44 Installable offline arcade (PWA).** Service worker that caches the shell and the skill games so they work with no signal ("plays on the Tube"); update prompt; keep network-first for the feed. Fix `manifest.webmanifest` description (it still advertises AI roasts) and add screenshots and shortcuts (Make a meme / Daily Challenge).
- [ ] **33.45 Accessibility pass.** Keyboard-only walkthrough of feed, maker and every game menu; visible focus; `aria-live` for scores; all colour-coded game state also shown by shape/label; captions/alt text for memes (task 28.21); a single "Calm mode" switch (no flashing, no screen shake, reduced motion, quieter sounds) that also follows `prefers-reduced-motion`. Add a photosensitivity check on win celebrations (no full-screen flashes faster than 3 per second).
- [ ] **33.46 Error and health monitoring.** Client error reporting (with personal data scrubbed) wired into `ArcadeErrorBoundary`; uptime check on `/`, `/api/meme-og`, `/api/sitemap`; alert the owner on moderation-API failures.
- [ ] **33.47 Break up the giants safely.** `VegasPinballGame.jsx` (97 KB), `VegasSlotMachine.jsx` (94 KB), `soundEngine.js` (121 KB), `App.jsx` (81 KB): extract pure logic into testable modules first, with tests, then split UI. One file per task; no behaviour changes.
- [ ] **33.48 Bring the docs back in line.** _(Progress 15 Nov 2026: history moved — Phases 1–29 + Phase 28 P1–P5 now in `docs/HISTORY.md`; rule 2 App.jsx size fixed. README, Section 3 tree, Phase 30/31 note and FAQ JSON-LD still to do.)_ Rewrite `README.md` (what the site is, how to run, env vars, how to deploy, how moderation works). In this file: fix rule 2's `App.jsx` size, regenerate the Section 3 tree, mark Phase 30 template routes as removed in Phase 31, and move completed phases 1–27 into `docs/HISTORY.md` so agents read a shorter file. Check the homepage FAQ JSON-LD in `index.html` still describes features that exist.

---

### P4 — 📈 Growth and getting ready to earn (only after P0 is live)

- [ ] **33.38 Monetisation plan that keeps the fun and stays clean.** Write `docs/MONETISATION.md` for the owner covering: (a) **ads**: a small number of fixed-size slots (feed every ~8 cards, lobby, between-game result screens), never over a game canvas, never mid-run, reserved space so layout does not jump, off for the first visit; note that ad networks have rules about user-generated content and about casino-style games, so 33.3–33.5 and 33.31 matter here and the owner must check the chosen network's policy; (b) **Supporter pass**: a low-cost one-off or monthly option that removes ads and unlocks cosmetic-only extras (exclusive frames, cabinet skins, a supporter sticker); (c) **never sell tokens, tickets, spins or anything that feeds the casino-style games**. Build nothing until the owner picks.
- [ ] **33.39 Embeddable games.** `/embed/<game>` routes: chrome-free, with a "Play more at thememes.net" end card, and a copy-paste `<iframe>` snippet on each game page. Requires a scoped exception to `X-Frame-Options: SAMEORIGIN` / `frame-ancestors` for `/embed/*` only. Other sites and itch.io can then host the games and send players back.
- [ ] **33.40 A reason to come back that we own.** Email sign-up for a weekly "Top 5 memes + this week's cheat code + new cabinet" digest (double opt-in, unsubscribe link, stored per `/privacy`); an official Discord link in the footer.
- [ ] **33.49 Share cards for everything.** Per-score, per-bracket, per-daily-challenge and per-sticker OG images so every shared link shows something specific. Add `?ref=` tagging and a simple "where do visitors come from" view using the existing analytics events.
- [ ] **33.50 Search-friendly evergreen pages.** `/hall-of-fame`, `/u/<handle>`, each game's "how to play + tips" section, and the daily challenge archive. Keep every page honest and useful; no thin keyword pages.

---

> 📜 **Completed Phases 1–30, the finished Phase 33 tasks and the Phase 28 P1–P5 notes were moved word for word to [`docs/HISTORY.md`](docs/HISTORY.md).**

---

## 0b. Phase 28: "Fun First, Findable" — remaining P6 backlog (P1–P5 done, see `docs/HISTORY.md`)

### P6 — Growth-loop & "wow" features (do AFTER P5; ship one at a time and check analytics between each)
> **Scope guard:** the site's past problem was too many features and too few users. Each P6 item must either **bring new people in** or **make people come back**. Ship one, deploy, look at the 28.10 analytics for a few days, then do the next.

- [ ] **28.18 🎉 Meme Party Mode (Jackbox-style; the flagship "super cool" feature).** One person opens `/party` on a laptop/TV, which shows a 4-letter room code + QR. Friends join on their phones (no login, just a nickname). Each round: a template appears, everyone captions it on their phone, captions are shown anonymously on the big screen with THE MEMES FM playing, everyone votes, and points + a podium follow. 5 rounds per game. Built with Supabase Realtime channels (broadcast + presence), with all game state held by the host client. The winning memes can be published to the feed with one tap. Every party brings 3–8 new people to the site at once.
- [ ] **28.19 📱 "Export for TikTok/Reels/Shorts."** One button renders any meme as a **9:16 MP4** (6–10s): a zoom/punch-in animation, captions popping in on the beat, a THE MEMES FM jingle, and a `thememes.net` end-card watermark. Uses the existing `captureStream` pipeline from Phase 26. Every exported video posted elsewhere is free advertising.
- [ ] **28.21 Auto alt text = Google Images traffic.** Every meme gets `alt` text built from its title + caption text + category (e.g., "Programming meme: 'It works on my machine' – expanding brain format"). This improves accessibility and makes memes show up in Google Images. Prerender it on the category and `/m/<id>` pages.
- [ ] **28.22 🧬 Meme Telephone (remix chains).** A "Pass it on" button on any meme: the next person must remix it (new caption or one Forge edit) within 24h to keep the chain alive. The Evolution Tree already exists, so show chains as a playful "Gen 1 → Gen 7" strip with a "🔥 longest chain this week" leaderboard.
- [ ] **28.23 🎃 Seasonal auto-themes.** Swap a theme by date with zero maintenance: Halloween (orange grid, spooky radio station, ghost cursor), Christmas/New Year (snowfall, jingle-synth station, countdown), April Fools (site "upside-down" button), Summer (Miami Vice palette). Use CSS variables + a date check only, with no new assets beyond tiny SVGs.
- [ ] **28.24 📊 "My Meme Wrapped" share card.** Weekly/monthly personal recap: memes viewed, top category ("You're 63% #TECH"), favourite reaction, best meme, rank, longest combo. Rendered as a 1080×1920 story image + 1200×630 card with one-tap share. People share these.
- [ ] **28.25 🔔 Opt-in web push (PWA).** After a user has published or played a party game, offer (never on first visit) push notifications for "Your meme got upvoted", "Daily Caption Battle results", and "Your remix chain is dying!". Works on Android/desktop and on iOS 16.4+ when the site is added to the home screen. Max 1 push/day.
- [ ] **28.26 🤖 Discord bot `/meme`.** A small bot (Vercel Function interactions endpoint) with `/meme` (random top meme), `/caption <text>` (renders today's template with your caption), and `/battle` (2 memes, server votes with reactions). Every post links back to the meme page. Discord is where meme-loving groups hang out.
- [ ] **28.27 ✂️ Feature cull (after ~2–4 weeks of analytics).** Rank every game/toy/overlay by usage from 28.10. Move anything under ~2% usage out of the main UI into the Extras drawer (or remove it). Report the list to the owner before deleting anything. Less clutter = more fun for the features people actually love.

---

## 1. Key Architectural & Visual Style Decisions

1. **Development Execution Order**:
   - Execute the **5-Phase Development Plan** sequentially starting with **Phase 1** ("Cyber-Arcade" Visual Overhaul & Modular Foundation), followed by **Phase 2** (Meme Forge Studio 2.0 & Frictionless Upload), **Phase 3** (Interactive Viewing Modes), **Phase 4** (Community Hooks, Bounties & Profiles), and **Phase 5** (Scale & Production Polish).
2. **Visual Style & Default Graphics Preferences**:
   - **Theme**: Dark **Neon Cyber-Arcade** aesthetic.
   - **Animated Synthwave Perspective Grid & Neon Nebula Glow**: **Active by default** for all visitors (`.tm-synthwave-bg`, `.tm-synthwave-grid`, `.tm-synthwave-glow` in `src/index.css`).
   - **3D Holographic Card Tilt & Specular Glare**: **Active by default** for all visitors on meme cards (`MemeCard.jsx` tracks cursor position at 60fps via CSS variables `--rx`, `--ry`, `--glare-x`, `--glare-y`).
   - **Dynamic Rarity / Heat Tiers**: Cards automatically upgrade their border & badge based on live score and mutation velocity (`getMemeRarityTier` in `src/data/starterMemes.js`):
     - *Standard* (`< 500 pts` and `0` remixes): Cyber-slate glass border.
     - *Heating Up* (`500–1,499 pts` or `1–2` remixes): Pulsing cyan plasma border + `⚡ HEATING UP` badge.
     - *Viral Supernova* (`1,500+ pts` or `3+` remixes): Animated holographic rainbow-foil border + `🔥 VIRAL SUPERNOVA` badge.
   - **Optional CRT Scanline & Phosphor Shader**: Available via an interactive `📺 CRT: ON/OFF` toggle in the top navigation HUD (`NavbarHud.jsx`), persisted in `localStorage` under `tm_crt` (default `OFF`).

---

## 2. Project Overview

**THE MEMES.net** is a gamified, cyber-arcade social meme platform and remix studio built with **React 19**, **Vite 8**, **Tailwind CSS v4**, **HTML5 Canvas**, **Web Audio API**, and **Supabase**.

### Core Pillars
1. **Multi-Mode Meme Consumption**:
   - **📱 Grid Feed (`feed`)**: 3D holographic masonry card grid with category filtering (`#ALL`, `#DANK`, `#TECH`, `#GAMING`, `#RELATABLE`), search, sorting (`Latest` vs. `Top This Week`), double-tap upvoting, emoji reactions (`🔥`, `💀`, `😂`, `🗿`), and inline comment drawers.
   - **⚡ Hyper-Swipe (`swipe`)**: Rapid card-deck triage mode controlled via on-screen buttons or keyboard arrows (`←` Pass, `→` Upvote, `↑` Super 2x Vote).
   - **⚔️ 1v1 Arena (`battle`)**: Sudden-death head-to-head meme matchups with win-streak tracking.
2. **Fork & Mutate Engine + Genealogical Evolution Tree**:
   - Any meme can be forked into the **Meme Forge Studio** (`🧬 MUTATE`), incrementing its generation (`GEN-1`, `GEN-2`, etc.), linking `parent_meme_id` / `root_meme_id`, and displaying an interactive **Meme Evolution Tree** modal.
   - Every exported/published canvas image automatically receives a **32px 16-bit Arcade Cartridge Footer** (`⚡ THEMEMES.NET` + generation & creator badge).
3. **Arcade Gamification ("Juice")**:
   - **XP & Leveling**: 6 progression tiers (*Lurker* → *Meme Overlord* + *Immortal Memer* overflow) with progress bar HUD and level-up toast banners.
   - **Overdrive Combo System**: Rapid actions build up to a `5x` XP & vote multiplier with a decaying top progress bar (holographic overdrive animation at `3x+`) and screen-shake.
   - **Zero-Dependency Synth Audio (`SoundEngine`)**: Procedural Web Audio API sound effects with harmonic fifth overtones on `3x+` Overdrive combos.
4. **Offline / Local-First Resilience**:
   - Ships with procedural SVG starter memes (`makeSvgMeme` / `STARTER_MEMES`) so there are zero broken images even offline.
   - Gracefully falls back to local state + `localStorage` (`tm_xp`, `tm_votes`, `tm_user`, `tm_crt`) whenever Supabase is unreachable.

---

## 3. Directory & File Structure (Post-Phase 1 Modularization)

```text
thememes-net/
├── .env.local                         # Local Vite environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── index.html                         # Clean HTML entry point mounting /src/main.jsx
├── package.json                       # Dependencies (React 19, Vite 8, Tailwind 4, Supabase, Lucide)
├── vite.config.js                     # Vite config with @vitejs/plugin-react & @tailwindcss/vite
├── eslint.config.js                   # Flat ESLint 10 config for JS/JSX + React Hooks/Refresh
├── instructions.md                    # This architectural summary, decisions log & phased roadmap
├── public/
│   ├── favicon.svg                    # Custom 512x512 Cyber-Arcade Mascot Vector Icon
│   ├── logo-512.png                   # High-Res 512x512 Neon Cyber-Jester Skull Logo for Google Search & Schema.org
│   ├── favicon-192.png                # 192x192 PWA & Android Chrome Icon
│   ├── favicon-48.png                 # 48x48 Google Search SERP Favicon
│   ├── apple-touch-icon.png           # 180x180 iPhone / iPad Home Screen Icon
│   ├── icons.svg                      # SVG sprite sheet
│   ├── manifest.webmanifest           # Installable PWA Web App Manifest
│   ├── robots.txt                     # Search crawler directives (Googlebot, Googlebot-Image)
│   └── sitemap.xml                    # XML Sitemap for Google Search & Category indexing
└── src/
    ├── main.jsx                       # React DOM root mount (<StrictMode><App /></StrictMode>)
    ├── index.css                      # Cyber-Arcade CSS: Synthwave grid, 3D holo tilt, rarity foil, CRT overlay, Soundboard & Loot Wheel
    ├── App.jsx                        # Main application coordinator (state, Supabase sync, studio canvas renderer)
    ├── supabaseClient.js              # Unified ES module Supabase client (reads .env.local with fallback)
    ├── data/
    │   └── starterMemes.js            # makeSvgMeme(), STARTER_MEMES, STUDIO_TEMPLATES, VIRAL_CAPTIONS, RANKS (Lv.1-10), WHEEL_REWARDS, DAILY_QUESTS, generateAiMemeRoast()
    ├── utils/
    │   ├── soundEngine.js             # iOS Safari Playback-Unlocked Comedy Synthesizer (4 Sound Packs + 8 Soundboard Pads)
    │   ├── canvasMutator.js           # loadMemeIntoStudioCanvas() & stampArcadeCartridgeFooter()
    │   ├── mediaPipeline.js           # Phase 26: validation, media probing, video poster gen, WebP compression
    │   ├── publishMeme.js             # Phase 26: unified Supabase storage upload & db insert pipeline
    │   ├── videoAutoplay.js           # Phase 26: shared IntersectionObserver video autoplay coordinator
    │   ├── memeFeedBridge.js          # Phase 26: feeds real community memes into Slots, Stocks, Crush, Pet & Pinball
    │   └── seoEngine.js               # Dynamic Title, Meta, OpenGraph & Schema.org JSON-LD Structured Data Engine
    ├── hooks/
    │   ├── useBoxSize.js              # ResizeObserver hook for overlay layers
    │   └── useMemeEditor.js           # Phase 26: undo/redo, layers state & IndexedDB autosave
    └── components/
        ├── forge/                     # Phase 26: Meme Forge 3.0 Studio (MemeForge, ForgeStage, ForgeToolPanel, draftStore, forgeEngine)
        ├── MemeMedia.jsx              # Phase 26: unified image / animated GIF / video player + overlay renderer
        ├── MemeOverlay.jsx            # Phase 26: non-destructive absolutely positioned HTML caption/sticker overlay
        ├── NavbarHud.jsx              # Simplified top HUD with Fair Token Wallet, Daily Cap indicator, ⚡ Turbo FPS toggle & Sub-Game pills
        ├── QuickUploadBar.jsx         # 1-Click inline Quick-Upload Bar (+75 🪙 First Upload Pioneer Bonus, 🎲 Random Funny Caption, drag-drop/paste/camera)
        ├── VegasSlotMachine.jsx       # Classic Las Vegas One-Arm Bandit 777 Slot Machine (SVG 777/BAR/Bell/Cherry/Diamond drums, chrome lever, chip wagers)
        ├── MemeStockMarketGame.jsx    # MEMEDAQ '86 80s Wall Street Meme Stock Market Simulator (8 meme tickers, live CRT SVG chart, 1% spread, insider tips)
        ├── MemeCrushGame.jsx          # 10-Level 80s Neon Meme Crush Saga (carved board shapes, 📼 Mixtape drops, 🔒 Laser Ice Locks, Double Frost Jelly)
        ├── VegasPinballGame.jsx       # 5-Table 80s Cyber-Pinball (Vegas '85, Outrun Highway, Invader Grid, Miami Lagoon, Cosmic Reactor Boss; zero shadowBlur)
        ├── ParticleOverlay.jsx        # Isolated forwardRef floating particle & comic-pop overlay (prevents root App re-renders on older iPads)
        ├── ViralTickerBar.jsx         # WallStreetBets-style Live Meme Stock Exchange Marquee Ticker ($DANK, $TECH, $GAMING)
        ├── DailyBountyBanner.jsx      # Featured Daily Meme Bounty banner (+200 XP 2x reward challenge & prompt switcher)
        ├── MemeSoundboardBar.jsx      # Interactive 16-Pad Crazy Meme Soundboard, Sound Pack Switcher, Chaos Roulette & Boss Key
        ├── MemeCard.jsx               # 3D holographic tilt card with rarity/bounty/spicy badges, AI Roast trigger & Mutate bar
        ├── MemeSkeletonGrid.jsx       # Neon cyber-arcade shimmer skeleton cards during feed loading
        ├── MemeStudioModal.jsx        # HTML5 Canvas Meme Forge Studio 2.0 (+ Fork/Mutate, Daily Bounty & Spoiler Blur toggle)
        ├── MemeTheaterModal.jsx       # Fullscreen Theater Lightbox modal with deep-linking & side-by-side lineage
        ├── MemeEvolutionModal.jsx     # Genealogical Evolution Tree modal
        ├── LeaderboardModal.jsx       # Hall of Fame Leaderboard modal (Top Meme Lords, Top Scored Memes, Most Mutated Origins)
        ├── PlayerProfileModal.jsx     # Creator Arcade Profile & 8-Badge Case modal (+50 XP mutation royalties & Custom Flair)
        ├── RewardsModal.jsx           # Wheel of Chaos Loot Box Spinner, 7-Day Login Streak & Live Daily Quests Vault
        ├── AiRoastModal.jsx           # Cyberpunk AI Dank-O-Meter Laser Scanner & Savage Meme Roast Generator
        ├── BossKeyOverlay.jsx         # 6-Tab Corporate Panic Disguise Suite (Excel, DevOps, Zoom, Enterprise AI, OS Update, BSOD)
        ├── DankPetWidget.jsx          # Interactive Virtual Dank Tamagotchi Cyber-Pet (4 Evolution Stages, Feed, Squish & Dance)
        ├── SeoDiscoveryFooter.jsx     # Crawlable SEO Category Directory & Rich Snippet FAQ Hub
        ├── MobileArcadeDock.jsx       # Thumb-friendly mobile bottom arcade navigation dock (Feed, Swipe, +Forge, Arena, Ranks)
        ├── SwipeDeck.jsx              # Physics-driven Hyper-Swipe deck view mode with drag stamps
        ├── BattleArena.jsx            # King of the Hill 1v1 Sudden Death Meme Battle Arena view mode
        └── AuthModal.jsx              # Hardened OAuth 2.0 (Google, Discord, Facebook), Magic Link OTP, Password Entropy Meter & OAuth Setup Wizard
```

---

## 4. Supabase Backend Contract

### Environment & Client Setup
- **Supabase Project ID**: `otvvphmjojqyjaznjzyo` (`https://otvvphmjojqyjaznjzyo.supabase.co`)
- **Single Source of Truth**: `supabase/migrations/` (`20260101000000_00_initial_schema.sql` through `20261115000013_33_14_arcade_leaderboards.sql`). The legacy `supabase-schema.sql` file was removed in Task 33.12.
- **Client Module**: `src/supabaseClient.js` exports `supabase` and `getSupabaseClient()`, reading `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` with fallback constants.

### Database Tables (`public`, RLS enabled on every table)
1. **`public.memes`** (public SELECT for `status = 'approved'`, owner `user_id = auth.uid()`, or `is_moderator()`; no public INSERT/DELETE — created only by `publish-meme` Edge Function; owner UPDATE guarded by `memes_guard_protected_columns` trigger; media URLs restricted by CHECK constraints to `/seed/` or `https://otvvphmjojqyjaznjzyo.supabase.co/storage/v1/object/public/memes/...`):
   - `id` (`uuid` PK), `title` (`text`), `category` (`text`), `image_url` (`text`), `author_name` (`text`), `user_id` (`uuid` FK → `auth.users`)
   - `score` (`integer`, default `1`), `base_score` (`integer`, default `1`), `reactions` (`jsonb`), `base_reactions` (`jsonb`)
   - `parent_meme_id` (`uuid` FK → `memes.id`), `root_meme_id` (`uuid` FK → `memes.id`), `generation` (`integer`, default `0`), `mutation_count` (`integer`, default `0`)
   - `media_type` (`text`: `'image' | 'gif' | 'video'`), `poster_url` (`text`), `base_image_url` (`text`), `duration_sec` (`numeric`), `width` (`integer`), `height` (`integer`), `overlay` (`jsonb`)
   - `sha256` (`text`), `phash` (`text`), `moderation` (`jsonb`), `removed_reason` (`text`), `status` (`text`: `'pending' | 'approved' | 'rejected' | 'removed'`, default `'pending'`), `is_bounty` (`boolean`), `bounty_id` (`text`), `created_at` (`timestamptz`)
2. **`public.comments`** (public SELECT for `status = 'visible'`, author `user_id = auth.uid()`, or `is_moderator()`; created via `post-comment` Edge Function only; authors can DELETE non-suspended):
   - `id` (`uuid` PK), `meme_id` (`uuid` FK → `memes.id` CASCADE), `user_id` (`uuid` FK → `auth.users` SET NULL), `author_name` (`text`), `body` (`text`, 1..280 chars), `status` (`text`: `'visible' | 'pending' | 'removed'`), `created_at` (`timestamptz`)
3. **`public.profiles`** (users can SELECT only their own row; server writes via service role / Edge Functions; claimed `username` enforced unique case-insensitively and checked against reserved words):
   - `id` (`uuid` PK FK → `auth.users` CASCADE), `username` (`text`), `avatar_id` (`text`, 12 built-in pixel-art preset IDs via `set_my_avatar()` in 33.17 migration), `role` (`text`: `'user' | 'moderator' | 'admin'`), `suspended_until` (`timestamptz`), `strikes` (`integer`), `created_at` (`timestamptz`)
4. **`public.votes`** (users can SELECT only their own rows; writes via `cast_vote` RPC only; 1 row per `(user_id, meme_id)`):
   - `id` (`uuid` PK), `user_id` (`uuid` FK → `auth.users` CASCADE), `meme_id` (`uuid` FK → `memes.id` CASCADE), `direction` (`integer` ∈ `{-1, 0, 1}`), `created_at`, `updated_at`
5. **`public.reactions`** (users can SELECT only their own rows; writes via `toggle_reaction` RPC; trigger `trg_reactions_sync_meme_counts` keeps `memes.reactions` in sync):
   - `id` (`uuid` PK), `meme_id` (`uuid` FK → `memes.id` CASCADE), `user_id` (`uuid` FK → `auth.users` CASCADE), `emoji` (`text` ∈ `{'🔥','💀','😂','🗿'}`), `active` (`boolean`), `created_at`, `updated_at`
6. **`public.notifications`** (users can SELECT `recipient_id = auth.uid()`; inserted only by triggers/RPCs):
   - `id` (`uuid` PK), `recipient_id` (`uuid` FK → `auth.users` CASCADE), `recipient_username` (`text`), `actor_id` (`uuid` FK → `auth.users` SET NULL), `actor_name` (`text`), `type` (`text` ∈ `{'remix','upvote','reaction','comment','bounty','royalty'}`), `meme_id` (`uuid` FK → `memes.id` CASCADE), `message` (`text`), `read` (`boolean`), `created_at`
7. **`public.reports`** (moderators SELECT; inserted only via `report_item` / `submit_takedown_request` RPCs; unique per `(reporter_id, meme_id)` or `(reporter_id, comment_id)`):
   - `id` (`bigint` identity PK), `meme_id` (`uuid`), `comment_id` (`uuid`), `reporter_id` (`uuid`), `reason` (`text` ∈ `{'sexual','violence','hate','child','spam','copyright','other'}`), `note` (`text` ≤ 300), `status` (`text` ∈ `{'open','actioned','dismissed'}`), `created_at`
8. **`public.takedown_requests`** (moderators SELECT; created via `submit_takedown_request` RPC):
   - `id` (`uuid` PK), `reporter_id` (`uuid`), `meme_id` (`uuid` FK → `memes.id` SET NULL), `kind` (`text` ∈ `{'copyright','photo_of_me','privacy','other'}`), `target_url` (`text` 1..500), `requester_email` (`text` ≤ 200), `details` (`text` 5..1000), `priority` (`integer` default `95`), `status` (`text`), `created_at`
9. **`public.moderation_actions`** (moderators SELECT): `id`, `moderator_id`, `action`, `meme_id`, `comment_id`, `target_user_id`, `reason`, `note`, `created_at`.
10. **`public.scores`** (public SELECT; written only via `submit_arcade_score()` RPC with 3-char blocklist check and server session timing bounds; `score_sessions` is server-only):
    - `id` (`uuid` PK), `game` (`text`), `user_id` (`uuid` FK → `auth.users` CASCADE), `score` (`integer` `1..10000000`), `initials` (`text` `^[A-Z0-9]{3}$`), `period` (`text` default `'all_time'`), `created_at` (`timestamptz`)
11. **Daily Caption Battle & Hall of Fame tables (`public`, RLS enabled):**
    - `public.caption_battle_entries` (public SELECT for `'approved'` or owner/`is_moderator()`; inserted via `submit-caption-entry` or `publish-meme`): `id`, `battle_date`, `template_id`, `user_id`, `author_name`, `top_text`, `bottom_text`, `score`, `meme_id`, `status`, `moderation`, `created_at`
    - `public.caption_battle_votes` (own SELECT; written via `vote_caption_battle_entry()` RPC with score sync trigger): `id`, `entry_id`, `user_id`, `direction`, `created_at`, `updated_at`
    - `public.caption_battle_winners` (public SELECT; written by `finalize_caption_battle_day()`): `battle_date` PK, `entry_id`, `meme_id`, `template_id`, `user_id`, `author_name`, `top_text`, `bottom_text`, `winning_score`, `crowned_until`, `created_at`
12. **Service-role-only safety/ops tables** (RLS enabled, zero public policies):
    - `public.score_sessions` (`id`, `user_id`, `game`, `issued_at`, `consumed_at`, `submitted_score`)
    - `public.banned_hashes` (`id`, `sha256`, `phash`, `reason`, `source`, `meme_id`, `created_at`)
    - `public.moderation_incidents` (`id`, `kind`, `user_id`, `sha256`, `phash`, `provider`, `categories`, `status`, `created_at`)
    - `public.moderation_digests` (`id`, `counts`, `sent`, `created_at`)
    - `public.upload_rejections` (`id`, `user_id`, `kind`, `detail`, `created_at`)
    - `public.rate_limit_events` (`id`, `action` ∈ `{'upload','upload_sign','comment','vote','report','follow'}`, `user_id`, `ip_hash`, `created_at`)
13. **`public.follows`** *(migration `20261115000016_33_17_creator_profiles_and_follows.sql`, applied live 16 Nov 2026)*: `follower_id` (`uuid` FK → `auth.users` CASCADE), `followed_handle` (`text` lowercase `^[a-z0-9_-]{2,32}$`), `created_at` (`timestamptz`); own-row SELECT RLS, writes exclusively via `toggle_follow_creator()` RPC.

### Storage Buckets & Policies (`storage.buckets` / `storage.objects`)
- **`memes`** (`public: true`, 15 MB limit, `allowed_mime_types`: `['image/webp', 'image/gif']`): Public SELECT only; writes exclusively by service role (`publish-meme` Edge Function).
- **`quarantine`** (`public: false`, 15 MB limit, `allowed_mime_types`: `['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/octet-stream']`): Private staging bucket written via server-signed URLs before moderation/transcode; no public SELECT/INSERT/UPDATE/DELETE policies.
- **`meme-images`** (`public: true`, legacy read-only bucket): Public SELECT policy only; no public writes.

### Edge Functions (`supabase/functions/`) & RPCs / Views (`public.*`)
- **SQL Views:** `public.memes_feed_view` (`security_invoker = true`; computes time-decayed `hot_score`, visible `comments_count`, and truthful `upvotes_last_hour` via `get_meme_upvotes_last_hour(id)` per approved meme alongside keyset indexes `memes_approved_created_id_idx`, `memes_approved_score_created_id_idx`, `memes_approved_category_created_id_idx`, `comments_meme_visible_created_idx`, and `votes_meme_positive_updated_idx` so feed queries never embed `comments(*)`).
- **Edge Functions:** `publish-meme`, `post-comment`, `submit-caption-entry`, `moderate`, `profile` (claims a username), `delete-account` (plus shared helpers `_shared/textModeration.js`, `_shared/imageModeration.js`, `_shared/captionBattleCore.js`, `_shared/accountCleanup.js`).
- **Client-Callable RPCs:**
  - `cast_vote(p_meme_id, p_direction)` & `toggle_reaction(p_meme_id, p_emoji, p_active)` (authenticated, non-suspended, rate-limited)
  - `mark_notifications_read(p_ids)` & `get_my_profile()` (authenticated)
  - `report_item(p_meme_id, p_comment_id, p_reason, p_note)` (authenticated, non-suspended, auto-hides at 3 distinct reporters or `'child'`)
  - `submit_takedown_request(p_target_url, p_kind, p_requester_email, p_details)` (`anon`/`authenticated`, rate-limited)
  - `mod_queue()` (authenticated moderator/admin only)
  - `meme_public_state(p_id)`, `get_meme_evolution_tree(target_meme_id)`, & `get_meme_upvotes_last_hour(p_meme_id)` (`anon`/`authenticated`; `approved` lineage ordered by generation/score, and aggregate positive upvotes cast in the last 60 minutes)
  - `start_game_session(p_game)`, `submit_arcade_score(p_session_id, p_game, p_score, p_initials)`, `get_game_leaderboard(p_game, p_period, p_limit)`, `check_initials_allowed(p_initials)` (Task 33.14 cabinet scores + `invaders` via Task 33.19 + `serpent` via Task 33.20 + `blaster` via Task 33.21 + `sunset` via Task 33.22 + `void` via Task 33.23 + `riders` via Task 33.24 `scores_game_check` / `arcade_game_limits`)
  - `get_daily_caption_battle()`, `vote_caption_battle_entry(p_entry_id, p_active)`, `get_caption_hall_of_fame(p_limit)`, `get_active_caption_kings()` (Task 33.15 daily battle & `/hall-of-fame`)
  - `set_my_avatar(p_avatar_id)`, `toggle_follow_creator(p_handle, p_active)`, `get_creator_profile(p_handle)` (Task 33.17 creator profiles & pixel avatars; migration `20261115000016_33_17_creator_profiles_and_follows.sql`)
  - `is_moderator()`, `is_suspended(p_uid)`, `format_rate_limit_message(p_seconds)`
- **Service-Role / Cron Functions:** `mod_apply_decision(...)`, `moderation_digest_send()` (daily `08:00 UTC` via `pg_cron`), `check_and_record_rate_limit(...)`, `request_ip_hash()`, `is_established_account(p_user_id)`, `is_banned_image(p_sha256, p_phash, p_max_distance)`, `increment_meme_score(...)` (legacy, revoked from `anon`/`authenticated`).

---

## 6. Development Commands

Run all commands from `c:\Users\corma\thememes-net`:

```bash
# Start local Vite dev server with HMR
npm run dev

# Build production bundle to dist/
npm run build

# Run ESLint checks
npm run lint

# Preview production build locally
npm run preview
```
