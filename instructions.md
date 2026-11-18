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
9. **Search engines (IndexNow for Bing & co., sitemap for Google) — keep them told about changes:**
   - **Automatic, nothing to do:** after every successful production deploy of `main` that touches `src/`, `public/`, `api/`, `index.html`, `vercel.json` or `scripts/prerender-seo.mjs`, the GitHub Action `.github/workflows/indexnow.yml` runs `npm run indexnow -- --pages` (all site pages from the live sitemap). New, approved and removed memes are pinged one by one by the `publish-meme` and `moderate` Edge Functions (`_shared/indexNow.js`).
   - **Run by hand, once the deploy is live (`BypassSandbox: true`):** `npm run indexnow` (every URL, memes included) after a bulk change to many meme pages, e.g. a migration that approves, removes or edits many memes, or a change to `api/meme-og.js` / `api/creator-og.js`; `npm run indexnow -- <url> <url>` after changing a few specific pages outside a deploy (e.g. a single meme fixed in the database). Check the GitHub Action ran green after a push that added or renamed routes.
   - **Adding any new public route or page-making code path** (new game, new SEO route, new kind of public page like `/u/` or a future `/s/` score page): add it to `SEO_ROUTES` / `api/sitemap.js` so it is in the live sitemap (that is what Google reads and what the Action submits), and if the page is created at runtime from the database, call `submitIndexNow([...])` from the Edge Function that makes it public.
   - **Never** commit a static `sitemap.xml` to `public/` or write one into `dist/`: a real file wins over the `vercel.json` rewrite and hides every user meme from search engines (bug fixed 17 Nov 2026). Never stamp "today" on every `<lastmod>`: Google ignores `lastmod` site-wide once it is shown to be inaccurate. Do not change the IndexNow key (`public/5eed15f774c2bb475174d8b3153e9496.txt` must match `INDEXNOW_KEY`).
   - **Page rules (17 Nov 2026, keep them):** unknown paths go to `api/not-found.js` (HTTP 404 + noindex, app still boots); unknown meme ids / creator handles return 404, removed memes 410, database timeouts 503 + Retry-After (never 200 with home content: that is a soft 404). A new client-only route that has no prerendered file must get its own rewrite in `vercel.json` **before** the catch-all, or it will answer 404 to crawlers. Server-rendered pages replace the whole `#root` with `replaceRootContent()` (`api/_seoShell.js`), never a non-greedy regex. Meme descriptions and JSON-LD come only from `src/utils/memeSeo.js`. Site-wide JSON-LD in `index.html` is Organization + WebSite only; page schema goes in `#tm-dynamic-jsonld`. The sitemap lists meme images (`image:image`) and every creator with an approved meme.
   - **Google** has no IndexNow and has shut down its sitemap "ping" URL; its Indexing API is only allowed for job posts and livestreams, so do not use it. Google finds changes through the sitemap registered in Search Console (owner task 35.9a) and links.
10. **If stuck or a task is ambiguous:** stop and ask the owner. Never delete features, files, or data without asking.

---

## 000a. Play with friends (multiplayer) — 18 Nov 2026 (night) — done

