# Handoff H-20261121-01: Site polish, wave 1

**Paste into:** Antigravity Orchestrator (Neon)
**Thinking level:** high
**Folder / branch:** `C:\Users\corma\thememes-net-gemini` on `gemini/site-polish-w1`

---
### Copy from here

You are Neon Orchestrator working on thememes.net, an 80s neon cyber-arcade meme site built with Vite 8, React 19, Vercel and Supabase. First read `AGENTS.md` and `GEMINI.md` in the repo root and follow them. This is handoff H-20261121-01.

**Goal:** make the site more trustworthy, accessible and satisfying to play, without changing what it is. Complete three work packages in this exact order: WP3, WP5, WP4. Make one commit per work package.

**Start here, before any edit:**
1. Confirm the folder is `C:\Users\corma\thememes-net-gemini`, the branch is `gemini/site-polish-w1`, the working tree is clean, and `git rev-parse --short HEAD` is `a99dc28`. If not, stop and report.
2. Run `npm ci`.
3. Record the smoke baseline in PowerShell. It uses a dead backend so no production traffic is sent:
   `$env:VITE_SUPABASE_URL='http://127.0.0.1:9'; $env:CI='1'; npm run build; npx playwright test --reporter=line *> ..\gemini-smoke-base.txt; Remove-Item Env:VITE_SUPABASE_URL, Env:CI`
   The baseline already has failures. Use it only for comparison.

**Hard rules:**
- Do not push, merge, deploy, run migrations, write to production, add dependencies or spend money.
- Add no cookies, trackers, personal data, real people, characters, brands, new images or new audio.
- MemeDollarz stays pretend money. Do not change payouts, odds, rewards or balances.
- Reduced motion, lite mode and mute settings always win. No audio before a user gesture.
- Keep existing test IDs, analytics names and behaviour unless this brief changes them. Make targeted edits and do not reformat files.
- Line numbers are from `a99dc28` and may shift. Find the code they describe.

**Do not touch:** `securityGuard.js`, `tokenEconomy.js`, `useTokenEconomy.js`, `reports.js`, any `Moderation*` file, `ReportSheet.*`, moderation, security or token tests, legal pages or legal copy, `forgeEngine.js`, `starterMemes.js`, `supabase/**`, `vercel.json`, `index.html`, `package.json`, `package-lock.json`, images, `ops/`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.claude/`. If a task seems to need one of these, skip that part and report it.

**WP3: Make the analytics true**
You may change only: `src/utils/dailyCaptionBattle.js`, `src/components/DailyCaptionBattleModal.jsx`, `src/components/ShareMemeSheet.jsx`, `src/components/CreatorProfilePage.jsx`, `src/components/SeoDiscoveryFooter.jsx` (share tracking near line 36 only), `src/utils/analytics.js`, `src/utils/pulse.js`, `src/utils/guessTheMeme.js`, `src/components/HigherOrLowerGame.jsx`, `tests/unit/guessTheMeme.unit.mjs`, and new analytics unit tests.
1. Funny votes fire twice. Remove the tracking at `dailyCaptionBattle.js:343` and keep the one at `DailyCaptionBattleModal.jsx:217`. Leave entry tracking alone.
2. Fire exactly one `meme_shared {channel}` after a native share or copy succeeds, inside `ShareMemeSheet`. A cancelled share fires nothing, and a download is not a share. Do not edit `App.jsx` for this or add `onShared`.
3. Move share tracking after success in `DailyCaptionBattleModal.jsx:245`, `CreatorProfilePage.jsx:116` and `SeoDiscoveryFooter.jsx:36`.
4. Add an early `isPulseAllowed()` return to `trackReturnVisitOnce`. Repair the returning-visitor flag with one non-identifying boolean, set only when Pulse is allowed and after this visit's value is read. First visit is false, second is true.
5. The Guess the Meme card must link to `https://www.thememes.net/games/guess-the-meme?ref=daily` (`guessTheMeme.js:53`; test lines 11 and 21). Higher or Lower keeps its own URL but uses `www`.
Done when unit tests prove one vote event, one event for a successful share, and none for a cancelled share.

