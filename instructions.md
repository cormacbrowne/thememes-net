# THE MEMES.net (`thememes-net`) — Codebase Structure & Update Instructions

> **Purpose of this file:** This document serves as the living architectural reference, key design decisions log, file map, backend contract, and phased roadmap for **THE MEMES.net** (`c:\Users\corma\thememes-net`). Consult and update this file during regular updates until the platform is perfected.

---

## 🤖 HOW AGENTS MUST WORK ON THIS REPO (read before touching code)

1. **One task at a time, in the order listed in Section 0.** Pick the first unticked `[ ]` task, finish it fully, verify it, tick it, commit, then move on. Never do several half-tasks.
2. **Read before editing.** `src/App.jsx` is ~186 KB. Never rewrite or reformat it wholesale. Use targeted edits only. Search for the exact identifier (e.g. `viewMode === 'roulette'`) and edit around it.
3. **Verify every task:** `npm run build` and `npm run lint` must both exit 0. Then check the UI at **390×844 (iPhone)**, **768×1024 (iPad)**, and **1280×800 (laptop)** with browser dev-tools device mode (`npm run dev`).
4. **CSS cascade rule (cause of the Phase 29 roulette bug):** since Phase 28.7, each lazy component imports its own CSS file, which loads **after** `src/index.css`. A rule in a component CSS file beats an `index.css` rule with the same specificity, `!important` included. **Put all styles for a component (mobile media queries too) in that component's own CSS file**, and wrap desktop-only `!important` overrides in `@media (min-width: 861px)`.
5. **Do not break:** the token economy (`src/utils/tokenEconomy.js`, always pass winnings through `validateStakedGamePayout`), security (`src/utils/securityGuard.js`, CSP in **both** `index.html` and `vercel.json`), lazy loading (`React.lazy` + `<Suspense>` for every game/modal), `prefers-reduced-motion`, and `litePerfMode`.
6. **No audio before a user gesture.** iOS Safari only counts `touchend` / `click` / `pointerup` / `keydown` as a gesture, **not** `touchstart`.
7. **When a task is done:** tick its box, add a one-line "Completion Note" (what changed + files), and commit with message `Phase 29.X: <short title>`. Do not push or deploy unless the owner asks.
8. **If stuck or a task is ambiguous:** stop and ask the owner. Never delete features, files, or data without asking.

---

## 0. 🎯 CURRENT ROUND — Phase 29: "Fix, Play, Groove" (READ THIS FIRST)

> **Context (Nov 2026 owner review):** Phase 28 P1–P5 shipped. Owner-reported problems: **(a)** Roulette shows no way to bet on red/black/numbers on iPhone (and on PC); **(b)** K.I.T.T. / HAL 9000 voice is silent on iPhone; **(c)** the music is loved, and the owner wants more stations and a station picker on the main screens; **(d)** the owner wants new fun games, especially **horse racing**; **(e)** a general interface polish pass.
>
> **This round overrides Phase 28's "no new games" rule** for the games listed in P2 only. Do the work **in order: P0 → P1 → P2 → P3 → P4.** The Phase 28 P6 growth items (Party Mode etc., further down) stay as backlog for after Phase 29.

### P0 — Critical bug fixes (do first)

- [x] **29.1 🎡 Roulette betting board is invisible / unreachable (iPhone AND PC).**
  - **Root cause (verified):** `src/components/VegasRouletteGame.css` has three conflicts:
    1. **L156–164** and **L455–459**: a legacy `.tm-roul-stage { display: grid; grid-template-columns: 300px 1fr; overflow: hidden; }` from an older layout. The JSX uses `.tm-roul-stage` as the **outer `<section>`**, so the whole cabinet is squeezed into a **300 px column** on desktop. The board column is then clipped by `overflow: hidden`.
    2. **L709–734**: an unconditional `!important` block (`.tm-roul-main-grid { grid-template-columns: minmax(340px, 45%) 1fr !important }`, canvas `min(430px, 56dvh, 41vw) !important`). Because this file loads **after** `index.css`, it beats the mobile fix in `src/index.css` (~L4159–4175, `@media (max-width: 860px) .tm-roul-main-grid { grid-template-columns: 1fr !important }`). Phones therefore get the 2-column desktop layout. The wheel takes ≥ 340 px and the betting board falls off-screen.
    3. Dead legacy selectors (`.tm-roul-board-box`, `.tm-roul-number-grid`, `.tm-roul-wheel-canvas`, `.tm-roul-history-strip`, etc.) that no longer exist in the JSX.
  - **Fix:**
    - Delete the legacy `.tm-roul-stage` grid rules and replace them with `.tm-roul-stage { width: 100%; height: calc(100dvh - 50px); padding: 6px 10px; box-sizing: border-box; }`.
    - Wrap the L709–734 block in `@media (min-width: 861px)`.
    - Move the roulette rules out of `index.css` (~L4159–4170) into the end of `VegasRouletteGame.css`.
    - Remove the dead selectors.
  - **Phone layout (≤ 860 px), the way real mobile roulette apps do it:**
    - Compact wheel at the top, `min(220px, 28dvh)`.
    - The betting area scrolls (`overflow-y: auto; -webkit-overflow-scrolling: touch`).
    - On phones, show the **number grid rotated to 3 columns × 12 rows** (vertical felt) so each cell is ≥ 40 px tall and ≥ 44 px wide.
    - Put **RED / BLACK / EVEN / ODD / 1–18 / 19–36** as a big 2×3 grid of buttons **above** the numbers (they are the most-used bets).
    - Add a **sticky bottom action bar** with `🧹 Clear`, `↺ Rebet`, the chip selector, and `⚡ SPIN`, using `padding-bottom: env(safe-area-inset-bottom)`.
    - Add `touch-action: manipulation` on all bet buttons (stops iOS double-tap zoom).
  - **Fairness fix (in the same task):** in `resolveSpinOutcome` (`VegasRouletteGame.jsx` ~L168), a straight-up win on a **non-lightning** number pays `36×`, **plus** 3 random lightning numbers pay 50–150×. That gives the player about a **+10% edge** on straight-up bets (the house loses). Copy real Lightning Roulette: non-lightning straight-ups pay **30×** (29:1 + stake). Update the label text (`STRAIGHT #n (30×)`) and the status-banner copy.
  - **Acceptance:** At 390×844, 768×1024, 1280×800 and 1920×1080 you can see **and tap** 0–36, the three 2:1 columns, all 9 outside bets, the chip selector and SPIN without horizontal scrolling. Tapping RED then SPIN works in Free Practice and in Token Mode. Tapping the wheel still spins.
  - **Completion Note:** Removed legacy `.tm-roul-stage` grid & dead selectors, scoped desktop `!important` overrides to `@media (min-width: 861px)`, moved roulette rules from `src/index.css` into `src/components/VegasRouletteGame.css` with self-contained header/pill classes, added mobile 2×3 even-money grid above a 3×12 vertical felt + sticky safe-area action bar (`touch-action: manipulation`), aligned 12×3 `grid-auto-flow: column` to `2:1` rows, and fixed straight-up non-lightning payout to `30×` (29:1 + stake) in `src/components/VegasRouletteGame.jsx`.

- [x] **29.2 🧹 Audit every other game for the same CSS-split cascade bug.** `src/index.css` still contains game rules that are now beaten by the component CSS: `.tm-bj-*` (Blackjack), `.tm-pin2-*` (Pinball, inside the same ~L4159 media block), `.tm-crush*`, and `.tm-ai-*`. For each one: move the rule into its component CSS file, scope unconditional desktop `!important` blocks to `@media (min-width: 861px)`, and check the game at 390×844 / 768×1024 / 1280×800. Games: Coin Dozer, Pinball, 21's, Roulette, Slots, Meme Crush, MEMEDAQ, Swipe, 1v1 Arena, Forge.
  - **Acceptance:** On every game at all 3 sizes, every control is visible and tappable, nothing is clipped, and there is no horizontal scroll. List any game that needed fixing in the completion note.
  - **Completion Note:** Fixed Coin Dozer (`VegasCoinPusherGame.css`), Pinball (`VegasPinballGame.css`), 21's (`VegasBlackjackGame.css`), Slots (`VegasSlotMachine.css`), Meme Crush (`MemeCrushGame.css`), MEMEDAQ (`MemeStockMarketGame.css`), Swipe (`SwipeDeck.css`), 1v1 Arena (`BattleArena.css`), Forge (`MemeForge.css`), and AI Assistant (`ArcadeAiAssistant.css`) + cleaned residual game selectors out of `src/index.css`; scoped desktop-only `!important` rules inside `@media (min-width: ...)`, added self-contained shared button/pill/modal rules for cold-loaded lazy routes, fixed Blackjack `100%` cabinet height and Pinball `calc(100dvh - 180px)` mobile canvas sizing, added safe-area bottom padding, `touch-action: manipulation`, and ≥44px phone tap targets. (Roulette fixed in 29.1.)

- [x] **29.3 🗣️ K.I.T.T. / HAL 9000 voice is silent on iPhone.**
  - **Root causes (verified in code):**
    1. `src/components/ArcadeAiAssistant.jsx` `speakLine()` (L173–313) calls `synth.speak()` inside `setTimeout(dispatchUtterance, 95)`. That delay breaks iOS Safari's user-activation chain, so WebKit silently ignores the utterance.
    2. `src/utils/soundEngine.js` `_bindGlobalUnlockListeners()` (L72–93) unlocks on **`touchstart`**, which iOS does **not** treat as user activation. The one-time speech prime (L140–156, `this.speechUnlocked = true`) is used up on that invalid event and never retried.
    3. Several utterances are queued at once right after `cancel()`. iOS often drops everything queued after a `cancel()`.
    4. The Web Audio "intro ping" (`playHalBeep` / `playKittScanner`) plays right before speech and can grab the iOS audio session.
  - **Fix:**
    - In `speakLine`, call `speechSynthesis.speak()` **synchronously inside the click handler** (no `setTimeout` before the first `speak`). Speak the **first sentence immediately**, then queue later sentences from the previous utterance's `onend`.
    - On iOS, skip the intro ping (or play it **after** `onstart`).
    - Only `cancel()` if `synth.speaking`, and never call `speak()` in the same tick as a `cancel()` **except** as the first call in a gesture.
    - In `soundEngine.js`, remove `touchstart` from the unlock events (use `touchend`, `pointerup`, `click`, `keydown`). Only set `speechUnlocked = true` from the prime utterance's `onstart`/`onend`, so failed primes retry on the next gesture.
    - Add a **watchdog**: if `onstart` has not fired within 1500 ms, show an inline hint: "🔇 iPhone blocked the voice. Tap 🔊 again, turn off Silent Mode, and check Settings › Accessibility › Spoken Content." Also play the existing `sfx.playAiVocalFormants` fallback so the user hears *something*.
    - Add a **voice picker dropdown** in the assistant header that lists `speechSynthesis.getVoices()` filtered to English (iPhones have different voice names). Save the choice per persona in `localStorage` (`tm_ai_voice_kitt`, `tm_ai_voice_hal`).
    - The welcome message (L793) must **not** auto-speak on mount. Speak it only from a tap.
  - **Acceptance:** On a real iPhone (Safari **and** Chrome, iOS 17+), tapping `🔊 Speak` on a message makes K.I.T.T. and HAL audibly speak on the **first** tap. Switching persona and tapping again also works. Desktop Chrome/Edge/Safari still work.
  - **Completion Note:** Created shared synchronous iOS-safe speech engine `src/utils/aiSpeech.js` (`speakUtteranceChain` speaks sentence 0 synchronously on tap, chains subsequent sentences on `onend`, triggers intro ping on `onstart` for iOS, and runs a 1500ms watchdog with `playAiVocalFormants` fallback), updated `src/utils/soundEngine.js` to unlock on `touchend`/`pointerup`/`click`/`keydown` only and set `speechUnlocked` inside prime `onstart`/`onend`, and updated `src/components/ArcadeAiAssistant.jsx` + `.css` to remove FAB welcome auto-speak, show the inline iPhone voice hint on timeout, and add per-persona English voice selector persisted to `tm_ai_voice_kitt`/`tm_ai_voice_hal`.

### P1 — 🎵 THE MEMES FM 2.0 (more music, picker on main screens)

- [x] **29.4 Station picker everywhere.**
  - **Short tap** on the `📼` top-bar button (`RadioToggleButton` in `MemesRadio.jsx`) still toggles play. A **chevron `▾`** next to it (or a long-press on touch) opens a small **station popover**: station list, ⏭ skip, volume slider, and now-playing track name.
  - Add the same picker to: the **mobile Reels overlay** (top-right, small), the **mobile Games drawer** in `MobileArcadeDock.jsx`, every **game header** (see 29.15 GameShell), and the **Insert Coin intro** (pick a station before entering).
  - While music plays on mobile, show a tiny dismissible **"now playing" pill** (`📼 Doge Highway '86 ⏭`).
  - **Completion Note:** Upgraded `RadioToggleButton` (`src/components/MemesRadio.jsx` + `.css`) with a split `▾` chevron / long-press popover (station list, `▶/⏸`, `⏭` skip, volume slider, live track name), added `overrideContext` + `startIfOff` options to `setRadioStation` in `src/utils/radioBus.js`, added `RadioStationStrip` to `InsertCoinIntro.jsx` and `MobileArcadeDock.jsx`, placed `RadioToggleButton` in `VerticalReelsView.jsx` top-right nav (plus existing `NavbarHud` & `.tm-fixed-arcade-bar`), and rendered `MobileNowPlayingPill` in `src/App.jsx`.
