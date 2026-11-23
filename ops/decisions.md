# Decisions

Max collects decisions here. Open ones go into every report to Cormac until they're answered. Each has a recommendation.

## Open

### D-002: Monthly spending cap
Set a monthly cap for new spend in `budget.md` (currently £0).
**Recommendation:** keep £0 until there's a specific need; decide per item.

### D-003: Gemini AI images: commercial use and watermarks
Before images from the Gemini app are published on the site at scale, legal-compliance checks Google's current terms: may outputs be used commercially on a site that later carries ads, who owns them, are visible watermarks or SynthID marks present and must they stay, and is any AI-content labelling needed.
**Status:** checked 21 Nov 2026 by legal-compliance. **C1 confirmed 21 Nov 2026:** Media watermark already showed Off in Gemini Settings on Cormac's Pro account before B002 was generated; it was not changed. **C3 met.** **C4 human check:** Cormac approved all 20 final B002 images on 21 Nov 2026 after viewing the contact sheet. **C2 met for B002:** on 21 Nov 2026 Gemini's verification detected SynthID in the converted WebP of P03 (`battle-panicking-robot`). C5, C6 and C7 are met for the battle launch, live 21 Nov 2026, with library display names deferred below. Forge and house-meme image swaps need their own check. Originals from Gemini are JPEG, so read "original PNG" in C2 as the original download. Images can be generated and curated, but **nothing is published until C1-C7 are met**. Next re-check due by 21 Feb 2027, or sooner if Google's terms change, and again before ads go live. This is a compliance check, not formal legal advice.

**Verdict**
- **New, original Gemini app images (B001 and the 20 replacement templates): CLEARED WITH CONDITIONS.**
- **Existing `public/meme-templates/` library: NOT CLEARED** for ads or wider promotion until reviewed (see Finding 6).

**Conditions for new images**
- **C1, visible mark:** before generating, Cormac opens gemini.google.com > Settings > Media Watermark and turns the visible mark off using Google's own setting. If the setting is not there, stop and tell Max. Do not crop, paint out, cover or use a remover tool on the mark.
- **C2, processing:** images made with the mark off may be resized, cropped, converted to WebP and captioned. Never deliberately remove or attack SynthID. Keep the original PNG, and test one converted image with Gemini's verification tool per batch, recording the result.
- **C3, prompts:** take "no watermarks" out of the B001 style block and future batches, so no prompt asks the model to suppress a mark.
- **C4, content:** no real people, characters, brands or close recreations of a famous meme photo or drawing. Reuse the joke idea only, with a different subject, setting and composition. A person checks every image.
- **C5, honest wording:** do not say or imply the art is human-made. Replace "We redrew each format" and "safe to share anywhere" (`src/data/memeTemplates.js:1104-1108`) and "Original artwork by THE MEMES.net" (`src/utils/templateSeo.js:51`). Add a plain "AI-generated image" note where these images appear, and a line on the legal pages.
- **C6, names:** change the priority display names in Finding 5 before the new images go live.
- **C7, records:** one `assets/image-log.md` row per image, including the date, Gemini account plan, watermark setting and this check.

