// Step 1: Fetch + Cheerio crawl (always real — this is our own crawler, no API key needed).
const cheerio = require('cheerio');
const { fetchWithTimeout } = require('../lib/http');

async function crawlSite(url) {
  const { res, elapsedMs } = await fetchWithTimeout(url, {
    timeoutMs: 20000,
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  const html = await res.text();
  const finalUrl = res.url || url;
  const origin = new URL(finalUrl).origin;
  const $ = cheerio.load(html);

  const text = $('body').clone().find('script,style,noscript').remove().end().text();
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

  const headings = (tag) => $(tag).map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean);

  const images = $('img').toArray();
  const imagesMissingAlt = images.filter((el) => !($(el).attr('alt') || '').trim());

  let internalLinks = 0;
  let externalLinks = 0;
  let nofollowLinks = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    try {
      const target = new URL(href, finalUrl);
      if (target.origin === origin) internalLinks++;
      else externalLinks++;
      if (($(el).attr('rel') || '').includes('nofollow')) nofollowLinks++;
    } catch {
      /* malformed href */
    }
  });

  const meta = (name) => $(`meta[name="${name}"]`).attr('content')?.trim() || null;
  const og = (prop) => $(`meta[property="og:${prop}"]`).attr('content')?.trim() || null;

  return {
    requestedUrl: url,
    finalUrl,
    statusCode: res.status,
    ok: res.ok,
    redirected: res.redirected,
    https: finalUrl.startsWith('https://'),
    responseTimeMs: elapsedMs,
    htmlBytes: Buffer.byteLength(html),
    headers: {
      contentType: res.headers.get('content-type'),
      server: res.headers.get('server'),
      xRobotsTag: res.headers.get('x-robots-tag'),
      cacheControl: res.headers.get('cache-control'),
      contentEncoding: res.headers.get('content-encoding'),
      hsts: !!res.headers.get('strict-transport-security'),
    },
    title: $('title').first().text().trim() || null,
    metaDescription: meta('description'),
    metaRobots: meta('robots'),
    viewport: meta('viewport'),
    canonical: $('link[rel="canonical"]').attr('href') || null,
    lang: $('html').attr('lang') || null,
    charset: $('meta[charset]').attr('charset') || null,
    favicon: !!$('link[rel~="icon"]').length,
    h1: headings('h1'),
    h2: headings('h2').slice(0, 20),
    h3Count: $('h3').length,
    wordCount: words.length,
    images: { total: images.length, missingAlt: imagesMissingAlt.length },
    links: { internal: internalLinks, external: externalLinks, nofollow: nofollowLinks },
    openGraph: { title: og('title'), description: og('description'), image: og('image'), type: og('type') },
    twitterCard: meta('twitter:card'),
    hreflang: $('link[rel="alternate"][hreflang]').map((_, el) => $(el).attr('hreflang')).get(),
    jsonLdRaw: $('script[type="application/ld+json"]').map((_, el) => $(el).contents().text()).get(),
    microdataTypes: $('[itemtype]').map((_, el) => $(el).attr('itemtype')).get(),
    hasTelLink: !!$('a[href^="tel:"]').length,
    hasMapEmbed: !!$('iframe[src*="google.com/maps"], iframe[src*="maps.google"]').length,
    bodyTextSample: words.slice(0, 120).join(' '),
  };
}

module.exports = { crawlSite };
