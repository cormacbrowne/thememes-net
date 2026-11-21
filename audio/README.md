# audio/: sound and music (owner: audio-director)

## Where sound lives in code
- `src/utils/soundEngine.js`: SFX, UI sounds, soundboard pads (all procedural Web Audio synthesis).
- `src/utils/musicEngine.js`: procedural synthwave/chiptune for MemesRadio and game music.
- `src/utils/radioBus.js`: radio playback bus.
- `src/utils/settingsStore.js`: mute, volume and Calm settings.
- **Licence ledger:** `docs/ASSETS.md`. Every sound is recorded there.

## Sonic brand
- **Feel:** neon arcade at 2 a.m.: analogue synth bass, bright arps, gated snares, chip blips. Funny, never shrill.
- **Signature moments:** win, level-up, battle opens, meme published, MemeDollarz earned. Each gets one short (< 1.2 s) stinger from the same synth family.
- **Loudness:** nothing louder than the `boom` pad; UI ticks quieter than game SFX; music sits under SFX.
- **Quiet by default, loud on reward.**

## Rules
- No audio before a user gesture (`touchend`, `click`, `pointerup`, `keydown`; **not** `touchstart`).
- Every sound respects mute and volume; looping sound always has an off switch.
- Default to self-made synthesis (licence-free). Any external file needs a commercial licence that allows use in user-exported meme videos, recorded in `docs/ASSETS.md`, and a legal-compliance check first.
- No copyrighted songs, samples of real tracks, or sound-alikes of famous stingers or jingles.

## Licences
| Asset | Source | Licence | Allows commercial + video export? | Checked by / date |
|---|---|---|---|---|
| All current SFX and music | Self-made Web Audio synthesis | Repo original | Yes | see `docs/ASSETS.md` |
