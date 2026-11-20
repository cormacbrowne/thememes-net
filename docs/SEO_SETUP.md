# SEO setup: owner checklist

What the code already does (plan 1.5):
- **Sitemap:** `https://www.thememes.net/sitemap.xml` is generated live by `api/sitemap.js`. It covers the homepage, meme categories, every approved meme page, games, prank screens, Hall of Fame, templates and creators, and updates itself. Never commit a static `sitemap.xml`.
- **robots.txt:** `public/robots.txt` allows everything except admin/moderation, `/api/` and the dev UI kit, and points to the sitemap.
- **Canonical tags and branding:** every page has a canonical URL and a title ending in "THE MEMES.net". The `og:site_name` is "THE MEMES.net".
- **Structured data:** `Organization` + `WebSite` JSON-LD is in `index.html`, with the logo and the alternate names "thememes.net" / "TheMemes.net". Social profiles are added as `sameAs` automatically once you fill them in (see step 4).
- **Bing / IndexNow:** new and removed pages are pinged automatically (GitHub Action plus Edge Functions).

Searching "thememes.net" currently returns WordPress theme sites. These steps tie the brand to the domain in Google and Bing.

## 1. Google Search Console (about 10 minutes)
1. Go to https://search.google.com/search-console and click **Add property**.
2. Choose **Domain** and enter `thememes.net`. This covers www and non-www.
3. Google shows a TXT record. Add it at your domain registrar's DNS settings, then click **Verify**. DNS changes can take up to an hour.
4. Open **Sitemaps** in the left menu, enter `sitemap.xml` and click **Submit**.
5. Open **URL inspection**, paste `https://www.thememes.net/` and click **Request indexing**. Do the same for `/games`, `/meme-generator` and `/prank-screens`.
6. After a few days, check **Pages** (indexing) and **Enhancements** for errors.

## 2. Bing Webmaster Tools (about 5 minutes)
1. Go to https://www.bing.com/webmasters and sign in.
2. Choose **Import from Google Search Console**. That's the fastest route once step 1 is done. Alternatively, add the site manually; the `BingSiteAuth.xml` file is already in `public/`.
3. Open **Sitemaps** and submit `https://www.thememes.net/sitemap.xml`.
4. IndexNow is already set up; the key file is `public/5eed15f774c2bb475174d8b3153e9496.txt`.

## 3. Brand signals (ongoing)
- Use the exact name **THE MEMES.net** and link to `https://www.thememes.net/` from every social profile bio.
- Ask for links from places that talk about meme generators or browser games (Reddit, Discord server listings, itch.io, Product Hunt).
- Once Google has indexed the site, search `site:thememes.net` to check what's in the index.

## 4. Social profiles (when the accounts exist)
Fill in the URLs in `src/config/social.js`, then commit and deploy. They then appear as `sameAs` in the Organization structured data, and later in the footer and menu (plan 2.8). Empty entries are ignored.

## 5. Check it worked
- Rich Results Test: https://search.google.com/test/rich-results?url=https://www.thememes.net/ should show Organization and WebSite with no errors.
- `https://www.thememes.net/robots.txt` and `https://www.thememes.net/sitemap.xml` both load.
