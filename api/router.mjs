export default async function handler(req, res) {
  process.env.VERCEL = process.env.VERCEL || '1';

  // All /api/* requests are rewritten to this fixed function. Rebuild the
  // original URL so nested auth and CRUD endpoints use the local server router.
  const rawPath = req.query?.path;
  const pathSegments = (Array.isArray(rawPath) ? rawPath : String(rawPath || '').split('/'))
    .map(segment => String(segment).replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean);
  if (pathSegments.length) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'path') continue;
      for (const item of Array.isArray(value) ? value : [value]) query.append(key, String(item));
    }
    req.url = `/api/${pathSegments.join('/')}${query.size ? `?${query}` : ''}`;
  }

  const { default: handleRequest } = await import('../server.mjs');
  return handleRequest(req, res);
}
