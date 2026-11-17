// ==========================================
// IndexNow (Bing, Yandex, Seznam, Naver, Yep...) — tells search engines a URL changed.
// https://www.bing.com/indexnow/getstarted
// The key is public by design: it is also served at https://www.thememes.net/<key>.txt
// (public/<key>.txt). Pure JS so it runs in Edge Functions, Node scripts and unit tests.
// ==========================================

export const INDEXNOW_KEY = '5eed15f774c2bb475174d8b3153e9496';
export const INDEXNOW_HOST = 'www.thememes.net';
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export function memeUrl(id) {
  return `${INDEXNOW_ORIGIN}/m/${encodeURIComponent(String(id))}`;
}

/** Builds the JSON body; only keeps URLs on our own host (IndexNow rejects the batch otherwise). */
export function buildIndexNowPayload(urls) {
  const urlList = [...new Set((urls || []).map(String))].filter((u) => {
    try {
      return new URL(u).host === INDEXNOW_HOST;
    } catch {
      return false;
    }
  });
  return {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`,
    urlList: urlList.slice(0, 10000)
  };
}

/** POSTs the URLs. Never throws; returns { ok, status }. 200/202 mean accepted. */
export async function submitIndexNow(urls, fetchImpl = fetch) {
  const payload = buildIndexNowPayload(urls);
  if (!payload.urlList.length) return { ok: false, status: 0 };
  try {
    const res = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return { ok: res.status === 200 || res.status === 202, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
