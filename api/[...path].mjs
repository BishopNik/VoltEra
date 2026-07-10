export default async function handler(req, res) {
  process.env.VERCEL = process.env.VERCEL || '1';
  const { default: handleRequest } = await import('../server.mjs');
  return handleRequest(req, res);
}