**WP5: Make the games feel right**
You may change only: `VegasPinballGame.jsx`, `GameRouter.jsx`, `ArcadeInitialsModal.jsx`, `NeonSerpentGame.jsx`, `BrickBlasterGame.jsx`, `GridRidersGame.jsx`, `MemeInvadersGame.jsx`, `SunsetSprintGame.jsx`, `VectorVoidGame.jsx`, `NeonBingoGame.jsx` (all in `src/components/`), one new shared resume-countdown component in `src/components/ui/`, and new unit tests.
1. Pinball runs faster on high-refresh phones (`VegasPinballGame.jsx:819,2323`). Use a fixed 60Hz timestep with capped catch-up, and pause it when the tab is hidden or loses focus.
2. A high-score prompt must never interrupt a restarted run (`GameRouter.jsx:402-439`). If the player has restarted, do not open the modal. Offer a non-blocking "Save score" chip afterwards.
3. In the six canvas games (Brick, Grid, Invaders, Serpent, Sunset, Vector), restarting mid-run needs a confirm or hold, and resuming from pause uses a 3-2-1 countdown. Under reduced motion the countdown is static. Grid has no restart handler, so add one.
4. Neon Bingo must not draw balls while the tab is hidden, and resumes on return (`NeonBingoGame.jsx:628`).
Done when pinball speed matches at 60Hz and 120Hz, a restart during the score lookup is not interrupted, and a hidden tab pauses Bingo.

**WP4: Make it work for everyone**
You may change only: `src/App.jsx` (skip link and minimal target wiring only), `src/index.css` (only the reduced-motion block near line 5048 and `.tm-comment-report-btn` near line 852; `!important` is allowed only in that reduced-motion block), `src/styles/tokens.css`, `src/components/MemeCard.jsx`, `src/components/MemeCard.css`, `src/components/MobileArcadeDock.jsx`, `src/components/ShareMemeSheet.jsx`, and new `src/components/ui/Sheet.jsx`.
1. The operating system's reduced-motion setting must stop non-essential motion when the site setting is `auto` or `on`. `off` still overrides it. Card tilt is off in reduced motion and lite mode (`MemeCard.jsx:77`).
2. Make the spoiler reveal keyboard-operable (`MemeCard.jsx:243`). Add a skip link and `aria-current` on the dock. Expand and comment-report targets must be at least 44px. `<main>` already exists on many views, so never nest it.
3. Set `--tm-text-mute` to `#9b94bd`.
4. Build `ui/Sheet.jsx` with a focus trap, Esc, scroll lock, `aria-modal` and focus return: a bottom sheet at 390px and a dialog from 861px. Migrate only `ShareMemeSheet` to it. Reporting must stay one tap.
Done when a full keyboard pass works, emulated OS reduced motion works, and screenshots at 390x844 and 1280x800 are saved in `docs/ui/site-polish-w1/`.

**After every work package:**
- Run `npm run lint`, `npm run test:unit` and `npm run build`. All must pass.
- Rerun the smoke command, writing to `..\gemini-smoke-<wp>.txt`. There must be no new failing test titles compared with the baseline.
- Commit on `gemini/site-polish-w1` with a clear message. If a package cannot pass, stop and report rather than working around it.

**Finish with the HANDOFF REPORT format from `AGENTS.md`.** Include commit hashes, every file changed, check results, smoke comparison, screenshot paths, anything skipped, and anything you could not verify. Do not merge or push.

### Copy to here
---

## Held back from this run

- **Claude side:** report buttons on shared views, battle "hide" fix, invented meme pages, legal copy, 80s cast, Derby names, casino exposure, 12 Days of Memes, battle-entry preview image.
- **Later Gemini run:** one mute and Calm mode after an audio spec, battle prompt pack, Podium Card, comeback card.
- **Cormac decisions:** casino games on a 13+ site, Online Safety Act assessments, iPhone silent switch, seed page indexing.

## Report
_(paste Gemini's report here when it comes back)_

## Review
- tech-lead:
- design-director:
- qa-reviewer:
