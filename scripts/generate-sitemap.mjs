import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://www.voltares.pp.ua';
const FIXED_PATHS = [
  '/',
  '/catalog.html',
  '/faq.html',
  '/calculators.html',
  '/categories/inverters',
  '/categories/batteries',
  '/categories/solar',
  '/rishennia/invertor-dlia-domu.html',
  '/rishennia/rezervne-zhyvlennia-dlia-biznesu.html',
  '/rishennia/soniachni-paneli.html',
  '/obladnannia/deye.html',
  '/obladnannia/anenji.html',
  '/obladnannia/easun.html',
  '/obladnannia/lifepo4.html',
  '/articles/5-pryladiv-iaki-zidaiut-avtonomnist.html',
  '/gallery.html',
  '/community.html'
];

function xmlEscape(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  })[character]);
}

function lastModified(item = {}) {
  const value = item.updatedAt || item.createdAt;
  if (!value || Number.isNaN(Date.parse(value))) return '';
  return new Date(value).toISOString().slice(0, 10);
}

const database = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'db.json'), 'utf8'));
const articles = (database.articles || [])
  .filter(item => item.status === 'published' && item.slug)
  .map(item => ({
    path: `/articles/${encodeURIComponent(String(item.slug).trim())}.html`,
    updated: lastModified(item)
  }));
const products = ['equipment', 'solarPanels', 'greenProtect']
  .flatMap(collection => database[collection] || [])
  .filter(item => item.status === 'active' && item._id)
  .map(item => ({
    path: `/products/${encodeURIComponent(String(item._id).trim())}`,
    updated: lastModified(item)
  }));

const entries = [...FIXED_PATHS.map(pathname => ({ path: pathname })), ...articles, ...products]
  .filter((item, index, items) => items.findIndex(candidate => candidate.path === item.path) === index);
const urls = entries.map(item => {
  const lastmod = item.updated ? `\n    <lastmod>${xmlEscape(item.updated)}</lastmod>` : '';
  return `  <url>\n    <loc>${SITE_URL}${xmlEscape(item.path)}</loc>${lastmod}\n  </url>`;
});
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

await fs.writeFile(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log(`Generated sitemap.xml with ${entries.length} URLs`);
