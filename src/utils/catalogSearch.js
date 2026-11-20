/**
 * Shared search for the arcade catalogs (games and prank screens).
 * Every entry in a catalog is searched, so new games/pranks are found with no extra wiring.
 */

/** Lower-case and strip accents/apostrophes so "tysiac" finds "Tysiąc" and "21s" finds "21's". */
export const normalizeSearch = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/gi, 'l')
    .toLowerCase()
    .replace(/[’'`]/g, '');

/** Split a raw query into normalized words ("Fake  BSOD" -> ["fake", "bsod"]). */
export const toSearchTerms = (query) => normalizeSearch(query).split(/\s+/).filter(Boolean);

/**
 * True when every term appears somewhere in the item's text fields.
 * Paths are included with dashes as spaces so "windows" finds /fake-windows-update-screen.
 */
export const itemMatchesSearch = (item, terms, extra = []) => {
  if (!terms.length) return true;
  const haystack = normalizeSearch(
    [
      item.label,
      item.pitch,
      item.id,
      item.badge,
      item.group,
      String(item.path || '').replace(/[/-]+/g, ' '),
      ...(Array.isArray(item.keywords) ? item.keywords : [item.keywords]),
      ...extra
    ]
      .filter(Boolean)
      .join(' ')
  );
  return terms.every((t) => haystack.includes(t));
};
