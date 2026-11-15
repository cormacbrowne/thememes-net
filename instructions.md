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

## 0AA. 🚀 CURRENT ROUND — Phase 33: "Safe, Real & Ridiculously Fun" (Nov 2026 deep-dive audit)

> **What this is:** the output of a full read-through of the repo (schema, upload pipeline, auth, feed, economy, games catalog, serverless functions, tests) plus the live homepage on 15 Nov 2026. It is a task list for agents. Work top to bottom: **P0 must be finished before the site is promoted or monetised**, because today nothing stops a visitor from putting harmful content on the site or defacing other people's memes.
>
> **Order:** P0 (safety) → P1 (make the fake things real) → P2 (fun) → P3 (polish/health) → P4 (growth and money). The unticked Phase 28 P6 items further down stay valid; where a task here replaces or depends on one, it says so.

### 🔎 Audit findings (why these tasks exist)

| # | Finding | Evidence |
|---|---------|----------|
| F1 | **All upload safety checks run in the browser only.** Anyone with the publishable key (it ships in the bundle) can call Supabase REST/Storage directly and skip every check. | `src/utils/securityGuard.js`, `src/utils/mediaPipeline.js`, `src/utils/publishMeme.js` |
| F2 | **Any visitor can edit any meme.** The update policy is `auth.uid() = user_id or user_id is null`, and `publishMeme` never sets `user_id`, so every row is editable by everyone: title, `image_url`, score, reactions. | `supabase-schema.sql` lines 76–78; `publishMeme.js` `baseRow` |
| F3 | **No content moderation at all.** No nudity/violence/CSAM scanning, no text filter for slurs, no review queue, no way to remove a meme. `image_url` accepts any `https://` URL, so a meme can point at content hosted elsewhere that changes after posting. | `sanitizeMediaUrl`, `memes` insert policy `with check (true)` |
| F4 | **"Report" does nothing server-side.** The flag button only hides the meme in that visitor's own `localStorage`. | `handleReportMeme` in `src/hooks/useFeed.js` |
| F5 | **Logins can be faked.** The Magic Link and OAuth handlers fall through to creating a local `verified: true` user even when no real sign-in happened. Usernames are free text, so anyone can post as anyone (including `TheMemesHQ`). | `src/hooks/useAuth.js` (`handleMagicLinkSubmit`, OAuth fallback) |
| F6 | **Scores are forgeable.** `increment_meme_score` accepts unlimited calls of ±5; the client falls back to writing `score` directly; `votes` insert/update policies are `true`; reactions are overwritten wholesale by the client. | `supabase-schema.sql`, `useFeed.js` vote/reaction handlers |
| F7 | **Notifications are open.** Anyone can read everyone's notifications and insert arbitrary notification text addressed to any username. | `notifications` policies; `src/utils/notifications.js` |
| F8 | **Raw video and GIF files are stored untouched** (up to 50 MB). Phone videos can carry GPS location metadata; nothing strips it, and nothing reviews the frames. | `publishMeme.js` motion branch |
| F9 | **The in-app security panel is hard-coded** to `HARDENED 100/100` with every check `ok: true`. | `getSecurityAuditReport()` |
| F10 | **Leaderboards show invented rivals** (`PennyFallsKing86`, `CyberCardCounter`, …) next to the player's `localStorage` score. The Daily Caption Battle is also local-only. | `src/components/LeaderboardModal.jsx`, `src/utils/dailyCaptionBattle.js` |
| F11 | **No Terms, Privacy Policy, content rules, takedown route or contact page.** No rate limiting or bot check on uploads, comments or votes. | repo-wide search |
| F12 | **The "80s arcade" is mostly casino.** Of ~15 games, 7 are gambling-style (slots, roulette, blackjack, poker, bingo, coin pusher, derby); only pinball and match-3 are skill cabinets. Code comments call the economy "gambling-ready". | `src/data/arcadeGamesCatalog.js`, `src/utils/tokenEconomy.js` header |
| F13 | **Feed loads only the newest 50 memes** from the database; older memes are unreachable. | `fetchSupabaseMemes` `.limit(50)` |
| F14 | **`supabase-schema.sql` is not a reliable source of truth.** The Phase 26 block is pasted three times; `memes`, `comments`, storage policies and `get_meme_evolution_tree` are not defined in it. | `supabase-schema.sql` |
| F15 | **Docs have drifted.** This file says `App.jsx` is ~186 KB (it is ~81 KB), the Section 3 file tree predates the hooks split, Phase 30 describes template routes that Phase 31 removed, and `README.md` is the Vite template. The live lobby headline says "13 games" but lists 12. | this file, `README.md`, live `/games` |

