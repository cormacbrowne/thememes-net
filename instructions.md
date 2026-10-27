# THE MEMES.net (`thememes-net`) — Codebase Structure & Update Instructions

> **Purpose of this file:** This document serves as the living architectural reference, key design decisions log, file map, backend contract, and phased roadmap for **THE MEMES.net** (`c:\Users\corma\thememes-net`). Consult and update this file during regular updates until the platform is perfected.

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
    │   └── seoEngine.js               # Dynamic Title, Meta, OpenGraph & Schema.org JSON-LD Structured Data Engine
    └── components/
        ├── NavbarHud.jsx              # Simplified top HUD with Fair Token Wallet, Daily Cap indicator, Sub-Game quick pills & Studio CTA
        ├── QuickUploadBar.jsx         # Phase 1: 1-Click inline Quick-Upload Bar (drag-drop, paste, camera snap, instant preview & publish)
        ├── MemeCrushGame.jsx          # Phase 3: "Meme Crush Saga" Candy-Crush style 8x8 Match-3 Puzzle Sub-Game with bombs & combos
        ├── VegasPinballGame.jsx       # Phase 4: "Las Vegas Retro Pinball" 60fps HTML5 Canvas Pinball Machine with silly sounds & jackpots
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
