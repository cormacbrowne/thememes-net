# Owner to-do (things the code can't do)

Last updated: 20 Nov 2026 (end of Phase 1).

## Done
- [x] Vote-count reset migration applied on production (`20261120143545_real_counts_only.sql`). The old values are backed up in `meme_count_baseline_backup`.
- [x] Privacy policy analytics section published on `/privacy`. It goes live with the next deploy.
- [x] The 3 old JPG memes were converted to WebP, about 2.5× smaller. The old `.jpg` files are still in Storage, unused; you can delete them any time.
- [x] Lookalike slot names renamed (Mr. Jackpots kept).
- [x] Edge Function `submit-caption-entry` deployed for Daily Caption Battle v2.

## Decide or do now
- [ ] **Deploy.** Nothing from Phase 1 is on the live site until `main` is pushed and Vercel deploys it.
- [ ] **Analytics (Umami + Vercel)**:
  1. Vercel → Project → Settings → Environment Variables: add `VITE_UMAMI_WEBSITE_ID` (your Umami website ID) for **Production** and **Preview**, and delete `VITE_PLAUSIBLE_DOMAIN` (and `VITE_PLAUSIBLE_SRC` if present). Then redeploy, because `VITE_` variables are baked in at build time.
  2. Vercel → Project → **Analytics** → **Enable**. Vercel → Project → **Speed Insights** → **Enable**.
  3. Umami Cloud → Settings → Websites: check the domain is `www.thememes.net`.
  4. Cancel the Plausible trial/account if you made one.
  5. Before turning on ads or affiliate links, move the Vercel team to **Pro**. Hobby is for personal or non-commercial use only.
- [ ] **Casino games:** keep them or retire them? To retire them, set `FEATURE_CASINO_GAMES = false` in `src/config/featureFlags.js`.
- [ ] Optional: delete the retired one-off Edge Function `one-off-legacy-jpg-to-webp` in Supabase → Edge Functions. It's already disabled and only returns "gone".

## Search
- [ ] Set up Google Search Console and Bing Webmaster Tools, and submit the sitemap. The steps are in `docs/SEO_SETUP.md`. They need your Google sign-in and a DNS record at your domain registrar.

## Social
- [ ] Create the social accounts (TikTok, Instagram, X, YouTube, Discord), then add their URLs to `src/config/social.js`.

## Content
- [ ] Queue the first 14 daily battle images, plus the 12 Christmas ones (Phase 2).
- [ ] Check the sound and template licences flagged in `docs/ASSETS.md` (Phase 2).

## Later
- [ ] Stripe account (test mode first), ad network applications, an email provider, and push VAPID keys.
- [ ] **Get legal advice before any real-money feature touches the arcade or MemeDollarz.**

## Share preview checks (Phase 2.2)
After the next deploy, paste one `/m/<id>/<slug>`, one `/battle/<battleId>`, and one `/battle/<battleId>/e/<entryId>` link into each app and verify the title, description, and preview image render cleanly:
- [ ] **WhatsApp** (paste in a private chat and wait ~2s before sending)
- [ ] **iMessage** (paste in Messages on iPhone/Mac)
- [ ] **Discord** (paste in a private channel)
- [ ] **X (Twitter)** (test in X Card Validator or a draft post with `summary_large_image`)

## Image moderation service options (Phase 2.6)
Currently `FEATURE_IMAGE_MODERATION` in `src/config/featureFlags.js` and `moderation_settings.image_moderation_enabled` are both `false` for optional third-party webhook expansion, while `publish-meme` continues its built-in OpenAI `omni-moderation-latest` + perceptual-hash + manual-queue safety pipeline. When you want to wire or switch a dedicated automated image moderation provider, pick one below:

| Provider | Free tier / pricing | Strengths | Trade-offs / requirements |
| --- | --- | --- | --- |
| **OpenAI `omni-moderation-latest`** | Free with your existing `OPENAI_API_KEY` | Already wired in `supabase/functions/_shared/moderation.js` (zero extra signup); covers sexual, violence/gore, self-harm | Does not score hate symbols or drugs (those stay in manual review) |
| **Sightengine** | 2,000 ops/month free, then ~$29/month Starter | Adapter already built in `_shared/moderation.js`; covers nudity, gore, hate symbols, self-harm, drugs, weapons | Requires `SIGHTENGINE_API_USER` + `SIGHTENGINE_API_SECRET` secrets; monthly cost once free tier is exceeded |
| **AWS Rekognition Moderation** | 1,000 images/month free for 12 months, ~$1.00 per 1,000 after | Broad visual taxonomy and strong reliability | Requires AWS account + IAM signing in an Edge Function; no built-in meme OCR/text check |
| **Google Cloud Vision SafeSearch** | 1,000 units/month free, ~$1.50 per 1,000 after | Solid adult/violence/racy/spoof scores | No hate-symbol classifier; requires GCP billing account & service credentials |
| **Hive Moderation** | Pay-as-you-go / sales-led tiers | Strong meme + overlaid text + hate-symbol coverage | Commercial onboarding required; higher unit cost at small volumes |
