// Step 6: robots.txt + sitemap.xml check (real HTTP, no key needed).
const cheerio = require('cheerio');
const { fetchWithTimeout } = require('../lib/http');

function parseRobots(txt) {
  const sitemaps = [];
  const groups = [];
  let current = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'sitemap') sitemaps.push(value);
    else if (key === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'disallow' || key === 'allow') && current) {
      current.rules.push({ type: key, path: value });
    }
  }
  const star = groups.find((g) => g.agents.includes('*'));
  const blocksAll = !!star?.rules.some((r) => r.type === 'disallow' && r.path === '/');
  return { sitemaps, groupCount: groups.length, blocksAllForStar: blocksAll, starRules: star?.rules.slice(0, 20) || [] };
}

async function checkSitemap(url) {
  try {
    const { res } = await fetchWithTimeout(url, { timeoutMs: 10000 });
    if (!res.ok) return { url, found: false, status: res.status };
    const body = await res.text();
    const $ = cheerio.load(body, { xmlMode: true });
    const isIndex = $('sitemapindex').length > 0;
    const isUrlset = $('urlset').length > 0;
    return {
      url,
      found: true,
      status: res.status,
      validXml: isIndex || isUrlset,
      type: isIndex ? 'sitemapindex' : isUrlset ? 'urlset' : 'unknown',
      urlCount: isIndex ? $('sitemap').length : $('url').length,
      hasLastmod: $('lastmod').length > 0,
    };
  } catch (err) {
    return { url, found: false, error: err.message };
  }
}

async function checkRobotsAndSitemap(siteUrl) {
  const origin = new URL(siteUrl).origin;
  const robots = { url: `${origin}/robots.txt`, found: false };
  let parsed = { sitemaps: [] };
  try {
    const { res } = await fetchWithTimeout(robots.url, { timeoutMs: 10000 });
    robots.status = res.status;
    if (res.ok && (res.headers.get('content-type') || '').includes('text')) {
      const txt = await res.text();
      robots.found = true;
      robots.bytes = txt.length;
      parsed = parseRobots(txt);
      Object.assign(robots, parsed);
    }
  } catch (err) {
    robots.error = err.message;
  }

  const candidate = parsed.sitemaps[0] || `${origin}/sitemap.xml`;
  let sitemap = await checkSitemap(candidate);
  if (!sitemap.found && candidate !== `${origin}/sitemap_index.xml`) {
    const alt = await checkSitemap(`${origin}/sitemap_index.xml`);
    if (alt.found) sitemap = alt;
  }
  sitemap.declaredInRobots = parsed.sitemaps.length > 0;
  return { robots, sitemap };
}

module.exports = { checkRobotsAndSitemap, parseRobots };
