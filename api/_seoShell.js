// Shared helpers for the HTML-rendering API functions (files starting with "_" are not
// deployed as their own Vercel functions).

/**
 * Turns the app shell into a "not found" page for search engines: noindex, no canonical,
 * no route JSON-LD, honest title. The React app still boots on it for real visitors.
 */
export function toNotFoundShell(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>Page not found | THE MEMES.net</title>')
    .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, '<meta name="robots" content="noindex" />')
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, '<meta name="description" content="This page does not exist on THE MEMES.net." />')
    .replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, '')
    .replace(/\s*<script[^>]*id="tm-dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i, '');
}

export function sendNotFound(res, html) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.end(toNotFoundShell(html));
}

/** Temporary failure (database slow/down): tell crawlers to come back, never drop the page. */
export function sendTryLater(res, html) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Retry-After', '120');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
}

/**
 * Replaces the WHOLE content of <div id="root"> (which holds the home page's nested
 * prerender markup in dist/index.html). A non-greedy regex stops at the first inner
 * </div> and leaves the rest of the home page behind, so cut to the last </div> before </body>.
 */
export function replaceRootContent(html, inner) {
  const open = '<div id="root">';
  const start = html.indexOf(open);
  const bodyEnd = html.lastIndexOf('</body>');
  if (start < 0 || bodyEnd < 0) return html;
  const close = html.lastIndexOf('</div>', bodyEnd);
  if (close < start) return html;
  return `${html.slice(0, start)}${open}${inner}${html.slice(close)}`;
}

/** JSON for a <script type="application/ld+json">, safe inside HTML. */
export function jsonLdString(data) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

export function replaceRouteJsonLd(html, data) {
  const tag = `<script id="tm-dynamic-jsonld" type="application/ld+json">${jsonLdString(data)}</script>`;
  const stripped = html.replace(/\s*<script[^>]*id="tm-dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i, '');
  return stripped.replace(/<\/head>/i, `  ${tag}\n  </head>`);
}
