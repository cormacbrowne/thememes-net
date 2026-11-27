# T-016 Smoke suite triage (27 Nov 2026)

Run: full `npx playwright test` on main `c6292bb`, 120 tests, **54 passed, 66 failed**.
The same failures happen with the storage stub off (`PW_REAL_STORAGE=1`), so T-015 did not cause them.

**Bottom line:** no confirmed bug that visitors hit. The failures come from tests that were never updated after deliberate product changes (group B), plus tests that silently talk to the **live** Supabase project instead of fake data (group A). Group A also writes to production.

## A. Tests reach live production instead of fakes (24 tests) — fix first

| Cause | Tests | Evidence |
|---|---|---|
| Hot feed moved to the `get_hot_feed` RPC on 20 Nov (`9bd2b0d`). Tests still fake `rest/v1/memes*` / `memes_feed_view*`, so the feed shows **live** MemeBotHouse memes and the tests' fake memes never appear | 33.7 rate limits (3), 33.8 tamper-resistant votes (3), 33.10 CSP / own storage (3), 33.14 leaderboards (3), 33.15 caption king frame (3), 33.16 cursor feed (3), 33.18 live signals (3) | `.tm-card` first card reads "@MemeBotHouse · The 3AM brain…" |
| Writes call `signInAnonymously()` against **live** auth. 24 h of edge logs: 21 real anonymous accounts created from `127.0.0.1:4173`, 72 refused with 429 (rate limit) | 33.11 takedown (3; plus quick-upload, see B) | "🔑 Could not open a session to record this report." |

