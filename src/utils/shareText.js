// Share text that phones turn into links.
// iMessage, WhatsApp and others auto-link anything that looks like a domain.
// "THE MEMES.net" is read as "MEMES.net", a different website, so a friend who
// taps it lands on the wrong site (owner report, 23 Nov 2026).
// Always run share/invite text through this before handing it to
// navigator.share or the clipboard.

const BRAND_WITH_SPACE = /\bTHE\s+MEMES\.net\b/gi;

export function linkSafeShareText(text) {
  if (typeof text !== 'string' || !text) return text;
  return text.replace(BRAND_WITH_SPACE, 'thememes.net');
}
