// Catch-all for paths that are not a real page (vercel.json sends unknown paths here, after
// static files, prerendered routes, /m/, /u/ and the admin rewrites). Returns HTTP 404 +
// noindex so search engines do not index made-up URLs as copies of the home page
// ("soft 404s"). The body is still the app shell, so a visitor still gets the site.
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { sendNotFound } from './_seoShell.js';

async function loadShell() {
  for (const file of [path.join(process.cwd(), 'dist', 'index.html'), path.join(process.cwd(), 'index.html')]) {
    try {
      const html = await fs.readFile(file, 'utf8');
      if (html.includes('id="root"')) return html;
    } catch {
      // try the next one
    }
  }
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>Page not found | THE MEMES.net</title></head><body><div id="root"><p>Page not found. <a href="/">Go to THE MEMES.net</a></p></div></body></html>';
}

export default async function handler(req, res) {
  return sendNotFound(res, await loadShell());
}
