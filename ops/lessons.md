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

## 2026-11-26: T-012 Google "why pages aren't indexed"
- Worked: checking the live sitemap URL by URL (status code, canonical, robots) found the one real bug in about a minute: 4 creator pages were listed as `/u/MemeLedge` but canonicalised to `/u/memeledge`. The other three reasons in the report (redirects, discovered/crawled not indexed) were normal for old URLs and thin pages, not bugs.
- Didn't: the server, the app and the sitemap each built creator URLs their own way. The app copied the address bar's casing, so after rendering it disagreed with the server.
- Routing note: Claude, inline. A curl loop over the sitemap beats reading the code first.
- Suggest: growth-marketer adds a "sitemap loc == canonical for every URL" check to the SEO checklist (could become a smoke test).

## 2026-11-26: T-013 Supabase over the free allowance
- Worked: the "over the free amount" email was about egress, not storage. The logs showed one 8.4 MB video sending 451 MB a day. Checking usage by type before deleting anything avoided a cleanup that would have saved nothing.
- Didn't: `preload="metadata"` isn't a size guard. Chrome downloads a short clip in full, so every home-page visit pulled the whole file, and the meme page pulled it twice.
- Routing note: Claude, inline. With no service key in the container, a temporary Edge Function with the file list hard-coded and a hashed one-off token did the uploads and deletes. It was stubbed out straight after.
- Suggest: tech-lead adds a weekly egress check (top storage paths by bytes) to /capacity.

## 2026-11-26: T-015 Supabase egress, part 2 (our own tests)
- Worked: grouping Storage egress in the edge logs by user agent and referer showed about 370 of 600 MB in one day came from headless Chrome on `127.0.0.1:4173`, `localhost:4789/4790` and Vercel previews, not from visitors.
- Didn't: smoke tests faked every REST, auth and function call but not `/storage/`, so every agent test and screenshot run downloaded real user media from production.
- Routing note: Claude, inline. One auto fixture (`tests/storageStub.js`) covers every spec. One-off screenshot scripts must call `blockStorage(page)` themselves, so this is in `instructions.md` and the handoff template for Gemini too.
- Didn't (2): I first reported "54 passed" because `| tail` hid both the "66 failed" line and the exit code. Read Playwright's summary block in full and keep the real exit code (no pipe) before quoting a result.

## 2026-11-27: T-016 step 1+2 (tests off live Supabase, takedown copy)
- Worked: making `get_hot_feed` "missing" in the fixture reused the app's own fallback to `memes_feed_view`, which the specs already faked. One fixture line fixed the data step for 8 test groups without touching any spec.
- Worked: faking anonymous sign-up also neuters any write a test forgets to fake, because it carries a fake token the live server rejects (328 refused calls, 0 writes in a full run). Tech-lead checked every Edge Function and RPC and found no anon-key write a test can reach.
- Didn't: faking the RPC took the production Hot-tab path out of smoke. QA caught it, and a vitest now covers it (`hotFeedRpc_t016.test.js`).
- Didn't: the planned "/contact" fallback for takedowns would have been circular, because /contact says the form is the only route. Read the target page before pointing users at it.
- Didn't: a `sed … && grep -c … && cat >> lessons` chain stopped at grep's exit 1 and silently skipped the lesson. Don't put unrelated writes after a grep in an && chain.
- Routing note: Claude, inline, with legal, QA and tech-lead in parallel. Legal turned a copy tweak into a real decision for Cormac (no public contact route).

## 2026-11-27: T-016 step 3 (stale smoke tests)
- Worked: Playwright's `error-context.md` page snapshots from one full run told me the current button names without opening a browser. Fix, rerun, and read the next layer. Long tests fail one stale step at a time, so expect 3–4 rounds.
- Worked: fixing tests against the real UI found 4 real bugs that a "make it green" pass would have hidden (3 doubled or leftover casino names, 1 SEO title swap). When a test says text is wrong, check the app before the test.
- Didn't: the preview server serves `dist/`, so after any `src/` change, rebuild before rerunning smoke, or the run tests stale code. I lost one 15-minute run to this.
- Didn't: sed with `$` and backslashes in JS regexes broke several edits silently. Use a literal find/replace script (or Edit) for test code.
- Routing note: Claude, inline, about 3 hours. Not a good Gemini job after all: most fixes needed reading app code to decide "stale test vs real bug".
