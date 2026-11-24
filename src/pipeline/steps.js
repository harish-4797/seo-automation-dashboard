// [progress %, label] for each pipeline stage. Shared by the pipeline and the admin UI timeline.
const STEPS = {
  crawl: [5, 'Step 1/7 · Crawling site (Fetch + Cheerio)'],
  pagespeed: [15, 'Step 2/7 · PageSpeed Insights'],
  gsc: [23, 'Step 3/7 · Google Search Console'],
  schema: [31, 'Step 4/7 · Schema.org validation'],
  onpage: [39, 'Step 5/7 · On-page analysis'],
  robots: [47, 'Step 6/7 · robots.txt + sitemap.xml'],
  rankings: [55, 'Step 7/7 · DataForSEO rankings'],
  claude: [63, 'Analysing signals with Claude'],
  save: [82, 'Saving audit result to Postgres'],
  pdf: [88, 'Generating PDF report (Puppeteer)'],
  deliver: [95, 'Delivering report via WhatsApp + Email'],
};

module.exports = { STEPS };
