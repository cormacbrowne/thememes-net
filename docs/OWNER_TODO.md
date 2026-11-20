# Owner to-do (things the code can't do)

Last updated: 20 Nov 2026 (end of Phase 1).

## Decide or approve now
- [ ] **Approve the vote-count reset migration** before it runs on production: `supabase/migrations/20261120000001_real_counts_only.sql`.
  - It zeroes the old fake baselines (+1 per meme and some older bumps) and backs up every value first.
  - It can be undone; the DOWN steps are in the file.
- [ ] **Approve the privacy policy text** in `docs/PRIVACY_ANALYTICS_DRAFT.md`. It goes live on `/privacy` once you OK it.
- [ ] **Plausible:** create an account at https://plausible.io, add the site `thememes.net`, then add `VITE_PLAUSIBLE_DOMAIN=thememes.net` in Vercel → Settings → Environment Variables, and redeploy.
- [ ] **Casino games:** keep them or retire them? To retire them, set `FEATURE_CASINO_GAMES = false` in `src/config/featureFlags.js`.
- [ ] **Old JPG memes:** three live memes by @MemeLedge are 400–536 KB JPGs from the old pipeline. Re-uploading them would convert them to WebP (about 5× smaller).

## Search
- [ ] Set up Google Search Console and Bing Webmaster Tools, and submit the sitemap. The steps are in `docs/SEO_SETUP.md`.

## Social
- [ ] Create the social accounts (TikTok, Instagram, X, YouTube, Discord), then add their URLs to `src/config/social.js`.

## Content
- [ ] Queue the first 14 daily battle images, plus the 12 Christmas ones (Phase 2).
- [ ] Check the sound and template licences flagged in `docs/ASSETS.md` (Phase 2).
- [ ] The slot machines use names that sound like real slot products: "Mr. Jackpots: Silver Mustang", "Lightning Vault 5000", "Cyber Buffalo '86". Consider renaming them before going public with ads.

## Later
- [ ] Stripe account (test mode first), ad network applications, an email provider, and push VAPID keys.
- [ ] **Get legal advice before any real-money feature touches the arcade or MemeDollarz.**
