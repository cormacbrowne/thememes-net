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

**Fix:** in `tests/storageStub.js` (rename to `tests/fixtures.js` later) add default context routes for `**/auth/v1/signup*` (fake anonymous session) and `**/rest/v1/rpc/get_hot_feed*` (empty list). Tests that need data keep their own `page.route`, which takes priority. Update each feed test to fake `get_hot_feed` with its meme rows.

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

## Safety note (not a test problem)

The takedown form shows only "Could not open a session to record this report." if anonymous sign-in fails (for example, rate-limited on shared Wi-Fi). Rule: report paths never get harder to reach. **Recommend** the message also offers the `/contact` route and the email address, so a takedown can always be sent.

## Suggested order

1. Group A fixture + feed mocks (stops tests writing to production). Claude, about 1 hour.
2. Takedown fallback message (tiny `src/utils/serverWrites.js` copy change, needs legal + QA).
3. Group B selector and wording updates. Mechanical, suits Gemini (Flash/medium) with a handoff, or Claude in one pass.
4. Group C investigations.
5. Optional: delete test-made anonymous users (Cormac's OK, data deletion).