### 📏 Extra rules for this phase (in addition to "HOW AGENTS MUST WORK")

1. **Trust nothing from the browser.** Every safety rule must be enforced by Postgres (RLS, constraints, triggers) or a server function. Browser checks stay, but only as a fast, friendly first pass.
2. **Schema changes go in numbered migration files** under `supabase/migrations/` (create the folder in task 33.12 first if doing P0 in a different order). Never tell the owner to "paste this into the SQL editor" without also committing the file.
3. **No invented people or numbers.** No fake rivals, fake online counts, fake comments or fake "verified" badges. Sample content must be labelled as `@TheMemesHQ`.
4. **Never test moderation with real illegal or explicit material.** Use the provider's documented test images/strings and synthetic fixtures only.
5. **Mobile-first for every new screen:** build at 390×844 first, with touch handlers (`onTouchStart` / `onTouchMove` / `onTouchEnd`), `touch-action: none` on game canvases, `position: fixed` full-screen layouts for iOS, and text that scales with viewport. Then check 768×1024 and 1280×800.
6. **Original games only.** New games must use original names, art, sounds and layouts. Do not copy the names, characters, mazes, sprites or music of existing commercial games.
7. **Secrets:** service-role keys and moderation API keys live only in Vercel/Supabase environment variables. Never commit them, never prefix them with `VITE_`.

---

### P0 — 🛡️ Safety, moderation & trust (do first, in this order)

- [x] **33.1 Close the "anyone can edit any meme" hole (hotfix, smallest possible change).** _Completion Note (15 Nov 2026): SQL in `supabase/migrations/20261115000001_33_1_lock_meme_updates.sql` (drops all public UPDATE/DELETE policies on `memes`, author-only update policy, `memes_guard_protected_columns` trigger that only blocks `anon`/`authenticated` so `increment_meme_score` keeps working until 33.8); removed both direct `memes` writes in `src/hooks/useFeed.js`. ⚠️ Owner must run the migration in the Supabase SQL editor — not yet applied to the live DB._
  - Drop the policy `"Authors or authenticated creators can update their own memes"` and replace it with `using (auth.uid() = user_id) with check (auth.uid() = user_id)`. Add no delete policy for the public.
  - Remove the two direct-write fallbacks in `src/hooks/useFeed.js` (`.from('memes').update({ score })` and `.update({ reactions })`); they will now fail by design. Votes and reactions move to RPCs in 33.8.
  - Add a column-level guard: a `before update` trigger on `memes` that rejects changes to `image_url`, `poster_url`, `base_image_url`, `author_name`, `user_id`, `score`, `status` unless the caller is the service role.
  - **Acceptance:** with only the publishable key, `PATCH /rest/v1/memes?id=eq.<any id>` changes zero rows. Add this as an automated test in 33.13.

- [ ] **33.2 Server-side publish pipeline (replaces direct browser → public bucket uploads).**
  - New Supabase Edge Function (or Vercel Function) `publish-meme`. Flow: browser asks for a **signed upload URL** into a new **private** bucket `quarantine`; uploads the file; calls `publish-meme` with the object path, title, category and overlay JSON.
  - The function, using the service role: checks size and **magic bytes** (PNG/JPEG/WebP/GIF only at this stage); decodes and **re-encodes** stills to WebP (this strips EXIF/GPS and kills polyglot files); caps dimensions at 1600 px; computes SHA-256 and a perceptual hash; runs 33.3 and 33.4; then copies the clean file to the public `memes` bucket under a server-chosen name and inserts the `memes` row with `user_id`, `status`, hashes and `moderation` JSON.
  - Lock the buckets: `storage.objects` policies so the public can only read `memes`, and cannot insert, update or delete in either bucket. Change the `memes` table insert policy so only the service role inserts.
  - `src/utils/publishMeme.js` becomes a thin client for this function. Keep the offline/local-draft path for "download only" use, but a local meme must never appear in anyone else's feed.
  - Add `memes.status text not null default 'pending' check (status in ('pending','approved','rejected','removed'))`, `user_id uuid`, `sha256 text`, `phash text`, `moderation jsonb`, `removed_reason text`. Public `select` policy becomes `status = 'approved' or user_id = auth.uid()`.
  - **Acceptance:** a direct REST insert into `memes` and a direct Storage upload with the publishable key both fail; an `.html` file renamed `.png` is rejected by the function; an uploaded JPEG with GPS EXIF comes out with none.

