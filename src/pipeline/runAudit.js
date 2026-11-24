// The audit pipeline from Section 3.2. Used by the BullMQ worker and by the cron route's
// inline fallback. Each data-collection step degrades gracefully: a failing step is recorded
// in signals.errors and the audit continues with whatever evidence it has.

const { prisma } = require('../lib/prisma');
const { crawlSite } = require('../crawlers/site');
const { getPageSpeed } = require('../crawlers/pagespeed');
const { getSearchConsole } = require('../crawlers/gsc');
const { getRankings } = require('../crawlers/dataforseo');
const { checkRobotsAndSitemap } = require('../crawlers/robots');
const { validateSchema } = require('../analyzers/schema');
const { analyzeOnPage, analyzeTechnical } = require('../analyzers/onpage');
const { analyzeSignals } = require('../ai/claude');
const { generateMockAnalysis } = require('../mocks/claude.mock');
const { parseAuditResult } = require('../ai/schema');
const { generatePdf } = require('../report/pdf');
const { saveReport, publicReportUrl } = require('../lib/storage');
const { sendWhatsApp } = require('../delivery/whatsapp');
const { sendEmail } = require('../delivery/email');
const { USE_MOCKS } = require('../mocks');

const { STEPS } = require('./steps');

function primaryKeyword(client) {
  const t = (client.businessType || 'business').toLowerCase();
  const service = t.includes('dent') ? 'dental clinic' : t.includes('real') ? 'real estate agent' : t;
  return `${service} ${client.city}`.toLowerCase();
}

/**
 * Steps 1–7. `report(stepKey)` is awaited before each step so progress is visible.
 * Pure data collection — no DB access — so scripts/dry-run.js can use it too.
 */
async function collectSignals(client, report = async () => {}) {
  const errors = {};
  const timings = {};
  const run = async (key, fn) => {
    await report(key);
    const t0 = Date.now();
    try {
      return await fn();
    } catch (err) {
      errors[key] = err.message;
      console.warn(`[PIPELINE] ${key} failed:`, err.message);
      return null;
    } finally {
      timings[key] = Date.now() - t0;
    }
  };

  const url = client.websiteUrl;
  const crawl = await run('crawl', () => crawlSite(url));
  const pagespeed = await run('pagespeed', () => getPageSpeed(url));
  const gsc = await run('gsc', () => getSearchConsole(url));
  const schema = await run('schema', async () => {
    if (!crawl) throw new Error('No crawl data (site unreachable)');
    return validateSchema(crawl.jsonLdRaw, crawl.microdataTypes, client.businessType);
  });
  const onPage = await run('onpage', async () => analyzeOnPage(crawl, client));
  const robotsSitemap = await run('robots', () => checkRobotsAndSitemap(crawl?.finalUrl || url));
  const rankings = await run('rankings', () => getRankings(url, primaryKeyword(client), client.city));
  const technical = analyzeTechnical(crawl, robotsSitemap);

  const failed = (checks) => (checks || []).filter((c) => !c.pass).map(({ id, severity, message, value }) => ({ id, severity, message, value }));

  // The six sections substituted into the prompt template.
  const sections = {
    onPage: crawl
      ? {
          title: crawl.title,
          metaDescription: crawl.metaDescription,
          h1: crawl.h1,
          h2: crawl.h2.slice(0, 8),
          wordCount: crawl.wordCount,
          images: crawl.images,
          links: crawl.links,
          canonical: crawl.canonical,
          lang: crawl.lang,
          openGraph: crawl.openGraph,
          hasTelLink: crawl.hasTelLink,
          hasMapEmbed: crawl.hasMapEmbed,
          score: onPage?.score ?? null,
          failedChecks: failed(onPage?.checks),
        }
      : { available: false, error: errors.crawl || 'crawl failed' },
    technical: {
      finalUrl: crawl?.finalUrl ?? null,
      statusCode: crawl?.statusCode ?? null,
      https: crawl?.https ?? null,
      responseTimeMs: crawl?.responseTimeMs ?? null,
      htmlBytes: crawl?.htmlBytes ?? null,
      headers: crawl?.headers ?? null,
      robots: robotsSitemap?.robots
        ? { found: robotsSitemap.robots.found, status: robotsSitemap.robots.status, blocksAllForStar: !!robotsSitemap.robots.blocksAllForStar, sitemapsDeclared: robotsSitemap.robots.sitemaps || [] }
        : null,
      sitemap: robotsSitemap?.sitemap ?? null,
      score: technical.score,
      failedChecks: failed(technical.checks),
      crawlError: errors.crawl || null,
    },
    cwv: pagespeed,
    schema,
    gsc,
    rankings,
  };

  return {
    collectedAt: new Date().toISOString(),
    mocks: USE_MOCKS,
    sections,
    raw: { crawl: crawl && { ...crawl, jsonLdRaw: crawl.jsonLdRaw.map((s) => s.slice(0, 2000)) }, onPageChecks: onPage?.checks, technicalChecks: technical.checks, robotsSitemap },
    errors,
    timings,
  };
}

