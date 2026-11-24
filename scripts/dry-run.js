// Runs steps 1–7 + analysis + PDF for a URL without touching Postgres or Redis.
//   npm run dry-run -- https://example.com "Dental Clinic" Pune Maharashtra
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { collectSignals, analyze } = require('../src/pipeline/runAudit');
const { generatePdf } = require('../src/report/pdf');

async function main() {
  const [url = 'https://example.com', businessType = 'Dental Clinic', city = 'Pune', state = 'Maharashtra'] = process.argv.slice(2);
  const client = { id: 'dry-run', name: new URL(url).hostname, websiteUrl: url, businessType, city, state };
  const outDir = path.join(process.cwd(), 'dry-run-output');
  fs.mkdirSync(outDir, { recursive: true });

  const signals = await collectSignals(client, async (k) => console.log('→', k));
  console.log('Step errors:', signals.errors);
  console.log('Timings (ms):', signals.timings);

  const result = await analyze(client, signals.sections);
  console.log(`Analysis: source=${result._meta.source} overall=${result.overall_score}`, result.score_breakdown);
  console.log(`Recommendations: ${result.recommendations.length}`);

  fs.writeFileSync(path.join(outDir, 'signals.json'), JSON.stringify(signals, null, 2));
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  const pdf = await generatePdf({ client, audit: { id: 'dry-run', createdAt: new Date() }, result, signals });
  fs.writeFileSync(path.join(outDir, 'report.pdf'), pdf);
  console.log('Wrote', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
