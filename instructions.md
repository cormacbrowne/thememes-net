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
│   ├── favicon.svg                    # App favicon
│   └── icons.svg                      # SVG sprite sheet
└── src/
    ├── main.jsx                       # React DOM root mount (<StrictMode><App /></StrictMode>)
    ├── index.css                      # Cyber-Arcade CSS: Synthwave grid, 3D holo tilt, rarity foil, CRT overlay
    ├── App.jsx                        # Main application coordinator (state, Supabase sync, studio canvas renderer)
    ├── supabaseClient.js              # Unified ES module Supabase client (reads .env.local with fallback)
    ├── data/
    │   └── starterMemes.js            # makeSvgMeme(), STARTER_MEMES, STUDIO_TEMPLATES, VIRAL_CAPTIONS, RANKS, getMemeRarityTier()
    ├── utils/
    │   ├── soundEngine.js             # Web Audio API synth SoundEngine class & sfx singleton
    │   └── canvasMutator.js           # loadMemeIntoStudioCanvas() & stampArcadeCartridgeFooter()
    └── components/
        ├── NavbarHud.jsx              # Sticky combo bar + top HUD (XP bar, CRT toggle, SFX toggle, Ranks CTA, Studio CTA, Auth)
        ├── DailyBountyBanner.jsx      # Featured Daily Meme Bounty banner (+200 XP 2x reward challenge & prompt switcher)
        ├── MemeCard.jsx               # 3D holographic tilt card with rarity/bounty/spicy badges, spoiler blur, report button & Mutate bar
        ├── MemeSkeletonGrid.jsx       # Neon cyber-arcade shimmer skeleton cards during feed loading
        ├── MemeStudioModal.jsx        # HTML5 Canvas Meme Forge Studio 2.0 (+ Fork/Mutate, Daily Bounty & Spoiler Blur toggle)
        ├── MemeTheaterModal.jsx       # Fullscreen Theater Lightbox modal with deep-linking & side-by-side lineage
        ├── MemeEvolutionModal.jsx     # Genealogical Evolution Tree modal
        ├── LeaderboardModal.jsx       # Hall of Fame Leaderboard modal (Top Meme Lords, Top Scored Memes, Most Mutated Origins)
        ├── PlayerProfileModal.jsx     # Creator Arcade Profile & Achievement Badge Case modal (+50 XP mutation royalties)
        ├── MobileArcadeDock.jsx       # Thumb-friendly mobile bottom arcade navigation dock (Feed, Swipe, +Forge, Arena, Ranks)
        ├── SwipeDeck.jsx              # Physics-driven Hyper-Swipe deck view mode with drag stamps
        ├── BattleArena.jsx            # King of the Hill 1v1 Sudden Death Meme Battle Arena view mode
        └── AuthModal.jsx              # Instant Arcade Guest login + Supabase Email/Password Auth modal
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
- [x] **Mobile Bottom Arcade Dock** (`src/components/MobileArcadeDock.jsx`):
  - [x] Thumb-friendly bottom navigation bar on mobile/tablet screens (`📱 Feed`, `⚡ Swipe`, `🎨 +Forge`, `⚔️ Arena`, `🏆 Ranks`).
- [x] **Safety, Moderation & Bundle Optimization**:
  - [x] 15MB upload validation, 4-second anti-spam publish cooldown, `🌶️ Spoiler / Spicy` click-to-reveal blur toggle (`is_spoiler`), 1-click `🚩` community report/hide button with undo/restore, and vendor chunk splitting in `vite.config.js`.

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
