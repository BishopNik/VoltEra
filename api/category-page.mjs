export default async function handler(req, res) {
  process.env.VERCEL = process.env.VERCEL || '1';
  const slug = String(req.query?.slug || '').replace(/[^a-z-]/g, '');
  if (!slug) return res.status(400).json({ error: 'SLUG_REQUIRED' });
  req.url = `/categories/${slug}`;
  const { default: handleRequest } = await import('../server.mjs');
  return handleRequest(req, res);
}
