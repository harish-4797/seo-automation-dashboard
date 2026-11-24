const { renderReportHtml, escapeHtml } = require('./template');

// Puppeteer is required lazily so the Next.js app (which never renders PDFs) doesn't load it.
async function generatePdf({ client, audit, result, signals }) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(renderReportHtml({ client, audit, result, signals }), { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="font-size:8px;color:#888;width:100%;padding:0 12mm;display:flex;justify-content:space-between;font-family:Arial"><span>SEO Audit · ${escapeHtml(client.websiteUrl)}</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdf };
