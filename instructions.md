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

## 0. ⚡ START HERE — Phase 35: "NEON TURBO" (owner brief, 16 Nov 2026)

> **This phase is first in the queue.** It was written after a full review of the code and the running site on 16 Nov 2026. Work through it top to bottom. Everything in Phase 33 and Phase 34 below still stands unless a task here says it replaces it.
>
> **The owner's brief, in their words:** a super cool 80s neon vibe; the rectangular "THE MEMES.net" logo is not good enough; "it would be cool to see the neon moving through the tubes"; a limited palette is fine; the slot machines need "lots of bells and whistles", faster wheels and suspense, "like in a strange dream", with the vibration and visual rewards that games like Candy Crush use; one money system across the site, based on 1980s prices; a way to see what is working and what is not; and more visitors. Aim: the best website in the world.

### 35.A What the review found (the reasons for the order below)

1. **We cannot see what works.** `src/utils/analytics.js` sends six events to Vercel Analytics and nothing else. Most ad blockers block Vercel's script, custom events depend on the Vercel plan, and there is no screen where the owner can read the numbers. Every later decision in this file ("is the new logo better?", "do people play slots longer?") needs this first.
2. **The brand does not look like neon.** The logo is a flat gradient rectangle with dark text (`.tm-logo-badge` in `src/index.css` line 193) next to a 36 px mascot image. Nothing on the site is drawn as a glass tube. The CSS has 208 different colours, so no colour means anything.
3. **A new visitor on a phone sees no meme and no game.** The first meme starts 2,160 px down (measured in 34.A). The first screen is two rows of top bar, a banner and a wall of 20+ pills.
4. **Money is shown three different ways.** Top bar: `M$20.25`. Arcade lobby, same wallet, same moment: `🪙 20 ($5.00)`. Slot machine: `$1.25 (5🪙)` and `$4.25 🪙`. The code agrees with none of them fully: `CURRENCY_BRAND` in `src/utils/tokenEconomy.js` says 1 token = M$1, while `formatEightiesPrice()` in the same file says 1 token = 25¢. The word "token" appears about 850 times in `src/`, "chip" 260, "coin" 107, and `🪙` 331 times.
5. **The slot reels do not spin.** In `src/components/VegasSlotMachine.jsx` a `setInterval` (line ~400) swaps the three visible symbols every 95 ms while a CSS keyframe jiggles and blurs them. Nothing scrolls. Reels stop on fixed timers (520 / 920 / 1320 ms) whatever is on them, so there is no suspense. Haptics exist (`SoundEngine.triggerHaptic`) but the slot machine never calls them. The win overlay is strong; the spin itself is weak.
6. **Growth has no engine.** The site has good share plumbing (`/m/<id>` OG cards, per-game routes, sitemap) but nothing a player produces during play is designed to be sent to a friend.

### 35.B Order of work, and why

| # | Task | Why it is in this position | Size |
|---|------|----------------------------|------|
| 1 | **35.1 Pulse** (private, first-party stats) | Start counting before anything changes, so every later task has a before and an after. | small |
| 2 | **35.2 Neon identity** (palette, tube system, fonts) | Everything visual after this is built from it. | medium |
| 3 | **35.3 The sign** (new logo, moving neon) | The owner's top complaint, and the thing people will screenshot. | medium |
| 4 | **35.4 First screen in neon** (does 34.4 + 34.5) | The biggest cause of visitors leaving. | medium |
| 5 | **35.5 One money: MemeDollarz** | Small, touches many files, and must be settled before the slots are rebuilt. | medium |
| 6 | **35.6 Juice kit** (shared haptics, shake, particles, count-up) | Built once, used by every game from now on. | small |
| 7 | **35.7 Slots Turbo** | The owner's showcase game. | large |
| 8 | **35.8 Dream Mode** | The "strange dream" layer on top of 35.7. | medium |
| 9 | **35.9 Growth engine** | Only worth pouring visitors in once 1 to 5 are live and measured. Owner step 35.9a can be done today. | medium |
| 10 | **35.10 Turbo template for every other game** | Repeatable recipe; one game per task, chosen by Pulse numbers. | ongoing |

**Which model for which task.** Tasks 35.2, 35.3, 35.7 and 35.8 are design and feel work: give them to the strongest model available and expect several rounds of looking at screenshots. Tasks 35.1, 35.5 and 35.6 are careful, mechanical work with clear tests: a cheaper model is fine. Never run two agents on the same files at once.

**Rules that apply to every Phase 35 task** (on top of "HOW AGENTS MUST WORK" and 34.G):

1. **Look at it.** A visual task is not done until the agent has taken screenshots at 390×844 and 1280×800 and compared them with the reference. "Build passes" is not "looks right".
2. **One commit per numbered sub-step** (35.2a, 35.2b …). The site must look finished after every commit.
3. **Reduced motion, Calm mode and `.tm-lite-perf` always win.** Every effect in this phase must have an "off" form: no flow pulse, no shake, no flashes, no vibration.
4. **No flash faster than 3 per second anywhere on screen, ever** (photosensitive epilepsy). This matters most in 35.7 and 35.8.
5. **Pretend money stays pretend.** Nothing in this phase may sell, gift for payment, or cash out MemeDollarz. Do not alter the odds in `src/data/slotMachinesCatalog.js` or the daily caps in `tokenEconomy.js`. All payouts still pass through `validateStakedGamePayout`.
6. **No new runtime dependencies.** No animation, particle, chart or analytics library.

---

### 35.1 Pulse: private, first-party stats

**What it is.** A tiny event counter that the site sends to its own database, plus one private screen for the owner. It uses no cookies, stores nothing new on the visitor's device, and keeps no information that can identify a person. Because it is first-party and anonymous, ad blockers do not block it and it does not need a cookie banner.

**Honesty rule (do not skip).** "Not flagged as tracking" must be true because the system does not track people, not because it is hidden. So: it is described in plain words on `/privacy`, it has an off switch in Settings, and it sends nothing when the browser sends `Sec-GPC: 1` or `navigator.doNotTrack === '1'`. Do not obfuscate the endpoint, do not fingerprint (no canvas, fonts, screen size, or full user-agent string), and do not send account ids, usernames, handles, meme titles, comment text, search text or full URLs with query strings.

- [x] **35.1a Database.** New migration `supabase/migrations/<next number>_35_1_pulse.sql`:
  - `public.pulse_events`: `id bigint identity pk`, `ts timestamptz default now()`, `day date`, `visitor text` (see below), `session text`, `name text`, `path text`, `ref_host text`, `src text`, `device text` (`phone` / `tablet` / `desktop`), `returning boolean`, `props jsonb default '{}'`. Index on `(day, name)`. RLS on, **no policies** (service role and definer functions only).
  - `public.pulse_salts`: `day date pk`, `salt text`. A `pg_cron` job at 00:05 UTC inserts today's random salt and **deletes every older salt**. Once yesterday's salt is gone, yesterday's visitor hashes cannot be linked to anyone or to today.
  - `public.pulse_daily`: one row per `(day, name, path, src, device)` with `events int`, `visitors int`, `sessions int`, and `sum_ms bigint` for timed events. A second cron job at 00:15 UTC rolls up yesterday and deletes `pulse_events` rows older than **30 days**.
  - `public.pulse(p_session text, p_events jsonb) returns void`, `security definer`, `set search_path = ''`, granted to `anon` and `authenticated`. It must: accept at most 25 events per call; accept only names matching `^[a-z][a-z0-9_]{1,31}$` that are in an allow-list inside the function; cap `props` at 600 bytes and keep only string / number / boolean values; cut `path` to 80 characters with the query string removed; reduce a referrer to its host name; compute `visitor = left(encode(digest(public.request_ip_hash() || today's salt, 'sha256'), 'hex'), 16)` (reuse `request_ip_hash()` from migration 33.7; the raw IP is never stored); silently drop the call if this visitor already has more than 300 events in the last 10 minutes or if the user-agent header contains `bot`, `crawl`, `spider`, `headless` or `lighthouse`. It never raises an error to the caller.
  - Read side: `public.pulse_report(p_days int default 14) returns jsonb`, `security definer`, first line `if not public.is_moderator() then raise exception 'forbidden'`. Returns everything the screen in 35.1d needs in one call.
  - Unit test in `tests/unit/` in the style of `migrationsSchema33_12.unit.mjs`: the migration enables RLS, creates no policy, and grants `pulse` but not the tables.
- [x] **35.1b Client.** New `src/utils/pulse.js` (target under 1.5 KB gzipped, no imports except `getSupabaseClient`):
  - `pulse(name, props)` pushes to an in-memory queue. Flush every 15 s, when the queue reaches 20, and on `visibilitychange` → hidden and `pagehide`. The flush is a plain `fetch` to `${SUPABASE_URL}/rest/v1/rpc/pulse` with the publishable key header and `keepalive: true`, so it does not wait for the Supabase client to load (33.43 wants that client lazy).
  - `session` is `crypto.randomUUID()` held in a module variable only. Not in `localStorage`, not in `sessionStorage`, not in a cookie.
  - `returning` is read from a key the site already keeps for its own features (`tm_intro_seen`). Do not create a new key for stats.
  - `src` comes from `?ref=` or `utm_source` on the landing URL (letters, digits, `-`, `_`, max 24 characters), read once.
  - It does nothing at all if GPC or Do-Not-Track is on, if `navigator.webdriver` is true, if `import.meta.env.DEV` is true (unless `?pulse=debug`, which logs to the console instead of sending), or if the Settings switch is off.
  - `pulseTimer(name, props)` returns a `stop()` function that sends `name` with `ms` (time while the tab was visible). Use it for game sessions and for the feed.
- [x] **35.1c Wire it in, without touching call sites.** In `src/utils/analytics.js`, make `safeTrack` call both Vercel's `track` and `pulse`. Then add these events (name: where to call it, props):
  - `view`: once on load and on every view-mode or route change (`useViewMode.js`), `{ mode }`. This is the page view.
  - `first_action`: the first tap, key or scroll of a session, `{ kind, ms_since_load }`. Sessions with a `view` and no `first_action` are bounces.
  - `feed_depth`: on leaving the feed, `{ cards_seen, ms }`.
  - `game_start` / `game_end`: for every game in `arcadeGamesCatalog.js`, `{ game, ms, rounds, result }`. `rounds` = spins, hands, levels or lives used. Hook into `GameShell` and `GameRouter` so no game needs its own code.
  - `slot_spin_batch`: every 10 spins, `{ machine, turbo, auto, spins, wins, biggest_mult }`. Batching keeps volume low.
  - `forge_open`, `forge_export`, `publish_ok`, `publish_refused` `{ reason_class }`: the meme-making funnel.
  - `share`: `{ surface, method }` (native share sheet, copy link, download).
  - `feature_use`: one event the first time in a session that each toy is opened, `{ feature }`: radio, pet, soundboard, boss key, DeLorean, CRT TV, icons strip, 8-ball, AI assistant, rewards, leaderboard, caption battle. This is the data that 33.42 (feature cull) has been waiting for.
  - `client_error`: from `ArcadeErrorBoundary` and `window.onerror`, `{ where, message }` with the message cut to 80 characters and any URL or email removed. (Covers the first half of 33.46.)
  - `wallet_empty`: when a player cannot afford the smallest stake, `{ game }`.
