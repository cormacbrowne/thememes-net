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

export const SOCIAL_PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', shortLabel: 'TikTok', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', shortLabel: 'Instagram', icon: '📸' },
  { id: 'x', label: 'X', shortLabel: 'X / Twitter', icon: '𝕏' },
  { id: 'youtube', label: 'YouTube', shortLabel: 'YouTube', icon: '▶️' },
  { id: 'discord', label: 'Discord', shortLabel: 'Discord', icon: '💬' }
];

const SAFE_HTTPS_URL_RE = /^https:\/\/[^\s"<>]+$/;

/** Configured platforms that have a non-empty https:// URL. Empty entries are omitted. */
export function getActiveSocialLinks(links = SOCIAL_LINKS) {
  const src = links && typeof links === 'object' ? links : {};
  return SOCIAL_PLATFORMS.reduce((acc, platform) => {
    const url = String(src[platform.id] || '').trim();
    if (SAFE_HTTPS_URL_RE.test(url)) {
      acc.push({ ...platform, url });
    }
    return acc;
  }, []);
}

/** Non-empty https profile URLs, for schema.org Organization.sameAs. */
export function socialSameAs(links = SOCIAL_LINKS) {
  return Object.values(links || {})
    .map((u) => String(u || '').trim())
    .filter((u) => SAFE_HTTPS_URL_RE.test(u));
}
