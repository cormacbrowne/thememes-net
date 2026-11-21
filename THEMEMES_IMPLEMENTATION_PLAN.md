# THE MEMES.net — Implementation Plan for Claude Code

> **How to use this file:** put it in the root of the thememes.net repo, then tell Claude Code:
> *"Read THEMEMES_IMPLEMENTATION_PLAN.md. Start with Phase 0, then do one phase at a time. At the end of each phase, stop and show me a summary of what changed and what to test."*

---

## 0. Context and ground rules (read first)

**What the site is:** www.thememes.net is a free meme and GIF maker, a community meme feed (Dank, Programming, Gaming, Relatable) with a vertical "Reels" mode, a meme soundboard, synthwave radio, an arcade (about 22 games, including casino-style games using a virtual "MemeDollarz"/M$ wallet), prank screens (fake Windows Update, BSOD, cracked iPhone/iPad, Excel boss screen, Teams/Zoom call, hacker terminal, AI workspace), Caption Battles, Bounties, Remixes and a Hall of Fame. It has a neon-80s synthwave look (theme colour `#07060f`) and a mobile bottom tab bar (Home, Reels, Create, Games, Profile).

**Goal:** build everything around one routine, and make the site trustworthy, fast and easy to share, so it's ready to make money later:

> **Make a meme → Share it (each share brings people back) → Compete in today's Caption Battle → Come back tomorrow for results and the next battle.**

**Rules for every task:**

1. **Audit before you build.** The plan is stack-agnostic. In Phase 0, work out the real framework, database, auth, hosting and file layout, and adapt every task below to them. Reuse existing components (the Caption Battle, Hall of Fame, Guess the Meme, upvotes, reactions, MemeDollarz wallet, soundboard) rather than rebuilding them.
2. **Mobile-first, always.** Design for a 375px-wide phone first, then scale up. All interactive or full-screen features need:
   - touch handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) as well as mouse handlers
   - `touch-action: none` on custom gesture surfaces (canvases, swipe areas, drag targets)
   - `position: fixed` with safe-area insets (`env(safe-area-inset-*)`) for full-screen iOS layouts
   - responsive text scaling (`clamp()`), tap targets at least 44×44px, and testing at 375×812 and 768×1024
3. **Keep the brand.** Neon synthwave styling, existing fonts and colours. Funny and playful, never cruel.
4. **Feature flags.** Put anything that touches money, ads, push notifications or third-party networks behind a flag that is **OFF** by default (for example `FEATURE_ADS`, `FEATURE_PRO`, `FEATURE_PUSH`, `FEATURE_VIDEO_EXPORT`).
5. **No real money without my say-so.** Never connect live payment keys, ad network accounts or live push credentials. Use test or sandbox modes and placeholder environment variables, and list what I need to sign up for.
6. **Small, reviewable commits.** One commit per task, with a clear message. Don't push or deploy unless I ask.
7. **Test as you go.** Add or extend tests where a test setup exists. For UI work, check the page renders at mobile and desktop widths with no console errors.
8. **Stop and ask** before deleting user data, running destructive database migrations on production, or making any change you can't undo.

---

## Phase 0 — Audit and baseline (do this first, change nothing)

**Tasks**
- [ ] Map the repo: framework, routing, styling approach, state management, database and ORM, auth, file and image storage, hosting and deploy setup, and any existing analytics.
- [ ] Find where these live: the homepage, feed, meme cards, meme maker (PNG and GIF), Reels, Caption Battle, Bounties, Remix, Hall of Fame, Guess the Meme, arcade and each game, the MemeDollarz wallet, prank screens, profile, House Rules, takedown.
- [ ] Find how vote and reaction counts are stored and displayed. Find out whether any counts are **seeded, hard-coded or artificially inflated** (for example @TheMemesHQ posts showing 800–1,700 upvotes "35m ago"), and how.
- [ ] Find test or junk data in production (for example user `@TestOne`, titles with repeated `REMIX: REMIX: REMIX:` prefixes).
- [ ] Check whether MemeDollarz can be **bought with real money, transferred between users, or cashed out** anywhere in the code.
- [ ] Measure the homepage: time until the logo and MEMES/PLAY buttons appear (currently a blank sun for about 3 seconds), plus a Lighthouse mobile score if you can run it.
- [ ] Check for `sitemap.xml`, `robots.txt`, canonical tags, and per-page Open Graph images.

