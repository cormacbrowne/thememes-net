# Privacy policy: analytics section (DRAFT for owner review)

**Status:** draft only. The live `/privacy` page has **not** been changed. Once you approve it, this text replaces the "📊 Analytics & Anti-Bot Protection" section in `src/data/legalPages.js` and `LEGAL_LAST_UPDATED` is bumped.

**Why it changes:**
- Microsoft Clarity has been removed. It set cookies and recorded sessions, and the old policy never mentioned it.
- Plausible is added as an optional cookieless provider. It only runs once `VITE_PLAUSIBLE_DOMAIN` is set.
- Share links now carry `?ref=share&m=<memeId>`.

---

## 📊 Analytics & Anti-Bot Protection

- **No cookies and no cross-site tracking.** We don't use advertising trackers, session recordings or fingerprinting. We don't sell your personal information.
- **Our own anonymous usage stats (Pulse).** We count things like page views, memes made, shares, votes, game plays and caption-battle entries, without cookies or tracking IDs.
  - The counts can't be tied to you or your account.
  - Your IP address is never stored. It's only used, scrambled with a key that changes daily, to tell today's visits apart.
  - Raw events are deleted after 30 days.
- **Plausible Analytics.** We also use Plausible (plausible.io), a privacy-friendly analytics service based in the EU.
  - It counts page views and the same anonymous events, without cookies and without storing personal data or IP addresses.
  - See [plausible.io/data-policy](https://plausible.io/data-policy).
- **Vercel Web Analytics.** We use this for aggregate page-view totals, again with no cookies.
- **Share links.** When you share a meme, the link includes `?ref=share` and the meme's ID. That tells us a visit came from a share, not who shared it.
- **Turning it off.** Switch off "Anonymous usage stats" in Settings (⚙️), or turn on Global Privacy Control (GPC) / Do-Not-Track in your browser. We honour both, and that switches off Pulse and Plausible.
- **Bot protection.** We may use Cloudflare Turnstile on uploads and comments to stop automated bots.
