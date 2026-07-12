export default async function handler(req, res) {
  process.env.VERCEL = process.env.VERCEL || '1';
  req.url = '/sitemap.xml';
  const { default: handleRequest } = await import('../server.mjs');
  return handleRequest(req, res);
}