- [x] **Rooms:** pink **👥 Play Friends** pill on Poker, 21's and Neon Serpent opens a room; the invite link is the game's normal URL + `?room=CODE` (e.g. `/games/poker?room=K7QZP`), shared with the native share sheet / copied. No new routes, no DB tables, no migration.
- **How it works:** Supabase Realtime channel `tm-mp:<game>:<CODE>` (broadcast + presence) in `src/hooks/useGameRoom.js`. The player who joined first is host; the host's browser runs the pure engine and broadcasts the whole table (`state` events), others send `action` events. Host leaves → next in line takes over with the last state; a host that reloads asks for the table back (`hello` with `hasState: false`). Leaving on purpose (`forgetSeat`) puts you at the back of the queue. Heartbeat republish every 4 s for dropped messages.
- **Games** (`src/utils/multiplayer/`, registry `mpGames.js`, tests `tests/vitest/multiplayer.test.js`): **Hold'em with Friends** 2–4 players, 1,000 chips, blinds 10/20, side pots, 30 s turn timer (auto check/fold), away players auto-fold, newcomers sit in next hand. **21's Head to Head** 2 players vs the dealer, 500 chips, bets 10–100, hit/stand/double, dealer stands on 17, head-to-head 🏅 per round. **Worm Wars** 2–4 worms on 26×26, 135 ms host tick, last worm alive wins the round, first to 3; dead worms turn into snacks; arrows/WASD, swipe, on-screen pad on touch.
- **Rules to keep:** multiplayer uses **table chips only** — never stake or pay MemeDollarz from a room (the host's browser decides outcomes, so it can't be trusted with wallet payouts). Hidden cards travel in the broadcast, so a determined player could peek with dev tools; fine for free chips, not for anything of value. UI lives in `src/components/multiplayer/` (one CSS file, `Multiplayer.css`; entry pill CSS in `PlayWithFriendsButton.css`).
- **Realtime budget:** Worm Wars sends ~7 messages/s from the host (each counted once per receiver); poker/21's only on moves. Keep an eye on Realtime message usage in the Supabase dashboard if rooms get popular.
- [ ] **Follow-ups (not done):** "👥 2–4" badge on the lobby cards; a host on a backgrounded tab slows the worm clock to ~1 tick/s (browser timer throttling).

---

## 000. Owner brief 18 Nov 2026 (evening) — done

- [x] **1 Opens on profile:** the "pick your @handle" nudge fired whenever `get_my_profile` failed (slow phone wake-up) because a missing profile looked like "no handle". Now `needsHandle` is only true when the profile loaded, the cached handle is reused on a failed fetch, and the nudge runs only on `/` at most once every 3 days (`useAuth.js`, `App.jsx`).
- [x] **2 Home portal:** `DualDirectionHero.jsx/.css` is now a full-first-screen portal: giant flowing sign over a striped sun and moving grid floor, a cyan MEMES door (warps down to the feed) and a pink PLAY door (warps to the lobby), each with sparks racing round the tube; small chips for Make a meme / Caption battle / Prank screens. The top-bar sign hides while the portal is in view (`html.tm-portal-visible`).
- [x] **3 Meme curation:** `/admin/moderation` → **Curate** tab (`ModerationCurate.jsx`). Grid of every live meme (uploads + built-in seeds) with Suspects filter (no title, broken image, duplicate file/hash/title, downvoted), multi-select, Hide / Restore. Migration `20261118000001_meme_curation.sql` (applied live 18 Nov 2026): `mod_curate_meme` (reversible, no strike, files kept) and `hidden_seed_memes` + `mod_hide_seed`; the feed filters hidden seeds (`utils/hiddenSeeds.js`, `useFeed.js`).
- [x] **4/9 Fonts:** owner picked **Orbitron** (self-hosted `public/fonts/orbitron-latin-wght.woff2`, OFL). New token `--tm-font-title`; `--tm-font-neon` now points at it. All `h1`/`h2`, game titles (`.tm-gs-title`), lobby card titles and lit signs use it; meme titles stay in Outfit. Canvas labels moved from generic sans to Oxanium. Prank screens keep their deliberately realistic system fonts; Impact stays for captions / win shouts.
- [x] **5 Cracked screen pranks:** `CrackedScreenPrank.jsx/.css`, disguises `crackphone` / `crackpad` (keys 7/8), routes `/fake-cracked-iphone-screen` and `/fake-cracked-ipad-screen`. Generated cracks, ink bleed, dead pixel lines, canvas sparks + arcs, tap = new impact. Start sheet; hidden triple-tap top-left corner for controls.
- [x] **6 Full screen:** top-bar button is now a lit labelled FULL pill (share + Lobby label hidden ≤480px to make room). `GameShell` zooms the game to fit the screen in full-screen mode on phones/tablets (min 55%); roulette gets half-height number rows in full screen. Blackjack, poker, pinball, crush, stocks already fit.
- [x] **7 Slots one-screen:** paytable, coin-op/odds strips, missions, record, feature quotes and the "← Memes" button moved into a **How to play** sheet (portal). Cabinet gets an electric spark frame, random ⚡ SURGE spins (28%, 1.6× reel speed, banner), and a lightning-storm overlay on BIG/MEGA/JACKPOT. Reels grow on tall screens. Odds and payouts unchanged.
- [x] **8 Games vs pranks:** lobby has a top-level GAMES | PRANKS switch; the two lists never mix.
- [x] **Roulette & derby event focus:** betting scrolls normally (`GameShell fitToScreen={false}`); once the ball is in play the wheel fills the phone screen with your bets lit win/lose, and once the gates open the track fills the screen with a live 8-horse standings board (your horses marked YOU) and your tickets lighting up; the results stay until Next Race Card.
- [ ] **Follow-up:** Curate tab not yet clicked through with a moderator login.

