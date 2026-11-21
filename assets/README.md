# assets/: AI image pipeline (owner: image-studio)

```
assets/prompts/<batch>.md   → prompt batch (image-studio writes, design-director OKs)
assets/inbox/<batch>/       → raw images from Gemini (not committed; see .gitignore)
public/…                    → curated WebP files the site serves (on a claude/… branch)
assets/image-log.md         → one row per published image
```

## Routes
- **Route A (default, cheapest on Claude usage):** Max gives Cormac the batch; Cormac pastes it into the Gemini app and saves results to `assets/inbox/<batch>/` as `<batch>-<promptId>-<variant>.png`. Then `/images curate <batch>`.
- **Route B (uses Claude usage):** Claude drives the Gemini web app in a browser. Only when Cormac asks.

Gemini app limit: Pro allows up to ~100 images/day per Google's help page (limits change; check before planning a big day).

## Gates
- Never real people, copyrighted characters, brands, logos or real products (`design/ai-image-style.md`).
- **Nothing is published at scale until legal-compliance has cleared Gemini's commercial-use and watermark terms** (`ops/decisions.md` D-003).
- design-director approves the look; qa-reviewer checks the feed at 390×844 and 1280×800.

## Top priority: replace the graphic-style feed images
Today the starter feed (`src/data/starterMemes.js`) is 64 seed memes, `public/seed/seed-{tech,dank,gaming,relatable}-01…16.webp`, each a flat pixel-graphic card (540×480) with its caption and a footer baked in. Each points at one of 20 graphic templates `public/seed/tpl-*.webp` (540×480) via `base_image_url`; those are also used as house-meme backgrounds (`src/components/forge/forgeEngine.js`).

**Plan**
1. **Pilot (B001):** 4 dank seeds → generate, curate, get design + legal sign-off. Learn what works; update `design/ai-image-style.md`.
2. **Caption rendering:** AI pictures carry no text, so the seed memes need their captions composited on by code (the house memes already do this: bare template + live caption overlay). tech-lead decides: bake captions at build time with a script, or render live like house memes. That's a build task to route.
3. **Templates:** 20 new text-free base pictures with neutral names (D-005 covers recognisable names).
4. **Seeds:** remaining 60 seed images, in batches of ~16 (one category per batch).
5. Battle images (14 daily + 12 Christmas) after that.

**Output size:** 9:8. Proposed 1080×960 (2× today) so pictures are sharp on phones, provided feed images stay under ~120 KB. design-director and tech-lead confirm on the pilot.

## Progress
| Batch | Target | Prompts | In inbox | Curated | Published | Notes |
|---|---|---|---|---|---|---|
| B001 | seed-dank-01…04 (pilot) | 4 (design OK) | 0 | 0 | 0 | Route A sent to Cormac 21 Nov; publish waits on D-003 |
