// src/crawlers/pagespeed.js
const { USE_MOCKS } = require('../mocks');
const mockData = require('../mocks/pagespeed.mock');
const { fetchWithTimeout } = require('../lib/http');

const AUDIT_KEYS = [
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'interaction-to-next-paint',
  'render-blocking-resources',
  'unused-javascript',
];

async function getPageSpeed(url) {
  if (USE_MOCKS) return mockData;

  // Real PageSpeed Insights API call
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  ['performance', 'seo', 'accessibility'].forEach((c) => params.append('category', c));
  if (process.env.PAGESPEED_API_KEY) params.set('key', process.env.PAGESPEED_API_KEY);

  const { res } = await fetchWithTimeout(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
    { timeoutMs: 60000 }
  );
  if (!res.ok) throw new Error(`PageSpeed API ${res.status}`);
  const lh = (await res.json()).lighthouseResult;

  // Reshape to the same structure as the mock so downstream code is identical.
  const audits = {};
  for (const key of AUDIT_KEYS) {
    const a = lh.audits[key];
    if (a) audits[key] = { score: a.score, displayValue: a.displayValue, description: a.title };
  }
  return {
    url,
    strategy: 'mobile',
    categories: {
      performance: { score: lh.categories.performance?.score },
      seo: { score: lh.categories.seo?.score },
      accessibility: { score: lh.categories.accessibility?.score },
    },
    audits,
  };
}

module.exports = { getPageSpeed };