- [ ] **33.3 Automated image moderation (the "no dodgy uploads" gate).**
  - Inside `publish-meme`, send each still (and the first, middle and last frame of every GIF) to an image-moderation API chosen by the owner (see Owner actions). Required categories: sexual/nudity, sexual content involving minors, graphic violence/gore, hate symbols, self-harm, drugs, weapons aimed at a person.
  - Decision table: **clear pass → `approved`**; **uncertain → `pending`** (visible only to the uploader, goes to the 33.5 queue); **clear fail → `rejected`** and the quarantined file is deleted. Anything the provider flags as suspected child sexual abuse material is **never shown, never viewed by an agent, never copied**; follow the provider's and the owner's legal reporting procedure and keep only what that procedure requires.
  - Keep a `banned_hashes` table (SHA-256 + perceptual hash). Every rejected or removed image is added; re-uploads of the same or near-identical image are rejected instantly without calling the API.
  - If the moderation API is down or over quota: **fail closed** (`pending`), never auto-approve.
  - Show the uploader a friendly state: "🕵️ Checking your meme… usually a few seconds", then "✅ Live!" or "🚫 That one breaks the house rules" with a link to the rules page (33.11). Rewards (`UPLOAD_MEME` tokens/XP) are granted only on `approved`.
  - **Acceptance:** provider test images for each category are rejected; a normal meme is live in under ~5 s; killing the API key leaves uploads in `pending`.

- [ ] **33.4 Text moderation everywhere text can appear.**
  - Server-side check (same function, plus a `before insert` trigger or RPC for comments) on: meme title, **every overlay/caption layer's text** (send the overlay JSON with the publish request; if text is already burned into the pixels, run OCR in the function and check the result), comments, usernames, profile bio, flair, high-score initials (33.14), party-mode captions (28.18).
  - Two layers: a maintained blocklist with normalisation (leet-speak, spacing, repeated letters, look-alike Unicode) and a text-moderation API for hate, harassment, threats, sexual content and personal data (phone numbers, addresses, emails).
  - Block links in comments and titles entirely for now. Block `@TheMemesHQ`-style impersonation of reserved names.
  - Memes are allowed to be rude and silly; the filter targets slurs, threats, sexual content, doxxing and spam, not ordinary swearing. Put the exact thresholds in one config file so the owner can tune them.
  - **Acceptance:** a unit-tested list of ~50 evasion spellings is blocked; ordinary meme phrases (`"this is fine"`, `"I'm dead 💀"`, `"kill it with fire"`) pass.

- [ ] **33.5 Real reporting, auto-hide and a moderator queue.**
  - New table `reports (id, meme_id | comment_id, reporter_id, reason, note, created_at, status)`; one report per reporter per item; insert only via an RPC that rate-limits.
  - Replace the local-only flag button with a small sheet: reasons = Nudity/sexual · Violence/gore · Hate or harassment · Involves a child · Spam/scam · It's my content (copyright) · Other. Keep "hide for me" as a separate, clearly labelled option.
  - Auto-hide rule: an item with **3 reports from distinct accounts** (or 1 report with reason "Involves a child") flips to `pending` immediately and goes to the queue.
  - `/admin/moderation` page, lazy-loaded, only for users whose `profiles.role = 'moderator'` (RLS-enforced, not just hidden in the UI): queue sorted by severity, big Approve / Remove buttons, keyboard shortcuts, "remove + ban hash", "remove + suspend user", and a log table `moderation_actions`. Images in the queue are blurred until clicked.
  - Daily digest to the owner (email or Discord webhook from a scheduled function): counts of uploads, auto-rejections, open reports.
  - `api/meme-og.js` and `api/sitemap.js` must only serve `approved` memes; a removed meme's `/m/<id>` returns HTTP 410 with a friendly page.
  - **Acceptance:** three test accounts reporting one meme hide it for everyone within seconds; the admin route returns nothing for a non-moderator even via raw REST.

