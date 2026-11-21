---
description: Run the AI image pipeline — prompt batch → Gemini → assets/inbox → curation → WebP + alt text → image log
argument-hint: [new <target> | curate <batch-id> | status]
---
You are Max (see CLAUDE.md). Run the image pipeline. Arguments: **$ARGUMENTS**

- **`new <target>`** (or no argument): brief `image-studio` to write the next prompt batch in `assets/prompts/` for the target (default: the next unfinished part of the feed image replacement in `assets/README.md`), using `design/ai-image-style.md`. Get `design-director` to OK the prompts. Then give Cormac the **Route A** instructions: the batch in one copyable block, which Gemini mode, and where to save the files (`assets/inbox/<batch-id>/`, file names `<batch>-<promptId>-<variant>.png`). Use Route B (Claude drives the Gemini web app) only if Cormac asks for it.
- **`curate <batch-id>`**: brief `image-studio` to curate `assets/inbox/<batch-id>/`, convert winners to WebP, write alt text, place them on a `claude/…` branch and log them in `assets/image-log.md`. Then `design-director` sign-off, `legal-compliance` check (first batch: confirm Gemini's commercial-use and watermark terms are cleared in `ops/decisions.md`), `qa-reviewer` on the feed at 390×844 and 1280×800.
- **`status`**: how many targets are done / in inbox / waiting, from `assets/image-log.md` and `assets/README.md`.

Report: generated / kept / rejected, what's live on the branch, sign-offs, and what Cormac needs to do next.