- [x] **35.1d The owner's screen.** New lazy route `/admin/pulse` in `src/main.jsx`, built like `ModerationPage.jsx` and open to moderators only. One call to `pulse_report`. Sections, each a plain table or a row of bars drawn with `<div>` widths (no chart library): **Today and the last 14 days** (visitors, sessions, bounce %, median session time, new vs returning); **Where they came from** (`src` and `ref_host`); **First screen** (which path people land on and the bounce % of each); **Games league table** (starts, median minutes, rounds per session, share of sessions that play a second game), sorted by total minutes; **Meme funnel** (feed view → forge open → export → publish); **Feature use** (% of sessions touching each toy); **Errors** (top 10). Add `<meta name="robots" content="noindex">` for this route.
- [x] **35.1e Tell people.** Add a switch "Anonymous usage stats" (default on) to `SettingsSheet.jsx`, stored through `settingsStore.js`. Update the "Analytics & Anti-Bot Protection" block in `src/data/legalPages.js` (line ~92) to say, in plain words: the site counts page views and button presses without cookies, the count cannot be tied to a person or an account, IP addresses are never stored, raw counts are deleted after 30 days, and here is how to switch it off. **The owner signed off the legal pages on 16 Nov 2026, so show the owner the new paragraph before publishing it.**
- [x] **35.1f Weekly digest.** Reuse the moderation digest webhook pattern (`moderation_digest_send`): every Monday 08:00 UTC, post to the same Discord webhook: visitors this week vs last, top 3 sources, top 3 games by minutes, memes published, and the one number that fell the most.
- **Completion Note (2026-11-16):** Added `supabase/migrations/20261116000001_35_1_pulse.sql` (`pulse_events`, `pulse_salts`, `pulse_daily`, `pulse`, `pulse_report`, `pulse_weekly_digest_send`, and 3 `pg_cron` jobs), `src/utils/pulse.js`, wired events in `analytics.js` / `useViewMode.js` / `GameRouter.jsx` / `GameShell.jsx` / `VegasSlotMachine.jsx` / `MemeStudioModal.jsx` / `useFeed.js` / `ArcadeErrorBoundary.jsx` / `settingsStore.js`, added lazy `/admin/pulse` (`PulseReportPage.jsx` + `.css`, `noindex`), Settings toggle (`SettingsSheet.jsx`), `/privacy` disclosure (`legalPages.js`), `tests/security.spec.js` `pulse_*` check, `tests/unit/pulse35_1.unit.mjs`, and `tests/vitest/pulse35_1.test.js`.
- **Done when:** playing two games and publishing one meme on the deployed site shows up on `/admin/pulse` within a minute; with uBlock Origin on, events still arrive; with GPC on, none do; `tests/security.spec.js` gains a test that the publishable key cannot `select` from any `pulse_*` table.
- **Then leave it running for 48 hours before 35.4 ships**, so there is a baseline for bounce rate and first action.

---

### 35.2 Neon identity: palette, tubes and type

> **Reference file: [`docs/ui/neon-sign-prototype.html`](docs/ui/neon-sign-prototype.html).** Open it at `http://localhost:5173/docs/ui/neon-sign-prototype.html` with the dev server running. It is a working sketch of the sign, the palette and the tube buttons, checked in a browser on 16 Nov 2026. Copy from it; do not import it.
>
> This task **does 34.1 and 34.2** (tick them when it is done) and **replaces the colour list in 34.B.2**. The owner has asked for the logo and colours to change, so 34.G rule 9 ("stop and ask before changing the logo or colour roles") is satisfied for 35.2 to 35.4.

**The idea: a real neon sign shop at night.** A real sign has only a few gas colours, the glass is visible when it is off, the light is hottest in the middle of the tube, and the room around it is dark. Copy those four facts and the site will look like neon instead of like a gradient.

**The whole palette (nothing else is allowed in new CSS):**

| Token | Value | Job |
|-------|-------|-----|
| `--tm-night-0` | `#07060f` | Page background |
| `--tm-night-1` | `#110d22` | Cards |
| `--tm-night-2` | `#1b1536` | Raised things: sheets, menus, cabinet bodies |
| `--tm-night-3` | `#2c2452` | The one border colour; unlit details |
| `--tm-pink` / `-hot` / `-off` | `#ff2e88` / `#ffd9ea` / `#3d1028` | **The main action.** One pink thing per screen. Also the sign's big word. |
| `--tm-cyan` / `-hot` / `-off` | `#19f0ff` / `#e2fdff` / `#0b3440` | Navigation, links, selected state, focus ring |
| `--tm-amber` / `-hot` / `-off` | `#ffb800` / `#fff1c9` / `#3d2c05` | **Money and wins only** (MemeDollarz, jackpots, prizes) |
| `--tm-uv` | `#8a3dff` | Background glow only. Never text, never a button. |
| `--tm-text` / `--tm-text-dim` | `#f4f1ff` / `#a59fc4` | Body text / secondary text |
| `--tm-ok` / `--tm-danger` | `#3dff9a` / `#ff4d5e` | Small utility marks only: upvoted, success tick, report, delete. Never glowing. |

Each neon colour has three forms, like a real tube: the gas colour (`--tm-pink`), the white-hot centre (`-hot`) and the unlit glass (`-off`). Text on a dark background that needs to "be neon" uses the `-hot` colour with a glow of the gas colour; it is never the raw gas colour on small text (it fails contrast).

