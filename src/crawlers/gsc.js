// src/crawlers/gsc.js
const { USE_MOCKS } = require('../mocks');
const mockData = require('../mocks/gsc.mock');
const { fetchWithTimeout } = require('../lib/http');

async function getSearchConsole(url) {
  if (USE_MOCKS) return mockData;

  // Real Search Analytics query. Needs an OAuth access token for a verified property
  // (production would refresh it from a stored refresh token per client).
  const token = process.env.GSC_ACCESS_TOKEN;
  if (!token) throw new Error('GSC_ACCESS_TOKEN not set');

  const end = new Date();
  const start = new Date(end.getTime() - 28 * 86400000);
  const site = encodeURIComponent(url.endsWith('/') ? url : url + '/');
  const { res } = await fetchWithTimeout(
    `https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ['query'],
        rowLimit: 25,
      }),
    }
  );
  if (!res.ok) throw new Error(`Search Console API ${res.status}`);
  const data = await res.json();
  const rows = (data.rows || []).map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
  return {
    rows,
    totalClicks: rows.reduce((s, r) => s + r.clicks, 0),
    totalImpressions: rows.reduce((s, r) => s + r.impressions, 0),
    indexCoverageErrors: null, // URL Inspection API is per-URL; not aggregated here
  };
}

module.exports = { getSearchConsole };
