export default async function handler(req, res) {
  const ga4MeasurementId = /^G-[A-Z0-9]+$/i.test(String(process.env.GA4_MEASUREMENT_ID || '')) ? String(process.env.GA4_MEASUREMENT_ID).toUpperCase() : '';
  const clarityProjectId = /^[a-z0-9]+$/i.test(String(process.env.CLARITY_PROJECT_ID || '')) ? String(process.env.CLARITY_PROJECT_ID) : '';
  const siteUrl = /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(String(process.env.PUBLIC_SITE_URL || '')) ? String(process.env.PUBLIC_SITE_URL).replace(/\/$/, '') : 'https://voltares.pp.ua';
  const debug = /^(1|true|yes)$/i.test(String(process.env.ANALYTICS_DEBUG || ''));
  const config = { ga4MeasurementId, clarityProjectId, debug, siteUrl };
  res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  return res.end(`window.VOLTA_ANALYTICS_CONFIG=Object.freeze(${JSON.stringify(config).replace(/</g, '\\u003c')});`);
}
