// Mock Claude response used when no ANTHROPIC_API_KEY is configured (or MOCK_CLAUDE=true).
// Rather than a frozen blob, it derives a realistic report from the real crawl checks and the
// mock API data, so the output still reflects the audited site. Same JSON shape as Claude.

const TEMPLATES = {
  title_present: ['CRITICAL', 'OnPage', 'Homepage has no <title> tag.', 'Add a unique title: "<Primary service> in {CITY} | <Brand>" (50–60 chars).', 'High', 'Hours', 'View source shows <title>; Google SERP snippet shows the new title within 2 weeks.'],
  title_length: ['MEDIUM', 'OnPage', 'Title length is {VALUE} characters (target 30–60).', 'Rewrite the title to 50–60 characters, leading with the primary service + {CITY}.', 'Medium', 'Hours', 'Title renders untruncated in GSC/SERP preview; CTR for branded + service queries rises over 28 days.'],
  meta_description_present: ['HIGH', 'OnPage', 'Homepage has no meta description, so Google auto-generates snippets.', 'Write a 140–155 character meta description with service, {CITY}, and a call to action (e.g. "Book today").', 'Medium', 'Hours', 'Meta description visible in page source; homepage CTR in GSC improves vs previous 28 days.'],
  meta_description_length: ['LOW', 'OnPage', 'Meta description is {VALUE} characters (target 70–160).', 'Trim/expand the meta description to 140–155 characters.', 'Low', 'Hours', 'SERP snippet is not truncated in a site: search.'],
  single_h1: ['HIGH', 'OnPage', 'Homepage has {VALUE} H1 headings (should be exactly one).', 'Use a single H1 stating the primary service and city, e.g. "Trusted Dental Clinic in {CITY}"; demote others to H2.', 'Medium', 'Hours', 'Crawl shows exactly one H1 containing the service + city keyword.'],
  h2_structure: ['LOW', 'Content', 'Only {VALUE} H2 sub-headings — content lacks scannable structure.', 'Add H2 sections per core service (e.g. Implants, Root Canal, Braces) with 80–120 words each.', 'Medium', 'Days', 'Crawl shows 4+ H2s; service queries in GSC gain impressions within 6 weeks.'],
  word_count: ['MEDIUM', 'Content', 'Homepage has only {VALUE} words of indexable text.', 'Expand homepage copy to 600+ words covering services, doctors, {CITY} locality, and FAQs.', 'High', 'Days', 'Word count ≥ 600 on re-crawl; long-tail impressions in GSC increase over 4–8 weeks.'],
  image_alt: ['MEDIUM', 'OnPage', '{VALUE} images are missing alt text.', 'Add descriptive alt text to every content image (e.g. "dental implant procedure at clinic in {CITY}").', 'Low', 'Hours', 'Re-crawl reports 0 images missing alt; Lighthouse accessibility score increases.'],
  canonical: ['MEDIUM', 'Technical', 'No canonical tag on the homepage.', 'Add <link rel="canonical" href="<preferred https URL>"> to every page template.', 'Medium', 'Hours', 'Canonical present in source; GSC "Duplicate without user-selected canonical" count drops.'],
  viewport: ['HIGH', 'Technical', 'No mobile viewport meta tag — page renders as desktop on phones.', 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.', 'High', 'Hours', 'Lighthouse mobile audit passes "Has a viewport meta tag".'],
  lang: ['LOW', 'Technical', 'The <html> element has no lang attribute.', 'Set <html lang="en-IN"> (or the correct locale).', 'Low', 'Hours', 'Source shows lang attribute; Lighthouse accessibility audit passes.'],
  open_graph: ['LOW', 'OnPage', 'Open Graph title/image missing — WhatsApp/Facebook shares show no preview.', 'Add og:title, og:description and a 1200×630 og:image.', 'Low', 'Hours', 'Sharing the URL on WhatsApp shows a rich preview card.'],
  internal_links: ['LOW', 'OnPage', 'Homepage links to only {VALUE} internal pages.', 'Link to every service page and location page from the homepage navigation and body.', 'Medium', 'Hours', 'Crawl shows 10+ internal links; service pages gain impressions in GSC.'],
  city_in_title: ['HIGH', 'OnPage', 'Title does not mention {CITY}, weakening local relevance.', 'Include "{CITY}" in the title, e.g. "Dental Clinic in {CITY} | <Brand>".', 'High', 'Hours', 'Position for "<service> {CITY_LOWER}" queries improves in GSC within 4 weeks.'],
  city_in_h1: ['MEDIUM', 'OnPage', 'H1 does not mention {CITY}.', 'Rewrite the H1 to include the service and "{CITY}".', 'Medium', 'Hours', 'Re-crawl shows city in H1; local query impressions rise.'],
  click_to_call: ['MEDIUM', 'Content', 'No click-to-call (tel:) link — mobile visitors cannot call in one tap.', 'Add a sticky "Call now" button using <a href="tel:+91XXXXXXXXXX">.', 'Medium', 'Hours', 'GA4 click events on tel: links > 0 within 7 days.'],
  map_embed: ['LOW', 'Content', 'No embedded Google Map for the clinic location.', 'Embed the Google Business Profile map on the contact/home page.', 'Low', 'Hours', 'Map iframe present on re-crawl; direction requests in GBP Insights increase.'],
  noindex: ['CRITICAL', 'Technical', 'Homepage is set to noindex — Google is told not to index it.', 'Remove "noindex" from the meta robots tag / X-Robots-Tag header immediately.', 'High', 'Hours', 'GSC URL Inspection shows "URL is on Google" within 7 days.'],
  https: ['CRITICAL', 'Technical', 'Site is not served over HTTPS.', 'Install a TLS certificate and 301-redirect all http:// URLs to https://.', 'High', 'Hours', 'http:// URL returns 301 to https://; browser shows padlock.'],
  status_200: ['CRITICAL', 'Technical', 'Homepage returned HTTP {VALUE} instead of 200.', 'Fix the server/CMS so the homepage returns 200 OK.', 'High', 'Hours', 'curl -I on the homepage returns 200.'],
  ttfb: ['MEDIUM', 'Technical', 'Server response time is {VALUE} ms (target < 800 ms).', 'Enable full-page caching and a CDN (e.g. Cloudflare) in front of the origin.', 'Medium', 'Days', 'Re-crawl measures < 800 ms response time on 3 consecutive runs.'],
  compression: ['LOW', 'Technical', 'HTML is served without gzip/brotli compression.', 'Enable brotli/gzip compression at the server or CDN.', 'Low', 'Hours', 'Response header shows content-encoding: br or gzip.'],
  hsts: ['LOW', 'Technical', 'No HSTS header.', 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains.', 'Low', 'Hours', 'Response headers include strict-transport-security.'],
  robots_found: ['MEDIUM', 'Technical', 'robots.txt is missing.', 'Publish /robots.txt allowing crawl and declaring the sitemap URL.', 'Low', 'Hours', 'GET /robots.txt returns 200 with a Sitemap: line.'],
  robots_not_blocking: ['CRITICAL', 'Technical', 'robots.txt disallows all crawlers (Disallow: /).', 'Remove "Disallow: /" for User-agent: * in robots.txt.', 'High', 'Hours', 'GSC robots.txt report shows homepage as allowed.'],
  sitemap_found: ['HIGH', 'Technical', 'No valid XML sitemap found.', 'Generate /sitemap.xml listing all indexable URLs and submit it in Search Console.', 'Medium', 'Hours', 'GSC Sitemaps report shows "Success" with discovered URLs > 0.'],
  sitemap_in_robots: ['LOW', 'Technical', 'Sitemap is not declared in robots.txt.', 'Add "Sitemap: https://<domain>/sitemap.xml" to robots.txt.', 'Low', 'Hours', 'robots.txt contains a Sitemap: line.'],
};

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function fromCheck(c, vars) {
  const t = TEMPLATES[c.id];
  if (!t) return null;
  const v = { ...vars, VALUE: typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value ?? '') };
  const [priority, category, finding, fix, estimated_impact, effort, falsifiability_check] = t.map((s) => fill(s, v));
  return { priority, category, finding, fix, estimated_impact, effort, falsifiability_check };
}

function generateMockAnalysis(client, sections) {
  const vars = { CITY: client.city, CITY_LOWER: (client.city || '').toLowerCase() };
  const recs = [];

  if (sections.technical?.crawlError) {
    recs.push({ priority: 'CRITICAL', category: 'Technical', finding: `The homepage could not be fetched by our crawler (${sections.technical.crawlError}); search engines may face the same problem.`, fix: 'Check DNS, TLS certificate, hosting uptime and any firewall/bot rules blocking crawlers; confirm the site loads for Googlebot via GSC URL Inspection.', estimated_impact: 'High', effort: 'Hours', falsifiability_check: 'GSC URL Inspection "Test live URL" succeeds and the next audit crawl returns HTTP 200.' });
  }

  for (const c of sections.onPage?.failedChecks || []) recs.push(fromCheck(c, vars));
  for (const c of sections.technical?.failedChecks || []) recs.push(fromCheck(c, vars));

  // Core Web Vitals (from PageSpeed)
  const audits = sections.cwv?.audits || {};
  const lcp = audits['largest-contentful-paint'];
  if (lcp && lcp.score < 0.5) {
    recs.push({ priority: 'HIGH', category: 'CWV', finding: `Mobile LCP is ${lcp.displayValue} (Google "good" threshold is ≤ 2.5 s).`, fix: 'Compress and preload the hero image (WebP/AVIF, fetchpriority="high"), and defer non-critical JS.', estimated_impact: 'High', effort: 'Days', falsifiability_check: 'PageSpeed mobile LCP ≤ 2.5 s; CrUX LCP passes in the 28-day field data.' });
  }
  const js = audits['unused-javascript'];
  if (js && js.score < 0.5) {
    recs.push({ priority: 'MEDIUM', category: 'CWV', finding: `${js.displayValue} of unused JavaScript is shipped on mobile.`, fix: 'Remove unused plugins/scripts and lazy-load chat widgets and sliders after interaction.', estimated_impact: 'Medium', effort: 'Days', falsifiability_check: 'PageSpeed "Reduce unused JavaScript" savings < 100 KiB.' });
  }
  const rbr = audits['render-blocking-resources'];
  if (rbr && rbr.score < 0.9) {
    recs.push({ priority: 'MEDIUM', category: 'CWV', finding: `Render-blocking resources delay first paint (${rbr.description || rbr.displayValue}).`, fix: 'Inline critical CSS and add defer/async to non-critical scripts.', estimated_impact: 'Medium', effort: 'Hours', falsifiability_check: 'PageSpeed no longer flags render-blocking resources.' });
  }
  const inp = audits['interaction-to-next-paint'];
  if (inp && inp.score < 0.9) {
    recs.push({ priority: 'MEDIUM', category: 'CWV', finding: `INP is ${inp.displayValue} (good is ≤ 200 ms).`, fix: 'Break up long main-thread tasks and defer third-party scripts until after first interaction.', estimated_impact: 'Medium', effort: 'Days', falsifiability_check: 'CrUX INP ≤ 200 ms at p75 over 28 days.' });
  }

  // Schema
  const schema = sections.schema || {};
  if (!schema.hasLocalBusiness) {
    recs.push({ priority: 'HIGH', category: 'Schema', finding: `No LocalBusiness/${schema.recommendedType} structured data found (types found: ${(schema.typesFound || []).join(', ') || 'none'}).`, fix: `Add JSON-LD "${schema.recommendedType}" schema with name, address (PostalAddress), telephone, geo, openingHoursSpecification, priceRange and sameAs links.`, estimated_impact: 'High', effort: 'Hours', falsifiability_check: 'Google Rich Results Test detects a valid LocalBusiness entity with 0 errors.' });
  } else if ((schema.entities?.[0]?.missingRecommended || []).length) {
    recs.push({ priority: 'MEDIUM', category: 'Schema', finding: `LocalBusiness schema is missing: ${schema.entities[0].missingRecommended.join(', ')}.`, fix: 'Add the missing properties to the existing JSON-LD block.', estimated_impact: 'Medium', effort: 'Hours', falsifiability_check: 'Rich Results Test shows no warnings for the entity.' });
  }
  if (schema.parseErrors?.length) {
    recs.push({ priority: 'HIGH', category: 'Schema', finding: `${schema.parseErrors.length} JSON-LD block(s) fail to parse.`, fix: 'Fix the JSON syntax errors in the structured data blocks.', estimated_impact: 'Medium', effort: 'Hours', falsifiability_check: 'Schema validator parses all blocks without error.' });
  }

  // Search Console
  const gsc = sections.gsc || {};
  if (gsc.indexCoverageErrors > 0) {
    recs.push({ priority: 'HIGH', category: 'Technical', finding: `Search Console reports ${gsc.indexCoverageErrors} index coverage errors.`, fix: 'Open GSC → Pages → "Why pages aren\'t indexed", fix each reason (404s, redirects, soft 404s) and request validation.', estimated_impact: 'High', effort: 'Days', falsifiability_check: 'GSC index coverage errors reach 0 after validation completes.' });
  }
  const strikingDistance = (gsc.rows || []).filter((r) => r.position > 5 && r.position <= 15).sort((a, b) => b.impressions - a.impressions);
  if (strikingDistance.length) {
    const top = strikingDistance.slice(0, 3).map((r) => `"${r.query}" (pos ${r.position}, ${r.impressions} impr.)`).join(', ');
    recs.push({ priority: 'HIGH', category: 'Content', finding: `High-impression queries sit just off the top 5: ${top}.`, fix: 'Create/upgrade a dedicated landing page per query with the exact phrase in title, H1 and first paragraph, plus FAQs and internal links from the homepage.', estimated_impact: 'High', effort: 'Days', falsifiability_check: 'Average position for these queries improves to ≤ 5 in GSC within 8 weeks; clicks rise.' });
  }
  const lowCtr = (gsc.rows || []).filter((r) => r.ctr < 0.035);
  if (lowCtr.length) {
    recs.push({ priority: 'MEDIUM', category: 'OnPage', finding: `CTR below 3.5% for ${lowCtr.map((r) => `"${r.query}"`).join(', ')}.`, fix: 'Rewrite titles/meta descriptions for the ranking pages with price cues, ratings and "{CITY}" to earn more clicks.'.replace('{CITY}', client.city), estimated_impact: 'Medium', effort: 'Hours', falsifiability_check: 'CTR for these queries exceeds 4.5% over the next 28 days at similar positions.' });
  }

  // Rankings
  const rk = sections.rankings || {};
  if (rk.client_rank_position && rk.client_rank_position > 3) {
    const kw = rk.tasks?.[0]?.result?.[0]?.keyword || 'primary keyword';
    recs.push({ priority: 'MEDIUM', category: 'Content', finding: `Ranks #${rk.client_rank_position} for "${kw}" (${rk.keyword_search_volume || 'n/a'} searches/mo) — top-3 captures most local clicks.`, fix: 'Strengthen the Google Business Profile (photos, weekly posts, review replies) and build 5+ local citations (Justdial, Practo, Sulekha).', estimated_impact: 'High', effort: 'Weeks', falsifiability_check: `DataForSEO rank for "${kw}" reaches top 3 within 3 months.` });
  }

  const recommendations = recs.filter(Boolean);
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  recommendations.sort((a, b) => order[a.priority] - order[b.priority]);

  // Scores
  const cwvScore = Math.round((sections.cwv?.categories?.performance?.score ?? 0.5) * 100);
  const onPageScore = sections.onPage?.score ?? 40;
  const techScore = sections.technical?.score ?? 50;
  const wc = sections.onPage?.wordCount ?? 0;
  const contentScore = Math.max(15, Math.min(95, Math.round(35 + wc / 20 + (sections.onPage?.h2?.length || 0) * 2 - strikingDistance.length * 3)));
  const missing = schema.entities?.[0]?.missingRecommended?.length ?? 9;
  const schemaScore = schema.hasLocalBusiness ? Math.round(60 + 40 * (1 - missing / 9)) : schema.hasOrganization ? 35 : 10;
  const overall = Math.round(techScore * 0.25 + onPageScore * 0.25 + contentScore * 0.15 + cwvScore * 0.2 + schemaScore * 0.15);

  const critical = recommendations.filter((r) => r.priority === 'CRITICAL');
  const high = recommendations.filter((r) => r.priority === 'HIGH');
  const quick = recommendations.filter((r) => r.effort === 'Hours' && r.priority !== 'CRITICAL');

  const criticalList = (critical.length ? critical : high).slice(0, 5);
  const importantList = high.concat(recommendations.filter((r) => r.priority === 'MEDIUM')).filter((r) => !criticalList.includes(r));

  const worst = Object.entries({ technical: techScore, 'on-page SEO': onPageScore, content: contentScore, 'Core Web Vitals': cwvScore, 'structured data': schemaScore }).sort((a, b) => a[1] - b[1]);

  return {
    audit_version: 'v1.0',
    overall_score: overall,
    score_breakdown: { technical: techScore, on_page: onPageScore, content: contentScore, core_web_vitals: cwvScore, schema: schemaScore },
    critical_issues: criticalList.map((r) => r.finding),
    important_issues: importantList.slice(0, 8).map((r) => r.finding),
    quick_wins: quick.slice(0, 5).map((r) => r.fix),
    recommendations,
    executive_summary: `${client.name} scores ${overall}/100, with the weakest areas being ${worst[0][0]} (${worst[0][1]}) and ${worst[1][0]} (${worst[1][1]}). We found ${critical.length} critical and ${high.length} high-priority issues, ${quick.length} of which can be fixed within hours. Fixing local signals for ${client.city} and the high-impression queries just outside the top 5 is the fastest route to more enquiries.`,
  };
}

module.exports = { generateMockAnalysis };
