// ==========================================
// SOCIAL ACCOUNTS — one place for THE MEMES.net's social profile URLs (plans 1.5 and 2.8).
// Fill a URL in once the account exists. Empty ones are left out everywhere: the
// Organization "sameAs" structured data (added at build time by vite.config.js) and, later,
// the footer/menu links. Use full https:// URLs of the brand's own profiles.
// ==========================================

export const SOCIAL_LINKS = {
  tiktok: '',
  instagram: '',
  x: '',
  youtube: '',
  discord: ''
};

/** Non-empty https profile URLs, for schema.org Organization.sameAs. */
export function socialSameAs(links = SOCIAL_LINKS) {
  return Object.values(links)
    .map((u) => String(u || '').trim())
    .filter((u) => /^https:\/\/[^\s"<>]+$/.test(u));
}
