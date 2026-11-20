// Plan 1.5 — robots.txt, brand structured data and social sameAs.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { injectOrganizationSameAs } from '../../vite.config.js';
import { SOCIAL_LINKS, socialSameAs } from '../../src/config/social.js';

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('search foundations (plan 1.5)', () => {
  it('robots.txt points at the sitemap and blocks private routes', () => {
    const robots = read('public/robots.txt');
    expect(robots).toContain('Sitemap: https://www.thememes.net/sitemap.xml');
    for (const p of ['/admin', '/api/', '/moderation']) expect(robots).toContain(`Disallow: ${p}`);
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m);
    expect(robots).not.toMatch(/Disallow: \/m\//);
  });

  it('no static sitemap.xml is committed (it would hide the live one)', () => {
    expect(fs.existsSync(path.join(root, 'public/sitemap.xml'))).toBe(false);
  });

  it('index.html has Organization + WebSite JSON-LD tied to the thememes.net name', () => {
    const html = read('index.html');
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const types = json['@graph'].map((n) => n['@type']);
    expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
    const org = json['@graph'].find((n) => n['@type'] === 'Organization');
    expect(org.name).toBe('THE MEMES.net');
    expect(org.alternateName).toContain('thememes.net');
    expect(org.logo.url).toMatch(/logo-512\.png$/);
  });

  it('social profiles are added as sameAs only when filled in', () => {
    const html = read('index.html');
    expect(socialSameAs({ x: '', tiktok: '  ' })).toEqual([]);
    expect(injectOrganizationSameAs(html, [])).toBe(html);
    const out = injectOrganizationSameAs(html, ['https://www.tiktok.com/@thememesnet']);
    const json = JSON.parse(out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    expect(json['@graph'][0].sameAs).toEqual(['https://www.tiktok.com/@thememesnet']);
    expect(socialSameAs({ bad: 'javascript:alert(1)', ok: 'https://x.com/a' })).toEqual(['https://x.com/a']);
    expect(Object.keys(SOCIAL_LINKS)).toEqual(['tiktok', 'instagram', 'x', 'youtube', 'discord']);
  });
});
