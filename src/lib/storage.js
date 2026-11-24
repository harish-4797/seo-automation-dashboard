const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { prisma } = require('./prisma');

// Cloudflare R2 is mocked per the brief: reports are written to /tmp/reports/.
// Because the worker and the web app run on different hosts, the bytes are also stored
// in Postgres (ReportFile) so /api/reports/[id] can serve them from anywhere.
const REPORTS_DIR = path.join(os.tmpdir(), 'reports');

async function saveReport(auditId, pdfBuffer) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const localPath = path.join(REPORTS_DIR, `${auditId}.pdf`);
  await fs.writeFile(localPath, pdfBuffer);
  console.log('[MOCK R2] → Saved report:', localPath, `(${Math.round(pdfBuffer.length / 1024)} KB)`);

  await prisma.reportFile.upsert({
    where: { auditId },
    create: { auditId, data: pdfBuffer },
    update: { data: pdfBuffer },
  });
  return localPath;
}

async function loadReport(auditId) {
  const row = await prisma.reportFile.findUnique({ where: { auditId } });
  return row ? Buffer.from(row.data) : null;
}

// Signed link so WhatsApp/email recipients can open the PDF without logging in.
function reportToken(auditId) {
  return crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
    .update('report:' + auditId)
    .digest('hex')
    .slice(0, 32);
}

function verifyReportToken(auditId, token) {
  if (!token) return false;
  const expected = reportToken(auditId);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function publicReportUrl(auditId) {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/reports/${auditId}?token=${reportToken(auditId)}`;
}

module.exports = { saveReport, loadReport, reportToken, verifyReportToken, publicReportUrl, REPORTS_DIR };