- [ ] **33.6 Honest accounts: remove fake logins, add anonymous sessions, bans.**
  - Delete the fall-through code in `src/hooks/useAuth.js` that creates `oauth-…` / `magic-…` users with `verified: true`. A user is signed in only when Supabase returns a session.
  - On first interaction that writes (vote, comment, upload), call `supabase.auth.signInAnonymously()` so every visitor has a real `auth.uid()` for RLS, rate limits and bans, with no sign-up form. Offer "keep your stuff: link an email/Google" later (upgrade the same account).
  - `profiles`: add `role`, `suspended_until`, `strikes`. Usernames: unique, case-insensitive, 3–20 chars, pass 33.4, reserved list (`TheMemesHQ`, `admin`, `moderator`, `support`, …). `memes.author_name` is filled by the server from the profile, never from the request body.
  - "Verified" badge only for real, linked accounts. Anonymous users display as a generated fun handle (e.g. `NeonOtter_482`).
  - Suspended users can browse and play but every write RPC refuses them.
  - **Acceptance:** entering any email in Magic Link without clicking the emailed link leaves the user signed out; no request can set `author_name`.

- [ ] **33.7 Rate limits and bot protection.**
  - Add a privacy-friendly challenge (e.g. Cloudflare Turnstile) verified inside `publish-meme` and the comment RPC. Invisible for most people; no puzzle on ordinary votes.
  - Server-side limits per user id and per IP hash, stored in Postgres: uploads 5/hour and 20/day for anonymous, higher for linked accounts; comments 1 per 10 s and 60/day; votes 120/hour; reports 20/day. New accounts (<24 h) get the lower tier.
  - Friendly errors in arcade voice ("⏳ Cool your jets, speed racer. Try again in 4 min").
  - **Acceptance:** a scripted loop of 50 uploads is cut off at the limit with HTTP 429.

- [ ] **33.8 Make votes, reactions, comments and notifications tamper-resistant.**
  - Votes: one RPC `cast_vote(meme_id, direction)` that uses `auth.uid()`, upserts into `votes` (change `votes.user_id` to `uuid references auth.users`), and recomputes `memes.score` from the `votes` table. Revoke public execute on `increment_meme_score` and drop the `votes` insert/update `true` policies. Combo multipliers affect XP only, never the stored score.
  - Reactions: new table `reactions (meme_id, user_id, emoji)` with a unique key; `memes.reactions` becomes a count maintained by trigger.
  - Comments: define the `comments` table and RLS in a migration (insert via RPC with 33.4 + 33.7; authors can delete their own; `status` column like memes; 280 chars max).
  - Notifications: created only by triggers/RPCs on the server; `select` restricted to `recipient_id = auth.uid()`; drop the public insert policy.
  - **Acceptance:** replaying a captured vote request 100 times changes the score by at most 1.

- [ ] **33.9 Switch video uploads off until they can be moderated; tighten GIFs.**
  - Remove `video/*` and `.mov/.mp4/.webm` from `ACCEPT_MEDIA` and from the bucket's `allowed_mime_types`; show "🎬 Video memes are coming back soon" instead. Existing video memes: set to `pending` and review.
  - GIFs: max 8 MB, max 10 s / 300 frames, re-encoded server-side (drops metadata), moderated on sampled frames (33.3).
  - Re-enable video later only with: server transcoding to MP4 (strips metadata), frame sampling every ~1 s through 33.3, audio muted by default. Log that as a separate future task.

