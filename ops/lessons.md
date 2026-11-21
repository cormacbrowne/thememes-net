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