---

## 00. 🧹 Phase 36: "Meme core first" — remaining items (completed 36.1–36.12 moved to `docs/HISTORY.md`)

- [ ] **36.6b Deploy `submit-caption-entry`** with the new `_shared/identity.js` (not redeployed yet; only matters for Google accounts with no handle entering the daily caption battle).
- [x] **Game ratings DB migration applied live (18 Nov 2026):** Applied `supabase/migrations/20261117000003_game_ratings.sql` to `otvvphmjojqyjaznjzyo` production (`game_ratings` RLS enabled, `rate_game` + `get_game_ratings` RPCs active, REST `get_game_ratings` verified HTTP 200).
- **36.V Safe video uploads — Stage 2 (waiting for owner pick):** Stage 1 (`V1`–`V6`, moderator review queue) is shipped & archived in `docs/HISTORY.md`. Stage 2 auto-approval options remain: Cloudflare Stream (Option A, recommended >10 videos/day), Mux (Option B), or own ffmpeg worker (Option C).

---

## 0. ⚡ START HERE — Phase 35: "NEON TURBO"

> **Completed phases moved to [`docs/HISTORY.md`](docs/HISTORY.md):** `35.1 Pulse`, `35.2a–35.2e Neon identity & refine`, `35.3 The sign`, `35.4a–35.4c First screen & dock`, `35.5 MemeDollarz`, `35.6 Juice kit`, `35.7a–35.7f + core 35.7g Slots Turbo`, and the 17–18 Nov UI/Ratings/Icons polish pass.

**Rules that apply to every Phase 35 task** (on top of "HOW AGENTS MUST WORK" and 34.G):

1. **Look at it.** A visual task is not done until the agent has taken screenshots at 390×844 / 402×874 and 1280×800 and compared them with the reference. "Build passes" is not "looks right".
2. **One commit per numbered sub-step.** The site must look finished after every commit.
3. **Reduced motion, Calm mode and `.tm-lite-perf` always win.** Every effect in this phase must have an "off" form: no flow pulse, no shake, no flashes, no vibration.
4. **No flash faster than 3 per second anywhere on screen, ever** (photosensitive epilepsy). This matters most in 35.7 and 35.8.
5. **Pretend money stays pretend.** Nothing in this phase may sell, gift for payment, or cash out MemeDollarz. Do not alter the odds in `src/data/slotMachinesCatalog.js` or the daily caps in `tokenEconomy.js`. All payouts still pass through `validateStakedGamePayout`.
6. **No new runtime dependencies.** No animation, particle, chart or analytics library.