- [ ] **33.10 Only serve media from our own storage; tighten CSP.**
  - Database constraint: `image_url`, `poster_url`, `base_image_url` must start with the project's Supabase Storage public URL or `/seed/`. Apply the same allow-list in `sanitizeMediaUrl` and in `toAbsoluteUrl` inside `api/meme-og.js`.
  - CSP in **both** `index.html` and `vercel.json`: change `img-src` and `media-src` from `https:` to `'self' data: blob: https://<project>.supabase.co`; remove the leftover `https://i.imgflip.com` and `https://images.unsplash.com` from `connect-src`; add the moderation/challenge script origin if 33.7 needs one. Investigate removing `'unsafe-inline'` from `script-src` (move the JSON-LD and any inline script to hashed or external form) and report back if it is not feasible.
  - **Acceptance:** inserting a meme whose `image_url` is on another domain fails at the database; the site still renders with the tighter CSP at all three viewports with zero console CSP errors.

- [ ] **33.11 House rules, legal pages, takedowns and an honest security panel.**
  - New crawlable routes (add to `seoRoutes.js`, prerender, sitemap, footer): `/rules` (short, funny, clear: what's welcome, what gets removed, how strikes work), `/terms`, `/privacy` (what is stored, analytics, cookies/localStorage, how to delete your data), `/takedown` (copyright and "this is a picture of me" requests, with a form that creates a high-priority report), `/contact`. Draft the wording, mark each page `DRAFT – owner to review`, and do not publish as final until the owner signs off.
  - Add "Delete my account and memes" in Settings (calls a server function that removes the user's rows and files).
  - Upload sheet: one line above the Post button, "By posting you agree to the House Rules. No nudity, no hate, no personal info, nothing you don't have the right to share," linked to `/rules`.
  - Replace `getSecurityAuditReport()`'s hard-coded `100/100` with either real checks or remove the panel. Never show a security score that is not measured.
  - Wording: the games use pretend tokens. Remove "gambling-ready" / "gamble" phrasing from code comments and UI copy (`tokenEconomy.js` header, `App.jsx` ~line 1302) and keep the "free, just for fun, can't be bought or cashed out" line. Do not add any way to buy tokens (see 33.38).

- [ ] **33.12 One source of truth for the database.**
  - Create `supabase/migrations/` and rebuild the full schema from the live project (`supabase db pull` or dashboard export, done with the owner): `memes`, `comments`, `votes`, `reactions`, `profiles`, `follows`, `notifications`, `reports`, `banned_hashes`, `moderation_actions`, storage buckets and policies, every RPC. Delete the triplicated Phase 26 block. Keep `supabase-schema.sql` only as a generated snapshot or remove it.
  - Update Section 4 of this file ("Supabase Backend Contract") to match.

- [ ] **33.13 Safety test suite (must pass before each deploy).**
  - Add Vitest for unit tests (text filter, URL allow-list, rate-limit maths, `validateStakedGamePayout`, `pokerEngine`).
  - Add `tests/security.spec.js` (plain `fetch` against a staging Supabase project, publishable key only) asserting: cannot update/delete others' memes; cannot insert into `memes` directly; cannot upload to storage directly; cannot read others' notifications; vote replay is idempotent; non-moderator cannot read `reports`.
  - Add a GitHub Actions workflow running lint, build, unit tests and the security spec on every push.

#### 🙋 Owner actions for P0 (agents cannot do these)

1. **Pick and pay for a moderation provider** (image + text). Ask for one that includes detection of child sexual abuse material by hash matching, and read its reporting obligations. Create the API key and add it to Vercel/Supabase env vars.
2. **Legal check before promoting the site.** You run a site where the public can post content, from the UK. Check what the UK Online Safety Act requires of a small user-to-user service (Ofcom publishes guidance and a risk-assessment process), plus UK GDPR for accounts and analytics. If you want US visitors' copyright complaints handled the standard way, look at registering a DMCA agent. This file is not legal advice; a short session with a solicitor is worth it.
3. **Supabase dashboard:** enable Anonymous sign-ins, confirm which OAuth providers are really configured, turn on leaked-password protection, set yourself as `moderator`, create a separate staging project for tests.
4. **Decide the age position** (e.g. 13+ with content kept at a "teen-safe" level) so 33.3/33.4 thresholds and the `/rules` page match.
5. **Until 33.1–33.3 are live:** consider switching public uploads off (a single feature flag) so nothing harmful can be posted in the meantime. ✅ **Done 15 Nov 2026:** `PUBLIC_UPLOADS_ENABLED` in `src/config/featureFlags.js` is `false` — Post to Feed and Forge Publish show a "paused" message and nothing is sent to Supabase (guards in `publishMeme.js`, `mediaPipeline.js`, `useFeed.js`, `QuickUploadBar.jsx`, `MemeForge.jsx`). Set it to `true` only after 33.1–33.3 are live.

---

### P1 — 🪞 Make the fake things real

- [ ] **33.14 Real global leaderboards with arcade initials.** Table `scores (game, user_id, score, initials, period, created_at)`. Delete every hard-coded rival in `LeaderboardModal.jsx`. Classic 3-letter initials entry screen after a top-10 run (joystick-style letter picker, touch and keyboard), initials checked against a blocklist. Boards: Today / This Week / All-time, per game. Scores are submitted through an RPC with basic sanity limits per game (max plausible score per second of play, session token issued at game start); label boards "for fun" because browser games cannot be made cheat-proof. Empty board copy: "No scores yet. Be the first name on the cabinet."
- [ ] **33.15 Real Daily Caption Battle.** Entries, votes and yesterday's winner stored in Supabase (through 33.2–33.4). Winner gets the 👑 Caption King frame for 24 h and a permanent entry in a `/hall-of-fame` page.
- [ ] **33.16 Feed that goes all the way back.** Cursor pagination (`created_at`, `id`) replacing `.limit(50)`; tabs Hot (time-decayed score) / New / Top (day, week, all-time) computed by a SQL view; stop fetching `comments(*)` with the feed (load on open); list virtualisation so 500+ cards stay smooth on older iPads.
- [ ] **33.17 Creator profile pages** at `/u/<handle>`: avatar picked from a built-in set of original pixel-art avatars (no avatar uploads, which removes a moderation surface), memes posted, badges, high scores, follow button. Prerender basic metadata for SEO.
- [ ] **33.18 Real "people here now".** Keep the existing rule (hide below 2). Add small truthful signals: "🔥 12 upvotes in the last hour" on a card only when true.

---

### P2 — 🕹️ Make it immense fun (ship one at a time; each needs lobby entry, SEO route, prerender, sitemap, smoke test)

**New original 80s-style skill cabinets** (each: one lazy component + own CSS, canvas with `touch-action: none`, touch + keyboard + gamepad, 60 fps on a mid-range phone, pause on tab hide, `GameShell`, real leaderboard from 33.14, costs no tokens to play):

- [ ] **33.19 "Meme Invaders '86".** Rows of descending emoji/meme-face sprites, shields that crumble, a bonus saucer. Every 5th wave is a boss built from the day's top meme thumbnail (approved memes only, via `memeFeedBridge.js`).
- [ ] **33.20 "Neon Serpent".** Grid snake that eats reaction emojis; each emoji type has an effect (🔥 speed, 🗿 slow-mo, 💀 shrink). Swipe controls on phones.
- [ ] **33.21 "Brick Blaster".** Paddle-and-ball brick breaker where each level's brick layout spells a word or draws a pixel face; power-ups (multi-ball, laser, wide paddle). Drag anywhere to move the paddle.
- [ ] **33.22 "Sunset Sprint".** Pseudo-3D synthwave road racer (reuse the existing 80s car art): dodge traffic, collect cassettes that switch THE MEMES FM station, checkpoint timer.
- [ ] **33.23 "Vector Void".** Glowing vector-line space shooter with wrap-around screen and splitting rocks; twin-stick on touch (left thumb move, right thumb aim).
- [ ] **33.24 "Grid Riders".** Light-trail arena duel vs. AI; later 2-player on one keyboard / one phone held between two people.
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

## 0A. PREVIOUS ROUND — Phase 30: "Ruthless Traffic, Simplicity & iPhone Overhaul" (Nov 2026)

> **Context & Brutal Honest Review (Zero Traffic + iPhone UX + Too Complicated):**
> 1. **Why traffic is flat:** Shared `/m/<id>` meme links currently all showed the same generic logo preview card on WhatsApp, iMessage, Discord, Reddit & X (because client-side SEO meta doesn't execute for link scrapers). Meanwhile homepage meta/copy pushed *"777 Slots & 16-pad soundboards"* instead of high-intent searches (**"free meme & GIF generator with top/bottom text"**, **"funny memes"**). On top of that, first-time visitors were blocked by a fullscreen `"INSERT COIN — TAP ANYWHERE"` gate and mobile visitors were forced straight into a Reels trap!
> 2. **Why creating memes felt like homework:** `MemeForge` opened with a 6-tab cockpit (`Templates / Text / Layout / Image / Stickers / Filters`), dragging gizmos, and required a title + multiple steps just to put funny top & bottom text onto an image or GIF.
> 3. **Why iPhone felt broken:** Pressing `🕹️` after scrolling left the scroll offset below `Lobby` (`scrollY > 1800px` -> blank dark screen!), `FixedArcadeTopBar` clipped/covered pills under the right HUD, `MemeStockMarketGame` overlapped stock rows, Reels ducked behind the mobile dock, `GameShell` headers ate 168px vertically, and `VegasRouletteGame` crushed an 895px table inside a **112px** `overflow: hidden` slit!

### ✅ Phase 30A — Shipped Right Now (Verified via Lint, Build & Playwright)

- [x] **30.1 Simplify Meme & GIF Maker to "Image/GIF + Top & Bottom Text".**
  - *Done:* Simplified `src/components/forge/ForgeToolPanel.jsx`, `src/components/forge/MemeForge.jsx`, and `src/components/QuickUploadBar.jsx` around 2 core modes: **Image/GIF/Template + Impact TOP TEXT & BOTTOM TEXT** (with `🎲 Random Meme Text`, style/size/color strip, optional title, and Stickers/Filters tucked inside a collapsed `⚙️ Optional` toggle). Added live Top/Bottom Impact preview overlay inside `QuickUploadBar.jsx` (`src/index.css`). Streamlined card remix/caption buttons in `src/components/MemeCard.jsx`.
- [x] **30.2 Fix iPhone "Joystick = Black Screen" & Navigation Clutter.**
  - *Done:* `src/hooks/useViewMode.js` now resets `window.scrollTo(0, 0)` and clears stale `overflow: hidden` locks on every `viewMode` change (also wired in `src/App.jsx` and `src/components/GameRouter.jsx`). Disabled blocking `InsertCoinIntro` on first load and defaulted `/` to scrollable `feed` across mobile & desktop (`src/data/seoRoutes.js`). Changed Extras drawer button from duplicate `🕹️` to `🎛️` so `🕹️` unambiguously means Games Lobby.
- [x] **30.3 Fix iPhone Roulette & Mobile Overlaps ("Info hidden under other info").**
  - *Done:* Fixed `src/components/GameShell.css` (header shrank from 168px to ~95px on mobile, `calc(100dvh - 46px)`), `src/components/VegasRouletteGame.css` (removed nested `112px` `overflow: hidden` trap so full betting table scrolls smoothly inside `.tm-gs-body` with sticky bottom chip/spin bar), `src/components/MemeStockMarketGame.css` (horizontal swipeable mobile ticker strip), `src/index.css` (`.tm-fixed-game-pills` `flex: 1; min-width: 0;`, hidden `<640px` so pills never slide behind wallet/controls; fixed Reels container height for `.tm-mobile-dock`), `src/components/MemesRadio.css`, `src/components/DankPetWidget.css`, `src/components/ArcadeAiAssistant.css`, and `src/components/forge/MemeForge.css` mobile height constraints.
- [x] **30.4 Dynamic Per-Meme Social Preview Cards & Expanded SEO Sitemap.**
  - *Done:* Created `api/meme-og.js` + `vercel.json` rewrite (`/m/:id` -> `/api/meme-og?id=:id`) so every shared `/m/<id>` meme URL injects that meme's actual title, description, image (`og:image` / `twitter:image`), and canonical URL into `dist/index.html` for Discord, iMessage, WhatsApp, X, Reddit, and Googlebot. Updated homepage & `/meme-generator` SEO metadata (`index.html`, `src/data/seoRoutes.js`) and expanded `scripts/prerender-seo.mjs` so `sitemap.xml` indexes all `/m/<seed-id>` pages alongside main routes.

### ✅ Phase 30B — Implemented & Verified (SEO Traffic Engine, GIF Burn-In, Viral Share & Declutter)

- [x] **30.5 High-Intent Classic Template & GIF Landing Pages.**
  - *Done:* Added `/gif-meme-maker`, `/templates`, and all 20 individual classic template landing routes (`/templates/drake-meme-generator`, `/templates/expanding-brain-meme-generator`, `/templates/two-buttons-meme-generator`, etc.) in `src/data/seoRoutes.js` + `scripts/prerender-seo.mjs` (44 pre-rendered static SEO HTML routes total), pre-loading that exact template into `src/components/forge/MemeForge.jsx` with editable Top/Bottom captions, template `og:image`, Schema.org `SoftwareApplication` / `ImageGallery` JSON-LD (`src/utils/seoEngine.js`), and crawlable links in `src/components/SeoDiscoveryFooter.jsx`.
- [x] **30.6 Animated GIF Text Burn-In Export (`gifuct-js` + `gifenc`).**
  - *Done:* Added `burnInAnimatedGif` in `src/components/forge/forgeEngine.js` (dynamically imported so zero cold-start bloat) with full multi-frame GIF disposal handling, frame-delay preservation, and Top/Bottom caption + sticker compositing. Wired `🎞️ Download GIF` in `src/components/forge/MemeForge.jsx` so edited GIFs download as real animated `.gif` files with text burned in.
- [x] **30.7 Viral Share Links & Remixes Feed Filter.**
  - *Done:* Updated `handleShareMeme` (`src/hooks/useFeed.js`) and `src/components/MemeLiveCelebrationModal.jsx` to share `${origin}/m/<id>?ref=share` (triggering per-meme dynamic `/api/meme-og` social cards on WhatsApp, iMessage, Discord, X, and Reddit), and added the `😜 Remixes` challenge filter tab in `src/App.jsx` & `useFeed.js`.
- [x] **30.8 Brutal Declutter Pass #2 & Bundle Trim.**
  - *Done:* Converted static `GameRouter` / `FixedArcadeTopBar` / `ArcadeLoungePromo` imports in `src/App.jsx` to lazy `React.lazy` chunks (trimmed cold-start `index.js` by ~20 KB), removed unrequested automatic 95-second `Loot Goblin` popups, and kept `DankPetWidget` opt-in (`payphoneModalOpen`). Also fixed `SettingsSheet.jsx` (`unlockedCosmetics.has` crash when opening Extras Drawer) and `VegasPinballGame.jsx` (`← Memes` exit label).
- [x] **30.9 Dynamic Supabase Sitemap & JSON-LD Validation.**
  - *Done:* Created `api/sitemap.js` + `/sitemap.xml -> /api/sitemap` rewrite in `vercel.json` combining all 44 static `SEO_ROUTES`, 64 starter memes, and top 500 live Supabase memes (`score desc`). Added Phase 30B Playwright tests covering template route preloading + JSON-LD + `og:image`, animated GIF text burn-in download (`GIF89a`), and `😜 Remixes` + `/m/:id?ref=share` copy links in `tests/smoke.spec.js`.

### 📣 Owner Checklist (External Growth Levers Code Alone Can't Do)
1. Deploy to Vercel so `/api/meme-og` & `/api/sitemap` are live, then submit `https://thememes.net/sitemap.xml` inside **Google Search Console** & **Bing Webmaster Tools**.
2. Share direct `/templates/drake-meme-generator`, `/gif-meme-maker`, and `/m/<id>?ref=share` links on Reddit, Discord, X, and TikTok with real humorous memes (now every link renders a crisp image preview card!).

---

> 📜 **Completed Phases 1–29 (and the Phase 28 P1–P5 notes) were moved word for word to [`docs/HISTORY.md`](docs/HISTORY.md).**

---

## 0b. Phase 28: "Fun First, Findable" — remaining P6 backlog (P1–P5 done, see `docs/HISTORY.md`)

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