**Findings**
1. **Commercial use: permitted by inference, not expressly granted.** Google's Terms and Prohibited Use Policy apply to Gemini Apps. I found no ban on commercial use of consumer Gemini app images and no express commercial licence. I found no difference in usage rights between free and paid consumer plans. The API has its own terms and is not covered by this clearance. Google Labs tools (Flow, ImageFX) are also outside it. Google's Terms carry an indemnity from business users, so Cormac could bear the cost of claims arising from unlawful use.
2. **Ownership: Google will not claim ownership, but that does not guarantee Cormac owns copyright.** UK protection for wholly computer-generated works still appears in the Act, but the Government proposed removing it in March 2026; I found no repeal. Assume others may be able to reuse these images and that similar images may exist. We remain responsible for infringement, privacy, deception and other prohibited uses.
3. **Watermarks.** All Gemini app media carries invisible SynthID, and Content Credentials are also used. The setting changes only the visible mark. Google limits that setting to AI Ultra in India, South Korea and Vietnam and withholds it from work or school accounts. The page does not name the UK or state a UK plan requirement, so C1 must be checked on Cormac's account. Google's Terms say not to "remove, obscure or alter" its branding, logos or legal notices, so cropping or covering a visible Gemini logo is treated as not allowed. Our bottom caption and 9:8 crop could do this by accident. The terms are silent on WebP conversion, resizing and loss of metadata; C2 is the cautious reading.
4. **Labelling.** UK: I found no general legal duty to label AI images. The ASA has no blanket rule, but disclosure is needed where leaving it out would mislead, and the Government supports labelling best practice. EU: Article 50 has applied since 2 Aug 2026 and can reach non-EU deployers whose output is used in the EU. The deployer label duty targets deepfakes, with a lighter duty for evidently satirical or creative work. Clearly fantastical neon scenes should fall outside it, but photorealistic people or events might not. Once ad-funded, the site should assume it acts professionally. A simple label is advisable everywhere.
5. **Template names.** Keeping `tpl-*` filenames for now is acceptable at low risk, but they are not truly internal: they appear in public `/seed/` URLs. Rename them before ads, starting with `tpl-spiderman-point`, `tpl-gigachad-verdict`, `tpl-woman-yelling-cat` and `tpl-drake-compare`. Do not use old names in alt text or metadata.
   - **Change first:** "GigaChad Verdict" / "GigaChad refuses to elaborate" to "Unbothered Verdict"; "This Is Fine" to "Calm in the Chaos" (its creator publicly objected to an unlicensed AI-company ad in 2026); "Stonks" / "Not Stonks" to "Line Goes Up" / "Line Goes Down"; "Always Has Been" to "It Was Always This Way"; "Change My Mind" to "Hot Take Booth"; "Buff vs Smol doge" to "Buff vs Smol".
   - **Also change:** caption slots that force "STONKS", "NOT STONKS", "CHANGE MY MIND" and "always has been" (`supabase/functions/_shared/houseTemplates.js:18-25`); "Spiderman Pointing" (`src/data/seoRouteCopy.js:171`); "Drake-style" and the Drake aliases (`src/data/memeTemplates.js:59-60`).
   - **Before ads, review:** "Sad Keanu Sprinter" (real person), "Pepe Pony", "Harambe Hooves", "Nyan Neigh", "Rickroll Runner" and the `$DOGE` / `$PEPE` tickers.
   - **Technical note:** battle names are stored in the `battle_settings` row, and the original migration uses `on conflict do nothing`. Editing that old migration will not update an existing database; a new migration is needed.
6. **Existing library risk.** `src/data/memeTemplates.js` says these 52 templates were made with Gemini, and they are wired into template pages and the sitemap. I viewed 6 and did not check the live site. `hero-slaps-sidekick` closely evokes Batman and Robin; `disaster-girl` recreates a famous photo of a real child; `woman-yelling-at-cat` recreates a real TV scene; `drake-reject-approve` copies the pose and outfit of a real performer's meme. None of the 6 shows a visible Gemini mark, and there is no record of whether the setting or an edit caused that. `assets/image-log.md` has no entries for them.

**Cormac to decide**
1. **Gemini plan:** buy nothing yet. Check whether Media Watermark appears on the current account. If it does, the cost is £0. If not, bring it back for a decision.
2. **Existing library:** recommended, hide the 4 flagged templates from public pages and review the other 48 before ads. Nothing is deleted. **Cormac approved hiding the 4 on 21 Nov 2026** (live since 21 Nov 2026, commit 3dfcaa3). He also asked for their raw source copies in the ignored `images/` folder to be discarded; those 4 went to the Recycle Bin. The other 48 still need review.
   **Library display names deferred:** on 21 Nov 2026 Cormac approved keeping names in `src/data/memeTemplates.js` (such as "Change My Mind" and "Stonks") for the 22 Nov battle launch. They must be renamed before ads go live.
3. **Before ads:** recommended, ask a UK solicitor: "Can a UK operator use images generated in the consumer Gemini app on an ad-funded website under Google's current Terms, what does the business-user indemnity expose them to, and do recognisable meme-format recreations create copyright, passing-off or image-rights risk?"

**Limits of this check:** Google pages were checked through search excerpts, not a full read of each page. Before relying on C1, confirm the wording on the watermark page in a browser.

