import { promises as fs } from 'node:fs';
import nodePath from 'node:path';

export default async function handler(req, res) {
  const routePath = String(req.query?.path || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const section = String(req.query?.section || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const slug = String(req.query?.slug || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const allowedTopLevel = new Set(['index','catalog','faq','calculators','community','gallery','privacy']);
  const allowedSections = new Set(['rishennia','obladnannia']);
  let relative = '';
  if (routePath && allowedTopLevel.has(routePath)) relative = `${routePath}.html`;
  else if (section && slug && allowedSections.has(section)) relative = `${section}/${slug}.html`;
  else { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"error":"NOT_FOUND"}'); }
  try {
    let page = await fs.readFile(nodePath.join(process.cwd(), relative), 'utf8');
    const verification = String(process.env.GOOGLE_SITE_VERIFICATION || '').trim().slice(0, 200).replace(/[^a-zA-Z0-9_\-.]/g, '');
    const head = `${verification ? `<meta name="google-site-verification" content="${verification}">` : ''}<script defer src="/analytics-config.js"></script><script defer src="/analytics.js?v=20260719-1"></script>`;
    if (!page.includes('/analytics.js')) page = page.replace('</head>', `${head}</head>`);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' });
    return res.end(page);
  } catch {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end('{"error":"NOT_FOUND"}');
  }
}