- [x] **35.2a Tokens.** Create `src/styles/tokens.css` exactly as 34.1 describes (type scale, spacing, radius, shadows, motion, layers, layout, breakpoints) but with the colour table above. Keep the five old `--tm-neon-*` names as aliases pointing at the new values (`--tm-neon-gold` → `--tm-amber`, `--tm-neon-purple` → `--tm-uv`, `--tm-neon-green` → `--tm-ok`). That alone re-tints much of the site. Screenshot the home page, lobby and slots before and after; fix anything that became unreadable.
- [x] **35.2b The tube primitives.** New `src/styles/neon.css`, imported after `tokens.css`. Classes use the `ui-` prefix (34.3):
  - `.ui-tube` + `.ui-tube--pink | --cyan | --amber`: sets `--c`, `--hot`, `--off` for whatever is inside.
  - `.ui-tube-box`: a rounded outline that looks like a bent tube. Recipe (from the prototype's `.tube-btn`): `border: 2px solid var(--c)`; `box-shadow: 0 0 0 1px var(--off), 0 0 14px -2px var(--c), inset 0 0 12px -4px var(--c)`; text in `var(--hot)` with `text-shadow: 0 0 10px var(--c)`. The glow is **static**. Never animate `box-shadow`, `filter` or `text-shadow`.
  - `.ui-tube-box--off`: the unlit state (border `--tm-night-3`, dim text, no glow). Disabled buttons and unselected tabs use this. A lit tab among unlit tabs reads instantly, which is the point.
  - `.ui-tube-text`: for short headings (one to three words).
  - `.ui-tube-rule`: a horizontal neon line used as a section divider, with an optional travelling pulse (a 40 px white gradient moved with `transform: translateX`, which is cheap).
  - `.ui-flicker-on`: the one-time power-on stutter (keyframe `power-on` in the prototype, 900 ms, `steps(1)`). Use it when a screen or a game cabinet first appears, staggered 70 ms per element, at most 6 elements.
  - **Glow budget:** at most three lit tube elements in view at once outside games (the sign, the primary button, the selected tab). Everything else is unlit glass or plain surface. This is what makes it look expensive.
- [x] **35.2c Fonts.** Self-host as 34.2 says, two families, both SIL Open Font Licence (check the licence file in the download and commit it): **Audiowide** for headings and big numbers (subset to Latin, one weight; *replaced by Oxanium / Tilt Neon / Outfit in 35.2e*) and **Press Start 2P** for tiny arcade labels only (scores, "INSERT COIN", subset to `A–Z 0–9` and basic punctuation). Body text is the system font stack. The site currently names `Inter` and `Press Start 2P` in CSS but loads neither. Remove the Google Fonts hosts from the CSP in **both** `index.html` and `vercel.json` once the files are local.
- [x] **35.2d Background.** Keep the synthwave grid as the single ambient loop, re-tinted: grid lines in `--tm-cyan` at 14% opacity, horizon glow in `--tm-uv`, and a slow pink "sun" only on the home page and lobby. Remove the two extra radial gradients on `.tm-app`. Add a faint film-grain layer (one 128×128 PNG noise tile, 4% opacity, `pointer-events: none`) to kill colour banding in the dark gradients; off under `.tm-lite-perf`.
- **Done when:** the kit page `/__ui` (34.3) shows every primitive lit and unlit; the count of different hex colours in `src/index.css` has gone down (record the number); nothing on the home page, lobby or slots uses a colour outside the table for a newly written rule.
- **Completion Note (2026-11-16):** Added `src/styles/tokens.css`, `src/styles/neon.css`, dev-only `/__ui` (`src/components/UiKitPage.jsx`), self-hosted `Audiowide` + `Press Start 2P` (`public/fonts/`, 26.6 KB total + OFL licences) with tightened CSP in `index.html` and `vercel.json`, re-tinted synthwave grid + UV horizon + pink sun (`data-view="feed|arcade"`) + `public/noise-128.png` film grain in `src/index.css` & `src/App.jsx`. Distinct hex colours in `src/index.css` reduced from 56 to 52. Before/after screenshots saved in `docs/ui/35.2/`.

---

### 35.2e Neon Refine (owner brief, 16 Nov 2026: "pink upload button looks tacky, the cyber-arcade font isn't great")

- **Type system replaced.** Audiowide is gone. `--tm-font-display` = **Oxanium** (variable 200–800: headings, numbers, tube buttons), `--tm-font-neon` = **Tilt Neon** (lit words only: hero "MEMES / CYBER-ARCADE", lobby title, game signs), `--tm-font-body` = **Outfit** (variable). Press Start 2P stays for tiny arcade labels. All SIL OFL, self-hosted in `public/fonts/` (79 KB total); Oxanium is the preloaded one. Courier / ui-monospace font stacks in component CSS now point at `--tm-font-display` (BossKey, Moderation and Pulse pages keep monospace on purpose).
- **Primary buttons are lit glass, not paint.** `.ui-tube-box--solid`, `.tm-btn-primary` and `.tm-mutate-btn` are a pink tube over smoked glass with a one-pass sheen on hover. Never bring back a flat pink fill or a yellow→pink→purple gradient. Selected tabs and pills (`.tm-tab.active`, lobby filters, game mode pills) are lit cyan tubes. Staked-game CTAs (deal / spin) are amber gold.
- **Legacy colours mapped to tokens.** ~1,800 hard-coded Tailwind-era hexes and rgba() values in CSS (`#00f3ff`, `#facc15`, `#ec4899`, slate greys…) now resolve to the palette tokens; new token `--tm-text-soft` (#d2cceb) sits between `--tm-text` and `--tm-text-dim`. Inline colours inside `.jsx` files and canvas drawing code were **not** touched.
- **Completion Note (2026-11-16):** `tokens.css`, `neon.css`, `index.css`, `DualDirectionHero`, `ArcadeLobby`, `QuickUploadBar` (lucide icons instead of emoji), modal chrome, meme-card action bar, casino CTAs. `npm run lint` and `npm run build` exit 0; checked at 390×844 and 1280×800.

---

### 35.2f / 35.2g Neon Refine, passes 2 and 3 (16–17 Nov 2026) + HANDOFF FOR THE NEXT AGENT

**Done in these passes (all pushed to `main`):**
- 35.2f: 80s icons strip restyled as unlit glass; 249 legacy hex colours inside JSX `style={{…}}` props mapped to tokens (40 files); poker buy-in / size pills lit amber.
- 35.2g: non-game panels (extras drawer, AI copilot panel, Dank Pet card, DeLorean modal, Forge window, iPhone modal, live-celebration card, dock games drawer) use the modal chrome (1 px `--tm-night-3` border, cyan top edge, `--tm-shadow-3`) instead of a 2 px cyan outline; radio Play and Reels "Remix this" are pink lit glass; Rewards vault game links are plain `.tm-btn` (one pink action per screen); **arcade steer cards under the home feed were clipping their titles** (icons sat beside the copy at a fixed width) and now stack, with a cyan tube CTA.

**The look, in five rules (do not regress these):**
1. Primary action = pink tube over smoked glass (`.ui-tube-box--solid`, `.tm-btn-primary`). Never a flat fill, never a multi-colour gradient. One per screen.
2. Selected / navigation = lit cyan tube; everything unselected is unlit glass (`--tm-night-3` border, `--tm-text-dim` text).
3. Amber is money and wins only (wallet, stakes, deal / spin, jackpots).
4. Fonts: `--tm-font-display` (Oxanium) for headings, labels, numbers; `--tm-font-neon` (Tilt Neon, weight 400 only) for one-to-three-word lit signs; `--tm-font-body` (Outfit) for reading and for user-written text such as meme titles; `--tm-font-arcade` for tiny arcade labels. Impact stays for meme captions and slot/win shout text.
5. Panels: `--tm-night-1` surface, 1 px `--tm-night-3` border, shadow tokens. Game cabinets may keep a coloured 2 px tube frame; ordinary panels may not.

**Still to do, in suggested order (each is its own commit):**
- [ ] **Game-by-game look.** Only the home feed, lobby, studio, slots, blackjack, poker, stock market, reels, auth, extras drawer, rewards vault, hall of fame and `/rules` were looked at. Open every other route in `src/data/seoRoutes.js` (bingo, pinball, coin pusher, roulette, derby, meme crush, 8-ball, guess, higher-or-lower, invaders, serpent, brick blaster, sunset sprint, vector void, grid riders, battle arena, swipe deck, the five boss-key prank screens, soundboard, creator profile, leaderboard, settings sheet, report sheet, AI roast, theater) at 390×844 and 1280×800 and fix anything off-rule.
- [ ] **Emoji as icons.** Buttons and pills still lead with emoji (🔥 Hot, 🏆 Ranks, ⚙️ Settings, 🎨 Remix, the lobby station pills, the hero Explore pills). `lucide-react` is already a dependency: swap them the way `QuickUploadBar.jsx` and `MobileArcadeDock.jsx` do. Keep emoji inside user content and game art.
- [ ] **Remaining off-palette colours in CSS** (count with `grep -rhoi "#[0-9a-f]{6}" src --include=*.css | sort | uniq -c | sort -rn`): `#f97316` orange (40, mostly amber→orange game fills, acceptable inside staked games, not elsewhere), `#a855f7` / `#c084fc` / `#8b5cf6` purple (should become `--tm-uv` glows or go), `#f87171` / `#fca5a5` / `#fb7185` reds (→ `--tm-danger`), `#86efac` / `#bbf7d0` greens (→ `--tm-ok`). The remaining multi-colour gradients are listed by `grep -rn "linear-gradient([^;]*var(--tm-cyan)[^;]*var(--tm-pink)" src --include=*.css`; progress bars and the supernova card foil may stay, button fills may not.
- [ ] **Colours in canvas code and SVG attributes** (`ctx.fillStyle = '#…'`, `fill="#…"`) were deliberately left: `var()` does not work there. If they need re-tinting, use the literal palette hex values from `tokens.css`.
- [ ] **VintageCrtNewsTv** keeps its wood-grain body on purpose. Its top bar and side panel greys could be warmer; low priority.
- [ ] **Inline styles.** Many components still carry long `style={{…}}` blocks (RewardsModal, MemeStockMarketGame, App.jsx). Move them into the component CSS file when touching that component; do not do a blind sweep.
- [ ] **Glow budget.** The home page on desktop still lights more than three tubes at once (nav tab, Create, wallet, Make a meme, Play, Hot, #ALL, Upload). Consider making the nav Create button unlit on the home page, where "Make a meme" is already the pink action.
- [ ] Then resume the roadmap at **35.7e** (see the Pause/Resume Note under 35.7).

**Things that will save you time:**
- CSS files are checked out with **CRLF** on this Windows machine. Exact multi-line string matches written with `
` will not match; normalise line endings when reading and restore them when writing.
- The Browser-pane screenshot of a page scrolled far down at an emulated size can show the lower half unpainted (`content-visibility` plus the scaled capture). It is a capture artefact; confirm with `getBoundingClientRect` before "fixing" it.
- In dev only, the console shows `cannot add presence callbacks … after subscribe()` from `useLivePresence.js` (React StrictMode double-mount). The production site is clean. Worth a proper fix, but it is not a styling regression.
- `npx vitest run` has **one failure that predates Phase 35.2e**: the "staging security assertions" case in `tests/vitest/safetyAndEconomy.test.js`, which shells out to `node --test tests/security.spec.js`. Everything else passes. Find out what it needs (it may want staging credentials) before treating a red run as your fault.
- Vercel deploys `main` about a minute after a push. Check `https://www.thememes.net/games` afterwards.

---

### 35.3 The sign: the new logo

**What it is.** The words THE MEMES.net as a neon sign made of bent glass tubes: small cyan "THE", big pink "MEMES", small cyan ".net", and an amber underline with one "zap" in it. A short bright pulse of light travels along each tube, the sign stutters on when the page loads, and the middle "M" has a loose connection and buzzes every few seconds. There is **no box** around it.

- [x] **35.3a Build `src/components/NeonSign.jsx`** from the prototype. How it works (keep all of this):
  - Every letter is **one SVG path drawn as a single centre line** with `stroke-linecap: round` and `stroke-linejoin: round`. Never use an outlined font glyph and never `<text>`: a font outline cannot look like a tube.
  - Each tube is the same path drawn five times, back to front: **glass** (`-off` colour, 1.5 px wider), **glow** (gas colour, 2 px wider, `filter: blur(5px)`, static), **core** (gas colour), **hot** (`-hot` colour, one third of the width) and **flow** (white, `stroke-dasharray: 5 95` on a path with `pathLength="100"`, animating `stroke-dashoffset` from 100 to 0, linear, infinite). The flow layer is the neon moving through the tube.
  - Each tube gets a slightly different flow duration (2.4 s to 3.9 s) so the pulses never line up.
  - Props: `size` (`hero` | `nav` | `icon`), `flow` (default true for hero, false for nav), `powerOn` (default true once per session, tracked in a module variable), `title`. Root element: `<svg role="img" aria-label="THE MEMES.net">`.
  - `nav` size (about 132 px wide): no flow layer, glow layer kept. `icon` size (square, for places under 48 px): just the pink "M" with its underline.
  - Under `prefers-reduced-motion`, the `data-reduced-motion` setting or `.tm-lite-perf`: no flow, no power-on, no buzz. The sign is simply lit.
  - Pause the flow animation when the sign is off screen (`IntersectionObserver` toggling a class that sets `animation-play-state: paused`) and when the tab is hidden.
  - The letter shapes in the prototype are a good first draft. Improve them by eye: real tube letters have slightly rounded corners where the glass bends, and small gaps where one tube ends and the next begins. Take a screenshot after each change. Stop when it looks like something you would photograph in a bar.
- [x] **35.3b Put it in the top bar.** In `NavbarHud.jsx`, replace `.tm-mascot-logo-wrap` and `.tm-logo-badge` with `<NeonSign size="nav" />`. Keep the click handler, the title and the 5-tap secret on the wrapper. Delete the old `.tm-logo-badge` and `.tm-mascot-logo-*` rules. Do the same in `FixedArcadeTopBar` (in `GameRouter.jsx` or `GameShell.jsx`; search for the second place the logo is drawn) using `size="icon"`.
- [x] **35.3c Hero moment.** On a first visit, the home page opens with the hero-size sign powering on over the dark grid (900 ms), then the first screen of 35.4 fades up under it. On later visits the sign is already lit and smaller. `InsertCoinIntro.jsx` already owns a first-visit moment: merge with it instead of adding a second intro.
- [x] **35.3d Everywhere else the logo lives.** Regenerate from the same paths, as static files: `public/favicon.svg` (the pink "M" tube on `--tm-night-0`, readable at 16 px, so drop the glow blur at that size), `favicon-48.png`, `favicon-192.png`, `apple-touch-icon.png`, `logo-512.png`, `og-card.png` (1200×630: the lit sign, centred, on the grid) and the frame used by `scripts/generate-og-cards.mjs` for the 29 per-page cards. Update `theme-color` in `index.html` and the colours in `manifest.webmanifest` to `#07060f`. Update the image `alt` text and the file-tree comments in Section 3 that still describe a "Cyber-Jester Skull" and an "Arcade Crest".
- [x] **35.3e The meme watermark.** `stampArcadeCartridgeFooter()` in `src/utils/canvasMutator.js` stamps every exported meme. Redraw that stamp with the new mark (pink "M" tube + `thememes.net` in the heading font) so every meme that leaves the site carries the new brand. Keep it the same height so existing layouts do not shift.
- **Done when:** screenshots of the top bar at 390 px and 1280 px, the hero, the favicon in a browser tab and one exported meme are saved in `docs/ui/35.3/`; Lighthouse performance on the home page is no worse than before; with reduced motion on, nothing in the sign moves.
- **Completion Note (2026-11-16):** Built `NeonSign.jsx` + `NeonSign.css` + `neonSignPaths.js` (rounded glass bends, 5-layer SVG tubes, 2.4–3.9s flow, once-per-session power-on, middle-M buzz, IntersectionObserver/visibility pause, reduced-motion & lite-perf off), replaced top-bar/footer badges in `NavbarHud.jsx`, `GameRouter.jsx` (`FixedArcadeTopBar`), and `SeoDiscoveryFooter.jsx`, updated `InsertCoinIntro.jsx` & `DualDirectionHero.jsx` for first-visit hero power-on, regenerated `favicon.svg`/`favicon-48.png`/`favicon-192.png`/`apple-touch-icon.png`/`logo-512.png`/`og-card.png` via `scripts/generate-brand-assets.mjs` & updated `manifest.webmanifest`/`index.html`/`generate-og-cards.mjs`, and redrew `stampArcadeCartridgeFooter()` in `src/utils/canvasMutator.js`. Screenshots & exported meme saved in `docs/ui/35.3/`.

---

### 35.4 The first screen, in neon

This **is tasks 34.4 and 34.5** (read them; their measurements and "done when" numbers still apply; tick them and 33.41 when this is done). What Phase 35 adds:

- [x] **35.4a Top bar (34.5) with the new parts.** One 56 px row on phones: `NeonSign` (nav), the wallet (amber, see 35.5), one "more" button. The selected tab is a lit cyan tube; the others are unlit glass.
- [x] **35.4b The first screen (34.4).** Under the top bar on a phone: one line of welcome, **Make a meme** (the screen's one pink tube button) and **Play** (cyan outline), then the first meme. All the pills and the "TWO 80s WORLDS" banner move as 34.4 says.
- [x] **35.4c Dock.** Five unlit glass icons; the centre Create button is the only pink tube; the current tab is lit cyan.
- [ ] **35.4d Check with Pulse.** Compare bounce % and `first_action` time for the 48 hours before and after. Put both numbers in the completion note. If bounce went up, say so and stop for the owner.
- **Completion Note (2026-11-16, 35.4a–35.4c):** Rebuilt `NavbarHud.jsx` (56 px single row on phones with `NeonSign`, amber wallet, `More` button, phone scroll-hide listener; single row on desktop with cyan lit/unlit tube tabs), `DualDirectionHero.jsx` + `.css` (compact welcome `<h1>` + solid pink `Make a meme` + cyan `Play`; desktop single horizontal Explore row; hidden Explore/QuickUploadBar on `<= 860px` where dock `+Create` is always reachable), `LazyCompanionRow.jsx` + `VirtualizedMemeGrid.jsx` (`EightiesIconsStrip` + `VintageCrtNewsTv` moved after the 6th meme on `< 1181px` and lazy-mounted via `IntersectionObserver`, kept above feed only from `>= 1181px`), `App.jsx` mobile `Filter` collapse for category pills & search, and `MobileArcadeDock.jsx` (`lucide-react` icons, unlit glass inactive tabs, lit cyan active tab, solid pink centre `Create`). Measured at `390×844`: `.tm-nav` = `56 px`, first meme image top = `293.3 px` (`< 320 px`), visible tappable items above first meme = `8` (`<= 8`), main JS bundle gzipped dropped `153.89 KB -> 145.31 KB`. `35.4d` remains open until 48h production Pulse data is collected.

---

### 35.5 One money: MemeDollarz

**The decision.** The currency is the **MemeDollar**, written **`M$`**, with cents written **`¢`**. Prices are 1980s prices: a game is a quarter, a slot pull starts at M$1.25, a new player gets five dollars. Everywhere on the site, the same amount is written the same way.

**The rule that makes this safe:** nothing about the economy changes. The stored number stays a whole number of "tokens" in `localStorage`, and **1 token is shown as 25¢** (one quarter). So 20 tokens is `M$5.00`, a 5-token bet is `M$1.25`, the 65-token daily cap is `M$16.25`. This is what `formatEightiesPrice()` already does; it becomes the only way.

- [x] **35.5a One formatter.** In `src/utils/tokenEconomy.js`:
  - Set `CURRENCY_BRAND = { name: 'MemeDollarz', symbol: 'M$', cent: '¢', centsPerToken: 25 }`.
  - Add `formatMoney(tokens, { centz = 0, compact = false, sign = false })`: total cents = `tokens × 25 + centz`. Under 100 cents → `75¢`. Otherwise `M$1.25`; with `compact`, whole dollars drop the decimals above M$100 (`M$250`) and thousands get a separator. `sign: true` gives `+M$2.50` / `−75¢` for wins and costs. Zero → `FREE` only where a price is being shown, `M$0.00` where a balance is being shown (add a `zero: 'free' | 'balance'` option).
  - Make `formatEightiesPrice` and `formatMemeCurrency` thin wrappers around it, then remove them once nothing calls them.
  - **MemeCentz** (`handleEarnMemeCentz` in `src/hooks/useTokenEconomy.js` line ~348) currently rolls over at 100 centz = 1 token, which only made sense when a token was a dollar. Change the rollover to **25 centz = 1 token**, change the stored balance range to 0–24, divide every centz award and the daily cap by 4 (round down, minimum 1; `maxDailyCentz` 500 → 125), and migrate a saved balance once with `Math.floor(old / 4)` under a new storage key `tm_memecentz_balance_v2`. The amount of real play needed to earn a token is unchanged.
  - Add Vitest cases to `tests/vitest/safetyAndEconomy.test.js`: `formatMoney(0)`, `(1)` → `25¢`, `(3)` → `75¢`, `(4)` → `M$1.00`, `(5)` → `M$1.25`, `(20, {centz: 6})` → `M$5.06`, `(4000, {compact: true})` → `M$1,000`; and the centz migration.
- [x] **35.5b One wallet.** New `src/components/ui/Money.jsx`: `<Money tokens={n} />` renders the formatted amount in the amber colour with `font-variant-numeric: tabular-nums`, and when the value changes it counts up or down over 400 ms (instant under reduced motion). New `<Wallet />` built on it replaces the three different wallet displays (top bar `tm-token-wallet-pill`, lobby header, each game's own balance box). The coin icon is a small inline SVG of an amber coin with an "M" on it, not the 🪙 emoji.
- [x] **35.5c Sweep the words.** Go through `src/` one file per commit, worst first: `ArcadeAiAssistant.jsx`, `RewardsModal.jsx`, `VegasCoinPusherGame.jsx`, `MemeStockMarketGame.jsx`, `GameRouter.jsx`, `VegasBlackjackGame.jsx`, `VegasSlotMachine.jsx`, `VegasPokerGame.jsx`, `NeonDerbyGame.jsx`, `MemeCrushGame.jsx`, then the rest, then `slotMachinesCatalog.js`, `arcadeGamesCatalog.js`, `seoRoutes.js`, `legalPages.js`, `index.html`, `manifest.webmanifest`, `scripts/prerender-seo.mjs` and the OG card generator. In every string a visitor can read:
  - An amount is always `formatMoney(...)` or `<Money />`. Never `5 🪙`, `5 Tokens`, `$1.25 (5🪙)`, `M$5` for 5 tokens, or a bare `$`.
  - The currency is called "MemeDollarz" (or "M$"). Not tokens, coins, credits or chips. "Chip" is fine for the physical object on a roulette or blackjack table ("drag a chip"), but its face value is in M$. "Coin" is fine for the physical object in the coin pusher and for "insert coin".
  - Bet buttons show 1980s amounts: `25¢`, `50¢`, `M$1.25`, `M$2.50`, `M$6.25`, `M$12.50`, `M$25`.
  - **Do not rename code identifiers** (`tokens`, `onSpendTokens`, storage keys). Only what people read changes.
  - Tickets (task 33.27) stay a separate, later thing and are not MemeDollarz.
- [x] **35.5d A guard so it stays fixed.** New `scripts/check-currency.mjs`, run by `npm run lint`: fails if a `.jsx` file under `src/` contains `🪙`, or a JSX text or string literal matching `/\b\d+\s*(tokens?|coins?|credits?)\b/i`, outside a short allow-list file. Add it to the Safety CI workflow.
- [x] **35.5e 1980s prices as flavour.** One place, the Rewards/Vault screen, gets a small "1986 price list" so the money feels real: arcade game 25¢, can of cola 50¢, cinema ticket M$3.50, cassette album M$8.99, pair of high-tops M$65. Original wording only; no brand names.
- **Done when:** the top bar, the lobby and all five slot machines show the same balance in the same format at the same time (screenshot all three); `npm run lint` runs the new check and passes; the Vitest cases pass.
  > Completion Note (35.5, 2026-11-16): Unified currency under `formatMoney()` and `<Money />`/`<Wallet />` (`25¢` per token, 25 centz rollover migrated to `tm_memecentz_balance_v2`), swept `src/` + catalogs + SEO routes + OG generator, wired `scripts/check-currency.mjs` (85 JSX files, 0 violations) into `npm run lint` and Safety CI, added the 1986 price list to `RewardsModal.jsx`, and verified `M$5.06` across top bar, `/games`, and all 5 slot machines (`docs/ui/35.5/`).

---

### 35.6 The juice kit (build once, use in every game)

"Juice" is the feedback that makes a tap feel like it did something: a tiny shake, a burst of sparks, a number that counts up, a buzz in the hand. Today each game has its own version or none. Build one kit, then every game calls it.

- [x] **35.6a `src/utils/juice.js`** (no React, no imports except `SoundEngine` and `settingsStore`). Every function is a no-op that returns immediately when Calm mode, reduced motion or `.tm-lite-perf` forbids it, so games never have to check.
  - `haptic(name)`: named patterns, played through one place. `tap` 8 ms; `tick` 4 ms; `thunk` 14 ms; `double` `[10, 40, 10]`; `win` `[20, 30, 20, 30, 60]`; `big` `[40, 40, 40, 40, 120]`; `jackpot` `[60, 30, 60, 30, 60, 30, 200]`; `heartbeat` `[18, 110, 28]`; `fail` `[30, 60, 80]`. Uses `navigator.vibrate` (Android, and desktop where present) through the existing `SoundEngine.triggerHaptic` gate (user gesture + haptics setting). **iPhone Safari has no `navigator.vibrate`.** There is a known approach that makes iOS 18+ tick by programmatically toggling a hidden `<input type="checkbox" switch>` through its `<label>`; try it behind a feature check, **test it on a real iPhone**, and remove it if it does not work. Never throw.
  - `shake(el, power)`: `power` 1–5 maps to 2–14 px and 120–420 ms, done with the Web Animations API on `transform` only, decaying. A new shake on the same element replaces the old one.
  - `punch(el, scale = 1.08)`: quick scale up and spring back (160 ms). For buttons, counters, symbols.
  - `hitStop(ms)`: returns a promise; games `await` it to freeze for 40–120 ms on a big impact. A freeze before a payoff is the cheapest drama there is.
  - `countUp(el, from, to, { ms, format, onTick })`: eased number roll; `onTick` lets the caller play a rising tick sound; a tap on the element finishes it at once.
  - `flash(el, colour, ms)`: one soft flash of an overlay's opacity. The kit keeps a global clock and **refuses to flash more than 3 times a second**.
  - `slowMo(factor, ms)`: sets a shared time-scale number that game loops may read.
- [x] **35.6b `src/components/ui/JuiceLayer.jsx`**: one full-viewport `<canvas>`, `pointer-events: none`, mounted once in `App.jsx` beside `ParticleOverlay`. `burst({ x, y, kind, count, colour })` with kinds `spark`, `coin` (the amber M$ coin, spinning, with gravity and one bounce), `confetti`, `star`, `ring` (expanding neon ring) and `float` (a "+M$2.50" label that rises and fades). Pool the particles (no allocation per frame); hard cap 400 (120 under lite); the loop stops when there are none. `coinsTo({ fromEl, toEl, count })` flies coins along curved paths from a win to the wallet, and the wallet `punch`es and ticks up as each coin lands. That one effect is the Candy Crush "reward travels to your total" trick, and it ties wins to the wallet on every game.
- [x] **35.6c Rewire what exists.** `ParticleOverlay.jsx` and `WinCelebrationOverlay.jsx` keep their public functions but draw through `JuiceLayer` where they overlap. The upvote in `useFeed.js` (line ~783) calls `haptic('tap')` instead of `navigator.vibrate(10)` directly.
- **Done when:** the kit page `/__ui` has a "Juice" section with a button for every function; each one visibly does nothing with reduced motion on; a unit test proves `flash` refuses a fourth flash inside one second.
  > Completion Note (35.6, 2026-11-16): Built `src/utils/juice.js` (named haptics + iOS 18 switch fallback, WAAPI shake/punch, hitStop, countUp, 3/sec flash limiter, slowMo) and pooled canvas `JuiceLayer.jsx` (`burst` + curved `coinsTo`), rewired `ParticleOverlay.jsx`, `WinCelebrationOverlay.jsx`, and `useFeed.js`, added the interactive section on `/__ui` (`docs/ui/35.6/`), and verified normal + reduced-motion no-op + Vitest `juice35_6.test.js` + `npm run lint` + `npm run build`.

---

### 35.7 Slots Turbo

**Goal:** the reels really spin, fast; stopping them feels heavy; the last reel makes you hold your breath; a win pours into your wallet. Then 35.8 makes it strange.

**Before changing feel, make it safe to change (this is the slot half of 33.47):**

- [x] **35.7a Extract the logic.** Move everything in `VegasSlotMachine.jsx` that decides an outcome (target stops, grids, wild placement, power-ups, free spins, hold-and-spin, bonus wheel result) into pure functions in `src/utils/slotEngine.js`, taking a random-number function as an argument so tests can fix the seed. Each returns a **spin result object** made *before* any animation starts: `{ stops or grid, wins: [{ line, cells, mult }], totalMult, payout, features: [...], anticipation: [...] }`. Add `tests/vitest/slotEngine35_7.test.js`: over 200,000 seeded spins per machine, return-to-player is within one percentage point of today's value (measure today's first and write it in the test), and no payout exceeds `maxMult`. **No behaviour change in this step.**
- [x] **35.7b One reel component.** New `src/components/slots/Reel.jsx` + `reelMotion.js`, used by all five machines (3-reel, 5×3 and 5×4): *(wired to `bandit85` first; 4 video machines follow after `35.7e` per order below)*
  - A reel is a **tall strip** of symbol cells inside a window with `overflow: hidden`. The strip moves with `transform: translate3d(0, y, 0)` and wraps. Motion is driven by **one `requestAnimationFrame` loop for the whole machine** that writes `style.transform` through refs. No React state changes per frame, and delete the `setInterval`/`spinTickOffset` mechanism and the `tmVegasDrumSpin` / `tmDrumSpinTick` jiggle keyframes.
  - **Motion blur without `filter`:** each symbol has a second, pre-blurred version (render `SlotSymbolArt` once to an offscreen canvas at start-up, stretch it vertically 3×, 55% opacity). Above about 1,400 px/s the strip shows the blurred set and gets `scaleY(1.06)`. Animated CSS `filter: blur()` is banned here: it is the main cause of dropped frames on phones.
  - **The spin has five phases:** (1) **wind-up**: the strip pulls *back* 14 px over 90 ms, like a spring being loaded; (2) **launch**: accelerate to top speed in 160 ms; (3) **cruise** at about 2,600 px/s (3,600 in turbo); today's effective speed is roughly a third of that; (4) **brake**: decelerate over the last 1.5 symbols so the target lands on the line; (5) **settle**: overshoot 10–16 px past the line and spring back in 180 ms. On settle: `SoundEngine.playSlotReelStop(i)`, `haptic('thunk')`, and the cabinet nudges 2 px down and back.
  - Each reel starts 60 ms after the one before it.
- [x] **35.7c Timing.** Normal play: reels stop at **450 / 700 / 950 ms** (3-reel) and **380 / 520 / 660 / 800 / 940 ms** (5-reel). Turbo: **160 / 260 / 360** and **140 / 200 / 260 / 320 / 380**. A spin with nothing to wait for is over in about one second. All the extra time is spent only where there is suspense (35.7d). *(done on `bandit85`)*
  - **Slam stop:** tapping the spin button, the reels or the space bar while they spin stops all reels at once (each on its already-decided target, 40 ms apart). Players who want speed get it; nothing about the result changes.
  - **Controls:** space bar or Enter spins; holding the spin button for 600 ms opens auto-spin (10 / 25 / 50, stops on any feature or any win over 10× the bet); the lever can be dragged down with a finger or mouse and its pull distance sets the wind-up.
- [x] **35.7d Suspense (the important part).** The engine's result object lists **anticipation reels**: a reel is one if, given the reels already stopped, it can still complete a top-tier win, a scatter/bonus trigger or a progressive. For each of those reels: *(done on `bandit85`)*
  - It keeps spinning 1.2 s longer (1.8 s for the last reel when a jackpot is alive), and for the final 600 ms it slows to a **crawl** in which single symbols can be read as they tick past the line, each with a `tick` haptic and a tick sound that rises in pitch.
  - The rest of the cabinet dims to 60%, a soft spotlight sits on that reel, the reel window zooms to 1.04, the payline tube pulses, and a rising synth tone plays (new `SoundEngine.playSlotRiser(ms)`), with `haptic('heartbeat')` once a second.
  - Symbols already landed that are part of the possible win glow and "breathe".
  - If it hits: `hitStop(90)` and silence for those 90 ms, then the win. If it misses: one soft low "aww" tone, the dim lifts in 150 ms, and the next spin is ready immediately. Do not punish a miss with a delay.
  - **Honest suspense only.** The result is fixed before the reels move. Anticipation plays only when the win is truly still possible on that reel. **Do not add, weight or stage near-misses** (for example, never choose a losing stop because it puts a jackpot symbol next to the line). A win smaller than the bet is shown as a small quiet return, never as a celebration.
  > Pause/Resume Note (2026-11-16): Completed `35.6` (pushed) and `35.7a` (`slotEngine.js` + 1M-spin `slotEngine35_7.test.js`), `35.7b` (`Reel.jsx`, `reelMotion.js`, `Reel.css` on `bandit85`), `35.7c` (`bandit85` timing/slam-stop/Space/Enter/600ms-auto-spin/lever-drag), and `35.7d` (`bandit85` honest anticipation, 600ms crawl, dim/spotlight/zoom/breathing, `playSlotRiser`/`playSlotTick`/`playSlotAww`, `hitStop(90)`). **Resume next at `35.7e` (Wins that pour on `bandit85`), then roll `b–e` out to the 4 video machines one per commit (`neon_special`, `silver_mustang`, `lightning_vault`, `buffalo_stampede`), then `35.7f`–`35.7h`, `35.8`, `35.9`, `35.10`.**
- [ ] **35.7e Wins that pour.** Tiers by how many times the bet was won, all through the juice kit:
  - **Under 1×:** amount ticks quietly into the wallet. No sound sting, no particles.
  - **1× to 5×:** winning cells `punch` in turn along the line, the line is drawn as a lit tube, 0.6 s count-up, 8 coins fly to the wallet (`coinsTo`), `haptic('win')`.
  - **5× to 15× "BIG WIN":** 2 s. `shake(cabinet, 2)`, coin fountain from the tray, the words in tube lettering power on, count-up with rising ticks, `haptic('big')`.
  - **15× to 50× "MEGA":** 4 s. The cabinet lights chase, `slowMo` on the coin fountain, the count-up pauses twice ("…and more…") before finishing.
  - **50× and over "JACKPOT":** up to 7 s. Full takeover using the existing `WinCelebrationOverlay` and siren, `haptic('jackpot')`, then a share card (35.9c).
  - Any celebration is skipped by a tap, and the money is credited at the *start* of the celebration, so closing the tab never loses a win.
- [ ] **35.7f Bells and whistles on the cabinet.** Chase lights round the cabinet built as real `NeonSign`-style tubes that speed up with the spin and run in the win colour afterwards; a mechanical credit counter in the heading font; a coin tray that fills visibly with the session's winnings; the pay glass lit from behind; a beacon on top that only ever lights for MEGA and JACKPOT. Idle cabinet = almost dark, with only the marquee tube lit and the spin button pulsing slowly. Everything else lights **when the player acts**.
- [ ] **35.7g Things to do, the Candy Crush lessons.** All of these use only pretend money and the existing daily caps:
  - **A meter that is always filling.** Each machine already has one (Fever, Reactor charge, Coffee pot, Voltage, Stampede). Give them one shared look: a glass tube that fills with glowing liquid, sloshes when it gains, and pulses when it is full.
  - **Three daily missions per machine** ("land BAR-BAR-BAR", "trigger free spins", "win 10 spins in a row with Hold"), each paying a small fixed amount inside the existing `quests` cap, with a tick-off animation.
  - **A sticker album** of every symbol and every feature seen on each machine (feeds 33.34), with the count shown on the machine picker ("14 / 22 found").
  - **The Strip:** the machine picker becomes a street at night seen side-on, one neon-fronted building per machine, scrolled sideways. New machines are dark until unlocked by play (spins made, not money spent).
  - **A streak that is kind:** consecutive days played light one more letter of a tube sign; missing a day dims one letter instead of resetting to zero.
  - **Session care:** after 20 minutes of continuous spinning, one gentle line in the status area ("You've been here 20 minutes. Stretch?"), once per session. Auto-spin never runs for more than 50 spins without a tap. The "no real money, can't be bought or cashed out" line stays visible on the cabinet.
- [ ] **35.7h Performance and proof.** 60 frames a second during a 5-reel turbo spin on a mid-range Android phone profile (Chrome dev-tools, 4× CPU slowdown): record a performance trace and put the frame-time summary in the completion note. No layout or style recalculation inside the animation loop. Pulse's `slot_spin_batch` and `game_end` for slots, compared with the week before, go in the note: median session length, spins per session, share of sessions using turbo.
- **Order inside 35.7:** a → b → c on `bandit85` only → d → e → roll b–e out to the four video machines one per commit → f → g → h.

---

### 35.8 Dream Mode: "like in a strange dream"

**The idea.** The longer and luckier a session runs, the less the room obeys the rules. It starts as a normal 1985 slot hall. It ends somewhere else. Nothing here changes odds or payouts; it is all presentation. Everything is original: no characters, music or imagery from films or TV.

- [ ] **35.8a Dream Depth.** A hidden number 0–5 per session. It rises by 1 on each BIG-or-better win, on each feature trigger and on every 25th spin, and falls by 1 after 12 spins with no win. A small moon in the corner of the cabinet shows it as a phase (new moon → full).
  - **Depth 1:** the background grid starts to bend slowly, like heat haze. The room tone drops a little in pitch.
  - **Depth 2:** symbols at rest breathe (scale 1 → 1.03 over 4 s, out of step with each other). Tube colours drift a few degrees of hue and back.
  - **Depth 3:** the reels' reflections in the glass lag half a second behind the reels. Coins fall slightly too slowly. The status text sometimes finishes its sentence wrong ("Reels spinning. The reels have always been spinning.").
  - **Depth 4:** the cabinet stretches taller as if seen from below. One symbol on the grid is looking at the pointer or the last touch. The chase lights run backwards.
  - **Depth 5: LUCID.** Triggers a free 5-spin round (stake = the last bet, paid like any free spins, inside `maxMult`): the reels spin **upward**, coins fall **up** into a tray on the ceiling, the music plays at half speed with a long echo, the palette inverts to amber-on-violet, and the win text writes itself in tube lettering one stroke at a time. Then the room snaps back to depth 0 with a single camera-flash and a `thunk`, as if waking.
- [ ] **35.8b Small impossible things.** At depth ≥ 2, about one spin in 40, one of these (never two at once, never during anticipation or a win): a symbol blinks; the goose from `UnhandledGooseSurprise` walks across the pay glass and leaves; for one spin the reels show the player's own most recent meme as a symbol (from `memeFeedBridge.js`), which pays as a wild if the engine had already put a wild there; the clock on the cabinet reads 3:33; the lever is on the other side; the spin button's label says "WAKE UP" and behaves normally; a door-shaped rectangle of light opens at the edge of the screen and closes when looked at (pointer or touch near it).
- [ ] **35.8c Sound.** New `SoundEngine` pieces: a low drone that detunes with depth, a reversed-reverb swell before LUCID, and a music-box version of the win jingle for depth ≥ 3. All through the existing volume and mute controls.
- [ ] **35.8d Limits.** Dream Mode has its own switch on the cabinet ("Dreams: on / off") and is forced off by Calm mode and reduced motion. No strobing, no full-screen flash except the single wake-up flash, no fast zooms. The warping uses `transform` on whole layers, never per-frame filters.
- **Done when:** a 3-minute screen recording of a session reaching LUCID is in `docs/ui/35.8/`, and Pulse shows what share of slot sessions reach each depth.

---

### 35.9 Growth engine: getting visitors

**The plan in one line:** make the things people create while playing easy to send, make each sent thing a doorway back, and make the pages that already match what people search for fast and good. Measure every step with Pulse (`src` and `ref_host`).

- [ ] **35.9a Owner, today, no code (10 minutes):** submit `https://www.thememes.net/sitemap.xml` in Google Search Console and Bing Webmaster Tools (owner action 9 in the Phase 33 list, still not done). Nothing else in this section pays off until this is done.
- [ ] **35.9b Tag every outgoing link.** Every share, copy-link, download watermark QR and embed adds `?ref=<surface>` (`card`, `score`, `daily`, `jackpot`, `embed`, `prank`). Pulse turns that into the "where they came from" table. (This is the measuring half of 33.49.)
- [ ] **35.9c Share cards made by play.** After a MEGA or JACKPOT, a top-10 score, a daily result or a finished meme, offer one card with one button (the native share sheet on phones, copy + download on desktop). The card is drawn on a canvas in the new identity: the lit sign, the result in tube lettering, and a challenge line ("I hit a 62× dream jackpot. Your turn."). The link opens a page with a matching OG image from a new `api/score-og` function (same pattern as `api/meme-og.js`). Does 33.29's OG part and most of 33.49.
- [ ] **35.9d "Beat my score" (33.29) and the Daily Challenge (33.28).** Promote both to here. The daily result shares as a spoiler-free emoji strip plus link. These two are the strongest reasons for one visitor to bring another, and for both to return tomorrow.
- [ ] **35.9e Make the pages people already search for excellent.** The fake-screen prank pages (`/fake-windows-update-screen`, `/fake-blue-screen-prank`, `/fake-hacker-terminal-screen`, `/fake-excel-boss-screen`, `/fake-teams-zoom-call-screen`, `/fake-ai-workspace-boss-screen`) and the meme maker (`/meme-generator`, `/gif-meme-maker`) match real searches. For each: the tool works within one second of landing with no intro in the way; one clear button ("Go fullscreen" / "Add your text"); a short honest how-to under it; and, on leaving the tool, a row of "also try" tiles. Check the bounce % of each on `/admin/pulse` and fix the worst first.
- [ ] **35.9f Speed is ranking (33.43, pulled forward).** Compress the 29 `public/og/*.png` cards to under 150 KB, lazy-load the Supabase client and `soundEngine`, and split `src/index.css`. Target: mobile LCP under 2.5 s.
- [ ] **35.9g Embeds and other shop windows (33.39).** `/embed/<game>` frames with a "Play more at thememes.net" end card; then list the skill games on itch.io.
- [ ] **35.9h Fix what search engines read.** The homepage FAQ in `index.html` still describes "Deep Fry or Glitch filters" and a four-pack soundboard: make it describe what exists now. Fix `manifest.webmanifest` (33.44 notes it still advertises AI roasts). Give every game page a short, honest "how to play" section (33.50).
- [ ] **35.9i Short videos.** Do 28.19 (9:16 export) for **slot jackpots and Dream Mode clips** as well as memes: one button records the last 8 seconds of the cabinet with the sign as an end card. Strange, good-looking clips are what get posted.
- **Not now:** paid ads, an email list, push notifications, a Discord bot. Each needs steady visitors first; see P4.

---

### 35.10 The turbo recipe for every other game

After slots, do one game per task. **Pick the next game from the Pulse league table:** first the most-played game (most people benefit), then the one with the worst "rounds per session" among the well-visited ones (most to gain). For each game, the same checklist:

1. **Frame:** on `GameShell` (34.10), new palette, `Wallet` and `Money` from 35.5, cabinet powers on with `.ui-flicker-on`.
2. **Every input answers within 100 ms** with a sound, a `punch` and a `haptic('tap')`.
3. **Every score or win travels** to the total (`float` label + `coinsTo`).
4. **One moment of held breath** per round, built like 35.7d: find where the outcome is still open (the last card, the ball slowing on the wheel, the final horse length, the last brick) and slow time, dim the room and raise a tone for that moment only.
5. **Three win tiers** with the 35.7e timings; losses are quick and quiet.
6. **Combos escalate:** the 2nd, 3rd, 4th success in a row sounds higher and looks bigger (Meme Crush's cascades are the model).
7. **A meter that is always filling** and **one daily mission**.
8. **Pulse:** `game_end` with `rounds`; before and after numbers in the completion note.
9. Reduced motion, Calm mode, lite mode, and the 3-flashes-a-second limit, checked by hand.

Suggested first three after slots, unless Pulse says otherwise: **Meme Crush** (already close to this style), **Roulette** (the ball slowing is ready-made suspense), **Pinball** (the most to gain from shake and haptics).

### 35.11 For the owner to decide (not blocking the tasks above)

- **Other people's characters.** The slot catalogue and the lobby use names from films and TV (a "Dougie Jones / Mr. Jackpots" machine, Airwolf and Blue Thunder helicopters, a DeLorean garage, a "1980s Classics Crew" of named film characters, KITT and HAL voices). Rule 6 of Phase 33 says new games must be original, and ad networks and rights holders both care about this. Before the site earns money, either rename and redraw these as original parodies or accept the risk knowingly. A short solicitor conversation can cover this with the legal check already on the owner list.
- **Casino-style games and a 13+ audience.** The minimum age is 13 and the busiest games imitate gambling. 35.7 makes them more engaging. That is a reason to keep every guard in 35.7g and rule 5 above, and to ask in the legal check whether the Vegas Room should sit behind an 18+ confirmation.
- **Privacy wording** for Pulse (35.1e) needs the owner's eyes before it goes live.

---

## 0AA. 🚀 PREVIOUS ROUND (still open) — Phase 33: "Safe, Real & Ridiculously Fun"

> **Where we are (site review, 16 Nov 2026):** the safety work (P0, 33.1–33.13), "make the fake things real" (P1, 33.14–33.18) and the first six skill cabinets (33.19–33.24) are **built, live and verified**. Their full task text and completion notes were moved word for word to [`docs/HISTORY.md`](docs/HISTORY.md) ("Phase 33 — completed tasks"). This file now lists **only what is still to do**.
>
> **Order (updated 16 Nov 2026):** **Phase 35 (Section 0 above) first** → owner actions → loose ends below → the rest of Phase 34 (34.3, 34.6–34.13) → P2 (fun) → P3 (polish/health) → P4 (growth and money). Phase 35 already contains 34.1, 34.2, 34.4, 34.5, 33.28, 33.29, 33.39, 33.43, 33.49 and the slot half of 33.47; do not do those twice.
>
> 🎨 **UI overhaul first (owner confirmed 16 Nov 2026):** the full implementation guide is in [Phase 34](#phase-34---ui-overhaul-implementation-guide) below. Do it straight after the loose ends, before more P2 cabinets. It replaces 33.41 and covers the UI half of 33.31, 33.43 and 33.45.

### ✅ Review result (16 Nov 2026) — what was checked

- **Database (live project `otvvphmjojqyjaznjzyo`):** RLS is on for every public table; no public INSERT/UPDATE/DELETE policy exists on any table or storage bucket; `tests/security.spec.js` run against live with only the publishable key: **6/6 pass** (cannot edit/delete others' memes, cannot insert memes, cannot upload to storage, cannot read/forge notifications, vote replay idempotent, non-moderator cannot read reports or the queue).
- **Code:** `npm run lint` clean, `npm run test:unit` 256 node:test + 45 Vitest pass, `npm audit --omit=dev` 0 vulnerabilities, no secrets in the repo or its git history, GitHub "Safety CI" green.
- **Live site (`www.thememes.net`):** CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` headers all present; `/rules`, `/terms`, `/privacy`, `/takedown`, `/contact`, all six new game routes and the sitemap respond; `.env`/`.git` paths are not served.
- **Fixed during the review (task 33.51, see history):** creator-profile migration (33.17) was never applied and had a broken rate-limit call → fixed and applied; `delete-account` function was never deployed → deployed; unknown URLs (including `/admin/moderation`) returned a Vercel 404 instead of the app → rewrite fixed and verified live (HTTP 200) after deploy; `/hall-of-fame` had an empty `<title>`/description → fixed; spare database grants removed (migration `20261115000024`).
- **Public uploads are ON** since 16 Nov 2026 (`PUBLIC_UPLOADS_ENABLED = true` in `src/config/featureFlags.js`; set it to `false`, commit and deploy to pause them in an emergency). Before switching on, a synthetic image was published through the live pipeline with a throwaway anonymous account: checked by image + text moderation, approved and public as WebP in ~2.4 s; a title containing a link was refused; `delete-account` then removed the meme, its file and the account.

### 🔧 Loose ends from finished work (do these first)

- [ ] **33.54 Small hardening follow-ups (none exploitable today).** (a) Rate-limit `start_game_session` (an account can create unlimited `score_sessions` rows) and add a cron job that deletes `score_sessions`/`rate_limit_events` older than 30 days. (b) `is_suspended(uuid)` lets anyone ask whether a given account id is suspended; restrict to own id / moderators. (c) Move the `pg_net` extension out of `public`. (d) Remove the unused legacy public bucket `meme-images` after confirming no meme row points at it. (e) Delete the orphaned test files in Storage `memes/u/` (`826097b0…`, `be9befb2…`, `75a101d0…`, `7f9b4595…`). (f) `delete-account` should also remove the user's `takedown_requests` and `reports` rows.

### 🙋 Owner actions (agents cannot do these)

1. ~~Make yourself a moderator~~ ✅ done 16 Nov 2026: both owner accounts have `role = 'moderator'` and `/admin/moderation` opens for them. Still to do here: review the 1 waiting item (the paused video meme).
2. ~~Sign off the five legal pages~~ ✅ owner published them on 16 Nov 2026: draft labels removed, minimum age set to **13+**, no public email (the `/takedown` form is the contact route), and `/privacy` now says uploads and text are checked by OpenAI's moderation service.
3. **Legal check — still to do (owner chose to switch uploads on before it).** UK Online Safety Act duties for a small user-to-user service (Ofcom guidance and risk assessment), UK GDPR, and a written procedure for reporting suspected child-abuse images (UK: IWF / NCA). This file is not legal advice; a short session with a solicitor is worth it.
4. **Supabase dashboard:** **leaked-password protection** cannot be turned on yet: the toggle (Auth → Sign In / Providers → Email) is Pro-plan only and this project is on the free plan (checked 16 Nov 2026), so the advisor warning stays until an upgrade. Done instead on 16 Nov 2026 (free): minimum password length raised from 6 to 8 and "Letters and digits" required for new passwords (sign-up form in `useAuth.js`/`AuthModal.jsx` matches; existing accounts still sign in). Google and Discord sign-in are enabled alongside email; create a separate **staging project** and add GitHub secrets `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_TEST_MEME_ID` so CI runs the security spec on every push (it is skipped until they exist).
5. **Bot check keys:** add `VITE_TURNSTILE_SITE_KEY` in Vercel and `TURNSTILE_SECRET_KEY` in Supabase Edge Function secrets. Until then Turnstile is skipped and only the rate limits apply.
6. **Daily moderation digest:** add a Discord webhook: `select vault.create_secret('<url>', 'moderation_digest_webhook_url');`
7. ~~Decide when to switch uploads on~~ ✅ switched on 16 Nov 2026 (see review result above).
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

- [x] **33.41 First 10 seconds.** _(Replaced by 34.4 / 35.4; ticked 2026-11-16.)_ New visitors should see, above the fold on a phone: one great meme, one obvious "Make a meme" button, one obvious "Play" button. Audit what currently competes for attention (radio pill, pet, ticker, hero, banners) and defer anything non-essential until after the first interaction. Report before/after screenshots at 390×844.
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

## Phase 34 — 🎨 UI Overhaul: implementation guide

> **Goal in one line:** the meme (or the game) is the brightest thing on every screen, and everything else is quiet, consistent and fast. The 80s neon arcade identity stays; the clutter goes.
>
> **How to work:** this is a refactor in small steps, not a rewrite. One task = one commit = one screen or one primitive. The site must look finished after every commit. All rules in "HOW AGENTS MUST WORK" still apply (targeted edits to `App.jsx`, component styles in the component's own CSS file, build + lint + three viewports).

### 34.A Where the UI is today (measured 16 Nov 2026, dev build)

These numbers are the baseline. Re-measure after each task and put the new number in the completion note.

**Home page on a phone (390×844):**

| What | Now | Target |
|------|-----|--------|
| Top of the first meme image | **2,160 px** down (2.6 screens) | **< 320 px** (visible without scrolling) |
| Top bar height (`.tm-nav`) | 108 px (two rows) | ≤ 56 px (one row) |
| Hero (`.tm-dual-hero`) | 905 px | ≤ 120 px, or gone after first visit |
| Icons strip + CRT TV (`.tm-80s-companion-row`) | 742 px, above the feed | below the 6th meme, or in Extras |
| Things you can tap above the fold | 22 (10 smaller than 44×44 px) | ≤ 8, all ≥ 44×44 px |
| Meme card | 522 px tall, image only 196 px (38%), **16 controls** | image ≥ 60% of the card, ≤ 6 visible controls |
| Smallest text above the fold | 9.5 px | 12 px minimum (11 px only for all-caps labels) |
| Total page height | 22,690 px | not a target, but the 4,203 px arcade block and 1,837 px SEO footer should not grow |

**CSS (all of `src/index.css` + component CSS):**

| What | Now | Target at the end of Phase 34 |
|------|-----|-------------------------------|
| `src/index.css` | 4,859 lines, 107 KB | < 60 KB (also satisfies part of 33.43) |
| Design tokens (custom properties) | 5 colours | full set in 34.1 |
| Different hex colours | 208 | ≤ 40, all defined once in the tokens file |
| Different `font-size` values | 103 | 8 (the type scale) |
| Different `border-radius` values | 36 | 5 |
| Different breakpoints | ~28 (480, 520, 600, 640, 680, 720, 768, 780, 820, 860, 900, 920 …) | 3 |
| `z-index` values | 40 different, from 15 up to 99999 | 8 named layers |
| `!important` | 180 | falling every task; none in new code |
| `box-shadow` / `gradient(` / `@keyframes` | 514 / 429 / 125 | falling every task |
| Button, pill and chip class names | 201 | 5 primitives + per-game exceptions |
| `:focus-visible` rules | 3 | every interactive primitive |
| Fonts | `Inter` and `Press Start 2P` are named in CSS but **never loaded** (no `<link>`, no `@font-face`), so every visitor gets fallbacks | 2 self-hosted families |
| Icons | emoji everywhere; `lucide-react` is installed but no component imports it | decide in 34.2: use it or remove it |

### 34.B Design direction (decide once, then apply everywhere)

1. **One neon sign in a dark room.** Dark, calm surfaces; neon only where the eye should go. At most **one glowing element per screen region** (the primary button, the active tab, a win). If everything glows, nothing does.
2. **Colour has a job.** _(The colour values and names are now set by the table in **35.2**; where this list and 35.2 differ, 35.2 wins. Gold is now amber, purple is now `--tm-uv`.)_ Stop picking colours by taste per component:
   - **Pink** `--tm-pink` = the main action ("Make a meme", "Play", "Publish"). One pink button per screen.
   - **Cyan** `--tm-cyan` = navigation, links, selected state, focus ring.
   - **Gold** `--tm-gold` = money and rewards only (tokens, tickets, wins). Never for ordinary buttons. (Today `#facc15` appears 306 times.)
   - **Green** = success and upvote. **Red** = danger, report, downvote. **Purple** = background glow only.
   - Text: `--tm-text` (near white), `--tm-text-dim` (secondary), `--tm-text-mute` (hints). Check every text/background pair for 4.5:1 contrast.
3. **Three surface levels, not gradients everywhere:** page background → card (`--tm-surface-1`) → raised/sheet (`--tm-surface-2`). One 1 px border colour. Shadows from a set of 3. No `backdrop-filter` on anything that scrolls (slow on older iPads; keep it for the fixed top bar and dock only, and switch it off under `.tm-lite-perf`).
4. **Type:** a display face for headings and big numbers, the system stack for body text, a pixel face only for tiny arcade labels (score, "INSERT COIN"). Never body text in a pixel or mono font. Sentence case for body and buttons; all-caps only for short labels.
5. **Emoji are content, not chrome.** Keep emoji in meme reactions, game names and jokes. Navigation and toolbar buttons get one consistent icon set, with a text label wherever space allows.
6. **Motion gives feedback; it does not decorate.** Things move when the user does something (press, vote, win, change view). At most one ambient loop per screen (the synthwave grid counts as that one).
7. **Quiet by default, loud on reward.** Screen shake, confetti and full-screen flashes belong to wins and level-ups only, which makes them feel bigger.

### 34.C Foundations (do these first, in this order; no visible redesign yet)

- [ ] **34.0 Baseline screenshots.** Capture feed, a meme page (`/m/<id>`), Meme Forge, `/games`, one skill game, one Vegas game, the profile modal and the settings sheet at 390×844, 768×1024 and 1280×800. Save under `docs/ui/baseline/`. Every later task adds its own before/after pair to `docs/ui/<task>/`.
- [x] **34.1 Tokens.** Create `src/styles/tokens.css` and import it at the top of `src/index.css` (after `@import "tailwindcss"`). Plain `:root` custom properties with the `--tm-` prefix (do **not** put them in a Tailwind `@theme` block: that would change the meaning of the ~54 Tailwind utility classes already in the JSX). Contents:
  - Colours as in 34.B.2, plus `--tm-bg`, `--tm-surface-1`, `--tm-surface-2`, `--tm-border`. Keep the five existing `--tm-neon-*` names as aliases so nothing breaks.
  - Type scale (8 steps): 11, 12, 14, 16, 18, 22, 28, 40 px as `--tm-text-xs` … `--tm-text-3xl`; headings use `clamp()` so they scale with the viewport.
  - Spacing (4 px grid): 4, 8, 12, 16, 24, 32, 48.
  - Radius: 6 (chip), 10 (button/input), 16 (card), 24 (sheet), 999 (pill).
  - Shadows: `--tm-shadow-1/2/3` and one `--tm-glow-pink`, one `--tm-glow-cyan`.
  - Motion: `--tm-dur-fast: 120ms`, `--tm-dur: 200ms`, `--tm-dur-slow: 400ms`, `--tm-ease-out`, `--tm-ease-spring`.
  - Layers: `--tm-z-base: 1`, `--tm-z-sticky: 100`, `--tm-z-dock: 200`, `--tm-z-overlay: 300` (CRT, particles), `--tm-z-sheet: 400`, `--tm-z-modal: 500`, `--tm-z-toast: 600`, `--tm-z-boss: 700` (boss key covers everything).
  - Layout: `--tm-nav-h`, `--tm-dock-h`, and the safe-area insets, so no component hard-codes `90px` of bottom padding again.
  - **Breakpoints** (written in a comment, since custom properties do not work in `@media`): compact phone `max-width: 480px`, phone and tablet `max-width: 860px`, desktop `min-width: 861px`, wide `min-width: 1181px`. 861 is kept because rule 5 already depends on it. New CSS uses only these.
- [x] **34.2 Fonts and icons.** Self-host two `woff2` families in `public/fonts/` with `@font-face`, `font-display: swap`, and a `<link rel="preload">` for the display face only. The CSP already allows `font-src 'self'`; after this, remove `fonts.googleapis.com` / `fonts.gstatic.com` from the CSP in **both** `index.html` and `vercel.json`. Subset to Latin; budget ≤ 60 KB for both families together. Choose fonts with an open licence (SIL OFL) and commit the licence file. Icons: either import `lucide-react` icons individually in the nav, dock and card toolbar, or remove the dependency; do not leave it installed and unused.
- [ ] **34.3 Primitives and a kit page.** Create `src/styles/primitives.css` with a **new `ui-` prefix** so nothing collides with the 201 existing class names and no `!important` is needed:
  - `.ui-btn` with modifiers `--primary` (pink, one per screen), `--secondary`, `--ghost`, `--danger`, sizes `--sm` / `--lg`; `.ui-icon-btn` (44×44 minimum hit area even when the icon is 20 px).
  - `.ui-chip` (filter and tag), `.ui-badge` (count and status), `.ui-card`, `.ui-input`, `.ui-tabs`, `.ui-toast`, `.ui-skeleton`.
  - Every one has hover, `:active` (scale to 0.97, 120 ms), `:focus-visible` (2 px cyan ring with offset), `:disabled` and loading states.
  - One React component `src/components/ui/Sheet.jsx`: bottom sheet on phones (drag handle, swipe down to close, respects the safe area), centred dialog from 861 px. It owns focus trap, `Esc`, scroll lock, `aria-modal` and return of focus. Every modal moves onto it in 34.8.
  - A dev-only kit page: when `import.meta.env.DEV` and the path is `/__ui`, render every primitive in every state on one screen. This is how a change to a primitive gets checked without clicking through the site. It must not ship in the production bundle.

### 34.D Screens (one task each; highest traffic first)

- [x] **34.4 The first screen (replaces 33.41).** Above the fold on a phone: one-row top bar, one line of welcome with two buttons (**Make a meme** in pink, **Play** as secondary), then the first meme. How:
  - `DualDirectionHero` becomes a compact strip (≤ 120 px). Its "Both / Memes / Gaming" switch and the eight shortcut pills move to a single "Explore" row that scrolls sideways, or into the Extras drawer. After the first visit (`tm_intro_seen`), show only the two buttons.
  - Move `.tm-80s-companion-row` (`EightiesIconsStrip` + `VintageCrtNewsTv`) out of the path to the feed: render it as an in-feed card after the 6th meme on phones, keep it beside the hero only from 1181 px. Lazy-mount it when it scrolls near the viewport.
  - Keep exactly one `<h1>` and keep the SEO wording that `scripts/prerender-seo.mjs` and `seoEngine.js` expect; shrink it visually rather than deleting it.
  - Nothing is deleted without asking the owner (rule 9). Moving is fine; list everything moved in the completion note.
  - Done when: first meme image top < 320 px at 390×844, ≤ 8 tappable items above the fold, and Lighthouse mobile LCP is no worse than the baseline.
- [x] **34.5 Top bar and dock.** Phone: one 56 px row = logo, wallet, one "more" button; everything else (install app, cassette/radio, extras, sign in) goes into that menu or the Profile tab. Keep the five-item dock (Home, Reels, Create, Games, Profile) and make the centre Create button the only pink element in it. Desktop: one row with Home / Reels / Games tabs on the left, search in the middle, Create + wallet + account on the right. Hide the top bar on scroll down and show it on scroll up (phones only, not under reduced motion). `FixedArcadeTopBar` uses the same primitives so games and feed feel like one product.
- [ ] **34.6 Meme card.** The image is the card. Today the card has 16 controls and a header of labels ("Posted by", "Uploaded 14 Nov 2026, 21:45", "1d ago", category, rarity).
  - Header: one line: avatar, `@handle`, "· 1d", category chip. Full date goes in a `title` attribute.
  - Image: full card width, real aspect ratio reserved from `width`/`height` (no layout jump), max height about 70% of the viewport. Rarity is shown by the card border only, with one small badge at most. Remove the permanent "Double-tap to upvote" hint from the image; show it once as a coach mark, then never again.
  - Action row (always visible, 44 px targets): **vote pill** (▲ score ▼), **react** (one button that opens the four emoji as a pop-up; show the top reaction and total count), **comment** with count, **share**, **Remix** (the only filled button).
  - Everything else (save, download, copy link, evolution tree, AI scan, caption this, report) moves into a **"⋯" sheet** built on `Sheet.jsx`. Report stays reachable in two taps from every card: that is a safety requirement, do not bury it deeper.
  - Comments stay collapsed behind the comment button, as now.
  - Keep `MemeCard`'s props and every `data-testid` unchanged; `grep tests/` for any class name before renaming it.
  - Holo tilt and glare: desktop pointer devices only (`@media (hover: hover) and (pointer: fine)`); off on touch and under `.tm-lite-perf`.
- [ ] **34.7 Feed controls and quick upload.** One sticky row under the top bar: category chips that scroll sideways, a sort control (Latest / Top), and a search icon that expands to a field. The quick-upload box (122 px) becomes a slim one-line prompt on phones, since the dock already has Create; keep the full drag-and-drop box on desktop.
- [ ] **34.8 Sheets and modals.** Move one modal per commit onto `Sheet.jsx`, starting with the most inline-styled: `RewardsModal` (66 inline `style={{}}` blocks), `MemeStudioModal` (54), `LeaderboardModal` (46), `PlayerProfileModal` (40), `DailyCaptionBattleModal` (25), `MemeTheaterModal` (21), `AuthModal` (16), then the rest. In each one, replace inline styles with classes built from tokens. Rule: only one sheet open at a time (the existing `closeAllModals()` already does this; keep using it). Leave `BossKeyOverlay` (76 inline styles) alone: it deliberately imitates other apps.
- [ ] **34.9 Arcade lobby (do together with 33.31, and before 33.26).** On `/games` the game list currently sits under a stack of header rows (wallet row, radio station strip, DeLorean garage, icons strip, filter tabs). New order: title + wallet, "Continue playing", filter chips, then the cabinets. Radio and DeLorean move below the cabinets or into Extras. Cabinet tile = one component with one size: artwork, name, one line of description, best score. Skill cabinets first, then meme games, then one "Vegas Room" tile. The count comes from `arcadeGamesCatalog.js` (33.31).
- [ ] **34.10 One game frame.** Every game uses `GameShell` for the same header (back, title, score, pause, sound, fullscreen), the same "how to play" card, the same pause screen and the same results screen (score, best, leaderboard position, Play again in pink, Share). Game canvases keep their own art; only the frame is unified. Check each game at 390×844 for anything hidden behind the dock or the notch.

### 34.E Motion and delight (after the screens are calm)

- [ ] **34.11 Motion system.**
  - Use only the duration and easing tokens. Animate `transform` and `opacity` only; never `width`, `height`, `top`, `left`, `box-shadow` or `filter` in a loop.
  - Go through the 125 `@keyframes`: delete unused ones, merge near-duplicates into about 12 shared ones (`ui-pop`, `ui-fade-up`, `ui-shake`, `ui-pulse-glow`, …) in `primitives.css`. Game-specific ones stay with their game.
  - Changing view (feed ↔ reels ↔ lobby ↔ game) uses the View Transitions API where the browser has it (`document.startViewTransition`), wrapped in a feature check, with an instant switch otherwise.
  - Signature moments, built once and reused: **upvote** (arrow pops, score ticks up, small spark), **publish** (card flies into the feed), **win / level-up** (the existing `WinCelebrationOverlay`), **insert coin / CRT power-on** when a game starts (ties into 33.26).
  - All of it obeys `prefers-reduced-motion`, the `data-reduced-motion` setting and `.tm-lite-perf`: in those modes, transitions become instant fades and loops stop. No full-screen flash faster than 3 per second (33.45).
  - No audio added to any of this unless it follows a user gesture (rule 7).
- [ ] **34.12 States that feel finished.** Skeletons that match the final layout (same image ratio, so nothing jumps); empty states with one sentence and one button; friendly error cards with Retry; an offline banner; toasts in one place (top on desktop, above the dock on phones) with a queue so they never stack on top of each other.

### 34.F Clean-up (last)

- [ ] **34.13 Delete what the new UI replaced.** After each screen task, remove the old rules it made dead; at the end, sweep `src/index.css` for selectors that no longer match anything in `src/` (search each class name before deleting; some are built from strings, e.g. rarity tiers and `data-device`). Replace remaining raw hex values, font sizes, radii and z-indexes with tokens, and fold stray breakpoints into the three in 34.1. Record the final numbers against the 34.A table.

### 34.G Rules for every Phase 34 task

1. **No new runtime dependencies.** No UI kit, no animation library, no CSS-in-JS. Tokens + primitives + the existing Tailwind import are enough.
2. **Net CSS goes down.** A task that adds more CSS than it removes must say why in its completion note.
3. **New code uses tokens only:** no raw hex, no raw `px` font size, no raw `z-index` number, no `!important`, no new breakpoint.
4. **Do not change behaviour.** Same props, same handlers, same routes, same `data-testid`s, same analytics events. If a control moves into a menu, its analytics event still fires.
5. **Safety UI never gets harder to reach:** report (two taps from any meme or comment), the legal links in the footer, sign-out and delete account.
6. **SEO text stays in the HTML:** one `<h1>` per page, the prerendered copy and `SeoDiscoveryFooter` stay crawlable. Collapsing with `<details>` is fine; removing is not.
7. **Verify each task:** `npm run build`, `npm run lint`, `npm run test:unit`; the kit page at `/__ui`; the changed screen at 390×844, 768×1024 and 1280×800, once more with Lite/Turbo mode on and once with reduced motion on; keyboard only (Tab, Enter, Esc) through the changed screen; then before/after screenshots into `docs/ui/<task>/`.
8. **Performance check on the feed:** scroll the feed on a throttled mid-range phone profile (Chrome dev-tools, 4× CPU slowdown); no long task over 200 ms and no dropped-frame stutter from shadows or blur.
9. **Stop and ask the owner** before removing any feature from view entirely, changing the logo or site name styling, or changing the colour roles in 34.B. _(On 16 Nov 2026 the owner asked for the new logo and palette described in 35.2 and 35.3, so those two changes are approved. Anything beyond them still needs asking.)_

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
│   ├── favicon.svg                    # Pink "M" neon tube + amber zap underline vector icon (from neonSignPaths.js)
│   ├── logo-512.png                   # High-Res 512x512 Neon "M" Tube Logo for PWA & Schema.org
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