**The look, in five rules (do not regress these):**
1. Primary action = pink tube over smoked glass (`.ui-tube-box--solid`, `.tm-btn-primary`). Never a flat fill, never a multi-colour gradient. One per screen.
2. Selected / navigation = lit cyan tube; everything unselected is unlit glass (`--tm-night-3` border, `--tm-text-dim` text).
3. Amber is money and wins only (wallet, stakes, deal / spin, jackpots).
4. Fonts: `--tm-font-display` (Oxanium) for headings, labels, numbers; `--tm-font-neon` (Tilt Neon, weight 400 only) for one-to-three-word lit signs; `--tm-font-body` (Outfit) for reading and for user-written text such as meme titles; `--tm-font-arcade` for tiny arcade labels. Impact stays for meme captions and slot/win shout text.
5. Panels: `--tm-night-1` surface, 1 px `--tm-night-3` border, shadow tokens. Game cabinets may keep a coloured 2 px tube frame; ordinary panels may not.

### Remaining Phase 35 Items

- [ ] **35.2f/g Game-by-game look (remaining secondary routes).** _18 Nov 2026: Audited & verified `/`, `/games`, `slots` (all 5), `blackjack`, `poker`, `magic-8-ball`, `pinball`, `higher-or-lower`, `meme-invaders`, `meme-stock-market`, `bingo`, `roulette`, `coin-pusher`, `meme-crush`, `horse-racing`, `guess-the-meme`, and `fake-windows-update-screen` at `402×874` and `1280×800`. Remaining routes still to spot-check: `serpent`, `brick-blaster`, `sunset-sprint`, `vector-void`, `grid-riders`, `battle-arena`, `swipe-deck`, soundboard, creator profile, settings sheet, report sheet, AI roast, theater._
- [x] **35.2f/g Emoji as icons (hero, lobby, top bar, music pill).** _18 Nov 2026: Swapped hero Explore pills (`DualDirectionHero.jsx`), `ArcadeLobby`, `GameShell`, `FixedArcadeTopBar`, and `MobileNowPlayingInner` to `lucide-react` + 27 custom neon tube SVGs (`GameIcon.jsx`). Minor buttons inside `ExtrasDrawerModal` / `RewardsModal` can still be swapped opportunistically._
- [x] **35.2f/g Glow budget (desktop home page).** _18 Nov 2026: Navbar `+ Create` button dimmed to `ui-tube-box--off` when `viewMode === 'feed'` so hero `Make a meme` owns the pink focal tube._
- [ ] **Remaining off-palette CSS colours & inline styles:** Sweep remaining `#a855f7` / `#f87171` / `#86efac` CSS literals to tokens and relocate inline `style={{…}}` blocks in untouched modals when modifying those files.
- [ ] **35.4d Check with Pulse.** Compare bounce % and `first_action` time for 48 hours after deploy of `35.4` on `/admin/pulse`.
- [ ] **35.7g Remaining slots progression items:** Sticker album of symbols/features (`14 / 22 found`), sideways Neon Strip machine picker with unlock states, and multi-day kind Streak neon sign. *(Liquid charge tubes, 3 daily slot missions per machine, 20-min stretch notice, 50-spin auto cap, and pretend-money disclaimer are done.)*
- [ ] **35.7h Performance and proof.** Record a Chrome DevTools 4× CPU slowdown 60 fps trace on a 5-reel turbo spin and log Pulse `slot_spin_batch` / `game_end` metrics.

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

