import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

test('sitemap is a static, valid URL set', () => {
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.equal(locations.length, new Set(locations).size);
  assert.ok(locations.length > 17);
  assert.ok(locations.every(url => url.startsWith('https://www.voltares.pp.ua/')));
});

test('sitemap excludes private and non-canonical pages', () => {
  assert.ok(!locations.some(url => /\/(?:admin|proposal|privacy|en\.html)/.test(url)));
  assert.ok(vercel.rewrites.every(rewrite => rewrite.source !== '/sitemap.xml'));
});

test('sitemap contains primary discovery pages', () => {
  for (const pathname of ['/', '/catalog.html', '/categories/inverters', '/categories/batteries', '/categories/solar']) {
    assert.ok(locations.includes(`https://www.voltares.pp.ua${pathname}`));
  }
  assert.ok(locations.some(url => url.includes('/articles/')));
  assert.ok(locations.some(url => url.includes('/products/')));
});
