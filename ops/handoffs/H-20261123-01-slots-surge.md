# Handoff H-20261123-01: Slots: bring back the fast "surge" spin, show the word SURGE once

**Paste into:** Antigravity Orchestrator (Neon)
**Thinking level:** high (game engine, rAF reel loop)
**Folder / branch:** `../thememes-net-gemini` on `gemini/slots-surge-fix` (see D-004; if there's no worktree, use the main folder with strict turn-taking and set "Active lane" on `ops/work-board.md` to Gemini)

**Owner report (23 Nov 2026):** "The accelerated spin has stopped working on the slot machines. SURGE is also written twice."

---
### Copy from here

You are working on thememes.net. First read `AGENTS.md` and `GEMINI.md` in the repo root and follow them.

**Goal:** On every slot machine, random "surge" spins must visibly speed up the reels again on phone and desktop. The word "SURGE" must not appear twice for one event. Reduced motion and lite mode must still win: when either is on, there is no fast spin.

**Background (Claude's first look, not yet proven):**
- The fast spin lives in `src/components/slots/reelMotion.js` `startSpin()` (`surge` → cruise speed × 1.6, plus a pulse in the `cruise` phase). `VegasSlotMachine.jsx` sets `surge` on about 28% of spins (`isSurgeSpin` around line 1021 for the 3-reel machines, `isSurgeRoll` around line 1432 for the 5-reel machines).
- **Lead 1, lite mode:** `isJuiceDisabled()` (`src/utils/juice.js`) turns all reel motion into "snap to result" when lite mode, calm mode or reduced motion is on. `src/App.jsx` (around line 208) switches lite mode **on by default for every phone and tablet** and for 4-core machines. The `⚡ SURGE ⚡` badge (`.tm-slot-surge-flash`) is hidden only for OS reduced motion, not lite mode, so phone users may see SURGE with no fast spin. Check what `getSettings().litePerfMode` returns on a fresh phone visit and whether it matches the `tm-lite-perf` class.
- **Lead 2, too subtle:** normal cruise is 2750 px/s and surge is 4400 px/s. Both are above the blur threshold (1400 px/s in `applyDomTransform`), so both show the same blurred strip and the surge may look no different. Surge spins also stop at the same time as normal spins.
- **Lead 3, recent change:** commits `90d23a1` and `f65d82c` (22 Nov) touched game loading, reduced-motion CSS in `src/index.css` and the slots. Check none of them broke this.
- **"SURGE twice" lead:** two different features share the name. (a) The random hyper-speed spin shows a `⚡ SURGE ⚡` badge, while its status banner already says "⚡ OVERDRIVE ROLL!". (b) On the Lightning Vault machine, the voltage button is "🔋 SURGE (n%)" and arms a "2× Overcharge Surge". The help text (around lines 2173, 2192, 2214) describes both as "Surge". Confirm what the owner sees on screen before changing anything.

**You may change only these files:**
- `src/components/slots/reelMotion.js`
- `src/components/VegasSlotMachine.jsx` (surge/overdrive logic and labels only)
- `src/components/VegasSlotMachine.css` (surge badge rules only)
- `tests/unit/slotSurge.unit.mjs` (new)
- `docs/ui/slots-surge/` (screenshots)

**Do not touch:** `src/App.jsx`, `src/utils/juice.js`, `src/utils/settingsStore.js`, `src/index.css`, `src/utils/slotEngine.js` (odds and payouts must not change), `src/utils/tokenEconomy.js`, `vercel.json`, `index.html`, `package.json`, anything in `supabase/`. If the fix needs one of these (for example changing lite mode defaults), **stop and report**. Don't work around it.

**Steps:**
1. Run the app (`npm run dev`). Open a slot machine at 390×844 (phone, touch emulation on) and at 1280×800. Spin about 20 times on one 3-reel and one 5-reel machine. Note: is lite mode on, do the reels animate at all, do surge spins look faster, and where does "SURGE" appear?
2. Write down the root cause in one or two sentences, with file and line.
3. Fix it:
   - Surge spins clearly faster than normal spins, for example a higher cruise speed, a short extra-fast burst, or a slightly longer spin. Don't touch results or odds.
   - Where motion is off (lite, calm, reduced motion), hide the surge badge too, so it never promises a fast spin that doesn't happen.
   - One name per feature. Recommended: the random fast spin becomes **"⚡ OVERDRIVE ⚡"** (matching its banner), and "SURGE" stays only for the Lightning Vault voltage button. Update the help text to match.
4. Add `tests/unit/slotSurge.unit.mjs`. It should check that `startSpin({ surge: true })` gives a higher cruise speed than a normal spin, and that the badge text appears only once in `VegasSlotMachine.jsx`.
5. Take screenshots: a surge spin mid-flight at 390×844 and 1280×800, and the Lightning Vault controls. Save them in `docs/ui/slots-surge/`.

**Done when:**
- [ ] `npm run lint`, `npm run build` and `npm run test:unit` pass
- [ ] Surge spins are visibly faster on a phone-size viewport and on desktop (say how you checked)
- [ ] With reduced motion or lite mode on, there's no fast spin and no surge badge
- [ ] "SURGE" appears once per event; help text matches
- [ ] Payouts and odds unchanged (`slotEngine.js` untouched)
- [ ] Screenshots at 390×844 and 1280×800 in `docs/ui/slots-surge/`
- [ ] Committed on `gemini/slots-surge-fix`. Do not merge or push to main.

**Finish with the HANDOFF REPORT format from `AGENTS.md`, and include the root cause.**

### Copy to here
---

## Report
_(paste Gemini's report here when it comes back)_

## Review
- tech-lead:
- design-director (visuals):
- audio-director (only if a sound changed):
- qa-reviewer:
