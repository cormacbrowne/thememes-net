# Changelog

## Phase 2: The core loop (20 Nov 2026)

### 2.1 Daily Caption Battle v2
- Scheduled daily battles (09:00 Europe/London, 24 h window) with `pg_cron`, one entry per player (editable until close), swipe voting with hidden totals until voting, podium rewards, and `/admin/battles`.
- Deployed updated `submit-caption-entry` Edge Function.

### 2.2 Meme pages, battle pages & share previews
- Readable `/m/<id>/<slug>` URLs with slug canonicals and quick-share buttons (WhatsApp, X, Reddit, Discord).
- Meme viewer "Make your own" opens the matching template when `base_image_url` uses `/meme-templates/<slug>.webp`, plus a "More like this" row (up to 6 same-category memes) and Today's Caption Battle card.
- Server-rendered battle OG pages (`/battle/<battleId>` and `/battle/<battleId>/e/<entryId>`) via `api/battle-og.js`, client route deep-linking, entry sharing, and sitemap entries.
- Tidier corner watermark pill (`globalAlpha = 0.72`) while preserving readable text size.

### 2.3 Guess the Meme daily share & sync
- Spoiler-free Wordle-style result card (`THE MEMES #N 🎯 X/5`, `🟥🟩🟨` grid, streak, `thememes.net/daily`) with 1-tap Copy Result and native Share actions tracking `share_card_copied`.
- Live `HH:MM:SS` countdown to the next puzzle and Today's Caption Battle nudge on completion, plus `/daily` 301 redirect to `/games/guess-the-meme`.
- Added `daily_puzzle_results` table + RPCs (`save_daily_puzzle_result`, `get_my_daily_puzzle_state`) to store per-user puzzle results and merge guest history on sign-in.

### 2.4 Streaks, family-friendly levels, badges & weekly leaderboards
- Daily activity streak (`tm_activity_streak_v1` + Supabase `record_daily_activity` RPC) tracks meme creation, battle entries, battle votes, and daily puzzle completions with 1 free weekly streak freeze (Europe/London) and displays the live `🔥` counter in `NavbarHud`.
- Replaced level rank names in `src/config/progression.js` with 10 family-friendly titles (`Arcade Lurker` → `Cosmic Supernova`) and added declarative `BADGE_CONFIG` in `src/config/badges.js`.
- Added `📅 Weekly` tab to `LeaderboardModal` powered by `get_weekly_leaderboards()` (Monday 00:00 Europe/London reset): Top Creators, Battle Points, Daily Puzzle, and Hall of Fame.

## Phase 1: Credibility and speed (20 Nov 2026)

### 1.1 Real numbers only
- The 60 @TheMemesHQ sample memes no longer carry invented votes, reactions or remix counts. They also no longer claim to be "35m ago"; they have a fixed date instead.
- Sample memes are out of the community feed. This is behind the `SAMPLE_MEMES_IN_FEED` flag, which is off.
- 🔥 VIRAL SUPERNOVA and ⚡ HEATING UP are now worked out from real votes, reactions and remixes. The thresholds live in `src/config/engagementTiers.js`. Below them, a meme shows ✨ NEW or 🌱 FRESH instead.
- Higher or Lower and the 1v1 Arena use real votes only. The fake 12-vote floor and the invented "crowd agreement %" are gone.
- A reversible database migration resets the old inflated baselines and backs them up first. It is written but **not yet applied**: it's waiting for the owner's OK.

### 1.2 Content clean-up
- Test posts (TestOne, AnonMemer) are hidden. This can be undone, and nothing was deleted.
- Stacked "REMIX: REMIX:" titles are cleaned up, and the meme maker no longer adds the prefix.
- Fixed a typo: "Nobody knows who's plan" → "whose plan".
- Arcade game counts are calculated from the game list, not hard-coded.

### 1.3 Homepage loads instantly
- The logo, the MEMES/PLAY doors and the quick links are now plain HTML in the first paint. The sun and grid fade in behind them afterwards.
- The main JavaScript bundle went from 512 KB to about 416 KB. SEO text moved out, and the footer, DeLorean and win overlay are now lazy-loaded.
- No images under the home portal are loaded eagerly any more.

### 1.4 Analytics
- There's one `track(event, props)` wrapper. It sends to Pulse (our own), Vercel and Plausible. Plausible stays off until `VITE_PLAUSIBLE_DOMAIN` is set.
- Microsoft Clarity is removed (it set cookies and recorded sessions).
- New events: meme_created, meme_shared, meme_downloaded, vote_cast, reaction_added, battle_entry, battle_vote, guess_the_meme_completed, share_card_copied, game_started, prank_opened, signup, return_visit.
- Share links are now `/m/<id>?ref=share&m=<id>`.
- The privacy policy text is drafted in `docs/PRIVACY_ANALYTICS_DRAFT.md` but not published yet.

### 1.5 Search foundations
- robots.txt now blocks admin, moderation and `/api/`.
- The brand structured data includes "thememes.net" as an alternate name.
- Social profiles in `src/config/social.js` become `sameAs` links in the structured data automatically.
- `docs/SEO_SETUP.md` is the owner's checklist for Google Search Console and Bing.

### 1.6 Retro Casino and MemeDollarz
- Casino games now sit in their own "Retro Casino (just for fun, no real money)" section. It's always last in the arcade and always shows its disclaimer.
- The whole section can be switched off with one flag, `FEATURE_CASINO_GAMES` (currently ON).
- The casino promo is gone from the homepage.
- "Las Vegas" names are replaced with neutral ones, for example Neon Slots '86 and Neon Pinball '86.
- New `MEMEDOLLARZ_RULES` and a guard test. The test fails if any payment code, M$ transfer or cash-out path, or money-like database object ever appears.

### Follow-ups (owner-approved, 20 Nov 2026)
- The vote-count reset migration is applied on production. Every count now comes from real votes and reactions.
- The analytics section of the privacy policy is published.
- The three old JPG memes are converted to WebP (384–535 KB down to 179–190 KB) and now have width and height set.
- Renamed names that echoed real casino products: Lightning Roulette → Neon Strike Roulette, Lightning Vault 5000 → Thunder Vault 5000, Cyber Buffalo '86 → Cyber Stampede '86. Mr. Jackpots stays.