- [x] **35.9a Owner, today, no code (10 minutes):** submit `https://www.thememes.net/sitemap.xml` in Google Search Console and Bing Webmaster Tools (owner action 9 in the Phase 33 list, still not done). Nothing else in this section pays off until this is done.
  - _17 Nov 2026:_ IndexNow (Bing, Yandex, Seznam, Naver) is live: key file, Edge Function pings on approve/remove, auto-submit after each deploy (see agent rule 9); first submission of 107 URLs accepted. Live `/sitemap.xml` now comes from `api/sitemap.js` (it was a static build file missing every user meme). **Google:** domain property `sc-domain:thememes.net` is verified; sitemap first submitted 14 Nov 2026 and resubmitted 17 Nov 2026 after the live-sitemap fix (was 107 URLs, now 137). **Bing:** sitemap first submitted 14 Nov 2026 (88 URLs found), resubmitted 17 Nov 2026; Webmaster Tools → IndexNow shows the automatic submissions (source "Self"). **Verification records (GoDaddy DNS, keep them):** Google TXT `google-site-verification=CgIiJq8R…` on `thememes.net`; Bing CNAME `de6db533293578534d2a5dcdb8a2127f.thememes.net` → `verify.bing.com` (backup to `public/BingSiteAuth.xml`, same code).
- [x] **35.9b Tag every outgoing link (share & copy links done; QR watermark / 35.9g embeds pending).** _18 Nov 2026: Tagged outgoing share/copy URLs across `ShareMemeSheet.jsx` (`?ref=share`), `MemeLiveCelebrationModal.jsx` (`?ref=share`), `ArcadeLobby.jsx` (`?ref=arcade`), `GameRouter.jsx` (`?ref=game`), `GameShell.jsx` (`?ref=game`), `BossKeyOverlay.jsx` (`?ref=prank`), `GuessTheMemeGame.jsx` (`?ref=daily`), `HigherOrLowerGame.jsx` (`?ref=score`), and `SeoDiscoveryFooter.jsx` (`?ref=footer`)._
- [ ] **35.9c Share cards made by play.** After a MEGA or JACKPOT, a top-10 score, a daily result or a finished meme, offer one card with one button (the native share sheet on phones, copy + download on desktop). The card is drawn on a canvas in the new identity: the lit sign, the result in tube lettering, and a challenge line ("I hit a 62× dream jackpot. Your turn."). The link opens a page with a matching OG image from a new `api/score-og` function (same pattern as `api/meme-og.js`). Does 33.29's OG part and most of 33.49.
- [ ] **35.9d "Beat my score" (33.29) and the Daily Challenge (33.28).** Promote both to here. The daily result shares as a spoiler-free emoji strip plus link. These two are the strongest reasons for one visitor to bring another, and for both to return tomorrow.
- [ ] **35.9e Make the pages people already search for excellent.** The fake-screen prank pages (`/fake-windows-update-screen`, `/fake-blue-screen-prank`, `/fake-hacker-terminal-screen`, `/fake-excel-boss-screen`, `/fake-teams-zoom-call-screen`, `/fake-ai-workspace-boss-screen`) and the meme maker (`/meme-generator`, `/gif-meme-maker`) match real searches. For each: the tool works within one second of landing with no intro in the way; one clear button ("Go fullscreen" / "Add your text"); a short honest how-to under it; and, on leaving the tool, a row of "also try" tiles. Check the bounce % of each on `/admin/pulse` and fix the worst first.
- [ ] **35.9f Speed is ranking (33.43, pulled forward).** Compress the 29 `public/og/*.png` cards to under 150 KB, lazy-load the Supabase client and `soundEngine`, and split `src/index.css`. Target: mobile LCP under 2.5 s.
- [ ] **35.9g Embeds and other shop windows (33.39).** `/embed/<game>` frames with a "Play more at thememes.net" end card; then list the skill games on itch.io.
- [x] **35.9h Fix what search engines read.** _18 Nov 2026: Verified `index.html` schema (Organization + WebSite only) and `manifest.webmanifest` already clean; removed remaining stale "Deep Fry or VHS Glitch filters" copy in `SeoDiscoveryFooter.jsx` and `src/data/seoRoutes.js` (`33.50` / `GameShell` how-to cards active per game)._
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
│   └── 5eed…9496.txt                  # IndexNow key file (sitemap is live from api/sitemap.js, never a static file)
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
