// Pure helper for extracting storage object keys from public bucket URLs (task 33.11).

export function extractStorageObjectPath(rawUrl, bucket = 'memes') {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = rawUrl.indexOf(marker);
  if (idx === -1) return null;
  const key = rawUrl.slice(idx + marker.length).split(/[?#]/)[0].trim();
  if (!key || key.includes('..')) return null;
  return decodeURIComponent(key);
}

export function collectUserStoragePaths(memeRows = []) {
  const paths = new Set();
  for (const row of memeRows) {
    if (!row || typeof row !== 'object') continue;
    for (const col of [row.image_url, row.poster_url, row.base_image_url]) {
      const key = extractStorageObjectPath(col, 'memes');
      if (key) paths.add(key);
    }
  }
  return Array.from(paths);
}