// Claude, with a clearly-labelled mock fallback so one API hiccup doesn't lose the audit.
async function analyze(client, sections) {
  try {
    const { result, meta } = await analyzeSignals(client, sections);
    return { ...result, _meta: meta };
  } catch (err) {
    console.error('[PIPELINE] Claude analysis failed, falling back to mock analyst:', err.message);
    const result = parseAuditResult(generateMockAnalysis(client, sections));
    return { ...result, _meta: { source: 'mock_fallback', error: err.message } };
  }
}

// Postgres jsonb rejects \u0000, which scraped HTML occasionally contains; also drops undefined.
function toJsonSafe(value) {
  return JSON.parse(JSON.stringify(value).replace(/\\u0000/g, ''));
}

/**
 * Runs the full pipeline for one Audit row. Returns { skipped: true } if another runner
 * already claimed it (worker vs cron fallback race).
 */
async function runAudit(auditId, { onProgress } = {}) {
  // Atomic claim: only one runner can move QUEUED -> RUNNING.
  const claimed = await prisma.audit.updateMany({
    where: { id: auditId, status: 'QUEUED' },
    data: { status: 'RUNNING', progress: 1, currentStep: 'Starting', errorMessage: null },
  });
  if (claimed.count === 0) {
    console.log(`[PIPELINE] Audit ${auditId} not QUEUED — skipping`);
    return { skipped: true };
  }

  const audit = await prisma.audit.findUnique({ where: { id: auditId }, include: { client: true } });
  const { client } = audit;
  const step = async (key) => {
    const [progress, currentStep] = STEPS[key];
    await prisma.audit.update({ where: { id: auditId }, data: { progress, currentStep } });
    if (onProgress) await onProgress(progress, currentStep);
    console.log(`[PIPELINE] ${auditId} ${progress}% ${currentStep}`);
  };

  try {
    const signals = toJsonSafe(await collectSignals(client, step));

    await step('claude');
    const result = toJsonSafe(await analyze(client, signals.sections));
    console.log(`[PIPELINE] ${auditId} analysis source=${result._meta.source} score=${result.overall_score} recs=${result.recommendations.length}`);

    await step('save');
    await prisma.audit.update({
      where: { id: auditId },
      data: { signals, result, overallScore: result.overall_score, scoreBreakdown: result.score_breakdown },
    });

    await step('pdf');
    let pdfPath = null;
    try {
      const pdf = await generatePdf({ client, audit: { ...audit, completedAt: new Date() }, result, signals });
      pdfPath = await saveReport(auditId, pdf);
      await prisma.audit.update({ where: { id: auditId }, data: { pdfPath } });
    } catch (err) {
      console.error('[PIPELINE] PDF generation failed:', err.message);
      signals.errors.pdf = err.message;
      await prisma.audit.update({ where: { id: auditId }, data: { signals } });
    }

    await step('deliver');
    const link = pdfPath ? publicReportUrl(auditId) : `${process.env.APP_URL || ''}/client`;
    for (const [channel, send] of [['whatsapp', sendWhatsApp], ['email', sendEmail]]) {
      let status = 'failed';
      let providerId = null;
      try {
        const out = await send(client, link, result.overall_score);
        status = out.status;
        providerId = out.sid || out.id || null;
      } catch (err) {
        console.error(`[PIPELINE] ${channel} delivery failed:`, err.message);
      }
      await prisma.notification.create({ data: { auditId, channel, status, providerId } });
    }

    await prisma.audit.update({
      where: { id: auditId },
      data: { status: 'COMPLETED', progress: 100, currentStep: 'Completed', completedAt: new Date() },
    });
    if (onProgress) await onProgress(100, 'Completed');
    console.log(`[PIPELINE] ${auditId} COMPLETED`);
    return { auditId, overallScore: result.overall_score, pdfPath };
  } catch (err) {
    console.error(`[PIPELINE] ${auditId} FAILED:`, err);
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: 'FAILED', currentStep: 'Failed', errorMessage: String(err.message || err).slice(0, 1000), completedAt: new Date() },
    });
    throw err;
  }
}

module.exports = { runAudit, collectSignals, analyze, primaryKeyword, STEPS };