**Deliverable:** write `docs/AUDIT.md` with your findings, a short list of risks, and any places where this plan doesn't fit the codebase and needs adjusting. **Stop and show me before Phase 1.**

---

## Phase 1 — Credibility and speed (weeks 1–2)

### 1.1 Real numbers only
- [ ] Remove all seeded, fake or inflated vote, reaction and view counts. Every number shown must come from real user actions.
- [ ] Existing house-account posts (@TheMemesHQ) keep their content, but their counts are reset to the real totals. Write the migration so it's **reversible** (back up old values to a separate column or table), and ask me before running it on production.
- [ ] Badges like "🔥 VIRAL SUPERNOVA" and "⚡ HEATING UP" must be calculated from real engagement, using configurable thresholds based on the site's actual traffic (start low and scale up). When engagement is low, show honest labels like "NEW" or "FRESH" instead.
- [ ] Add a code comment and a test that fail if any display count isn't from the database.

### 1.2 Clean up content
- [ ] Hide or remove test accounts and their posts from public feeds (add an `is_test` flag on users if that's safer than deleting; ask before deleting).
- [ ] Remix titles: stop prefixes stacking. Store `remix_of_id` and show "Remix of [original title] by @user" as a link, with the user's own caption as the title. Clean up existing titles with repeated `REMIX:` prefixes.
- [ ] Fix visible typos in seeded content (for example "Nobody knows who's plan" → "Nobody knows whose plan").
- [ ] Fix the arcade count: "15 Free Retro & Meme Games" must be **calculated** from the game list, not hard-coded.

### 1.3 Homepage loads instantly
- [ ] The logo, the MEMES/PLAY buttons and the quick links must render on the first paint: server-rendered or static HTML, no waiting for JavaScript or animation.
- [ ] The synthwave sun and grid animate in **behind** the content afterwards (CSS animation, `prefers-reduced-motion` respected).
- [ ] Lazy-load feed images below the fold, set width and height to avoid layout shift, and serve modern formats (WebP or AVIF) with responsive sizes.
- [ ] Defer non-critical JavaScript (radio, soundboard, games) until it's needed.
- [ ] **Target:** Lighthouse mobile performance 85+, Largest Contentful Paint under 2.5s, Cumulative Layout Shift under 0.1.

### 1.4 Analytics (privacy-friendly)
- [ ] Add a lightweight analytics layer behind one wrapper function (`track(event, props)`) so the provider can be swapped. Default to a cookieless option (Plausible or similar), configured by environment variable; ask me which provider.
- [ ] Track these events: `meme_created` (type: image/gif/video), `meme_shared` (channel), `meme_downloaded`, `vote_cast`, `reaction_added`, `battle_entry`, `battle_vote`, `guess_the_meme_completed`, `share_card_copied`, `game_started` (game id), `prank_opened` (prank id), `signup`, `return_visit`.
- [ ] Add `?ref=share&m=<memeId>` (or similar) to all share links so traffic from shares can be measured.
- [ ] Update the privacy policy to reflect analytics (draft the text and show me).

### 1.5 Search foundations
- [ ] Generate `sitemap.xml` (homepage, categories, meme pages, battles, games, prank pages, Hall of Fame) and keep it updated automatically.
- [ ] `robots.txt` that points to the sitemap and blocks private routes (profile edits, admin, API).
- [ ] Canonical tags on every page. Use "THE MEMES.net" consistently in titles, Open Graph site name and structured data (`WebSite` + `Organization` schema with logo and `sameAs` social links, placeholders for now).
- [ ] Write a short checklist in `docs/SEO_SETUP.md` of the manual steps I need to do: Google Search Console, Bing Webmaster Tools, submit the sitemap. (Searching "thememes.net" currently returns WordPress theme sites, so the brand needs to be tied to the domain.)

### 1.6 The casino games and MemeDollarz (risk reduction)
- [ ] **Hard rule, enforced in code:** MemeDollarz can never be bought with real money, transferred between users, or cashed out or redeemed for anything of real value. Add a server-side guard and a test for this. If any such path exists, disable it and tell me.
- [ ] Move casino-style games (slots, roulette, blackjack, poker, horse racing, coin dozer, bingo) off the homepage and out of the main promotional copy. Put them in a separate "Retro Casino (just for fun, no real money)" section inside the arcade, and keep the disclaimer always visible.
- [ ] Rename "Las Vegas" framing to neutral retro-arcade naming (for example "Neon Slots '86" rather than "Las Vegas 777 Slots").
- [ ] Put the whole casino section behind a single feature flag `FEATURE_CASINO_GAMES` (default **ON** for now) so I can retire it with one switch.
- [ ] Any future paid currency (Phase 4) must be a **separate** currency that can never be used in casino games.

**Stop at the end of Phase 1 and show me a summary plus before/after screenshots at mobile size.**

---

## Phase 2 — The core loop (weeks 3–6)

### 2.1 Daily Caption Battle (the flagship feature)
Build on the existing Caption Battle and Hall of Fame code where possible.

- [ ] **Data model** (adapt to the ORM):
  - `battles`: id, image_url, prompt (optional), theme (optional, for example "Christmas"), starts_at, ends_at, status (`scheduled` | `live` | `judging` | `complete`), sponsor (nullable, for later)
  - `battle_entries`: id, battle_id, user_id, caption, created_at, vote_count (calculated or cached), rank (set at close)
  - `battle_votes`: id, entry_id, user_id (or anonymous fingerprint/session), created_at; one vote per user per entry; users can't vote on their own entry
- [ ] **Schedule:** one battle goes live every day at a set time (configurable; default 09:00 Europe/London) and closes 24 hours later. Use the platform's scheduled jobs (cron) to open and close battles. Admins can queue images ahead of time.
- [ ] **Admin screen:** upload an image, set an optional theme and prompt, schedule it, view a queue of upcoming battles, remove entries.
- [ ] **Entering:** the caption is overlaid on the image live as you type (reuse the meme maker's rendering). Set a character limit (for example 120). One entry per user per battle (allow editing until close). Run entries through the profanity/moderation filter from 2.6.
- [ ] **Voting:** a swipe or tap card stack on mobile ("funny" / "skip") plus a ranked list view. Shuffle the order per voter to avoid bias toward early entries. Don't show live totals until the voter has voted on a few entries (reduces bandwagon voting).
- [ ] **Results:** at close, rank the entries; the top 3 get badges and MemeDollarz, and the winner goes into the Hall of Fame. Show a results screen the next day with a confetti moment for winners.
- [ ] **Homepage hero:** today's battle is the first thing on the homepage: the image, a countdown to close, an entry count, a big "Enter" button, and yesterday's winner below it.
- [ ] **Shareable:** each battle and each entry has its own page and share image (see 2.2).
- [ ] Analytics: `battle_entry`, `battle_vote`, `battle_result_viewed`.

### 2.2 A page for every meme, with rich link previews
- [ ] Every meme gets a permanent page: `/m/<shortId>/<slug>`.
- [ ] Generate an Open Graph image (1200×630) for every meme and battle entry server-side, with a small THE MEMES.net brand strip. Set `og:title`, `og:description`, `og:image`, `twitter:card=summary_large_image`.
- [ ] Below the meme on that page: a big **"Make your own"** button (opens the maker with the same template, or remix mode), a "Remix this" button, related memes and today's battle.
- [ ] Share button: use the Web Share API on mobile, with copy-link fallback and quick buttons for WhatsApp, X, Reddit and Discord (copy). Every share link carries the `ref=share` parameter.
- [ ] Keep the downloadable image watermark small and tidy (bottom corner, semi-transparent "thememes.net").
- [ ] Test the previews in WhatsApp, iMessage, Discord and X (list any I need to check manually).

### 2.3 Guess the Meme: shareable results card (Wordle-style)
- [ ] Number each daily puzzle (`THE MEMES #142`).
- [ ] After finishing, show a spoiler-free emoji result, for example:
  ```
  THE MEMES #142 🎯 3/5
  🟥🟥🟩
  🔥 Streak: 6
  thememes.net/daily
  ```
- [ ] One tap to copy (clipboard API) or share (Web Share API). Track `share_card_copied`.
- [ ] Show a countdown to the next puzzle, plus a nudge to today's Caption Battle.
- [ ] Store results per user (or in local storage for guests, merged on signup).

### 2.4 Streaks, levels, badges, leaderboards
- [ ] **Daily streak:** counts days with at least one meaningful action (make a meme, enter or vote in a battle, play the daily puzzle). Show it in the header next to the M$ balance. Give one free "streak freeze" per week.
- [ ] **XP and levels:** small XP amounts for creating, entering battles, getting upvotes, winning. Fun level names (for example "Lurker → Shitposter-in-Training → Certified Memer → Meme Lord → Supernova").
  > Keep the level names family-friendly enough for ad networks; my example above is a placeholder. Suggest a cleaner set.
- [ ] **Badges:** First Meme, First Battle, Podium Finish, Battle Champion, Hall of Famer, 7-Day Streak, 30-Day Streak, 100 Upvotes, Remix Master, Wholesome Hero. Build a badge system driven by config so more can be added without code changes.
- [ ] **Weekly leaderboards** (reset Monday 00:00 Europe/London): Top Creators (upvotes received), Battle Points, Daily Puzzle. Also an all-time Hall of Fame.

### 2.5 Profiles worth showing off
- [ ] Public profile at `/u/<username>`: avatar, level, streak, badges, battle wins, grid of the user's memes, total upvotes.
- [ ] Own profile: edit avatar and bio, notification settings (Phase 3), MemeDollarz history.
- [ ] Each profile has an Open Graph share image ("@user — Level 12 Meme Lord — 3 battle wins").
- [ ] Guests: let people make and share memes with no account, but encourage signup at natural moments (to enter a battle, to keep a streak, after a meme gets upvotes). Keep sign-up to one tap (magic link, Google, Apple) if the auth stack supports it.

### 2.6 Moderation and safety (must ship with the battles)
- [ ] Report button on every meme, entry and profile; reports go to an admin queue with one-click hide/remove/ban.
- [ ] Auto-hide content after N reports (configurable) until reviewed.
- [ ] A text filter for slurs and abuse on captions, titles and usernames (blocklist plus configurable list). Image uploads: hook for an image moderation service behind a flag; list the options for me.
- [ ] Rate limits on posting, voting and reporting. Basic bot protection on signup and voting.
- [ ] Make sure the House Rules, takedown and contact pages are linked from the footer and the report flow.

### 2.7 Homepage redesign
New mobile layout, top to bottom:
1. Header: logo, streak 🔥, M$ balance, menu (as now).
2. **Today's Caption Battle** hero card (image, countdown, entries, Enter button).
3. Yesterday's winner strip (link to results and Hall of Fame).
4. Daily Guess the Meme tile (with "your streak" if played).
5. **Trending feed** (real numbers, category chips: All, Wholesome, Dank, Programming, Gaming, Relatable).
6. "Fun extras" row: Prank Screens, Soundboard, Arcade, Radio, as smaller tiles.

- [ ] The big **Create** button in the bottom bar stays the primary action.
- [ ] Desktop: two-column layout (battle and daily tiles on the left, feed on the right).
- [ ] Add a **Wholesome** category to the feed and the maker.

### 2.8 Social presence (code side)
- [ ] Footer and menu links to TikTok, Instagram, X, YouTube and Discord. Read the URLs from config; hide any that are empty.
- [ ] A small admin "social kit" page that, for the current battle and yesterday's winners, gives downloadable 1080×1920 (Stories/TikTok) and 1080×1080 images, with suggested caption text, so I can post daily quickly.

### 2.9 Seasonal: Christmas and New Year
- [ ] Support seasonal themes: an optional theme on battles, plus a site-wide seasonal skin flag (for example snow over the synthwave grid, festive logo glow) that's easy to switch on and off.
- [ ] Prepare a "12 Days of Memes" battle series (from 13 December): queue 12 themed battles (admin imports images).
- [ ] Festive soundboard pads (jingle bells, a "ho ho ho" stinger). Use only royalty-free or self-made sounds, and note the source of each in `docs/ASSETS.md`.
- [ ] A new prank screen: "Office Secret Santa: You've been assigned… your boss" (playful, clearly a parody).
- [ ] A "Year in Memes" Hall of Fame page for New Year (best of the year, by real votes).

**Stop at the end of Phase 2 and show me.**

---

## Phase 3 — Growth engines (weeks 7–10)

### 3.1 Turn memes into videos (standout feature)
- [ ] In the maker and on every meme page: **"Make it a video"** creates a 5–10 second vertical (1080×1920) clip: the meme centred on a branded synthwave background, with an optional soundboard sound (Vine Boom, airhorn, etc.) and a simple zoom/shake effect timed to the sound.
- [ ] Do the rendering on the user's device first: canvas + `MediaRecorder` (MP4 where supported, for example iOS Safari; WebM elsewhere), with a fallback to `ffmpeg.wasm` loaded only when needed. If device rendering is unreliable, propose a server-side render queue and ask before building it.
- [ ] Output includes a small "thememes.net" end card (last 1 second).
- [ ] Share the video with the Web Share API (files) on mobile; download on desktop.
- [ ] Sounds: confirm every soundboard sound is royalty-free or licensed before it's used in exported videos; flag any I need to replace.
- [ ] Behind `FEATURE_VIDEO_EXPORT`. Track `meme_created` with `type: video`.

### 3.2 Prank screen landing pages (search traffic)
For each prank screen (Windows Update, BSOD, cracked iPhone, cracked iPad, Excel boss screen, Teams/Zoom call, hacker terminal, AI workspace, Secret Santa):
- [ ] A fast, polished landing page: a big "Launch full screen" button, a short how-to (how to go full screen and exit on Windows, Mac, iPhone and Android), 3–4 FAQ items with `FAQPage` structured data, and links to other pranks.
- [ ] Full-screen mode: Fullscreen API where available; on iOS (which doesn't support it for normal pages) use `position: fixed` full-viewport layout and suggest "Add to Home Screen" for the full effect. Make the exit gesture easy and clearly explained.
- [ ] Clearly labelled as parody. **No real Microsoft, Apple or Zoom logos or trademarked artwork**; use look-alike-but-original styling. Flag any existing screen that uses real logos.
- [ ] April Fools hub page `/april-fools` ready ahead of 1 April (lists all pranks).

### 3.3 Meme template pages (search traffic)
- [ ] A template library: `/templates` and `/templates/<slug>` pages ("[Template name] meme generator"), each with a blank template ready to caption in the maker, a short "what this meme means", popular captions from users (real ones), and related templates.
- [ ] Start with templates we're comfortable hosting. Add a `source/licence` note per template in the admin, and make sure the takedown flow covers templates. **Don't scrape or bulk-import images**; build an admin upload flow and I'll add templates.
- [ ] Each template page goes in the sitemap.

### 3.4 Push notifications (opt-in, useful only)
- [ ] Web push (VAPID keys from env vars; service worker). Behind `FEATURE_PUSH`.
- [ ] Only ask for permission **after** a meaningful action (after the user's first battle entry or first meme), never on first visit. Use a soft prompt in our own UI first, then the browser prompt.
- [ ] Notification types (each can be turned off in profile settings):
  - Battle results are in (you placed #N)
  - Your meme hit 10 / 100 / 1,000 upvotes
  - Your streak is about to end (one evening reminder, max once a day)
  - Today's battle is live (off by default)
- [ ] Rate-limit to at most 2 notifications per user per day.
- [ ] Note in `docs/` that iOS web push only works for sites added to the home screen; add an "Add to Home Screen" prompt for iOS users who enter battles.
- [ ] Make it a proper installable PWA: web app manifest, icons, splash, offline fallback page.

### 3.5 Email (optional, scaffold only)
- [ ] Capture an optional email at signup with a clear opt-in for a weekly "Best Memes of the Week" email. Build the template and the sending job, but use a provider placeholder (env vars). Don't send anything until I set up a provider.

**Stop at the end of Phase 3 and show me.**

---

## Phase 4 — Ready to make money (weeks 11–12, everything flagged OFF)

### 4.1 Ad slots (no network connected yet)
- [ ] Build an `<AdSlot placement="..."/>` component that renders nothing unless `FEATURE_ADS` is on and the user isn't Pro.
- [ ] Placements: in the feed every 8–10 memes, between Hall of Fame sections, on prank landing pages (**not** while a prank is full screen), on the arcade lobby.
- [ ] **Never** in the meme maker, battle entry or voting flows, or Reels gestures.
- [ ] Reserve fixed space so ads don't cause layout shift.
- [ ] Add a consent banner, needed in the UK/EU before personalised ads, with the most privacy-preserving default. Include a placeholder `ads.txt` route.
- [ ] Write `docs/ADS_SETUP.md`: which networks to apply to as traffic grows, and their requirements (look them up at the time; don't hard-code numbers), plus a reminder to check each network's policy on simulated casino games before applying.

### 4.2 THE MEMES Pro (subscription, test mode only)
- [ ] Pro features: no watermark, HD and longer GIFs, video export without the end card, extra fonts and sticker packs, exclusive neon profile frames, no ads.
- [ ] Payments: Stripe Checkout and Customer Portal (or what fits the stack) in **test mode only**, with keys from env vars. Webhook handling for subscription created/updated/cancelled. A `plan` field on users.
- [ ] A Pro page explaining the benefits, with a monthly and yearly option (prices in config; placeholder £2.99/month and £24.99/year).
- [ ] Behind `FEATURE_PRO`.

### 4.3 Cosmetics shop
- [ ] Shop for profile frames, badges, colour themes, custom upvote animations and maker sticker packs.
- [ ] Items can be bought with **earned MemeDollarz** only, for now. If we add paid items later, they use Pro or a separate premium currency that **can never be used in casino games** (see 1.6). Enforce this server-side, with tests.

### 4.4 Sponsored battles (scaffold)
- [ ] The `sponsor` field on battles: sponsor name, logo, link and prize text, shown as a clearly labelled "Sponsored by" strip on the battle card and results.
- [ ] An admin form to attach a sponsor to a scheduled battle.

### 4.5 Merch (scaffold only)
- [ ] On Hall of Fame memes: a "Want this on a T-shirt?" interest button (just records interest per meme for now). Add a creator consent field so merch can only ever be made with the creator's permission.

**Stop at the end of Phase 4 and show me.**

---

## Phase 5 — Polish and voice (ongoing)

- [ ] **Microcopy pass:** playful, self-aware, never cruel. Rewrite empty states, errors and loading messages in the site's voice (for example 404: "This meme has been deleted from the timeline").
- [ ] **Wholesome angle:** a weekly "Good Vibes Friday" battle theme, a Wholesome Hero badge, and wholesome memes featured on the homepage.
- [ ] **Accessibility:** alt text on memes (use the caption text as default alt), keyboard navigation, focus states, colour contrast on neon text, `prefers-reduced-motion` respected everywhere, captions or labels for sound pads.
- [ ] **Arcade focus:** put the meme-native games first (Guess the Meme, Higher or Lower, Meme Battle Arena, Speed Swipe, MEMEDAQ, Meme Crush); retro clones after; casino section last (see 1.6).
- [ ] **Performance budget:** add a CI check (or a script) that fails if homepage JavaScript grows past an agreed size or Lighthouse mobile drops below 85.
- [ ] **Admin dashboard:** one page showing the key numbers: memes created per day, shares per meme and visits from shares, next-day and 7-day return rates, daily battle entries and voters, search traffic to prank and template pages.

---

## Definition of done (every task)

- Works on a 375px phone (iOS Safari and Android Chrome) and on desktop.
- No console errors; no layout shift from new elements.
- Touch and mouse both work on interactive features.
- Analytics events fire where specified.
- Feature flags default to safe values.
- Tests added or updated where a test setup exists.
- A short note added to `CHANGELOG.md` (create it if missing).

## Things I (the owner) need to do — keep this list updated in `docs/OWNER_TODO.md`

- Choose an analytics provider and add the key.
- Set up Google Search Console and Bing Webmaster Tools, and submit the sitemap.
- Create social accounts (TikTok, Instagram, X, YouTube, Discord) and add the URLs to config.
- Decide whether to keep or retire the casino games (`FEATURE_CASINO_GAMES`).
- Approve the vote-count reset migration before it runs on production.
- Queue the first 14 daily battle images, plus the 12 Christmas ones.
- Check sound and template licences flagged in `docs/ASSETS.md`.
- Later: Stripe account, ad network applications, email provider, push VAPID keys.
- Get legal advice before any real-money feature touches the arcade or MemeDollarz.
