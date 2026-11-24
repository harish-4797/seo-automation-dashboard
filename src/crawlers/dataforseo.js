// src/crawlers/dataforseo.js
const { USE_MOCKS } = require('../mocks');
const mockData = require('../mocks/dataforseo.mock');
const { fetchWithTimeout } = require('../lib/http');

async function getRankings(url, keyword, city) {
  if (USE_MOCKS) return mockData;

  // Real DataForSEO SERP call (Google organic, live/regular)
  const { DATAFORSEO_LOGIN: login, DATAFORSEO_PASSWORD: password } = process.env;
  if (!login || !password) throw new Error('DATAFORSEO credentials not set');

  const domain = new URL(url).hostname.replace(/^www\./, '');
  const { res } = await fetchWithTimeout(
    'https://api.dataforseo.com/v3/serp/google/organic/live/regular',
    {
      method: 'POST',
      timeoutMs: 45000,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        { keyword, location_name: `${city},India`, language_code: 'en', depth: 30 },
      ]),
    }
  );
  if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
  const data = await res.json();
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  const mine = items.find((i) => i.type === 'organic' && i.domain?.replace(/^www\./, '') === domain);
  return {
    tasks: data.tasks,
    client_rank_position: mine ? mine.rank_absolute : null,
    keyword_search_volume: null, // separate Keywords Data API call in production
  };
}

module.exports = { getRankings };