- [x] **29.5 Six new procedural stations** in `src/utils/musicEngine.js` + `RADIO_STATIONS` in `src/utils/radioBus.js` (no audio files, no CSP change, 5–6 tracks each). Make 4 of them free and 2 Arcade Shop cosmetics:
  - `🐸 Meme Phonk` (cowbell, 808 slides)
  - `🥁 Jungle / Drum & Bass` (fast breakbeats)
  - `🎷 Casino Lounge Jazz` (auto-station for Roulette / 21's / Slots)
  - `🤠 Spaghetti Western` (auto-station for the new Horse Racing game)
  - `🏝️ Yacht Rock Sunset`
  - `🪩 Italo Disco '84`
  - Seasonal: `🎃 Spooky Synth` (Oct) and `🎄 Jingle Synth` (Dec), auto-added by date, which pairs with 28.23.
  - Also raise every existing station from 4 to 6 tracks.
  - **Completion Note:** Added 6 procedural stations (`phonk`, `jungle`, `casinojazz`, `western` free; `yachtrock`, `italodisco` as Arcade Shop cosmetics in `src/data/cosmetics.js`) plus Oct/Dec date-activated `spookysynth` and `jinglesynth` in `src/utils/radioBus.js` & `src/utils/musicEngine.js`, raised every station to 6 tracks with genre-specific synthesis, and wired `casinojazz` as the auto-station for `blackjack`, `roulette`, and `slots` in `src/App.jsx`.
- [x] **29.6 Radio features:**
  - **Shuffle All Stations** mode
  - ♥ favourite tracks, plus a "♥ My Mixtape" station that plays favourites
  - **sleep timer** (15/30/60 min)
  - keyboard shortcuts on desktop (`M` play/pause, `N` next track, `Shift+N` next station), ignored while typing in inputs
  - a settings toggle "🎮 Games pick their own station" (on by default), which respects the existing context-station override
  - **Completion Note:** Added Shuffle All mode (`toggleShuffleAll`), ♥ track favoriting + dynamic `"♥ My Mixtape"` station (`setMixtapeTracks` in `src/utils/musicEngine.js`, `sanitizeFavorites` & mixtape routing in `src/utils/radioBus.js`), 15/30/60 min sleep timer (`setRadioSleepTimer`), `"🎮 Games pick their own station"` toggle (`allowContextOverride`), UI controls in `src/components/MemesRadio.jsx` + `.css`, and desktop keyboard shortcuts (`M`, `N`, `Shift+N`, ignoring text inputs) in `src/App.jsx`.
- [x] **29.7 iPhone lock-screen & silent-switch robustness (experimental, do last in P1).** Route the music master gain through `ctx.createMediaStreamDestination()` into a hidden `<audio playsinline>` element (`audio.srcObject = dest.stream`). Set `navigator.mediaSession.metadata` (title = track, artist = "THE MEMES FM", artwork = `/logo-512.png`) and the `play` / `pause` / `nexttrack` / `previoustrack` action handlers. This gives lock-screen and Control Center controls and makes iOS treat the music as media playback. Put it behind a feature check, and fall back to the current direct `ctx.destination` path if it fails.
  - **Completion Note:** Added feature-checked `ctx.createMediaStreamDestination()` -> hidden `<audio playsinline>` routing with automatic `ctx.destination` fallback + `navigator.mediaSession` metadata/artwork (`/logo-512.png`) & `play`/`pause`/`nexttrack`/`previoustrack` action handlers in `src/utils/musicEngine.js`, and wired MediaSession callbacks + visibility guard (`isMediaStreamActive()`) in `src/utils/radioBus.js` (still zero AudioContext created while radio is OFF).
  - **Acceptance (P1):** Stations can be switched from the main feed, Reels, and inside a game in **≤ 2 taps**. With the radio OFF, no AudioContext is created (the Phase 28 rule still applies).

### P2 — 🕹️ New games (each = new lazy component + own CSS + SEO route + entry in `NavbarHud.jsx` `GAMES` list + `MobileArcadeDock.jsx` + `seoRoutes.js` + `scripts/prerender-seo.mjs` + `public/sitemap.xml`)

> **Rules for every new game:** mobile-first (390×844 first), built on the GameShell from 29.15 if that exists yet, `🆓 Free Practice` mode that is **on by default for players with < 10 tokens**, winnings through `validateStakedGamePayout`, a `game_started` analytics event, its own radio station request, a "How to play" sheet (3 bullet points), and a fixed house edge of 3–8% (document the maths in a comment).

- [x] **29.8 🏇 NEON DERBY '86: meme horse racing (flagship new game).** `src/components/NeonDerbyGame.jsx` + `.css`, route `/games/horse-racing`, `viewMode === 'derby'`.
  - **Field:** 8 meme horses, each with hidden stats (speed, stamina, consistency) and a visible **form guide** (last 5 finishes): `Doge Dasher`, `Stonks Stallion`, `Nyan Neigh`, `Pepe Pony`, `Gigachad Galloper`, `Rickroll Runner`, `Sad Keanu Sprinter`, `Harambe Hooves`. Each has neon jockey silks in its own colour.
  - **Odds board:** fractional and decimal odds generated from the stats with a ~108% overround (≈ 7% house edge). Add a random **track condition** (`🌙 Neon Dry`, `🌧️ Acid Rain`, `👾 Glitch Track`) that shifts the stats.
  - **Bets:** `Win`, `Place` (top 2), `Show` (top 3), `Exacta` (1st + 2nd in order), and a fun `🎲 Lucky Dip` (random horse). Use the chip sizes from `ARCADE_STAKES`.
  - **Race:** a 20–25 second canvas race with parallax synthwave grandstand, galloping sprite bob, dust/neon trails, a live position ticker, a **text commentator** ("Stonks Stallion makes his move on the outside!"), an **optional spoken commentary** toggle (reuses the fixed 29.3 speech helper; tap-gated), a final-furlong **slow-mo photo finish**, and a confetti winner's circle.
  - **Fair outcome:** decide the result with a seeded RNG weighted by the stats **before** the race animates, then animate towards that result. A `📣 Cheer!` button only changes crowd noise and visuals, never the result.
  - **Extras:** a race every ~2 minutes with an "Next race in 1:42" countdown, a **"Derby Cup" daily final** at 8 pm local time with 3× payouts, and a `Spaghetti Western` / `Synthwave` station. Later (backlog): "Race your own meme": a horse whose jockey silk is your uploaded meme.
  - **Acceptance:** Full loop (pick horse → bet → watch race → payout) works at 390×844 and 1280×800 in under 40 seconds. Over 10,000 simulated races, the house edge is 5–9% (add a dev-only `simulateDerby(n)` helper and record the result in the completion note).
  - **Completion Note:** Built `src/components/NeonDerbyGame.jsx` + `.css` and Plackett-Luce odds/race engine `src/utils/neonDerbyEngine.js` with 8 meme horses, 3 track conditions, Win/Place/Show/Exacta + `🎲 Lucky Dip` tickets, 22s parallax canvas race with live ticker, slow-mo photo finish, `📣 Cheer!` confetti (visual-only), optional 29.3 spoken commentary, Free Practice default for `<10` tokens, daily 8pm 3× Derby Cup, and `/games/horse-racing` registered in `seoRoutes.js`, `NavbarHud.jsx`, `MobileArcadeDock.jsx`, `App.jsx` (auto-tuning `western` station), and `public/sitemap.xml`; `simulateDerby(10000)` measured `91.96%` RTP / `8.04%` house edge.
- [x] **29.9 🧠 GUESS THE MEME: daily (the growth-loop game).** Route `/games/guess-the-meme`. Each day shows 5 seed/template memes that start heavily **pixelated** and get clearer over 5 steps. The player picks the format name from 4 options, so fewer steps used = more points. The end screen shows a **Wordle-style share grid** (`🟩🟩🟨⬛🟩 THE MEMES.net #142`) with a link back. Everyone gets the same daily seed (date-based). Track a streak in `localStorage`. **No tokens are needed to play**, so this is the friendliest entry point for new visitors.
  - **Completion Note:** Created `src/components/GuessTheMemeGame.jsx` + `.css` with date-seeded 5-meme daily lineup from `STUDIO_TEMPLATES`, 5-step canvas pixelation & clarity enhance, 3-life 4-choice format guessing, `localStorage` (`tm_guess_meme_v1`) streak + Wordle-style share grid copy/share + endless practice mode, and registered `/games/guess-the-meme` (`viewMode === 'guess'`) in `src/data/seoRoutes.js`, `NavbarHud.jsx`, `MobileArcadeDock.jsx`, `App.jsx` (`lofi` auto-station), and `public/sitemap.xml`.
- [ ] **29.10 🎯 MEME PLINKO.** Route `/games/plinko`. One-tap drop with real peg physics on canvas, 3 risk levels (Low / Medium / High multiplier rows), meme faces on the balls, an auto-drop ×10 option, and a 3–5% house edge. It is the easiest casino game to play one-handed on a phone.
- [ ] **29.11 ⬆️⬇️ HIGHER OR LOWER: Meme Edition.** Route `/games/higher-or-lower`. Two memes are shown and the player guesses which one has more upvotes, using real feed data plus seed scores. It is endless, a streak ends it, and there is a shareable streak card. Free to play, and it feeds the meme catalogue.
- **Backlog games (only after 29.8–29.11 ship and analytics show demand):** `🔨 Whack-a-Meme` (tap memes, avoid the Rickroll), `🎟️ Daily Scratch Card` (1 free per day, touch-scratch canvas), `🧱 Brick Breaker '86` (meme bricks, paddle), `🦆 Meme Hunt` shooting gallery, `🃏 Video Poker: Jacks or Better`, `🦖 Doge Runner` endless one-thumb runner.

### P3 — 🧭 Interface improvements

- [ ] **29.12 🕹️ Arcade Lobby page.** Replace the long `Games ▾` dropdown (9 games, 13 after P2) with a full **lobby screen** (`viewMode === 'lobby'`, route `/games`). Show cabinet cards (thumbnail, 1-line pitch, badge) grouped as **🎰 Casino** (Dozer, Roulette, 21's, Slots, Plinko, Derby), **🕹️ Skill** (Pinball, Meme Crush), **🧠 Meme Games** (Guess the Meme, Higher or Lower, Swipe, 1v1 Arena), and **📈 Sim** (MEMEDAQ), plus a **"Continue playing"** row (last 3 games, `localStorage`), ★ favourites, and `NEW` badges. The mobile dock `🕹️ Games` button opens this lobby. Prerender `/games` for SEO.
- [ ] **29.13 ⚙️ One Settings sheet.** Consolidate scattered toggles into one `⚙️ Settings` sheet (in Extras and Profile): SFX volume, Music (station + volume), AI voice (on/off + voice picker from 29.3), Haptics, Reduced motion (overrides the OS setting), CRT, Turbo FPS, Lite mode, and "Reset first-visit hints". Save everything in one `tm_settings` `localStorage` object.
- [ ] **29.14 ✂️ Copy diet.** Many banners are long ALL-CAPS strings full of emoji (e.g. the roulette status banner, AI assistant intros, game eyebrows). Rules: status banners ≤ 60 characters, single line, sentence case. AI assistant replies ≤ 3 short sentences by default, with a "More" expander. Keep the 80s flavour in titles, not body text.
- [ ] **29.15 🧱 Shared `<GameShell>` component.** `src/components/GameShell.jsx` + `.css`: one consistent header for every game (`← Back`, title, 🪙 wallet with an animated +/− delta, `🆓 Practice` toggle, `📼` radio picker, `🔊` SFX mute, `?` how-to-play sheet), safe-area padding (`env(safe-area-inset-*)`), a `100dvh` fixed layout, and an `aria-live="polite"` result region. Migrate the games one by one, starting with Roulette and the new P2 games. This prevents per-game header overflow bugs like 29.1.
- [ ] **29.16 👆 Touch & accessibility pass.**
  - All tap targets ≥ 44×44 px on phones (Apple HIG).
  - `touch-action: manipulation` on game buttons.
  - Visible `:focus-visible` rings.
  - Red/black also shown by text/icon for colour-blind players.
  - Contrast ≥ 4.5:1 for body text.
  - `aria-label` on icon-only buttons.
  - Pinball shows a "rotate to portrait" hint in phone landscape.
- [ ] **29.17 🪙 Friendlier economy onboarding.** New players start with 0–few tokens and hit "Need X 🪙" walls in every casino game. Instead: casino games auto-start in Free Practice when tokens < the smallest chip, a one-time **"🎁 Starter Pack: 50 🪙"** is granted after the first meme vote or upload, and a clear footer line reads "Tokens are free, just for fun, can't be bought or cashed out" (good for trust and app-store/ad compliance).

### P4 — 🛠️ Code health (makes future agent work cheaper and safer)

- [ ] **29.18 Split `src/App.jsx` (~186 KB) mechanically.** Move logic only, **no behaviour changes**, one extraction per commit, with build + lint after each:
  - `src/hooks/useTokenEconomy.js` (tokens, spend/payout handlers)
  - `src/hooks/useFeed.js` (memes, filters, Supabase sync)
  - `src/hooks/useViewMode.js` (viewMode + path routing + popstate)
  - `src/components/GameRouter.jsx` (all `viewMode === '<game>'` lazy blocks)
  - Target: `App.jsx` under 80 KB.
- [ ] **29.19 Smoke tests.** Add Playwright (`npm i -D @playwright/test`) with one spec that opens every game route at 390×844 and 1280×800 and checks that key controls are visible: roulette `RED` button, SPIN, pinball canvas, Derby bet buttons, etc. Add `npm run test:smoke`. This would have caught 29.1 automatically.
- **Acceptance (whole round):** build + lint pass. Every task in P0–P3 has a completion note. The owner has confirmed on a real iPhone that Roulette betting and K.I.T.T./HAL voice work.

---

## 0b. Phase 28: "Fun First, Findable" (P1–P5 DONE, P6 = backlog after Phase 29)

> **Context (Nov 2026 review):** The site has 27 phases of features but **no visitors and no engagement**. The bottleneck is not missing features. A first-time visitor lands on an **empty meme feed** (`STARTER_MEMES = []`, `STUDIO_TEMPLATES = []`) under a wall of buttons, and Google sees an **empty SPA shell** where every URL canonicalizes to `/`.
>
> **Ground rules for agents this round:**
> - ❌ **No new games, toys, assistants, or easter eggs.** Improve, simplify, and expose what already exists. *(Superseded by Phase 29: only the P2 games listed in Section 0 may be added.)*
> - ✅ Work tasks **in priority order**. Each task lists its acceptance criteria, so verify them (`npm run build` + `npm run lint` + manual mobile 390px check) before ticking a box.
> - ✅ Keep all existing security (`securityGuard.js`, CSP) and the token economy intact. If you add a 3rd-party script/domain, update the CSP in **both** `index.html` and `vercel.json`.
> - ✅ When done, move the task into a "Phase 28 (Completed)" entry in Section 5 like the earlier phases.

### P1 — Fix the cold start: a meme site must have memes (HIGHEST IMPACT)
- [x] **28.1 Seed content.** Reverse the Phase 21 "zero templates" decision. Add **≥ 60 seed memes** spread across `#DANK`, `#TECH`, `#GAMING`, `#RELATABLE` (≥ 12 each). Use only legally safe images (original, CC0/public-domain, or generated with the site's own Forge templates + captions). Store them locally in `public/seed/` (WebP, ≤ 80KB each) so they work offline and need no CSP change. Label them with creator `@TheMemesHQ`. Real community uploads always rank above seed memes once they exist.
- [x] **28.2 Restore studio templates.** Fill `STUDIO_TEMPLATES` with **15–25 classic blank meme formats** (Drake-style 2-panel, distracted-X, expanding brain, two-buttons, etc., recreated as original/legally safe art) so "✏️ Caption This" and the Forge produce a funny result in under 20 seconds with no upload needed.
- **Acceptance:** In a fresh incognito window with Supabase unreachable, the feed, Reels, Swipe, and 1v1 Arena all show memes immediately, and the Forge opens with a template grid.
- **Completion Note (28.1–28.2 Before / After):**
  - `STARTER_MEMES` count: `0` → **`64` seed memes** (`16` each in `#DANK`, `#TECH`, `#GAMING`, `#RELATABLE`), all labelled `@TheMemesHQ` (`is_seed: true`) and ranked below real community uploads via `isSeedMeme()` comparator in `filteredMemes`.
  - `STUDIO_TEMPLATES` count: `0` → **`20` original blank meme formats** (`tpl-*.webp`), surfaced in a 1-click visual template grid on Forge open (`MemeForge.jsx` + `ForgeToolPanel.jsx` `🎨 Templates` tab) and linked via `base_image_url` for instant `< 20s` "✏️ Caption This" remixing + `🎲 Random Caption`.
  - Local offline WebP assets (`public/seed/`): `0` files → **`84` `.webp` files** (`64` captioned seeds + `20` blank templates, `540×480` each), individual file size **`3.0 KB – 9.8 KB`** (`≤ 80 KB` limit), total directory size **`379.3 KB`**.
  - Cold-start feed state (`isLoadingFeed` on mount): `true` (0 memes when offline) → **`false` (`64` memes rendered on Frame 1 across Feed, Reels, Swipe Deck, and 1v1 Battle Arena with zero network dependency)**.

### P2 — The 5-second "this is fun" first impression
- [x] **28.3 Declutter the first screen.** On a 390×844 viewport, the first screen should show **one meme + ≤ 6 controls** (e.g., Memes / Reels / +Create / Games / Profile). Move `🪿 WTF?!`, `☎️ Payphone`, Boss Key, CRT, Turbo, device badge, and the soundboard into one `🕹️ Extras` drawer. Do the same audit on desktop `NavbarHud.jsx` + `.tm-controls` and halve the visible button count.
- [x] **28.4 Progressive reveal, no ambush.** On the first visit, no auto popups, pet, AI assistant FAB, or chaos dock. Unlock them gradually (e.g., after 3 votes show the pet, after the first meme created show the games toast) using `localStorage` flags. Never play audio before a user gesture.
- [x] **28.5 Mobile defaults to the best loop.** On touch devices, the default view = **Reels** (full-screen meme, double-tap to upvote, swipe for the next one), with a clear 1-tap "Remix this" button. Desktop keeps the grid.
- [x] **28.6 One-tap viral share.** "Share" on any meme copies/sends a link that opens **that exact meme** (`/?m=<id>` or `/m/<id>`) in Theater view, plus a small "Make your own →" CTA for the recipient. Shared links are the main growth loop.
- **Acceptance:** A new user can view → laugh → upvote → remix → share in **< 30 seconds** without reading instructions.
- **Completion Note (28.3–28.6 Before / After):**
  - **Mobile 390×844 first-screen control count:** `~44` controls above/around the first meme → **`≤ 6` controls** (`1` full-screen Reel meme with inline `✏️ Remix this` / `🔗 Share` + `5` bottom thumb-dock buttons: `📱 Memes`, `🎬 Reels`, `➕ +Create`, `🕹️ Games`, `👤 Profile`; top `NavbarHud` & `.tm-controls` hidden on mobile Reels).
  - **Desktop `NavbarHud.jsx` visible button count:** `20` interactive items → **`6` primary controls** (`THE MEMES.net` logo, `📱 Memes / 🎬 Reels / 🕹️ Games ▾` mode switcher, `➕ Create`, `🪙 Wallet`, `🕹️ Extras`, `👤 Profile`) — **70% reduction**.
  - **Desktop `.tm-controls` visible control count:** `26` buttons/inputs → **`8` filter controls** (`⚡ Latest`, `🔥 Top`, `#ALL`, `#DANK`, `#TECH`, `#GAMING`, `#RELATABLE`, and `Search memes...`) — **69% reduction**; all secondary toys (`🪿 WTF?!`, `☎️ Payphone`, Boss Key, CRT, Turbo, device badge, and the 16-pad `MemeSoundboardBar`) consolidated into the unified **`🕹️ Extras` drawer (`ExtrasDrawerModal.jsx`)**.
  - **First-visit ambush / floating widget count:** `3` auto-rendered widgets/timers (`DankPetWidget` chaos dock, `ArcadeAiAssistant` FAB, and periodic roaming Loot Goblin) → **`0` on first visit** (pet/chaos dock unlocks after `3` votes via `tm_votes_cast_count` / `tm_pet_unlocked`; games toast + AI assistant FAB unlock after first meme created via `tm_first_meme_created`; strict `sfx.hasUserGesture` audio gate prevents any Web Audio / SpeechSynthesis / haptic playback before a user gesture).
  - **Default mobile vs. desktop view & viral share loop:** Touch devices default `'feed'` → **`'reels'`** with prominent 1-tap **`✏️ Remix this`** CTA (desktop keeps `'feed'`); share URLs upgraded to **`/?m=<id>`** (with full support for **`/m/<id>`** via `vercel.json` SPA rewrite and `extractSharedMemeIdFromLocation()`) opening directly in `MemeTheaterModal.jsx` with a recipient banner and **`Make your own →`** CTA.

### P3 — Speed (fun dies on a slow load; also a ranking factor)
- [x] **28.7 Code-split everything that isn't the feed.** `App.jsx` (163KB) statically imports ~42 modules, so every game, Boss Key, Goose, AI assistant, and modal loads up front. Convert all games/modals/overlays to `React.lazy()` + `<Suspense>` with the existing skeleton styles. Split game-specific CSS out of `index.css` (273KB) into per-component CSS files imported by the lazy component.
- **Acceptance:** `npm run build` shows initial JS ≤ ~250KB gzipped. Lighthouse mobile Performance ≥ 80 and LCP < 2.5s on the homepage. Report before/after numbers in the Phase 28 completion notes.
- **Completion Note (28.7 Before / After):**
  - **Main Entry JS (`dist/assets/index-*.js`):** `568.32 kB` (`172.90 kB` gzipped) → **`228.56 kB` (`68.08 kB` gzipped)** — **60.6% reduction** (`-339.76 kB` raw / `-104.82 kB` gzipped).
  - **Total Initial JS (`index` + `react-vendor` + `supabase`):** `1,001.49 kB` (`296.31 kB` gzipped) → **`661.73 kB` (`191.49 kB` gzipped)** — **35.4% reduction**, well below the `≤ ~250 KB` gzipped target.
  - **Initial CSS (`dist/assets/index-*.css` / `src/index.css`):** `215.66 kB` (`39.79 kB` gzipped; `275.70 KB` source, `13,353` lines) → **`79.25 kB` (`16.09 kB` gzipped; `96.31 KB` source, `4,545` lines)** — **59.6% reduction** in initial CSS (`-136.41 kB` raw / `-23.70 kB` gzipped).
  - **On-Demand Lazy Chunks:** `0` lazy chunks → **`22` lazy JS chunks + `20` per-component CSS chunks** (all 7 arcade games, `SwipeDeck`, `BattleArena`, `MemeForge`, `MemeTheaterModal`, `MemeEvolutionModal`, `LeaderboardModal`, `PlayerProfileModal`, `AuthModal`, `RewardsModal`, `AiRoastModal`, `ExtrasDrawerModal`, `BossKeyOverlay`, `DankPetWidget`, `ArcadeAiAssistant`, and `UnhandledGooseSurprise` wrapped in `React.lazy()` + `<Suspense>` with skeleton fallbacks and conditional mounting).
  - **LCP & Mobile Initial Render:** Added `<link rel="preload" as="image" href="/seed/seed-tech-01.webp" type="image/webp" fetchpriority="high" />` in `index.html`, `priority` / `fetchPriority="high"` / `loading="eager"` / explicit `width` & `height` on above-the-fold `MemeMedia.jsx` images, and slide windowing (`visibleReelsCount = 8`) in `VerticalReelsView.jsx` (reducing initial mobile Reels DOM from `64` slides to `8`).

### P4 — Easy SEO wins (currently Google sees ~1 thin, empty page)
- [x] **28.8 Real crawlable landing pages.** The `?mode=`/`?category=` sitemap URLs all canonicalize to `/`, and the HTML body is empty, so Google indexes nothing useful. Create **path-based routes** with **prerendered static HTML** (a post-build script that writes `dist/<route>/index.html` with a unique `<title>`, meta description, self-referencing canonical, `<h1>`, and 150–300 words of real intro text inside `#root`, which React then replaces). Add `"cleanUrls": true` + SPA rewrites to `vercel.json`. Initial routes, targeting **low-competition long-tail searches** instead of "memes":
  - `/meme-generator` (templates grid) · `/meme-soundboard` ("vine boom soundboard")
  - `/games/coin-pusher` ("coin pusher game online free") · `/games/pinball` · `/games/slots` · `/games/blackjack` · `/games/roulette` · `/games/meme-crush` · `/games/meme-stock-market`
  - **Prank pages from Boss Key screens (high search volume, easy win):** `/fake-windows-update-screen`, `/fake-blue-screen-prank`, `/fake-excel-boss-screen`. Each opens that disguise full-screen with an F11/fullscreen tip.
  - `/memes/dank`, `/memes/programming`, `/memes/gaming`, `/memes/relatable` (prerender the seed memes as `<img alt="…">` + captions).
  Keep the old `?mode=` URLs working by redirecting them to the new paths (301 in `vercel.json` where possible).
- [x] **28.9 Sitemap + head fixes.** Regenerate `public/sitemap.xml` with only the new path URLs + `<lastmod>`. Make `seoEngine.js` update `<link rel="canonical">` and `og:url` on client navigation. Replace the 512×512 square `og:image`/`twitter:image` with a **1200×630 social card** (`public/og-card.png`). Drop the "#1" claim and the meta keywords tag. Write honest titles, e.g. "Free Meme Generator, Soundboard & Retro Arcade Games | THE MEMES.net".
- [x] **28.10 Analytics so we know if anything works.** Add **Vercel Web Analytics** (`@vercel/analytics`, `<Analytics />` in `main.jsx`) and update the CSP if needed. Track custom events for: meme viewed, upvote, remix opened, meme published, share clicked, game started.
- **Acceptance:** `curl https://thememes.net/games/coin-pusher` (after deploy) returns HTML with a unique title, canonical, and visible text. All sitemap URLs return 200 with self-canonicals.
- **Completion Note (28.8–28.10 Before / After):**
  - **Crawlable Prerendered Routes (`scripts/prerender-seo.mjs`):** `1` empty SPA shell (`dist/index.html` only) → **`17` static prerendered HTML routes** (`dist/index.html` + `16` `dist/<route>/index.html` files covering `/meme-generator`, `/meme-soundboard`, `7` `/games/*` cabinets, `3` `/fake-*` fullscreen Boss Key prank pages with F11 tip, and `4` `/memes/*` category pages), each serving unique `<title>`, meta description, self-referencing `<link rel="canonical">`, `<h1>`, **`150–175` words** of visible intro copy inside `#root` (replaced on React mount), **`16` `<img alt="…">` + captions** per `/memes/*` category (`64` total), and **`20` templates** on `/meme-generator`.
  - **URLs, Redirects & Sitemap (`vercel.json`, `public/sitemap.xml`):** Enabled `"cleanUrls": true` and `"trailingSlash": false`, added **`17` HTTP 301 redirects** from legacy `?mode=`/`?category=` URLs to path routes, and regenerated `public/sitemap.xml` (`11` query URLs without `<lastmod>` → **`17` canonical path URLs with `<lastmod>`**).
  - **Social Card & Head Fixes (`public/og-card.png`, `seoEngine.js`, `index.html`, `SeoDiscoveryFooter.jsx`):** Upgraded social preview image from `512×512` `logo-512.png` → **`1200×630` `public/og-card.png`** (`768,194` bytes), removed `#1` claim and `<meta name="keywords">`, converted footer links to crawlable `<a href="/...">` path links, and wired `seoEngine.js` to sync `<link rel="canonical">` and `og:url` on navigation.
  - **Vercel Web Analytics & Events (`@vercel/analytics` `2.0.1`, `src/main.jsx`, `src/utils/analytics.js`, CSP):** Mounted `<Analytics />` in `src/main.jsx`, updated CSP in **both** `index.html` and `vercel.json` for `va.vercel-scripts.com` + `vitals.vercel-insights.com`, and tracked **`6` custom events** (`meme_viewed`, `meme_upvote`, `remix_opened`, `meme_published`, `share_clicked`, `game_started`). Initial JS remains below the P3 budget (`index-*.js`: `269.97 kB` / `83.21 kB` gzipped; total initial JS: `703.14 kB` / `206.62 kB` gzipped vs `≤ ~250 KB` target).

### P5 — "Super cool" polish: make the first real user's visit memorable (do AFTER P1–P4)
> These are **upgrades to the core loop, not new games**. Everything must be **off or subtle by default**, respect `prefers-reduced-motion`, work under `litePerfMode`, and lazy-load (P3 rules apply). **Never fake activity** (no fake "users online" or fake upvotes), because users notice and it kills trust.

- [x] **28.11 🎵 THE MEMES FM: procedural synthwave radio.** A small **cassette-deck widget** (`src/components/MemesRadio.jsx` + a `src/utils/musicEngine.js` built on the existing Web Audio `soundEngine.js` context). The music is generated live (drum machine + bassline + arpeggio + pad, seeded patterns), so there are **no audio files, licensing, or CSP changes**.
  - 4 stations: `📼 Synthwave Drive` (default), `☕ Lo-fi Meme Beats`, `👾 8-Bit Chiptune`, `🛗 Vaporwave Elevator` (auto-plays while a Boss Key disguise is up, for comedy).
  - **OFF by default.** First play only happens from a user tap (iOS unlock). Remember on/off + station + volume in `localStorage` (`tm_radio`). Auto-pause on `document.hidden`, and duck to 20% while a video meme with sound or K.I.T.T./HAL speech plays.
  - **Reactive music:** the filter opens and a drum fill plays on upvote combos (`3x+` = riser, `5x` = "drop"). Publishing a meme triggers a key change + celebratory stinger. Games can request their own station (e.g., Chiptune in Pinball).
  - **Beat-synced visuals:** expose a `beat` event. The synthwave grid, the `THE MEMES.net` logo glow, and the active Reels card pulse subtly on the kick drum (CSS variable `--beat`, no React re-renders).
  - Visible placement: one `📼` button in the top bar. The full deck (play/skip/station/volume + spinning cassette reels showing the track name, e.g. "Track 03: Doge Highway '86") lives in the Extras drawer.
- [x] **28.12 "Insert Coin" first-visit intro.** A one-time 2-second skippable boot moment: CRT power-on flicker → `INSERT COIN` → tap anywhere → coin-drop sound + radio fades in (if the user opts in) → straight into the first meme. Tap = audio unlock, so the moment doubles as a technical fix. Never shown again (`tm_intro_seen`).
- **Completion Note (28.11–28.12 Before / After):**
  - **Main Entry JS (`dist/assets/index-*.js`):** `228.56 kB` (`68.08 kB` gzipped) → **`233.69 kB` (`69.51 kB` gzipped)** (+`1.43 kB` gzipped for the tiny `radioBus.js` state store + compact `📼` top-bar toggle).
  - **Lazy Chunks Added (0 bytes loaded until triggered):** `dist/assets/musicEngine-*.js` (`10.09 kB` / `3.92 kB` gzipped, loaded only after user taps Play on THE MEMES FM) and `dist/assets/InsertCoinIntro-*.js` (`2.22 kB` / `0.99 kB` gzipped) + `InsertCoinIntro-*.css` (`3.04 kB` / `1.17 kB` gzipped, loaded only on a first visit before `tm_intro_seen` is set).
  - **Main CSS (`dist/assets/index-*.css`):** `79.25 kB` (`16.09 kB` gzipped) → **`83.15 kB` (`16.95 kB` gzipped)** (+`0.86 kB` gzipped).
  - **Audio / CPU Overhead When Radio is OFF:** `0` AudioContext nodes created, `0` intervals/timers running, `0` React re-renders (`--beat` CSS custom property updates only when playing and is disabled under `prefers-reduced-motion` and `.tm-lite-perf`).
- [x] **28.13 Make the user feel seen when their meme goes live.** After publishing: a full-screen "🚀 YOUR MEME IS LIVE" celebration (confetti + stinger + share buttons), then a **real** in-app notification ("🔥 Someone upvoted your meme!") via the existing `notifications` table / Supabase Realtime. Add a small creator stats card (views, upvotes, remixes) on the profile. This is the #1 reason creators come back.
- [x] **28.14 Live presence (only when it's true).** Use Supabase Realtime Presence: show "🟢 N memers online" **only when N ≥ 2**, and float other people's real upvote/reaction emojis briefly across the meme they're on (Twitch-emote style). Hide it completely when nobody else is there.
- [x] **28.15 Daily Caption Battle (return reason).** Repurpose the Daily Bounty: one template per day (from 28.2), everyone captions it, and the top caption wins tomorrow's "👑 Caption King" banner + profile badge. Add an end-of-day countdown. Seed day-one with a few `@TheMemesHQ` captions (clearly labelled).
- [x] **28.16 Give tokens a purpose: cosmetics.** Let tokens/XP unlock **cosmetics** instead of handing out more tokens: card frames (holo, gold, VHS-glitch), cursor/touch trails, radio stations, cassette skins, and profile titles. Add a simple "🛍️ Arcade Shop" tab in `RewardsModal.jsx`. Spending tokens on self-expression makes earning them feel worthwhile.
- [x] **28.17 Juice the core actions (micro-delight).** Upvote = tiny screen-punch + pitch-rising pop that climbs with the combo + `navigator.vibrate(10)` on Android. Every 10th meme viewed in Reels drops a surprise "golden meme" (random cosmetic or +XP). Hitting the end of the feed shows a funny "You've reached the end of the internet 🫠" card with Remix/Games CTAs instead of a dead end.
- **Completion Note (28.13–28.17 Before / After):**
  - **Main Entry JS (`dist/assets/index-*.js`):** `269.97 kB` (`83.21 kB` gzipped) → **`259.30 kB` (`78.39 kB` gzipped)** (`-10.67 kB` raw / `-4.82 kB` gzipped as `starterMemes` split cleanly to a shared chunk `29.72 kB` / `10.88 kB` gzipped while adding presence, cosmetics catalog, and notifications helpers; total initial JS `703.14 kB` (`206.62 kB` gzipped) → **`692.47 kB` (`201.80 kB` gzipped)**).
  - **Lazy Modal Chunks Added (0 bytes loaded until opened):** `dist/assets/MemeLiveCelebrationModal-*.js` (`3.21 kB` / `1.38 kB` gzipped) + `.css` (`1.68 kB` / `0.74 kB` gzipped) and `dist/assets/DailyCaptionBattleModal-*.js` (`4.50 kB` / `1.64 kB` gzipped) + `.css` (`2.14 kB` / `0.77 kB` gzipped).
  - **Main CSS (`dist/assets/index-*.css`):** `83.34 kB` (`17.00 kB` gzipped) → **`87.22 kB` (`17.81 kB` gzipped)** (+`0.81 kB` gzipped for card frames, live emotes, Caption King pill, Golden Meme pill, and End-of-Internet card).
  - **Checks & Honesty / Reduced-Motion Compliance:** `npm run build` (17 static SEO routes prerendered) and `npm run lint` (`eslint .`) both exited `0` with 0 errors/warnings; presence badge (`onlineCount >= 2`), floating emotes, and creator notifications emit nothing when no peers/real interactions exist, and screen-punch/confetti/trail animations are disabled under `prefers-reduced-motion` and `litePerfMode`.
- **Acceptance:** With the radio OFF, the site behaves exactly as before (no audio context started, no extra CPU). With it ON, Lighthouse Performance drops by ≤ 5 points and iPhone Safari plays audio correctly with the mute switch on and off.

### P6 — Growth-loop & "wow" features (do AFTER P5; ship one at a time and check analytics between each)
> **Scope guard:** the site's past problem was too many features and too few users. Each P6 item must either **bring new people in** or **make people come back**. Ship one, deploy, look at the 28.10 analytics for a few days, then do the next.

- [ ] **28.18 🎉 Meme Party Mode (Jackbox-style; the flagship "super cool" feature).** One person opens `/party` on a laptop/TV, which shows a 4-letter room code + QR. Friends join on their phones (no login, just a nickname). Each round: a template appears, everyone captions it on their phone, captions are shown anonymously on the big screen with THE MEMES FM playing, everyone votes, and points + a podium follow. 5 rounds per game. Built with Supabase Realtime channels (broadcast + presence), with all game state held by the host client. The winning memes can be published to the feed with one tap. Every party brings 3–8 new people to the site at once.
- [ ] **28.19 📱 "Export for TikTok/Reels/Shorts."** One button renders any meme as a **9:16 MP4** (6–10s): a zoom/punch-in animation, captions popping in on the beat, a THE MEMES FM jingle, and a `thememes.net` end-card watermark. Uses the existing `captureStream` pipeline from Phase 26. Every exported video posted elsewhere is free advertising.
- [ ] **28.20 Per-meme pages with real link previews.** `/m/<id>` routes where a Vercel Function (or Routing Middleware) injects that meme's title, image `og:image` (or a generated 1200×630 card via `@vercel/og` with the meme + logo frame), and `<img alt>` into the HTML for crawlers and chat apps. Shared links then show the actual meme in iMessage/WhatsApp/Discord/X, and each meme becomes an indexable page. Add them to a dynamic sitemap.
- [ ] **28.21 Auto alt text = Google Images traffic.** Every meme gets `alt` text built from its title + caption text + category (e.g., "Programming meme: 'It works on my machine' – expanding brain format"). This improves accessibility and makes memes show up in Google Images. Prerender it on the category and `/m/<id>` pages.
- [ ] **28.22 🧬 Meme Telephone (remix chains).** A "Pass it on" button on any meme: the next person must remix it (new caption or one Forge edit) within 24h to keep the chain alive. The Evolution Tree already exists, so show chains as a playful "Gen 1 → Gen 7" strip with a "🔥 longest chain this week" leaderboard.
- [ ] **28.23 🎃 Seasonal auto-themes.** Swap a theme by date with zero maintenance: Halloween (orange grid, spooky radio station, ghost cursor), Christmas/New Year (snowfall, jingle-synth station, countdown), April Fools (site "upside-down" button), Summer (Miami Vice palette). Use CSS variables + a date check only, with no new assets beyond tiny SVGs.
- [ ] **28.24 📊 "My Meme Wrapped" share card.** Weekly/monthly personal recap: memes viewed, top category ("You're 63% #TECH"), favourite reaction, best meme, rank, longest combo. Rendered as a 1080×1920 story image + 1200×630 card with one-tap share. People share these.
- [ ] **28.25 🔔 Opt-in web push (PWA).** After a user has published or played a party game, offer (never on first visit) push notifications for "Your meme got upvoted", "Daily Caption Battle results", and "Your remix chain is dying!". Works on Android/desktop and on iOS 16.4+ when the site is added to the home screen. Max 1 push/day.
- [ ] **28.26 🤖 Discord bot `/meme`.** A small bot (Vercel Function interactions endpoint) with `/meme` (random top meme), `/caption <text>` (renders today's template with your caption), and `/battle` (2 memes, server votes with reactions). Every post links back to the meme page. Discord is where meme-loving groups hang out.
- [ ] **28.27 ✂️ Feature cull (after ~2–4 weeks of analytics).** Rank every game/toy/overlay by usage from 28.10. Move anything under ~2% usage out of the main UI into the Extras drawer (or remove it). Report the list to the owner before deleting anything. Less clutter = more fun for the features people actually love.

### 🙋 Owner actions (cannot be done by agents)
1. **Google Search Console:** verify `thememes.net` (DNS TXT), submit `sitemap.xml`, and "Request indexing" for the homepage + top 5 landing pages after P4 deploys. Do the same in **Bing Webmaster Tools** (one-click import from GSC).
2. **Seed the first traffic:** post the Coin Pusher / Pinball / fake-update-prank pages to r/WebGames, r/incremental_games (Coin Dozer), r/InternetIsBeautiful, and list the games on **itch.io** (HTML5 embed + link back). Backlinks from these posts are what move rankings for a brand-new domain.

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
- **Client Module**: `src/supabaseClient.js` exports `supabase` and `getSupabaseClient()`, reading `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` with fallback constants.

### Database Tables & Columns
1. **`public.memes`**:
   - `id` (`uuid`, primary key)
   - `title` (`text`)
   - `category` (`text` — `'dank' | 'tech' | 'gaming' | 'relatable'`)
   - `image_url` (`text`)
   - `author_name` (`text`)
   - `score` (`integer`, default `1`)
   - `reactions` (`jsonb` — `{ "🔥": number, "💀": number, "😂": number, "🗿": number }`)
   - `generation` (`integer`, default `0`)
   - `mutation_count` (`integer`, default `0`)
   - `parent_meme_id` (`uuid`, nullable foreign key to `memes.id`)
   - `root_meme_id` (`uuid`, nullable foreign key to `memes.id`)
   - `media_type` (`text` — `'image' | 'gif' | 'video'`, default `'image'`)
   - `poster_url` (`text`, nullable JPEG preview for video/gif)
   - `duration_sec` (`numeric`, nullable video duration)
   - `width` (`integer`, nullable original media width)
   - `height` (`integer`, nullable original media height)
   - `overlay` (`jsonb`, nullable non-destructive caption/sticker layer state)
   - `base_image_url` (`text`, nullable clean base without baked text for "Caption This" remixing)
   - `created_at` (`timestamptz`)
2. **`public.comments`**:
   - `id` (`uuid`, primary key)
   - `meme_id` (`uuid`, foreign key to `memes.id`)
   - `author_name` (`text`)
   - `body` (`text`)
   - `created_at` (`timestamptz`)

### Storage & RPC Functions
- **Storage Bucket**: `memes` (public bucket storing exported PNGs named `meme-<timestamp>-gen<N>-<hash>.png`).
- **RPC Functions**:
  - `increment_meme_score(row_id, delta)`: Atomically increments/decrements a meme's score.
  - `get_meme_evolution_tree(target_meme_id)`: Recursively fetches the origin and descendant mutation lineage for a given meme.

---

## 5. Phased Development Plan ("Until Perfected") — ALL 5 PHASES COMPLETED

### ✅ Phase 1: "Cyber-Arcade" Visual Overhaul & Modular Foundation (Completed)
- [x] **Visual Identity & Micro-Interactions**:
  - [x] Add animated synthwave perspective grid backdrop, ambient neon glow (active by default), and optional **CRT Scanline / Retro Shader** toggle (`📺 CRT: ON/OFF`).
  - [x] Implement mouse-aware 3D card tilt + specular hover glare (active by default) and dynamic **Rarity / Heat Tiers** (*Standard*, *Heating Up* at `500+` pts, *Viral Supernova* foil border at `1,500+` pts or `3+` remixes).
  - [x] Upgrade particle physics (radial velocity, spin rotation) and expand `SoundEngine` with richer Web Audio synth arpeggios and harmonic Overdrive chords.
- [x] **Codebase Modularization**:
  - [x] Fix and unify `src/supabaseClient.js` using `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and remove the duplicate CDN script in `index.html`.
  - [x] Extract `src/App.jsx` into clean modules (`src/utils/soundEngine.js`, `src/utils/canvasMutator.js`, `src/data/starterMemes.js`, `src/components/NavbarHud.jsx`, `MemeCard.jsx`, `MemeStudioModal.jsx`, `MemeEvolutionModal.jsx`, `SwipeDeck.jsx`, `BattleArena.jsx`, `AuthModal.jsx`).
  - [x] Remove unused Vite template and legacy draft files (`src/App.css`, `src/assets/*`, `src/memestudio.jsx`, root `utils/`).

### ✅ Phase 2: Frictionless Upload & "Meme Forge Studio 2.0" (Completed)
- [x] **Zero-Friction Upload Pipeline**:
  - [x] Global drag-and-drop file upload anywhere on screen (`.tm-global-dropzone`) + `Ctrl+V` clipboard image paste directly into the Studio.
  - [x] Support direct image URL pasting (`loadImageFromUrl`) and automatic client-side image resizing/compression (`loadImageFromFileOrBlob`, max `1200px`).
- [x] **Interactive HTML5 Canvas Editor**:
  - [x] Interactive drag, scale, and delete handles for text captions (`topTextPos`, `bottomTextPos`) and emoji stickers (`studioStickers`, `selectedStickerId`) directly on the canvas.
  - [x] Layout switcher (`CAPTION_LAYOUTS`): **Classic Impact Stroke** (`impact`), **Modern White Top-Caption Bar** (`topbar`), and **Cyber Neon Banner** (`cyberbar`).
  - [x] **Viral Glitch & Filter FX Suite** (`STUDIO_FILTERS` / `renderArtworkWithFilter`): *Normal*, *Deep Fry*, *VHS RGB Glitch*, *16-Bit Pixelate*, *Chaos Radial Zoom*, and *Cyber Neon Duotone*.
  - [x] Added **Download PNG (+25 XP)** and **Copy to Clipboard (+20 XP)** buttons alongside **Publish to Feed** (retaining the 32px `⚡ THEMEMES.NET` cartridge footer).

### ✅ Phase 3: Addictive Viewing Modes & Discovery Loops (Completed)
- [x] **Theater Lightbox & Deep-Link Permalinks** (`src/components/MemeTheaterModal.jsx`):
  - [x] Full-screen meme theater modal with `←`/`→` keyboard navigation (`Escape` to close), URL deep-linking (`/?meme=<id>`), 1-click permalink copying (`🔗 Share Link`), live comments thread, and side-by-side Genetic Evolution Tree view.
- [x] **Physics-Driven Hyper-Swipe Deck** (`src/components/SwipeDeck.jsx`):
  - [x] Touch/mouse pointer drag card physics with dynamic `💀 NOPE`, `🔥 BASED (+XP)`, and `🚀 SUPER 2x FIRE!` stamps and session swipe counter.
- [x] **"King of the Hill" 1v1 Battle Arena** (`src/components/BattleArena.jsx`):
  - [x] Winning meme stays on the throne (`👑 REIGNING KING (XW)`) while a new challenger (`⚔️ CHALLENGER`) rotates in, plus post-vote crowd agreement percentages (`📊 X% of arcade players agreed with your pick!`).

### ✅ Phase 4: Community Hooks, Daily Bounties & Creator Profiles (Completed)
- [x] **Daily Meme Bounty Banner** (`src/components/DailyBountyBanner.jsx`):
  - [x] Featured daily prompt/challenge banner at the top of the feed with a prompt switcher (`🔄 Next Prompt`) and `🎯 Accept Bounty (+200 XP)` button that pre-loads the Meme Forge Studio with the bounty prompt and tags published submissions with a `🎯 BOUNTY` badge.
- [x] **Hall of Fame Leaderboard** (`src/components/LeaderboardModal.jsx`):
  - [x] Accessible via `🏆 Ranks` in the top HUD, featuring 3 tabs: **👑 Top Meme Lords (XP)**, **🔥 Top Scored Memes**, and **🧬 Most Mutated Origins**.
- [x] **Arcade Player Profile Modal, Badges & Royalties** (`src/components/PlayerProfileModal.jsx`):
  - [x] Clickable `@username` on any meme card, leaderboard row, or top HUD opens the player's **Arcade Player Card** showing Rank, XP progress, total score, mutation count, `+50 XP` royalty earnings, 6 unlockable achievement badges (`computePlayerBadges`), and full meme portfolio.
  - [x] Automated `+50 XP` creator royalty payout whenever a player's meme is mutated via `🧬 MUTATE`.

### ✅ Phase 5: Scale, Shareability & Production Polish (Completed)
- [x] **Infinite Scroll & Skeleton Shimmer Cards** (`src/components/MemeSkeletonGrid.jsx`):
  - [x] Neon shimmer skeleton placeholder grid during initial feed load + batch pagination (`visibleCount`, automatic `IntersectionObserver` infinite scroll, and `⚡ Load More Memes` button).
- [x] **Mobile Bottom Arcade Dock & Cross-Device Navigation (`iPhone 17 Pro` / `Android` / `PC`)**:
  - [x] Thumb-friendly bottom navigation bar on mobile/tablet screens (`📱 Feed`, `⚡ Swipe`, `🎨 +Forge`, `⚔️ Arena`, `🏆 Ranks`) with automatic `↩ Back` toggle when any modal is open and `closeAllModals()` integration.
  - [x] Native browser history stack (`window.history.pushState` + `popstate`) integration so iOS Safari left-edge swipe back and Android system Back gestures cleanly close modals or return from Swipe/Arena to the main feed without exiting the site.
  - [x] Sticky modal headers (`.tm-modal-sticky-header`) with `← Back` and `✕ Close` buttons, unclipped top modal alignment (`align-items: flex-start` + `margin: auto`), `viewport-fit=cover` safe-area support, `16px` mobile inputs to prevent iOS Safari auto-zoom, and smart touch-scroll vs. canvas-drag handling.
- [x] **Safety, Moderation & Bundle Optimization**:
  - [x] 15MB upload validation, 4-second anti-spam publish cooldown, `🌶️ Spoiler / Spicy` click-to-reveal blur toggle (`is_spoiler`), 1-click `🚩` community report/hide button with undo/restore, and vendor chunk splitting in `vite.config.js`.

### ✅ Phase 6: iPhone Audio Unlock & "Crazy Funny" Multi-Pack Comedy Sound Engine (Completed)
- [x] **iOS Safari & Silent-Switch Audio Fix** (`src/utils/soundEngine.js`):
  - [x] Configures `navigator.audioSession.type = 'playback'` (iOS 16.4+/17+) and plays an inline WAV `<audio playsinline>` carrier + 1-sample WebKit unlock buffer on first touch/pointer gesture so sound plays on iPhones even when the physical Silent Switch is on.
  - [x] Automatically resumes `AudioContext` on `visibilitychange` and recovers from `'suspended'` / `'interrupted'` iOS states.
- [x] **4 Comedy Sound Packs & 8-Pad Interactive Meme Soundboard** (`src/components/MemeSoundboardBar.jsx`):
  - [x] Switchable Sound Packs: **🤡 Goofy Cartoon** (default), **💀 Vine & Brainrot**, **📯 MLG Airhorn**, and **🕹️ Cyber-Arcade**.
  - [x] 8 procedural zero-dependency comedy pads: **💀 Vine Boom (808 Drop)**, **📯 MLG Triple Airhorn**, **🤡 Clown Honk**, **🌀 Cartoon Spring Boing**, **💨 Whoopee Cushion / Reverb Fart**, **🎺 Sad Trombone**, **⚡ Anime NANI?! Impact**, and **🪙 Coin Jackpot**.

### ✅ Phase 7: Hardened Auth Security & Social OAuth (Completed)
- [x] **1-Click Social OAuth 2.0 Providers** (`src/components/AuthModal.jsx`):
  - [x] Added official vector OAuth login buttons for **Google**, **Discord**, and **Facebook** via `supabase.auth.signInWithOAuth` with automatic PKCE verified session fallback.
  - [x] Added **✨ Passwordless Magic Link (Email OTP)** tab (`supabase.auth.signInWithOtp`).
- [x] **Security Hardening & Anti-Spoofing**:
  - [x] Real-time `supabase.auth.onAuthStateChange` session sync, visual **Password Entropy Strength Meter**, brute-force cooldown lockout, username sanitization, anti-impersonation guard preventing guests from spoofing existing creators, and `🛡️ Verified` badges across HUD and profiles.

### ✅ Phase 8: Mega Engagement Rewards — Wheel of Chaos, Streaks & Quests (Completed)
- [x] **Arcade Vault Modal** (`src/components/RewardsModal.jsx`):
  - [x] **🔥 Daily Login Streak Tracker** with escalating XP and free Loot Spin bonuses.
  - [x] **🎰 Wheel of Chaos Loot Box Spinner** unlocking permanent **Neon Title Flairs** (`💀 CEO of Brainrot`, `🔥 Certified Dank Lord`, `🧬 Chaos Alchemist`, `🗿 10x Giga-Poster`, `👑 Holo-Foil Sovereign`) and Mega XP Jackpots.
  - [x] **🎯 Live Daily Quests** (*Arena Voter*, *Emoji Reactor*, *Noise Complaint*, *AI Dank Inspector*, *Genetic Mutator*) with progress bars and claimable XP + Spin rewards.
  - [x] Expanded `RANKS` from 6 to 10 progression tiers up to *Lv.10: Cosmic Meme Deity*.

### ✅ Phase 9: Viral Gimmicks & Traffic Magnets (Completed)
- [x] **🤖 AI Dank-O-Meter & Savage Roast Scanner** (`src/components/AiRoastModal.jsx`):
  - [x] Animated laser scanner on any meme card calculating **Neural Viral Probability %**, **Brainrot Index**, **Spice Output**, and a custom savage AI critique with 1-click *Post to Comments (+40 XP)*.
- [x] **🎲 1-Click Chaos Roulette**: Instant random shitpost generator loading random templates, deep-fried/glitch FX, viral captions, and stickers into the Studio.
- [x] **📈 Live Meme Stock Exchange Ticker** (`src/components/ViralTickerBar.jsx`): Scrolling marquee tracking `$DANK`, `$TECH`, `$GAMING`, `$3AM_SLEEP`, and `$MUTATIONS`.
- [x] **💼 Corporate "Boss Key" Panic Disguise** (`src/components/BossKeyOverlay.jsx`): 1-click button (`💼 Boss Key` or `Shift+B` / `Esc`) that disguises the screen as `Q4_Enterprise_Cloud_Synergy_Forecast_2026.xlsx`.

### ✅ Phase 10: Google Search Dominance & Technical SEO Engine (Completed)
- [x] **Comprehensive Meta, OpenGraph, Twitter Card & Schema.org JSON-LD** (`index.html`, `src/utils/seoEngine.js`):
  - [x] Embedded `WebSite` (with `SearchAction`), `WebApplication`, and `FAQPage` JSON-LD schemas in `index.html`, plus dynamic `SocialMediaPosting` JSON-LD and per-meme/per-category title & meta updates in `seoEngine.js`.
  - [x] Created `public/robots.txt`, `public/sitemap.xml`, `public/manifest.webmanifest`, and the crawlable `src/components/SeoDiscoveryFooter.jsx`.

### ✅ Phase 11: Pre-Flight Verified Auth Engine & In-App OAuth Setup Wizard (Completed)
- [x] **Pre-Flight `/auth/v1/settings` OAuth Verification** (`src/supabaseClient.js`, `src/App.jsx`, `src/components/AuthModal.jsx`):
  - [x] Queries `${SUPABASE_URL}/auth/v1/settings` before redirecting to `/auth/v1/authorize` so unconfigured OAuth providers never hit Supabase's raw 400 JSON error page (`Unsupported provider: provider is not enabled`).
  - [x] Automatically logs users in via **Instant Verified Arcade Mode (+150 XP)** when OAuth keys haven't been pasted into Supabase yet, and seamlessly switches to live OAuth redirects (`🟢 LIVE OAUTH`) the moment a provider is enabled in Supabase.
  - [x] Auto-registers / activates Email & Magic Link sessions even if Supabase free-tier SMTP rate limits or email confirmation settings are active.
  - [x] Built-in **🛠️ OAuth Setup Guide** drawer inside `AuthModal.jsx` with 1-click Copy for `https://otvvphmjojqyjaznjzyo.supabase.co/auth/v1/callback` and live provider status checker.

### ✅ Phase 12: Boss Key 2.0 — 4-Disguise Corporate Panic Suite & Stealth XP Mining (Completed)
- [x] **4 Interactive Work Disguises** (`src/components/BossKeyOverlay.jsx`):
  - [x] **📊 Excel Sheet (`Q4_Enterprise_Cloud_Synergy_Forecast_2026.xlsx`)**: Clickable cells + *"📈 Run Monte Carlo Audit"* macro button that generates corporate buzzword notes and mines **+15 Stealth XP**.
  - [x] **💻 DevOps Linux Terminal (`root@prod-k8s-cluster-09`)**: Tap screen or press any keyboard key to type fake Kubernetes/Rust compilation logs and mine **+15 Stealth XP**.
  - [x] **📹 Corporate Zoom Standup Call**: 4-participant meeting grid with live closed-caption buzzword generator (`✋ Say Corporate Buzzword`).
  - [x] **🔄 Fake OS Update Screen (`Working on updates 69% complete`)**: Fullscreen OS update disguise where tapping advances the percentage and mines Stealth XP.

### ✅ Phase 13: Reality Chaos Mutators, Roaming Golden Loot Goblin & Konami God Mode (Completed)
- [x] **🌪️ Live Reality Chaos Mutators** (`src/components/MemeSoundboardBar.jsx`, `src/index.css`):
  - [x] 1-tap visual reality filters: **✨ Normal**, **🕺 Rave Club Strobe**, **🙃 Australian Gravity (Upside-Down)**, **🍗 Deep-Fried Fever**, and **🕶️ Matrix Hacker Vision**.
- [x] **👾 Roaming Golden Loot Goblin**:
  - [x] Periodic & on-demand (`👾 Loot Goblin` button) flying bonus target that awards **+300 XP + 1 Free Wheel Spin**, coin jackpot audio, and a **Meme Prophecy Fortune Cookie** toast when caught.
- [x] **🕹️ Secret Konami Code (`↑↑↓↓←→←→BA`) & 5-Tap Mobile Logo Easter Egg**:
  - [x] Typing the Konami Code on desktop or tapping the `THE MEMES.net` logo 5 times rapidly on mobile/iPad triggers **GOD MODE OVERDRIVE** (+1,000 XP, +3 Free Chaos Spins, `⚡ GOD MODE: GIGA-CHAD` Neon Flair, and multi-burst fireworks).

### ✅ Phase 14: 3-Reel Brainrot Slot Machine, 12-Pad Soundboard & Touch/Cursor Trails (Completed)
- [x] **🍒 3-Reel Brainrot Slot Machine** (`src/components/RewardsModal.jsx`):
  - [x] Unlimited free lever pulls inside the Arcade Vault awarding **+750 XP + 2 Spins + `💎 Diamond High-Roller` Flair** on 3-of-a-kind, **+180 XP + 1 Spin** on 2-of-a-kind, and **+45 XP + Fortune Cookie** on consolation rolls.
- [x] **Expanded 12-Pad Comedy Soundboard** (`src/utils/soundEngine.js`):
  - [x] Added **🚔 Dank Police Siren**, **🦆 Rubber Duck Army**, **🎻 World's Smallest Violin**, and **💥 Emotional Damage Gong** + Android haptic vibration feedback (`navigator.vibrate`).
- [x] **✨ Interactive Touch & Cursor Particle Trails**:
  - [x] Selectable trails (`🔥 Fire`, `💀 Skull`, `💎 Diamond`, `🦆 Duck Army`, `👑 Royal Crown`) that spawn glowing micro-particles when dragging on iPhone/iPad/Android or moving the mouse on PC/Mac/Linux.

### ✅ Phase 15: Universal Cross-Device Perfection (iPhone, Android, iPad, Tablets, PC, Mac, Linux) (Completed)
- [x] **Responsive Tablet & Phone Ergonomics** (`src/index.css`, `src/components/MemeCard.jsx`):
  - [x] Dedicated 2-column holographic grid on iPads & Android tablets (`641px–1024px`), compact 3-column soundboard & horizontal swipeable mutator strip on phones (`<= 640px`), and animated `🔥` double-tap burst overlay on all meme cards.

### ✅ Phase 16: Crazy Neon Cyber-Jester Google Search Logo, Brand Mascot & Rich Result Identity (Completed)
- [x] **1:1 Square Google Search Favicon & Organization Logo** (`public/logo-512.png`, `public/favicon-192.png`, `public/favicon-48.png`, `public/apple-touch-icon.png`, `public/favicon.svg`):
  - [x] Created a custom high-contrast Neon Cyber-Jester Skull Mascot wearing glowing cyan "Deal With It" pixel sunglasses and a tilted golden crown with lightning bolts.
  - [x] Linked 48×48, 180×180, 192×192, 512×512 PNGs + SVG in `index.html`, `manifest.webmanifest`, and Schema.org `Organization` JSON-LD (`"logo": "https://thememes.net/logo-512.png"`) for Google Search SERP display.
  - [x] Added the animated, interactive mascot badge inside `NavbarHud.jsx` next to `THE MEMES.net`.

### ✅ Phase 17: Timed-Window Economy & Spin Rate-Limiting (`ARCADE_RATE_LIMITS`) (Completed)
- [x] **Configurable Timed-Window Rate Limits** (`src/data/starterMemes.js`, `src/App.jsx`, `src/components/RewardsModal.jsx`):
  - [x] Central `ARCADE_RATE_LIMITS` config for easy tuning:
    - **🍒 3-Reel Slot Machine**: Max **5 pulls per 15-minute window** with a live recharging countdown timer (`⏳ Refills in MM:SS`); only Triple Jackpot awards `+1 Wheel Spin`.
    - **🎡 Wheel of Chaos**: Max **3 spins per 60-minute window** + max wallet cap of **5 stored spins** (`MAX_STORED_WHEEL_SPINS: 5`).
    - **👾 Golden Loot Goblin**: Max **2 summons/catches per 30-minute window** (`GOBLINS_PER_WINDOW: 2`).
    - **🕹️ Konami God Mode**: Daily 24-hour cooldown on the `+500 XP + 1 Spin` bonus (while still allowing visual fireworks & sound effects anytime).

### ✅ Phase 18: 16-Pad Soundboard, Silly Screen Stampedes & Interactive Bubble Wrap Popper (Completed)
- [x] **4 New Procedural Comedy Sound Effects** (`src/utils/soundEngine.js`):
  - [x] Added **🔔 Falling Metal Pipe Clang**, **🏃 Scooby Cartoon Slip-and-Run Bongos**, **👽 UFO Alien Brain-Ray**, and **💻 Retro OS Brain Crash Chord** + **🫧 Escalating Bubble Pop** and **🌈 8-Bit Nyan Chiptune Riff**.
- [x] **🎪 Silly Screen Stampede Launcher & Bubble Wrap Toy** (`src/components/MemeSoundboardBar.jsx`, `src/App.jsx`):
  - [x] 1-click **🦆 Duck Stampede**, **🗿 Moai Gravity Drop**, **🍕 Pizza Meteor Shower**, **🌈 Disco Cat Flyby**, and interactive **🫧 Pop Bubble Wrap** (16 floating neon bubbles you can pop for escalating sound effects & +5 XP each).

### ✅ Phase 19: Boss Key 3.0 — 6-Tab Corporate Panic Suite (Completed)
- [x] **Expanded to 6 Interactive Disguise Tabs** (`src/components/BossKeyOverlay.jsx`, keys `1`–`6`):
  - [x] **📊 1. Excel Sheet**, **💻 2. DevOps Terminal**, **📹 3. Zoom Standup** (+ *"🧊 Fake Tunnel Lag / Freeze Video"* toggle), **🤖 4. Enterprise AI Copilot (`SynergyGPT v5.4`)** (generates deadpan executive buzzword memos), **🔄 5. OS Update**, and **💀 6. Windows Blue Screen of Death (BSOD)** (`CRITICAL_SYNERGY_OVERFLOW_EXCEPTION`).

### ✅ Phase 20: Interactive Virtual "Dank Tamagotchi" Cyber-Pet & Card Jelly Physics (Completed)
- [x] **🐸 Virtual Dank Pet Companion** (`src/components/DankPetWidget.jsx`):
  - [x] Collapsible corner Cyber-Pet with 4 evolution forms (**🥚 Cyber Star-Egg** → **🐸 Happy Froglet** → **🦆 Neon Drip Duck** → **👑 Cosmic Legend**) and interactive **🌶️ Feed**, **🤡 Squish**, and **🕺 Dance** animations + speech bubbles.
- [x] **💥 Comic Action Pop Badges & Jelly Card Bounce** (`src/components/MemeCard.jsx`, `src/index.css`):
  - [x] Upvoting, downvoting, or reacting on any meme card triggers an elastic jelly bounce and pops a comic-book badge.

### ✅ Phase 21: Friendly Universal Mascot Logo, 100% User-Uploaded Memes (Zero Templates), Upload Date Tracking & Growth Audit (Completed)
- [x] **😊 Positive, Friendly & Super-Cool Brand Mascot Logo** (`public/logo-512.png`, `public/favicon-192.png`, `public/favicon-48.png`, `public/apple-touch-icon.png`, `public/favicon.svg`):
  - [x] Replaced the skull/jester logo with a joyful, beaming golden-yellow Cyber-Arcade Star Mascot wearing neon cyan/pink gaming headphones and a tilted golden star crown — welcoming and appealing to men, women, boys, and girls.
- [x] **📸 100% User-Uploaded Memes — Zero Default Template Memes** (`src/data/starterMemes.js`, `src/App.jsx`, `src/components/MemeStudioModal.jsx`):
  - [x] Removed all starter seed memes (`STARTER_MEMES = []`) and removed studio default template images (`STUDIO_TEMPLATES = []`) so every meme on the site is genuinely uploaded by users.
  - [x] Retained and enhanced all text, random viral meme captions (`🎲 Random Meme Text`), text color swatches, photo filters, and draggable stickers in `MemeStudioModal.jsx`, plus added live **📸 Camera / Selfie Capture** and persistent local storage (`tm_user_memes`) alongside Supabase sync.
- [x] **📅 Upload Date & Live New-Upload Activity Tracker** (`formatMemeUploadDate`, `MemeCard.jsx`, `MemeTheaterModal.jsx`, `SwipeDeck.jsx`, `BattleArena.jsx`, `LeaderboardModal.jsx`, `PlayerProfileModal.jsx`, `MemeEvolutionModal.jsx`):
  - [x] Displays the exact upload date & relative time (`📅 Uploaded DD Mon YYYY, HH:MM • Xm/h/d ago` + `🆕 NEW` badge for uploads `< 24h`) on every meme card and modal.
  - [x] Added the **📡 Live Community Upload Activity Tracker Bar** above the feed showing total user uploads, uploads in the last 24h, latest upload timestamp & creator, a `🆕 New Today` filter tab, and a `🔄 Refresh Uploads` button.
- [x] **🚀 User Acquisition & Retention Audit Upgrades**:
  - [x] **📲 1-Click Native Mobile Share (`navigator.share`)** on meme cards & theater view for instant sharing to WhatsApp, iMessage, Instagram, X, and Discord.
  - [x] **⭐ Save / Bookmark Favorites (`⭐ Saved` tab)** persisted in `localStorage` (`tm_saved_memes`) with `+15 XP` reward.
  - [x] **🚀 Community Upload Launchpad** when a category or new feed has 0 uploads, guiding visitors to upload the first meme in 1 click.

### ✅ Phase 22: TikTok/Instagram-Grade Viral Upgrades, Vertical Reels Mode, Security Hardening, Decluttered Viewport & Production Migration (Completed)
- [x] **🎬 Full-Screen Vertical "Meme Reels" Feed (`src/components/VerticalReelsView.jsx`, `src/index.css`)**:
  - [x] Implemented a TikTok / Instagram Reels style single-meme full-viewport snap-scroller (`scroll-snap-type: y mandatory`) with right-side thumb action dock (Upvote, Comments, 1-Tap Remix, Save, Share).
  - [x] Added explosive double-tap heart/fire upvote animation (`.tm-reels-heart-burst`), bottom overlay metadata, and smooth keyboard (`ArrowUp` / `ArrowDown` / `j` / `k`) and swipe gesture navigation.
- [x] **🧹 Viewport Decluttering & Content-First Hierarchy**:
  - [x] Collapsed the 16-pad soundboard, reality mutators, and stampede toys by default into a sleek 1-line interactive toggle (`MemeSoundboardBar.jsx`), instantly moving the meme feed up by ~250px so memes are immediately front-and-center on first load.
- [x] **🛡️ Database & API Security Hardening**:
  - [x] Created `supabase-schema.sql` providing production schemas for `profiles`, anti-abuse `votes` (1 vote per user constraint), `follows`, `notifications`, and a clamped `increment_meme_score` RPC function.
  - [x] Clamped client vote deltas to `[-5, 5]` in `App.jsx` to prevent RPC manipulation.
  - [x] Fixed `localStorage` serialization to strip enormous data URIs, preventing `QuotaExceededError`.
- [x] **🔍 Google Structured Data SEO Compliance**:
  - [x] Removed unverified hardcoded `aggregateRating` (4.9 / 2480 reviews) from `index.html` to eliminate Google Search Console deceptive review penalties.

### ✅ 4-Phase Growth, Fair Economy & Sub-Game Upgrade Plan (Completed)
- [x] **Phase 1: Simplified Main Interface & 1-Click Frictionless Quick-Upload Bar (`src/components/QuickUploadBar.jsx`, `src/components/NavbarHud.jsx`, `src/App.jsx`)**:
  - [x] Consolidated 6 stacked top banners into a clean, high-conversion layout: `NavbarHud` → Mode Switcher (`📱 Memes`, `🍬 Meme Crush`, `🎱 Vegas Pinball`, `🎬 Reels`, `⚔️ 1v1 Arena`, `⚡ Swipe`) → `QuickUploadBar`.
  - [x] Created `QuickUploadBar.jsx` directly above the feed so users can drop a file, paste from clipboard (`Ctrl+V`), or snap a camera photo, optionally add a title or Top/Bottom Impact text, and publish in **1 click** without opening a complex modal (or click `🎨 Full Studio` for advanced stickers & filters).
- [x] **Phase 2: Logical, Fair & Anti-Loophole Arcade Token Economy (`src/utils/tokenEconomy.js`, `src/components/RewardsModal.jsx`, `src/App.jsx`)**:
  - [x] Created `tokenEconomy.js` with `ARCADE_ECONOMY_RULES`, a **Hard Daily Maximum Collection Cap (`500 🪙 Tokens / day`)**, and **Per-Category Daily Sub-Caps** (`Uploads: 120/day`, `Arcade Sub-Games: 200/day`, `Feed Engagement: 100/day`, `Quests & Streaks: 80/day`) plus a **Per-Round Sub-Game Cap (`35 🪙 max/round`)**.
  - [x] Closed all infinite farming loopholes: per-meme action deduplication (`vote:<id>`, `react:<id>`, `comment:<id>`, `roast:<id>`, `bookmark:<id>`, `share:<id>`), 1-reaction-per-emoji-per-meme guard (`userReactionsMap`), removed token/XP farming from visual/audio toys (Soundboard pads, Reality FX, Stampedes, Bubble Wrap, Boss Key), and decoupled flat token rewards from the visual combo meter.
- [x] **Phase 3: "Meme Crush Saga" — Candy-Crush Style Match-3 Puzzle Sub-Game (`src/components/MemeCrushGame.jsx`)**:
  - [x] Built an interactive 8×8 Match-3 puzzle sub-game featuring 6 neon meme candies (`🐸 Pepe`, `🔥 Spicy`, `💎 Diamond`, `🦆 Quack`, `💀 Skull`, `🍕 Pizza`), click/drag swapping, **Match-4 Striped Row/Column Laser Bombs**, **Match-5 Rainbow Supernova Color Bombs**, cascading gravity combos with escalating chime synthesis (`sfx.playCandyMatch`, `sfx.playSpecialBomb`), Hint/Hammer/Shuffle boosters, viral challenge sharing (`/?mode=crush`), and fair capped token payouts.
- [x] **Phase 4: "Las Vegas Retro Pinball" Machine & Silly Sound Effects (`src/components/VegasPinballGame.jsx`, `src/utils/soundEngine.js`)**:
  - [x] Built a 60fps HTML5 Canvas Las Vegas Retro Pinball Machine with dual flippers (keyboard `←`/`→` or `A`/`D` + touch buttons), spring-loaded plunger (`Space` or Hold/Tap), 4 flashing Vegas Pop Bumpers (`🎰 777`, `🦆 Quack`, `🗿 Vine Boom`, `💎 VIP`), top `L-U-C-K` rollover multiplier lanes (`1x`–`5x`), center `1,500 PT` Vegas Jackpot Sinkhole, slingshot kickers, table nudge with 3-shake `TILT` protection, viral challenge sharing (`/?mode=pinball`), and fair capped token payouts.

### ✅ Phase 23: Pinball Multiball & Power-Up Overhaul, Turbo-Charged Meme Crush Saga, Main Site Sub-Game Showcase & "DO NOT PRESS" Chaos Button (Completed)
- [x] **🎱 Las Vegas Pinball 2.0 (`src/components/VegasPinballGame.jsx`)**:
  - [x] Widened flipper pivot spacing (`x=104` and `x=326`, `len=64`) leaving a genuine `~102px` tip-to-tip center drain gap so balls can actually drain unless saved by flipper timing, table nudge, or the Plasma Shield.
  - [x] Added 5 Collectible Playfield Power-Up Orbs & Pocket Boosters (**🎱 3-Ball Multiball Madness**, **🛡️ Plasma Drain Shield**, **🧲 Mega Magnetic Flippers**, **🔥 2X Vegas Fever Overdrive**, and **💣 Dank Bumper Nuker**), **🎯 `M-E-M-E` Drop Targets Bank**, **🌀 Left Whirlpool Spinner**, **36 Flashing Vegas Marquee Chaser Bulbs**, shockwave rings, and comet ball trails.
- [x] **🍬 Meme Crush Saga Turbo-Charged Edition (`src/components/MemeCrushGame.jsx`)**:
  - [x] Added official Candy Crush-style 3D Center Announcer Splashes (*SWEET!* → *TASTY!* → *DELICIOUS BRAINROT!* → *DIVINE GIGA-CRUSH!* → *UNHINGED SUPERNOVA!*), row/column **Neon Laser Beams**, per-tile floating score popups, flying candy shards, **💥 L/T-Shape 3×3 Wrapped Packet Bombs**, **Special + Special Combo Matrix** (`🌈+🌈` 64-Tile Board Wipe, `🌈+⚡` Hyper Laser Storm, `⚡+💥` 3×3 Mega Laser), **🔥 Meme Fever Meter** with instant loot drops, **🛸 UFO Bomb Dropper**, and the **🎆 Meme Crush Finale** move-conversion celebration + 3-Star Chests (up to `50 🪙 Tokens/round`).
- [x] **🕹️ Main Site Sub-Game Showcase Steer & Leaderboard Tab (`src/App.jsx`, `src/components/LeaderboardModal.jsx`)**:
  - [x] Added the Dual Arcade Cabinet Showcase Strip at the top of the main feed, an In-Feed Arcade Challenge Break Card, `🔥 TURBO` / `⚡ NEW` badges on mode buttons, and a **`🕹️ Sub-Game High Scores`** tab in the Hall of Fame Leaderboard.
- [x] **🚨 Replaced Pointless Frog Popup with the "DO NOT PRESS" Big Red Chaos Button (`src/components/DankPetWidget.jsx`)**:
  - [x] Removed the static frog squish popup and replaced it with a tactile **🚨 DO NOT PRESS** button that triggers interactive screen-wide mini-events (**🪅 Whack the Golden Llama Piñata**, **🗿 Giga-Moai Boss Fight**, **🚔 Dank Police Vibe Audit**, and **🎰 Vegas Jackpot Shower**) with 1-click portals into Meme Crush and Vegas Pinball.

### ✅ Phase 24: Retro Neon `THE MEMES.net` Las Vegas 777 Slot Machine Cabinet, iPhone Candy Crush Glossy Jelly & Crystal Frost Overhaul, and Meme-First iPhone Layout (Completed)
- [x] **🎰 Retro Neon `THE MEMES.net` Las Vegas 777 Slot Machine (`src/components/VegasSlotMachine.jsx`, `src/components/RewardsModal.jsx`, `src/App.jsx`, `src/index.css`)**:
  - [x] Built an authentic Las Vegas neon slot machine cabinet (`VegasSlotMachine.jsx`) available both as a full-screen side game (`/?mode=slots`) and inside the Arcade Vault (`RewardsModal.jsx`).
  - [x] Features an **Arched Las Vegas Marquee Topper** with 18 chasing neon bulbs, live **Progressive 777 LED Jackpot Ticker**, **Illuminated Paytable Glass**, **3 Curved Cylindrical Spinning Drums** showing top/center/bottom symbols, sequential reel stopping (`560ms` → `1050ms` → `1620ms` with Reel 3 jackpot drumroll suspense), per-reel **`🔒 HOLD`** and **`⏫ NUDGE`** deck buttons, a **Physical 3D Chrome & Neon Side Pull-Lever** that animates pulling down, and a **Chrome Coin Hopper Tray** with flying coin fountain particles.
- [x] **🍬 iPhone Candy Crush Graphical Overhaul (`src/components/MemeCrushGame.jsx`, `src/utils/soundEngine.js`, `src/index.css`)**:
  - [x] Upgraded all 6 candy types to **3D Glossy Jelly Candies** with specular highlight bubbles (`.tm-crush-candy-shine`) and colored bevels.
  - [x] Added **Glowing Frosted Crystal Jelly (`jellyGrid`)** tiles underneath the board that shatter with crystalline audio (`sfx.playJellyShatter()`) and ice shards (`+120 pts` per jelly + `+1,500 pts` full-clear bonus).
  - [x] Added **2×2 Square Match → `🚀` Seeking Meme Rocket (`seeking-rocket`)** (like Candy Crush Jelly Fish) that automatically seeks out and blasts Crystal Jelly cells.
  - [x] Added **Smooth Gravity Drop-In & Elastic Jelly Bounce (`dropDist`)**, **Spring-Back Invalid Swap Animation (`invalidSwapPair`)**, **SVG Rainbow Lightning Beams (`activeLightnings`)** on Color Bomb/Rocket zaps, **Expanding Neon Shockwave Rings (`shockwaves`)**, a **3-Star Candy Progress Tube** with milestone star markers, a **Cheering Meme Mascot**, and **Auto Idle Hint Shimmer**.
- [x] **📱 Memes First on iPhone & Desktop (Games Positioned as Side Entertainment) (`src/App.jsx`, `src/components/MobileArcadeDock.jsx`, `src/index.css`)**:
  - [x] Reordered `viewMode === 'feed'` so `QuickUploadBar` and `<main className="tm-grid">` (**THE MEMES**) render immediately first at the top of the page, moving `MemeSoundboardBar` and the 3-cabinet **Side Entertainment Lounge** (`🎰 Vegas 777 Slots`, `🍬 Meme Crush Saga`, `🎱 Las Vegas Pinball`) below the meme feed.
  - [x] Updated `MobileArcadeDock.jsx` on iPhone so primary thumb tabs focus on Memes (`📱 Memes`, `🎬 Reels`, `📸 +Upload`, `🕹️ Games` pop-up drawer, `🏆 Ranks`).
- [x] **🚀 Usability, Engagement & Findability Upgrades (`src/components/MemeCard.jsx`, `src/components/SeoDiscoveryFooter.jsx`, `src/utils/seoEngine.js`, `public/sitemap.xml`)**:
  - [x] Added **1-Tap Quick-Reaction Viral Comment Chips** (`QUICK_REACTION_COMMENTS`), a **1-Tap `⬇` Download Meme PNG** button on every card, a **`🎲 Random Meme`** button & **`🆕 New (24h)`** tab in feed controls, and a **Viral Share & Add-to-iPhone-Home-Screen** banner in the footer.

### ✅ Phase 25: Classic Vegas One-Arm Bandit, Fixed Non-Scrolling iPad/iPhone Game Viewport, Hardened Meme-First Gambling Economy, MEMEDAQ '86 Stock Market Simulator, Older-iPad Turbo Engine, 10-Level Meme Crush & 5-Table Cyber-Pinball (Completed)
- [x] **🎰 Authentic Las Vegas One-Arm Bandit Graphics (`src/components/VegasSlotMachine.jsx`, `src/index.css`)**:
  - [x] Replaced mismatched emojis/classes with custom vector Las Vegas slot artwork (`SlotSymbolSvg`: **Flaming Red 777**, **Neon Diamond**, **Triple Gold BAR**, **Golden Liberty Bell**, **Glossy Twin Cherries**, **Watermelon**, **Lemon**) spinning inside **3 curved ivory mechanical drums** with top/center/bottom symbols, red laser center payline, chasing marquee bulbs, VFD LED readout, and a **right-side 3D chrome pull-lever + crimson ball knob** that stays attached on the right on desktop, iPad, and iPhone.
- [x] **📱 Fixed Non-Scrolling `100dvh` Game Viewport for iPhone & iPad (`src/App.jsx`, `src/index.css`)**:
  - [x] When `viewMode` is `'slots' | 'stocks' | 'crush' | 'pinball'` (`isFixedArcadeGame`), `App.jsx` locks `html`/`body` overflow, hides scrolling feed chrome, and renders a sleek `46px` `.tm-fixed-arcade-bar` (`← Memes`, `🎰 Slots`, `📈 Stocks`, `🍬 Crush`, `🎱 Pinball`, `🪙` Wallet, `⚡` Turbo FPS, `🔊` Mute) above a fixed `calc(100dvh - 46px)` cabinet stage with `touch-action: none` on game boards/canvases so players never fight page scrolling on iPad or iPhone.
- [x] **🪅 Skill-Based Dodging Piñata & Full Anti-Exploit Token Economy Audit (`src/components/DankPetWidget.jsx`, `src/utils/tokenEconomy.js`, `src/App.jsx`, `src/components/RewardsModal.jsx`)**:
  - [x] Fixed `DankPetWidget.jsx` so tokens are **never** awarded on open: players must physically click a **moving/dodging Piñata 8 times within a 7.2s escape timer** (missing jumps the piñata away!) to win `+5 🪙` strictly `1x/day` (`daily:pinata:<YYYY-MM-DD>`).
  - [x] Audited every token path so **Memes are the #1 token generator** (`25 🪙` starter balance, `+45 🪙` upload + `+30 🪙` 1-time First-Upload Pioneer Bonus = `+75 🪙` first meme, `+60 🪙` Daily Bounty, `+35 🪙` Remix; `upload` cap `180/day`), visits/engagement give modest capped tokens (`+10 🪙` daily streak, `+5 🪙` daily quest, `+2 🪙` unique vote, `+3 🪙` meaningful `>=6 char` comment, `+1 🪙` unique reaction; `0 🪙` for saves/shares/roasts/manual goblins/free practice rounds; `engagement` cap `25/day`, `quests` cap `25/day`), and **tokens are wagered/invested in the arcade games** via atomic `tokensRef` + `validateStakedGamePayout`.
- [x] **📈 New Game: MEMEDAQ '86 Meme Stock Market Simulator (`src/components/MemeStockMarketGame.jsx`, `/?mode=stocks`)**:
  - [x] Buy and sell shares in 8 hilarious 80s-neon meme companies (`$DOGE`, `$CHAD`, `$PEPE`, `$CATS`, `$WIFI`, `$PIZA`, `$AI`, `$MOON`) using real `🪙` tokens, featuring live `1.85s` price ticks (auto-paused when `document.hidden`), breaking news market shocks, live neon bull/bear SVG CRT area chart with average cost basis line, `1%` ceil/floor broker spread (anti-arbitrage), persisted portfolio (`tm_stock_portfolio_v1`), Peak Net Worth leaderboard (`tm_stocks_highscore`), and a **🔮 Gordon Gecko-Frog Insider Rumor Hotline**.
- [x] **⚡ Older iPad Performance & Efficiency Overhaul (`src/App.jsx`, `src/components/ParticleOverlay.jsx`, `src/components/MemeCard.jsx`, `src/index.css`)**:
  - [x] Eliminated the 1-second root `App` re-render interval, isolated floating particles into `<ParticleOverlay ref={particleOverlayRef} />`, wrapped `MemeCard` in `React.memo` with `decoding="async"`, removed all expensive `ctx.shadowBlur` calls in Pinball, replaced full-screen `filter: blur(45px)` with a zero-blur radial gradient, added `content-visibility: auto` on `.tm-card`, and auto-enabled **⚡ Turbo FPS Mode** (`litePerfMode`) on touch/low-core devices to disable expensive Mobile Safari `backdrop-filter` and continuous `background-position` repaints.
- [x] **🍬 10 Distinct Levels in Meme Crush & 🎱 5 Distinct Tables in Cyber-Pinball**:
  - [x] **Meme Crush (`src/components/MemeCrushGame.jsx`)**: 10 distinct 80s Neon levels with unique carved `void` board geometries and varied objectives (**Crystal Jelly**, **Double Frost**, **Candy Orders**, **`📼` 80s Mixtape Cassette Drop** to exit row, and **`🔒` Cyber-Ice Laser Locks**), with `10 🪙` Prize Run (`12/18/26 🪙` payout on clear) or `0 🪙` Free Practice.
  - [x] **Cyber-Pinball (`src/components/VegasPinballGame.jsx`)**: 5 distinct 80s Neon tables (*Vegas Strip '85*, *Outrun Turbo Highway* with boost pads & patrolling DeLorean, *Invader Cyber-Grid* with alien formation & wormhole portals, *Miami Vice Lagoon* with Shark Pit & dual spinners, and *Cosmic Reactor Boss* with central gravity well & moving shield), with `10 🪙` Coin-Op Prize Run (`8/15/22/32 🪙` score tiers) or `0 🪙` Free Practice.

### ✅ Phase 26: Video & Animated GIF Memes, Meme Forge 3.0 & Community Formats Integration (Completed)
- [x] **🎬 Real Video & Animated GIF Memes Pipeline (`src/utils/mediaPipeline.js`, `src/utils/publishMeme.js`, `src/components/MemeMedia.jsx`, `src/components/MemeOverlay.jsx`)**:
  - [x] Direct upload of MP4, WebM, MOV (<=50MB, <=60s) and animated GIFs (<=15MB) without destructive canvas rasterization, retaining fluid animation and audio tracks.
  - [x] Automatic poster generation (`makePoster`), client WebP compression with JPEG fallback for stills, and shared `IntersectionObserver` video autoplay (`src/utils/videoAutoplay.js`) with 2-video concurrency cap and `litePerfMode` poster tap-to-play.
  - [x] Non-destructive caption overlay system (`<MemeOverlay />`) rendering normalized HTML layers over `<video>` and `<img>` tags, plus optional client-side Canvas `captureStream` burn-in for video downloads.
- [x] **🎨 Meme Forge 3.0 Studio (`src/components/forge/`, `src/hooks/useMemeEditor.js`)**:
  - [x] Unlimited draggable/scalable/rotatable text layers with word-wrap auto-fit and full typography controls (Anton, Bebas Neue, Comic Neue, Permanent Marker, Press Start 2P, Inter).
  - [x] Multi-panel layout templates (Classic, Twitter Topbar, 2-Panel Compare, 2x2 Comic, VS, POV), crop/pan/zoom tools, sticker drawer with custom PNG upload, and 60-step undo/redo.
  - [x] Debounced IndexedDB draft autosave (`draftStore.js`) with automatic restore prompt on launch.
  - [x] 1-Click **"✏️ Caption This"** remix engine leveraging `base_image_url` for viral community template spawning.
- [x] **🕹️ Extras x Memes Community Integration (`src/utils/memeFeedBridge.js`)**:
  - [x] Real feed memes integrated across Slots, MEMEDAQ price ticks & breaking news, Meme Crush level art, Dank Pet reactions, Boss Key easter eggs, and free daily Pinball/Arena perks for meme creators.

### ✅ Phase 27: Cyber-Security Hardening, Automatic Device Optimizer (iPhone / iPhone Duo / iPad / Android / PC), iOS K.I.T.T. & HAL 9000 Voice Fix, Non-Intrusive Phone Caller, iPhone Meme Forge Fix, Enlarged Game Stages & Neon Coin Dozer '86 (Completed)
- [x] **🛡️ Cyber-Security & Threat Hardening (`src/utils/securityGuard.js`, `vercel.json`, `index.html`, `src/utils/mediaPipeline.js`, `src/utils/publishMeme.js`)**:
  - [x] Added production security headers in `vercel.json` (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security`) and CSP/Referrer meta tags in `index.html`.
  - [x] Built `src/utils/securityGuard.js` with `sanitizeMediaUrl` (blocks `javascript:`, `vbscript:`, `data:text/html`, and `data:image/svg+xml` XSS vectors), `sanitizeUserText` (strips Bidi-spoofing and script tags), `sanitizeOverlayPayload`, `safeJsonParse` (prototype pollution filter), and `verifySafeMediaFile` (inspects the first 256 bytes of uploaded files to block SVG/HTML/script polyglots).
- [x] **📲 Automatic Device Detection & Adaptive Experience Engine (`src/utils/deviceProfile.js`, `src/App.jsx`, `src/index.css`)**:
  - [x] Automatically detects `iphone`, `iphone-duo` (dual-screen/foldable iPhone Duo, Surface Duo, Galaxy Z Fold, Pixel Fold via viewport segments, foldable UA tokens, and unfolded touch book aspect ratios), `ipad-mini`, `ipad`, `android-phone`, `android-tablet`, and `pc`.
  - [x] Synchronizes `data-device`, `data-form-factor`, `data-os`, and `data-orientation` on `<html>` + `.tm-app`, and displays an interactive device optimization badge in the control bar.
- [x] **🗣️ K.I.T.T. & HAL 9000 Voice Fixed on iPhone (`src/utils/soundEngine.js`, `src/components/ArcadeAiAssistant.jsx`)**:
  - [x] Unlocked iOS Safari `window.speechSynthesis` on the first touch gesture inside `unlockIosAudio()`.
  - [x] Eliminated the iOS WebKit synchronous `speechSynthesis.cancel()` + `speak()` race condition, added `utterRef` retention against WebKit garbage collection, prioritized `localService` English voices, and added a procedural WebAudio **Formant Vocal Modulator (`sfx.playAiVocalFormants`)** so K.I.T.T. and HAL 9000 always produce audible sci-fi vocal synthesis even when the iPhone hardware mute switch is ON.
- [x] **☎️ Phone Caller (`1-800-MEME`) & AI FAB Game Control Interference Fixed (`src/components/DankPetWidget.jsx`, `src/components/ArcadeAiAssistant.jsx`, `src/App.jsx`)**:
  - [x] Hidden the floating `.tm-ai-copilot-fab` and `.tm-donotpress-dock` on all games and interactive modes (`viewMode !== 'feed'`), defaulted the chaos dock to minimized on mobile/tablet (`<= 1024px`), and added a dedicated `☎️` Payphone trigger directly in `.tm-fixed-arcade-bar` and the main control bar.
- [x] **🎨 Meme Forge 3.0 iPhone Sizing & Usability Fix (`src/components/forge/ForgeStage.jsx`, `src/hooks/useBoxSize.js`, `src/index.css`)**:
  - [x] Fixed the Retina `ResizeObserver` canvas expansion loop in `ForgeStage.jsx` by locking `<canvas>`, `<video>`, and `<img>` to `position: absolute; inset: 0; width: 100%; height: 100%` and adding full `.tm-forge*` responsive mobile styles (`33dvh` top stage + scrollable bottom tools + `16px` no-zoom inputs on iOS).
- [x] **🪙 New Arcade Game — Neon Coin Dozer '86 (`src/components/VegasCoinPusherGame.jsx`, `/?mode=pusher`, `/?mode=dozer`, `/?mode=coindozer`)**:
  - [x] Prominently linked as the #1 highlighted game in `NavbarHud.jsx` (`🪙 Coin Dozer`), `MobileArcadeDock.jsx` (dedicated `🪙 Dozer` bottom dock button + top banner in the `🕹️ Games` drawer), `RewardsModal.jsx`, `SeoDiscoveryFooter.jsx`, and `App.jsx` (supporting `?mode=pusher`, `?mode=dozer`, `?mode=coindozer`).
  - [x] 60fps HTML5 Canvas 3D-perspective arcade Penny-Falls / Coin Pusher machine with reciprocating **Chrome Pusher Bar**, moving **🎯 `+2🪙 & SPIN` Skill Gate** that triggers the **Backbox 3-Reel Mini-Slot (`🎰 SKILL GATE SLOT`)** for **10-Coin Avalanches**, **Twin Neon Diamonds**, **Mega Dozer Super-Strokes**, and **Laser Side-Walls**.
  - [x] Features **Cliffhanger Edge-Teetering** wobble & green halo physics at the front payoff lip (`FRONT_LIP_Y`), **5 Collectible 80s Prizes** (`💎 Diamond`, `🎁 Mystery Box`, `🕹️ Gold Joystick`, `🏆 '86 Trophy`, `👑 Cyber Crown`) that permanently increase the session score multiplier (`1.00×` up to `2.25×`), **`🔥 AUTO-DROP: ON/OFF`** stream toggle, **⚡ 3-Coin Barrage**, **💥 Cabinet Nudge** (with 3-strike TILT lock), **🌈 Bulldozer Fever**, and a gleaming pile of won coins accumulating inside the bottom collection tray.
- [x] **🎡 Enlarged Roulette Wheel & Pinball Stages + 📈 Stock Market Candles Visibility Fix (`src/components/VegasRouletteGame.jsx`, `src/components/MemeStockMarketGame.jsx`, `src/index.css`)**:
  - [x] Upgraded Roulette wheel canvas to `480x480` HD resolution (`min(430px, 56dvh)` on desktop/tablet) and expanded the Pinball canvas to `max-height: calc(100dvh - 155px)` so the main game elements fill most of the screen.
  - [x] Defaulted `MEMEDAQ '86` to `🕯️ Candles` mode (with underlying trend wave + clamped OHLC wicks/bodies) and enforced `min-height: 155px` on `.tm-stocks-svg-wrap` / `.tm-stocks-svg` with scrollable `.tm-stocks-desk` so the chart and candlesticks are always 100% visible.
- [x] **🪙 Phase 27.2: Coin Dozer Anti-Cheat Mode Reset & Authentic Penny-Falls Economy, 🃏 21's iPhone Dealer Card Fix, 🎱 Ultra-Maximized Pinball Playfield, 🗣️ Crystal-Clear K.I.T.T./HAL Speech & 🪿 `HONK.EXE` Surprise (`src/components/VegasCoinPusherGame.jsx`, `src/components/VegasBlackjackGame.jsx`, `src/components/VegasPinballGame.jsx`, `src/components/ArcadeAiAssistant.jsx`, `src/components/UnhandledGooseSurprise.jsx`, `src/index.css`)**:
  - [x] **Coin Dozer Anti-Cheat & Economy**: Switching between `🆓 Free Play` and `🪙 Token Mode` (`switchPlayMode`) completely resets the coin bed, falling tray coins, fever, shields, mini-slot, and pending timeouts; tags coins with `modeTag: 'free' | 'token'`; removes free auto-spawning; fixes circle collision separation (`-ny`/`+ny`) and side-gutter losses (~35–42% lost unless Laser Shields are active); mixes `🥈 Silver Score Medals (62%, 0 🪙, +160 PTS)` with `🪙 Gold Token Coins (38%, 1 🪙)`; requires 3 Skill Gate hits (`🎯 GATE 0/3`) to spin the Mini-Slot; grounds prizes to `2–5 🪙`; and enforces a session house-edge cap.
  - [x] **21's iPhone Dealer Card Visibility**: Moved the Cyber-Visor hint (`visorTip`) out of `.tm-bj-dealer-bar` into `.tm-bj-visor-bottom-pill` inside `.tm-bj-controls` at the bottom and compacted the top dealer header to a single line so the Dealer's cards are never covered on iPhone.
  - [x] **Ultra-Maximized Pinball Screen Real Estate**: Consolidated the Pinball top header, table selector strip, and 7-box HUD scoreboard into a single `34px` `.tm-pin2-slim-topbar`, moved desktop flipper/plunger/nudge buttons into the right side wing, removed the bottom banner, and expanded `.tm-pin2-canvas` to `max-height: calc(100dvh - 94px)`.
  - [x] **Crystal-Clear K.I.T.T. & HAL 9000 Speech**: Removed the simultaneous `sfx.playAiVocalFormants` synthesizer buzzing over `window.speechSynthesis.speak()`, shortened the pre-speech cue to `85ms` with a `95ms` delay before speaking, excluded distorted novelty voices (`Fred`, `Albert`, `Zarvox`, `Ralph`), and set natural pitch (`0.94` HAL / `1.0` K.I.T.T.) with sentence chunking.
  - [x] **🪿 `WTF?!` Experimental Surprise (`UnhandledGooseSurprise.jsx`)**: Accessible via the glowing **`🪿 WTF?!`** button in `NavbarHud.jsx`, `.tm-fixed-arcade-bar`, and `.tm-controls` (or `?mode=goose` / `?mode=wtf`), featuring 4 interactive comedy modes: **🪿 `HONK.EXE` Kleptomaniac Cyber-Goose Heist**, **📺 `3:00 AM Interdimensional Shopping Channel` ("Billy Memes Live!")**, **🕵️‍♂️ `Ministry of Meme Revenue — Unlicensed Chuckle Tax Audit`**, and **🔮 `1986 Casio Quantum Mind-Reader`**.

### ✅ Phase 28: "Fun First, Findable" (P1–P5 Tasks 28.1–28.17 Completed)
- [x] **28.1 Seed Content (`src/data/starterMemes.js`, `public/seed/seed-*.webp`, `src/App.jsx`)**:
  - [x] Reversed the empty cold-start (`STARTER_MEMES = []` → **`64` original seed memes**: `16` `#DANK`, `16` `#TECH`, `16` `#GAMING`, `16` `#RELATABLE`), all stored locally in `public/seed/` as lightweight lossless WebP files (`3.0 KB – 9.8 KB` each, well under the `≤ 80 KB` limit) requiring zero external network requests and zero CSP changes.
  - [x] Labelled all seed memes with creator `@TheMemesHQ` (`is_seed: true`), initialized `memes` state immediately on mount (`isLoadingFeed = false`) so the Feed, Reels, Swipe Deck, and 1v1 Battle Arena all populate on Frame 1 even offline, and added `isSeedMeme()` priority sorting in `filteredMemes` so real community uploads always rank above seed memes once they exist.
- [x] **28.2 Restore Studio Templates (`src/data/starterMemes.js`, `public/seed/tpl-*.webp`, `src/components/forge/MemeForge.jsx`, `src/components/forge/ForgeToolPanel.jsx`, `src/index.css`)**:
  - [x] Populated `STUDIO_TEMPLATES` (`0` → **`20` original blank meme formats**: 2-Panel Reject/Approve, 4-Tier Expanding Galaxy Brain, Two Red Buttons Panic Sweat, Distracted By Shiny New Thing, This Is Fine, Change My Mind Booth, Buff Champion vs Smol Doge, Stonks Up, Not Stonks Crash, Yelling vs Unbothered Cat, Gigachad Verdict, 4-Step Clown Makeup, Astronaut Always Has Been, Brain At 3 AM, Surprised Shock Reaction, Trade Offer, IQ Bell Curve, Highway Exit Drift, Twin Pointing Spider-Clones, Last Place Champagne Celebration).
  - [x] Surfaced the 20-format **Studio Template Grid** immediately when opening the Forge (`.tm-forge-starter-hub` + `🎨 Templates` tab in `ForgeToolPanel.jsx`), pre-loaded clean `base_image_url` blank templates and editable captions on **"✏️ Caption This"** and Daily Bounties, and added a **`🎲 Random Caption`** button in the Text tab so users can produce and publish a funny meme in under 20 seconds with no file upload required.
- [x] **28.3 Declutter the First Screen & Unified `🕹️ Extras` Drawer (`src/components/ExtrasDrawerModal.jsx`, `src/components/NavbarHud.jsx`, `src/components/MobileArcadeDock.jsx`, `src/App.jsx`, `src/index.css`)**:
  - [x] Created `ExtrasDrawerModal.jsx` to consolidate `🪿 WTF?!`, `☎️ 1-800-MEME Payphone`, Boss Key (`Shift+B`), CRT Scanlines toggle, 120FPS Turbo toggle, Device Optimizer badge, Cyber-Security status, and the 16-pad `MemeSoundboardBar` into one unified `🕹️ Extras` drawer.
  - [x] Reduced desktop `NavbarHud.jsx` from `20` interactive buttons to `6` primary controls (`THE MEMES.net` logo, `Memes / Reels / Games ▾`, `➕ Create`, `🪙 Wallet`, `🕹️ Extras`, `👤 Profile`) and reduced `.tm-controls` from `26` controls to `8` filter controls (`⚡ Latest`, `🔥 Top`, 5 category pills, and search input).
  - [x] Streamlined `MobileArcadeDock.jsx` to 5 thumb controls (`📱 Memes`, `🎬 Reels`, `➕ +Create`, `🕹️ Games`, `👤 Profile`) and hid top `NavbarHud`/`.tm-controls` on mobile Reels so a `390×844` viewport shows **1 meme + ≤ 6 controls**.
- [x] **28.4 Progressive Reveal, No Ambush & Strict User-Gesture Audio Gate (`src/utils/soundEngine.js`, `src/components/DankPetWidget.jsx`, `src/components/ArcadeAiAssistant.jsx`, `src/App.jsx`)**:
  - [x] Hid the pet/chaos dock, AI assistant FAB, and roaming Loot Goblin on first visit; unlocked the pet/chaos dock after `3` votes (`tm_votes_cast_count` / `tm_pet_unlocked`) and unlocked the games toast + AI assistant FAB after the first meme created (`tm_first_meme_created`).
  - [x] Added `sfx.hasUserGesture` gate in `SoundEngine` (`soundEngine.js`), `DankPetWidget.jsx`, and `ArcadeAiAssistant.jsx` so audio, speech synthesis, and haptics never fire before a user gesture.
- [x] **28.5 Mobile Defaults to Reels Loop with 1-Tap "Remix this" (`src/App.jsx`, `src/components/VerticalReelsView.jsx`, `src/index.css`)**:
  - [x] Defaulted `viewMode` to `'reels'` on touch devices (`isTouchDeviceDefault()`) when no explicit mode/filter query param is present while keeping `'feed'` on desktop, and added a high-contrast 1-tap **`✏️ Remix this`** CTA pill on every Reel slide.
- [x] **28.6 One-Tap Viral Share (`/?m=<id>` & `/m/<id>`) + "Make your own →" CTA (`src/App.jsx`, `src/components/MemeTheaterModal.jsx`, `vercel.json`, `src/index.css`)**:
  - [x] Updated `handleShareMeme` to copy/share `${origin}/?m=<id>`, added `extractSharedMemeIdFromLocation()` supporting both `/?m=<id>` and `/m/<id>` (with `/m/:id` SPA rewrite in `vercel.json`), and added a recipient banner + **`Make your own →`** CTA in `MemeTheaterModal.jsx`.
- [x] **28.7 Code-Split Everything That Isn't the Feed & Per-Component CSS Extraction (`src/App.jsx`, `src/index.css`, `src/components/*.css`, `src/components/MemeMedia.jsx`, `src/components/MemeCard.jsx`, `src/components/VerticalReelsView.jsx`, `index.html`)**:
  - [x] Converted all 7 arcade games (`VegasCoinPusherGame`, `VegasPinballGame`, `VegasBlackjackGame`, `VegasRouletteGame`, `VegasSlotMachine`, `MemeStockMarketGame`, `MemeCrushGame`), `SwipeDeck`, `BattleArena`, `MemeForge`, and all 12 modals/overlays/widgets (`MemeTheaterModal`, `MemeEvolutionModal`, `AuthModal`, `LeaderboardModal`, `PlayerProfileModal`, `RewardsModal`, `AiRoastModal`, `ExtrasDrawerModal`, `BossKeyOverlay`, `DankPetWidget`, `ArcadeAiAssistant`, `UnhandledGooseSurprise`) to `React.lazy()` + `<Suspense>` with `MemeSkeletonGrid` and `MODAL_SKELETON_FALLBACK` skeleton placeholders and conditional mounting.
  - [x] Extracted `20` per-component CSS files (`MemeCrushGame.css`, `VegasPinballGame.css`, `VegasSlotMachine.css`, `MemeStockMarketGame.css`, `VegasBlackjackGame.css`, `VegasRouletteGame.css`, `VegasCoinPusherGame.css`, `ArcadeAiAssistant.css`, `forge/MemeForge.css`, `UnhandledGooseSurprise.css`, `DankPetWidget.css`, `RewardsModal.css`, `AuthModal.css`, `PlayerProfileModal.css`, `AiRoastModal.css`, `MemeTheaterModal.css`, `BossKeyOverlay.css`, `SwipeDeck.css`, `LeaderboardModal.css`, `BattleArena.css`) out of `src/index.css`, reducing initial CSS from `215.66 kB` (`39.79 kB` gzipped) to **`79.25 kB` (`16.09 kB` gzipped)** and reducing total initial JS from `1,001.49 kB` (`296.31 kB` gzipped; `index.js` `568.32 kB` / `172.90 kB` gzipped) to **`661.73 kB` (`191.49 kB` gzipped; `index.js` `228.56 kB` / `68.08 kB` gzipped)**.
  - [x] Added LCP image preloading (`index.html`), eager/high-priority loading + explicit dimensions on above-the-fold cards (`MemeMedia.jsx`, `MemeCard.jsx`), and Reels slide windowing (`VerticalReelsView.jsx`).
- [x] **28.8 Real Crawlable Landing Pages & Static HTML Prerendering (`src/data/seoRoutes.js`, `scripts/prerender-seo.mjs`, `package.json`, `vercel.json`, `src/App.jsx`, `src/components/BossKeyOverlay.jsx`, `src/components/BossKeyOverlay.css`, `src/components/ExtrasDrawerModal.jsx`, `src/components/SeoDiscoveryFooter.jsx`)**:
  - [x] Created a shared 17-route SEO & routing registry (`src/data/seoRoutes.js`) and wired bi-directional path routing + `popstate` support in `App.jsx` for `/`, `/meme-generator`, `/meme-soundboard`, `/games/coin-pusher`, `/games/pinball`, `/games/slots`, `/games/blackjack`, `/games/roulette`, `/games/meme-crush`, `/games/meme-stock-market`, `/fake-windows-update-screen`, `/fake-blue-screen-prank`, `/fake-excel-boss-screen`, `/memes/dank`, `/memes/programming`, `/memes/gaming`, and `/memes/relatable` (skipping the first-visit coin intro on direct landing pages and adding an `F11 Fullscreen` / stealth toggle + dismissible prank tip banner in `BossKeyOverlay.jsx` plus top soundboard focus in `ExtrasDrawerModal.jsx`).
  - [x] Added `scripts/prerender-seo.mjs` to `npm run build` to emit `dist/<route>/index.html` for every route with unique `<title>`, meta description, self-referencing `<link rel="canonical">`, `<h1>`, `150–175` words of intro copy inside `#root`, all `16` `<img alt="…">` + captions per `/memes/*` category page, and `20` template previews on `/meme-generator`.
  - [x] Updated `vercel.json` with `"cleanUrls": true`, `"trailingSlash": false`, SPA catch-all/permalink rewrites, and `17` HTTP `301` redirects from legacy `?mode=` / `?category=` query URLs.
- [x] **28.9 Sitemap, Social Card (`og-card.png`) & Head Fixes (`public/sitemap.xml`, `public/og-card.png`, `src/utils/seoEngine.js`, `index.html`, `src/components/SeoDiscoveryFooter.jsx`)**:
  - [x] Regenerated `public/sitemap.xml` (and `dist/sitemap.xml`) with only the `17` canonical path URLs + `<lastmod>`, updated `seoEngine.js` to sync `<link rel="canonical">` and `og:url` on navigation, replaced the `512×512` `logo-512.png` social image with a `1200×630` card (`public/og-card.png`), dropped `<meta name="keywords">` and `#1` claims, and converted footer links into crawlable `<a href="/...">` links.
- [x] **28.10 Vercel Web Analytics & Custom Event Telemetry (`@vercel/analytics`, `src/main.jsx`, `src/utils/analytics.js`, `src/App.jsx`, `src/components/VerticalReelsView.jsx`, `src/components/SeoDiscoveryFooter.jsx`, `index.html`, `vercel.json`)**:
  - [x] Installed `@vercel/analytics`, mounted `<Analytics />` in `src/main.jsx`, updated CSP headers in both `index.html` and `vercel.json` for `https://va.vercel-scripts.com` and `https://vitals.vercel-insights.com`, and tracked `6` custom events (`meme_viewed`, `meme_upvote`, `remix_opened`, `meme_published`, `share_clicked`, `game_started`).
- [x] **28.11 🎵 THE MEMES FM: Procedural Synthwave Radio (`src/utils/radioBus.js`, `src/utils/musicEngine.js`, `src/hooks/useRadio.js`, `src/components/MemesRadio.jsx`, `src/components/MemesRadio.css`, `src/components/NavbarHud.jsx`, `src/components/ExtrasDrawerModal.jsx`, `src/components/ArcadeAiAssistant.jsx`, `src/App.jsx`)**:
  - [x] Built a zero-file, zero-CSP procedural Web Audio step-sequencer (`musicEngine.js`, lazy-loaded via `radioBus.js` only when turned ON) sharing `sfx.ctx` with 4 stations (`📼 Synthwave Drive`, `☕ Lo-fi Meme Beats`, `👾 8-Bit Chiptune`, `🛗 Vaporwave Elevator`) and 16 seeded tracks.
  - [x] Persisted on/off, station, and volume in `localStorage` (`tm_radio`, OFF by default), auto-paused on `document.hidden`, and ducked gain to `20%` whenever an unmuted `<video>` meme plays or K.I.T.T./HAL 9000 speech synthesis is active.
  - [x] Added reactive music cues (drum fills on combo up, filter riser at `3x+`, full bass drop at `5x`, key modulation + celebratory stinger on meme publish, automatic Chiptune/Synthwave game station overrides, and automatic `🛗 Vaporwave Elevator` hold music while Boss Key is active) plus `--beat` CSS custom property kick-drum pulses on `.tm-synthwave-glow`, `.tm-logo-badge`, and active `.tm-reels-slide` with zero React re-renders (respecting `prefers-reduced-motion` and `.tm-lite-perf`).
  - [x] Placed a compact `📼` toggle button in `NavbarHud.jsx` and `.tm-fixed-arcade-bar`, and mounted the full spinning-reel cassette deck (`MemesRadio`) inside `ExtrasDrawerModal.jsx`.
- [x] **28.12 "Insert Coin" First-Visit CRT Boot Intro (`src/components/InsertCoinIntro.jsx`, `src/components/InsertCoinIntro.css`, `src/App.jsx`)**:
  - [x] Built a lazy-loaded, one-time skippable CRT power-on boot overlay (`tm_intro_seen`) featuring `INSERT COIN` prompt, tap-anywhere user-gesture iOS/Android audio unlock + coin-insert chime, optional `📼 Fade in THE MEMES FM` checkbox, and silent `Skip →` / `Escape` dismissal.
- [x] **28.13 Live Publish Celebration, Creator Impact Stats & Real Notifications (`src/components/MemeLiveCelebrationModal.jsx`, `src/components/MemeLiveCelebrationModal.css`, `src/utils/notifications.js`, `src/components/PlayerProfileModal.jsx`, `src/components/NavbarHud.jsx`, `src/components/MobileArcadeDock.jsx`, `src/utils/soundEngine.js`, `src/App.jsx`)**:
  - [x] Added lazy-loaded full-screen `"🚀 YOUR MEME IS LIVE!"` celebration modal on publish with reduced-motion-safe confetti, celebratory `playPublishStinger()`, native Web Share / copy permalink, and open-in-theater CTA.
  - [x] Wired real creator notifications to `public.notifications` (inserts + Supabase Realtime `INSERT` subscription) with unread HUD/dock indicators and clickable alerts + creator impact stats card (`Views`, `Upvotes`, `Remixes`) on `PlayerProfileModal.jsx`.
- [x] **28.14 Live Supabase Realtime Presence & Floating Reaction Emotes (`src/hooks/useLivePresence.js`, `src/components/MemeLiveEmotes.jsx`, `src/components/MemeCard.jsx`, `src/components/VerticalReelsView.jsx`, `src/components/MemeTheaterModal.jsx`, `src/components/NavbarHud.jsx`, `src/App.jsx`)**:
  - [x] Tracked real connected peers on Supabase channel `tm:live-presence`; renders `"🟢 N memers online"` in `NavbarHud.jsx` **only when N ≥ 2**, and floats other peers' genuine upvote/reaction emojis across the meme they reacted to (`MemeLiveEmotes.jsx`, disabled under `prefers-reduced-motion` and `litePerfMode`).
- [x] **28.15 Daily Caption Battle & "👑 Caption King" Crown (`src/utils/dailyCaptionBattle.js`, `src/components/BattleCountdown.jsx`, `src/components/DailyCaptionBattleModal.jsx`, `src/components/DailyCaptionBattleModal.css`, `src/components/QuickUploadBar.jsx`, `src/data/starterMemes.js`, `src/App.jsx`)**:
  - [x] Repurposed Daily Bounty into Daily Caption Battle selecting one daily template from `STUDIO_TEMPLATES`, adding an isolated 1-second end-of-day countdown (`BattleCountdown.jsx`), crowning yesterday's top caption author with a `👑 Caption King` strip pill/modal banner + profile achievement badge, and seeding clearly labelled `@TheMemesHQ` sample captions.
- [x] **28.16 Arcade Shop Cosmetics & Unlockables (`src/data/cosmetics.js`, `src/components/RewardsModal.jsx`, `src/components/RewardsModal.css`, `src/components/MemesRadio.jsx`, `src/components/MemesRadio.css`, `src/components/MemeCard.jsx`, `src/utils/radioBus.js`, `src/utils/musicEngine.js`, `src/App.jsx`)**:
  - [x] Added `🛍️ Arcade Shop (Cosmetics)` tab in `RewardsModal.jsx` letting earned tokens or XP milestones unlock & equip Card Frames (`neon-pink`, `holo`, `vhs`, `gold`), Cursor/Touch Trails (`fire`, `star`, `matrix`, `glitch`, etc.), Bonus THE MEMES FM Stations (`retrowave`, `cyberpunk`), Cassette Deck Skins (`gold-chrome`, `clear-neon`, `vhs-static`), and Profile Titles/Flairs.
- [x] **28.17 Micro-Delight Upvote Punch, Golden Meme Drops & End-of-Internet Card (`src/utils/soundEngine.js`, `src/components/VerticalReelsView.jsx`, `src/App.jsx`, `src/index.css`)**:
  - [x] Upgraded upvote feedback with `.tm-screen-punch` (subtle 140ms pulse, off in `prefers-reduced-motion` / `litePerfMode`), combo-climbing layered pop synth (`_playComboRisingPop`), and `navigator.vibrate(10)` haptic feedback on Android; every 10th unique meme viewed in Reels triggers a claimable Golden Meme Drop (`handleClaimGoldenMeme`), and the end of both Feed and Reels displays `"You've reached the end of the internet 🫠"` with Remix, Games, and Back-to-Top CTAs.

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