**Sources (all checked 21 Nov 2026)**
- Google Terms: https://policies.google.com/terms?hl=en-GB
- Service-specific terms: https://policies.google.com/terms/service-specific?hl=en-US
- Generative AI Additional Terms (retired for most users): https://policies.google.com/terms/generative-ai
- Prohibited Use Policy: https://policies.google.com/terms/generative-ai/use-policy
- Gemini Apps Privacy Hub: https://support.google.com/gemini/answer/13594961?hl=en-GB
- Gemini watermark settings: https://support.google.com/gemini/answer/17405358?hl=en
- Gemini verification, SynthID and Content Credentials: https://support.google.com/gemini/answer/16722517?hl=en-gb
- Gemini API terms: https://ai.google.dev/gemini-api/terms
- AI Act Article 50: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50
- AI Act Article 2: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-2
- Commission Article 50 FAQ: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
- Commission Article 50 guidelines, C(2026) 5054: https://ai-act-service-desk.ec.europa.eu/sites/default/files/2026-07/guidelines_on_the_implementation_of_the_transparency_obligations_for_certain_ai_systems_under_article_50_of_the_ai_act_bzptwqhk0ikg1dtlddap41psfy_131215.pdf
- UK Government report on copyright and AI: https://www.gov.uk/government/publications/report-and-impact-assessment-on-copyright-and-artificial-intelligence/report-on-copyright-and-artificial-intelligence
- IPO guidance on copyright exceptions: https://assets.publishing.service.gov.uk/media/5a7f4cf640f0b62305b864e6/Exceptions_to_copyright_-_Guidance_for_creators_and_copyright_owners.pdf
- ASA on AI disclosure: https://www.asa.org.uk/news/disclosure-of-ai-in-advertising-striking-the-balance-between-creativity-and-responsibility.html
- AdSense Publisher Policies: https://support.google.com/adsense/answer/10502938?hl=en
- "This Is Fine" dispute: https://techcrunch.com/2026/05/03/this-is-fine-creator-says-ai-startup-stole-his-art

### D-004: Gemini worktree
Set up `../thememes-net-gemini` as a git worktree for Antigravity (recommended), or use strict turn-taking in one folder.
**Recommendation:** worktree. One command, `git worktree add ../thememes-net-gemini -b gemini/<task-slug> main`, then open that folder in Antigravity.

### D-005: Recognisable meme template names
Some existing template files reference real people or characters by name (for example `tpl-spiderman-point`, `tpl-gigachad-verdict`, `tpl-woman-yelling-cat`). legal-compliance to review whether the names, the images, or both should change as part of the image replacement.
**Recommendation:** replace with original AI images and neutral names during the feed image work.

### D-006: Gemini takes the heavy code work (Cormac, 23 Nov 2026)
Cormac's Pro plan includes Antigravity, so Gemini can do the bulk of code building and save Claude usage. **Proposed standing brief** (Max recommends):
- **Gemini builds:** features and fixes that have a written spec (a concept card or a handoff), bulk edits and renames, tests, and screenshots. Neon (medium/high thinking) handles builds; Hydrogen (low) handles bulk edits.
- **Claude keeps:** deciding what to build, writing each handoff, design/legal/audio calls, and review, QA and merging. Also anything touching security, RLS, migrations, money/M$, moderation, `vercel.json`/CSP, and deploys.
- **How:** one handoff per task from `/handoff`, saved in `ops/handoffs/`. Gemini works on a `gemini/<slug>` branch in its own folder (D-004) and returns the report from `AGENTS.md`. Claude reviews, then Cormac says when to ship.
- **First task:** `ops/handoffs/H-20261123-01-slots-surge.md`.
**Recommendation:** approve, together with D-004 (worktree). Cost: £0, because it's included in the Pro plan. Risk: Gemini output still needs a Claude review pass, about a third of the cost of Claude building it.

## Decided

### D-001: The stack is Vite + React, not Next.js (21 Nov 2026)
The team brief said "Next.js/Vercel/Supabase". The code is a Vite 8 + React 19 single-page app with Vercel serverless functions in `api/` and Supabase. The agent files describe the real stack. Moving to Next.js would be a big migration and is **not** planned; it would need its own pitch and Cormac's OK.
