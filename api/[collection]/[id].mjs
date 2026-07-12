export default async function handler(req, res) {
  process.env.VERCEL = process.env.VERCEL || '1';
  const collection = String(req.query?.collection || '').replace(/[^a-z-]/gi, '');
  const id = String(req.query?.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (collection && id) req.url = `/api/${collection}/${id}`;
  const { default: handleRequest } = await import('../../server.mjs');
  return handleRequest(req, res);
}
