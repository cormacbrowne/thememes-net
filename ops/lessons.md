# Lessons

One entry after every task. Keep it short. `/retro` turns these into playbook and routing changes.

Format:
```
## <date>: <task id> <task>
- Worked: …
- Didn't: …
- Routing note: <was the lane/model right?>
- Suggest: <a playbook change, if any>
```

## 2026-11-21: T-000 Agent team set up
- Worked: grounding every agent file in the real repo (paths, scripts, rules from `instructions.md`).
- Didn't: the brief assumed Next.js; the code is Vite + React (D-001).
- Routing note: set-up and playbook writing belong on Claude.
- Suggest: none yet.

## 2026-11-21: T-003 B002 template image prompts
- Worked: tracing image use first showed 20 templates power both battles and house memes, so one batch upgrades both. Design review removed text traps and compositions too close to source memes.
- Didn't: the prompts were written before legal finished, so "no watermarks" had to be removed afterwards from B002, B001 and the style guide.
- Routing note: Claude for prompts and checks, Route A for generation. Run legal before prompt writing when a batch depends on tool terms.
- Suggest: image-studio checks `ops/decisions.md` conditions before writing any new batch.

## 2026-11-21: T-003 B002 generation in the built-in browser
- Worked: Claude drove Gemini while Cormac clicked Save. Early design review caught problems before most of the batch was spent. Follow-up edits in the same chat fixed small defects cheaply.
- Didn't: the approved prompts produced an all-neon, samey set and Cormac had to call it out. Naming "bars" or "letterboxing" made Gemini draw them. A blind coordinate click opened Gemini's editor. Max ran the first images without bringing the specialists in.
- Routing note: before generating, get design-director's palette mix and meme-content-lead's gags and trend view. Find the download button by name on every image.
- Suggest: describe full-bleed positively ("background runs to the very top edge"), and test 3 varied prompts before committing to a batch.

## 2026-11-21: T-003 battle launch preparation
- Worked: new filenames protect live battles and old memes from a mid-contest picture swap. Legal, design and QA each caught real misses: unlabelled views, leftover meme names and "original" claims.
- Didn't: fixes went in piecemeal because the first search for flagged wording was too narrow. A file attached in Gemini was the wrong image, caught only by looking at the thumbnail.
- Routing note: run legal's wording sweep across the whole repo before the first review round.
- Suggest: check the thumbnail before every Gemini verification, and list every view of an image before adding a label.

## 2026-11-23: T-007 share link went to the wrong site
- Worked: before changing anything, loaded the live battle URL on a phone-size browser. That proved the preview card worked, so the bug was the message text: iMessage auto-links "MEMES.net".
- Didn't: our brand name "THE MEMES.net" contains another site's domain, and nobody had checked share text for auto-linking.
- Routing note: a small fix like this belongs on Claude; the slots engine bug went to Gemini with a brief.
- Suggest: growth-marketer and qa-reviewer add "read share text as a phone would (what gets auto-linked?)" to the share-preview checklist.

## 2026-11-23: T-010 feed image swap
- Worked: checking the live feed before building showed the graphic images came from the house memes on the 20 old templates, not from the 64 sample memes (those are switched off in the feed). Replacing the 20 template files fixed the feed, Forge and future house memes at once, with no database or Edge Function change. Running legal, design and QA in parallel against the exact deploy branch kept it to an afternoon.
- Didn't: the first build targeted the sample memes because the brief (CLAUDE.md §8) described them as "the feed". Legal's first pass came back before its scope was widened, so it had to run twice.
- Routing note: Claude did it end to end. Image compositing in headless Chromium with the site's own fonts made 64 images in under a minute.
- Suggest: before any "replace what users see" task, screenshot the live page and list the image URLs first. Keep QA screenshots as small JPEGs; PNGs added 7 MB to the repo.

## 2026-11-25 — Caption battle card: image size + iPhone overflow (fix to W2-1)
- **What broke:** the Gemini W2-1 QA "overflow fix" shrank the hero image to a fixed 164–204px letterboxed box, and missed the real overflow cause. Content still ran off the right edge on iPhone.
- **Root cause:** a CSS grid with no `grid-template-columns` gets an `auto` track. That track grows to fit nowrap text (the standings rows), so `min-width: 0` on the parent alone doesn't stop it. Fix: `grid-template-columns: minmax(0, 1fr)` on every nested grid that holds truncated text.
- **Check that worked:** a Playwright script that lists every child whose right edge is past the card's right edge, run against mocked battle data in each state (still voting / all voted with standings). Check both states, not just the empty one.
- **Routing note:** for mobile layout fixes, a Claude Code fix with a before/after overflow measurement beat the Gemini screenshot pass.

## 2026-11-25 — Share messages carried two links (homepage + deep link)
- **What broke:** battle share text said "on THE MEMES.net"; `linkSafeShareText` turned that into the homepage URL, then `ensureShareUrlInText` appended the battle URL, so iMessage showed two links.
- **Fix:** one-link rule in `src/utils/shareText.js` — when the target is a deep link, homepage-only mentions become plain "THE MEMES" (doesn't auto-link). Fixed once in the helper, so every share button benefits. Battle copy now: `⚔️ Caption battle: "<title>". Think you can out-caption me? <link>`.
- **Check that worked:** QA ran edge cases through the helper (full stops, upper case, blank lines, trailing slash) and caught 4 misses before ship.
- **Routing note:** small copy/helper fix — Claude Code end to end, no Antigravity step needed.