Side effect: the live project has 274 anonymous users, 101 from the last 7 days, 269 with no meme or comment. Most look like test runs. **Not deleted** (needs Cormac's OK).

**Fix:** in `tests/storageStub.js` (rename to `tests/fixtures.js` later) add default context routes for `**/auth/v1/signup*` (fake anonymous session) and `**/rest/v1/rpc/get_hot_feed*` (404 PGRST202, so the feed falls back to the faked `memes_feed_view`). Tests that need data keep their own `page.route`, which takes priority.

**Done 27 Nov (`claude/t016-test-isolation`):** both fakes are in. A full run made 0 live sign-ups, hot-feed calls, Storage downloads or table writes, and smoke went from 54 to 64 passing (33.10, 33.14, 33.18 and the desktop 33.11 / 33.16 now pass). 33.7, 33.8, 33.15 and the mobile/tablet 33.11 / 33.16 now get past the data step and fail later on stale selectors, so they move to group B: vote buttons are only in `MemeTheaterModal.jsx`, not on feed cards; the badge reads "👑 CAPTION KING" without "(24h)"; `top-window-day` no longer exists; the quick-upload bar is gone. The production RPC path is now covered by `tests/vitest/hotFeedRpc_t016.test.js`. Step 3 should add a shared `fakeFeed(page, rows)` helper that fakes both `get_hot_feed` and `memes_feed_view*`, so smoke exercises the RPC path again.

## B. Deliberate product changes, tests never updated (39 tests)

| Change (date, commit) | Tests | Fix |
|---|---|---|
| Token wording became MemeDollarz (16 Nov, `a94f4b9`): "0 TOKENS" text is gone | 33.19–33.24 game cabinets (18) | expect the M$ wording |
| Casino names changed (20 Nov, `49dbc4d`, `15cd521`): "Neon Lightning Roulette" and "Neon Lightning Vault 5000" renamed, casino moved last and flagged | lobby (3), joystick repro (6), slot arcade (1), 12-pull slot (1) | use the new names / `data-testid` |
| Components no longer mounted: `DualDirectionHero`, `MemesRadio` (EQ chevron), `QuickUploadBar`; token-wallet and "🤖 AI" header buttons removed | Vegas block: EQ, extras drawer, AI assistant, close buttons, dual hero (5); 33.9 / 33.11 quick-upload checks (5) | delete or rewrite those steps against the current UI (Meme Forge upload) |
| Video uploads are allowed again (T-014, 36.V Stage 1, moderator-held) | 33.9 "rejects video uploads" (3, counted above) | flip to "video accepted, held for review, ≤ 12 MB" |
| Drake template on legal hold, hidden (21 Nov, D-003) | 30B `/templates/drake-meme-generator` (1) | use a visible template |
| Prank page retitled "Fake Video Call Screen (Teams & Zoom Style)…" (brand-safe naming) | boss/prank routes (1) | new title |
| "Remixes" feed tab gone | 30B remixes filter (1) | remove or point at the new remix entry |

## C. Need a closer look (3)

- Neon Bingo "Ceefax 888" button not found (1). The text is still in `seoRoutes.js`, so check whether the in-game button was renamed.
- `www.thememes.net` stamp pixel check, deep-equality off by 2 (1). Could be a real change to the export badge, so compare against a fresh export.
- Joystick: `.tm-nav-mode-pill` 🕹️ click timed out on desktop (1). The pill still exists, so it is probably covered by another element. Check after the casino-name fixes.
- Roulette on iPhone (`smoke.spec.js:180`): `spinningWidth >= 300` measured 285.8 mid-spin in one run, then passed 3/3 on repeat. It's a flaky timing check, so measure after the spin settles.

## Safety note (not a test problem)

The takedown form shows only "Could not open a session to record this report." if anonymous sign-in fails (for example, rate-limited on shared Wi-Fi). Rule: report paths never get harder to reach. ~~Recommend the message also offers `/contact` and the email address~~: not possible, because `/contact` says there is no public email and points back to the form. **Done 27 Nov:** the message now says the report wasn't sent, the text is kept, and how to retry (legal cleared). **Still open (Cormac):** legal recommends adding a contact email as a fallback (Online Safety Act ss.20–21, UK GDPR Art 13, and the E-Commerce Regs reg 6 once ads go live). Legal also flags `src/data/legalPages.js` lines 64 and 77, which point to /contact in the same circular way.

## Suggested order

1. Group A fixture + feed mocks (stops tests writing to production). Claude, about 1 hour.
2. Takedown fallback message (tiny `src/utils/serverWrites.js` copy change, needs legal + QA).
3. Group B selector and wording updates. Mechanical, suits Gemini (Flash/medium) with a handoff, or Claude in one pass.
4. Group C investigations.
5. Optional: delete test-made anonymous users (Cormac's OK, data deletion).

## Step 3 done (27 Nov, `claude/t016-step3-stale-tests`)

Result: **118 passed, 0 failed, 2 skipped** (was 54 / 66 / 0 on 26 Nov). Run time 4.4 min (was ~17). Across those runs: 0 live sign-ups, hot-feed calls, Storage downloads, Realtime connections or table writes; reads only.

What changed in the tests: wording and selectors updated to the current UI (FREE badge, M$ chips, casino renames, feed card vote/react/comment buttons, caption-king badge, share sheet, video uploads allowed, quick-upload bar desktop-only, House Rules line checked in Meme Forge on phones, new watermark, slot reel columns, "How to play" sheet, Pranks tab, lobby heading). The fixture also fakes the Realtime websocket: parallel test browsers had joined live presence and counted each other.

Real bugs found and fixed in the app:
- Slot cabinet named **"Cyber Stampede Stampede '86"** and Roulette titled **"NEON NEON STRIKE ROULETTE '86"** (leftovers from the 20 Nov rename). The Thunder Vault tab still said **"Lightning 5000"**, an echo of the real-casino name the rename removed. Now "Cyber Stampede '86", "NEON STRIKE ROULETTE '86" and "Thunder 5000".
- **SEO:** `/games/speed-swipe` and the battle arena swapped their prerendered titles for old ones ("Hyper-Swipe Meme Triage Deck", "1v1 Sudden-Death…") once the app loaded, so Google saw a different title from the sitemap/prerender. `seoEngine.js` now keeps the route titles.

Parked as `test.fixme` (2), pending Cormac:
- Fullscreen music equalizer: still mounted, but **nothing on the site opens it** since the radio/EQ widgets left the page. Bring an entry point back, or retire it.
- K.I.T.T. AI assistant: removed from the site 19 Nov; component and test still in the repo.

Follow-ups:
- Daily Caption Battle v2 (20 Nov) has no end-to-end smoke test; the old v1 submit/vote steps were removed. Write one.
- Speed Swipe and the battle arena have no Share button (they don't use GameShell); every other game has one. Growth to decide.
- Joystick test on iPhone once hung clicking "Back to Lobby" on MEMEDAQ (passed on the next two runs). Watch for flakiness.
- Roulette mid-spin width check is timing-sensitive (group C).
