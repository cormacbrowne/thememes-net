# THE MEMES.net — Audio & Visual Assets Ledger

This file records the provenance and licence status of every sound effect and bundled template image used in THE MEMES.net (including seasonal additions from Phase 2.9 and readiness for Phase 3 exported video clips).

---

## 1. Soundboard & Stinger SFX (`src/utils/soundEngine.js`)

All 18 soundboard pads in `SOUNDBOARD_PADS` (plus all arcade & UI SFX in `src/utils/soundEngine.js`) are **100% original procedural Web Audio API synthesis** generated cleanly at runtime using `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `WaveShaperNode`, and white-noise `AudioBuffer` generators authored in this repository.

- **No external `.mp3`, `.wav`, or third-party sampled clips are bundled or fetched.**
- **Commercial / Video-export status:** Self-made & royalty-free (safe to synthesize/export into user-generated meme videos in Phase 3 without attribution or third-party clearance).

| Pad ID | Label | Category | Synthesis Method in `src/utils/soundEngine.js` | Source / Licence |
| :--- | :--- | :--- | :--- | :--- |
| `boom` | Vine Boom | Core Comedy | `playBoom()` — sine/sub-bass pitch envelope + noise transient | Self-made Web Audio synthesis (MIT / Repo original) |
| `airhorn` | MLG Airhorn | Core Comedy | `playAirhorn()` — detuned sawtooth chord (`F#4/A#4/C#5`) | Self-made Web Audio synthesis (MIT / Repo original) |
| `rimshot` | Ba Dum Tss | Core Comedy | `playRimshot()` — tom/snare bursts + filtered noise hi-hat | Self-made Web Audio synthesis (MIT / Repo original) |
| `sad` | Sad Trombone | Core Comedy | `playSadTrombone()` — descending chromatic brass sawtooth slides | Self-made Web Audio synthesis (MIT / Repo original) |
| `bruh` | Bruh | Core Comedy | `playBruh()` — formant-filtered low triangle sweep | Self-made Web Audio synthesis (MIT / Repo original) |
| `bonk` | Bonk | Core Comedy | `playBonk()` — pitched percussive triangle knock | Self-made Web Audio synthesis (MIT / Repo original) |
| `wow` | Anime Wow | Core Comedy | `playWow()` — dual formant-swept sine/triangle choir swell | Self-made Web Audio synthesis (MIT / Repo original) |
| `cricket` | Crickets | Core Comedy | `playCrickets()` — high-frequency amplitude-modulated sine chirps | Self-made Web Audio synthesis (MIT / Repo original) |
| `mlg` | Airhorn Barrage | Core Comedy | `playMlgHorn()` — rhythmic triple sawtooth airhorn stinger | Self-made Web Audio synthesis (MIT / Repo original) |
| `nope` | NOPE! | Core Comedy | `playNope()` — downward pitch-dropped square buzz | Self-made Web Audio synthesis (MIT / Repo original) |
| `dialup` | 56k Modem | Core Comedy | `playDialup()` — dual-tone FSK handshake chirps + white noise | Self-made Web Audio synthesis (MIT / Repo original) |
| `record` | Vinyl Scratch | Core Comedy | `playRecordScratch()` — rapid bi-directional triangle scrub | Self-made Web Audio synthesis (MIT / Repo original) |
| `boing` | Cartoon Boing | Core Comedy | `playBoing()` — vibrating FM sine spring bounce | Self-made Web Audio synthesis (MIT / Repo original) |
| `gong` | Dramatic Gong | Core Comedy | `playGong()` — inharmonic metallic FM partial cluster | Self-made Web Audio synthesis (MIT / Repo original) |
| `alienbeam` | UFO Brainray | Core Comedy | `playAlienBeam()` — LFO-modulated sci-fi sine warble | Self-made Web Audio synthesis (MIT / Repo original) |
| `xpcrash` | Brain Crash | Core Comedy | `playXpCrash()` — sawtooth dramatic alert chord | Self-made Web Audio synthesis (MIT / Repo original) |
| `jinglebells` | **Jingle Bells** | **Seasonal (2.9)** | `playJingleBells()` — procedural celestial sine/triangle chime melody (`E5-E5-E5 / E5-E5-E5 / E5-G5-C5-D5-E5`) + shimmer sleigh noise burst | Self-made Web Audio synthesis (MIT / Repo original) |
| `hohoho` | **Ho Ho Ho!** | **Seasonal (2.9)** | `playHoHoHo()` — three deep low-pass sawtooth vowel-formant bursts (`Ho-Ho-Ho`) + crisp sleigh bell tail | Self-made Web Audio synthesis (MIT / Repo original) |

---

## 2. Procedural 80s Cyber-Arcade Music (`src/utils/musicEngine.js`)

All chiptune / synthwave radio tracks in `MemesRadio` and game BGM are procedurally sequenced in `src/utils/musicEngine.js` using the Web Audio API (self-made, zero external audio files).

---

## 3. Meme Templates, Battle Artwork & Prank Screens

- **Starter Templates (`public/seed/tpl-*.webp` & `src/data/starterMemes.js`):** Local bundled `.webp` assets shipped with the repo; moderator takedown workflow covers `/takedown`.
- **Custom Daily Battle Artwork (`battle-image` Edge Function):** Moderator-uploaded `.webp` artwork uploaded directly via `/admin/battles`.
- **Prank Screens (`src/components/BossKeyOverlay.jsx` & `src/components/PrankScreensPage.jsx`):** 100% original HTML/CSS/SVG parody UI (no real OS, Microsoft, Apple, or Zoom trademarks or proprietary brand images).
