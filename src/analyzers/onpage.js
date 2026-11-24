// Step 5: On-page analysis — deterministic checks over the crawl data. These findings feed
// Claude (and the mock analyst) as evidence, so each one carries the measured value.

function check(id, pass, severity, message, value) {
  return { id, pass, severity, message, value };
}

function analyzeOnPage(crawl, client) {
  if (!crawl || crawl.error) {
    return { available: false, reason: crawl?.error || 'crawl failed', checks: [], score: null };
  }
  const city = (client.city || '').toLowerCase();
  const titleLen = crawl.title?.length || 0;
  const descLen = crawl.metaDescription?.length || 0;
  const mentionsCity = (s) => !!city && (s || '').toLowerCase().includes(city);

  const checks = [
    check('title_present', titleLen > 0, 'critical', 'Page has a <title> tag', crawl.title),
    check('title_length', titleLen >= 30 && titleLen <= 60, 'medium', 'Title is 30–60 characters', titleLen),
    check('meta_description_present', descLen > 0, 'high', 'Meta description present', crawl.metaDescription),
    check('meta_description_length', descLen >= 70 && descLen <= 160, 'low', 'Meta description is 70–160 characters', descLen),
    check('single_h1', crawl.h1.length === 1, 'high', 'Exactly one H1 on the page', crawl.h1.length),
    check('h2_structure', crawl.h2.length >= 2, 'low', 'At least two H2 sub-headings', crawl.h2.length),
    check('word_count', crawl.wordCount >= 300, 'medium', 'Homepage has 300+ words of content', crawl.wordCount),
    check('image_alt', crawl.images.total === 0 || crawl.images.missingAlt / crawl.images.total <= 0.1, 'medium', '≤10% of images missing alt text', `${crawl.images.missingAlt}/${crawl.images.total}`),
    check('canonical', !!crawl.canonical, 'medium', 'Canonical tag present', crawl.canonical),
    check('viewport', !!crawl.viewport, 'high', 'Mobile viewport meta tag present', crawl.viewport),
    check('lang', !!crawl.lang, 'low', '<html lang> attribute set', crawl.lang),
    check('open_graph', !!(crawl.openGraph.title && crawl.openGraph.image), 'low', 'Open Graph title + image set', crawl.openGraph),
    check('internal_links', crawl.links.internal >= 10, 'low', '10+ internal links from homepage', crawl.links.internal),
    check('city_in_title', mentionsCity(crawl.title), 'high', `Title mentions target city (${client.city})`, crawl.title),
    check('city_in_h1', crawl.h1.some(mentionsCity), 'medium', `H1 mentions target city (${client.city})`, crawl.h1[0] || null),
    check('click_to_call', crawl.hasTelLink, 'medium', 'Click-to-call (tel:) link present', crawl.hasTelLink),
    check('map_embed', crawl.hasMapEmbed, 'low', 'Google Map embedded', crawl.hasMapEmbed),
    check('noindex', !/noindex/i.test(`${crawl.metaRobots || ''} ${crawl.headers.xRobotsTag || ''}`), 'critical', 'Page is not set to noindex', crawl.metaRobots),
  ];

  const weight = { critical: 4, high: 3, medium: 2, low: 1 };
  const total = checks.reduce((s, c) => s + weight[c.severity], 0);
  const passed = checks.filter((c) => c.pass).reduce((s, c) => s + weight[c.severity], 0);

  return {
    available: true,
    score: Math.round((passed / total) * 100),
    passed: checks.filter((c) => c.pass).length,
    failed: checks.filter((c) => !c.pass).length,
    checks,
  };
}

function analyzeTechnical(crawl, robotsSitemap) {
  const checks = [];
  if (crawl && !crawl.error) {
    checks.push(
      check('https', crawl.https, 'critical', 'Site served over HTTPS', crawl.finalUrl),
      check('status_200', crawl.statusCode === 200, 'critical', 'Homepage returns HTTP 200', crawl.statusCode),
      check('ttfb', crawl.responseTimeMs < 800, 'medium', 'Server responds in < 800 ms', crawl.responseTimeMs),
      check('compression', !!crawl.headers.contentEncoding, 'low', 'HTML is compressed (gzip/br)', crawl.headers.contentEncoding),
      check('hsts', crawl.headers.hsts, 'low', 'HSTS header set', crawl.headers.hsts),
      check('html_size', crawl.htmlBytes < 300000, 'low', 'HTML under 300 KB', crawl.htmlBytes)
    );
  }
  const { robots, sitemap } = robotsSitemap || {};
  if (robots) {
    checks.push(
      check('robots_found', robots.found, 'medium', 'robots.txt present', robots.status),
      check('robots_not_blocking', !robots.blocksAllForStar, 'critical', 'robots.txt does not block all crawlers', robots.blocksAllForStar)
    );
  }
  if (sitemap) {
    checks.push(
      check('sitemap_found', !!sitemap.found && sitemap.validXml !== false, 'high', 'Valid sitemap.xml found', sitemap.url),
      check('sitemap_in_robots', !!sitemap.declaredInRobots, 'low', 'Sitemap declared in robots.txt', sitemap.declaredInRobots)
    );
  }
  const weight = { critical: 4, high: 3, medium: 2, low: 1 };
  const total = checks.reduce((s, c) => s + weight[c.severity], 0) || 1;
  const passed = checks.filter((c) => c.pass).reduce((s, c) => s + weight[c.severity], 0);
  return { score: Math.round((passed / total) * 100), checks };
}

module.exports = { analyzeOnPage, analyzeTechnical };
