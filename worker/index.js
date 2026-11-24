// Long-running BullMQ worker. Deploy on Render/Railway/Fly/VPS (not Vercel).
//   node worker/index.js
require('dotenv').config();

const http = require('http');
const { Worker } = require('bullmq');
const { QUEUE_NAME, HEARTBEAT_KEY, createConnection } = require('../src/lib/queue');
const { runAudit } = require('../src/pipeline/runAudit');
const { prisma } = require('../src/lib/prisma');
const { USE_MOCKS } = require('../src/mocks');
const { useRealClaude, MODEL } = require('../src/ai/claude');

const connection = createConnection();
const HEARTBEAT_EVERY_MS = 5 * 60 * 1000;

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[WORKER] Picked up job ${job.id} (audit ${job.data.auditId})`);
    return runAudit(job.data.auditId, { onProgress: (p, step) => job.updateProgress({ progress: p, step }) });
  },
  {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 1),
    // Upstash free tier budget: an idle worker issues one blocking poll per drainDelay
    // (new jobs still wake it instantly) and one stalled-job check per stalledInterval.
    drainDelay: 60,
    stalledInterval: 5 * 60 * 1000,
    lockDuration: 5 * 60 * 1000,
    maxStalledCount: 1,
  }
);

worker.on('completed', (job, res) => console.log(`[WORKER] Job ${job.id} completed`, res?.skipped ? '(skipped)' : `score=${res?.overallScore}`));
worker.on('failed', async (job, err) => {
  const final = job && job.attemptsMade >= (job.opts.attempts || 1);
  console.error(`[WORKER] Job ${job?.id} failed (attempt ${job?.attemptsMade}${final ? ', final' : ', will retry'}):`, err.message);
  if (!final) return;
  // A failure before runAudit claimed the row (e.g. DB unreachable) would leave it QUEUED forever.
  await prisma.audit
    .updateMany({
      where: { id: job.data.auditId, status: { in: ['QUEUED', 'RUNNING'] } },
      data: { status: 'FAILED', currentStep: 'Failed', errorMessage: String(err.message).slice(0, 1000), completedAt: new Date() },
    })
    .catch((e) => console.error('[WORKER] Could not mark audit failed:', e.message));
});
worker.on('error', (err) => console.error('[WORKER] Error:', err.message));

// Heartbeat lets the cron route know a dedicated worker is online (so it won't process inline).
// It carries this instance's id: during a zero-downtime deploy the old instance shuts down after
// the new one has started, and must not delete the new one's heartbeat.
const INSTANCE_ID = `${process.env.RENDER_INSTANCE_ID || require('os').hostname()}:${process.pid}`;
const DEL_IF_OURS = "local v = redis.call('get', KEYS[1]) if v and string.sub(v, 1, #ARGV[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

async function heartbeat() {
  try {
    await connection.set(HEARTBEAT_KEY, `${INSTANCE_ID}@${new Date().toISOString()}`, 'EX', Math.ceil((HEARTBEAT_EVERY_MS * 2) / 1000));
  } catch (err) {
    console.error('[WORKER] Heartbeat failed:', err.message);
  }
}

// Audits left RUNNING by a crashed/restarted worker would otherwise spin forever in the UI.
async function failOrphanedAudits() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const { count } = await prisma.audit.updateMany({
    where: { status: 'RUNNING', createdAt: { lt: cutoff } },
    data: { status: 'FAILED', currentStep: 'Failed', errorMessage: 'Worker restarted while this audit was running' },
  });
  if (count) console.log(`[WORKER] Marked ${count} orphaned audit(s) as FAILED`);
}

// Health endpoint: Render web services need an open port, and cron-job.org can ping it
// to keep a free instance awake.
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, queue: QUEUE_NAME, running: worker.isRunning(), mocks: USE_MOCKS, ai: useRealClaude() ? MODEL : 'mock', time: new Date().toISOString() }));
});

async function main() {
  await failOrphanedAudits().catch((e) => console.error('[WORKER] Orphan check failed:', e.message));
  await heartbeat();
  setInterval(heartbeat, HEARTBEAT_EVERY_MS).unref();
  const port = Number(process.env.PORT || 8080);
  server.listen(port, () => console.log(`[WORKER] Health server on :${port}`));
  console.log(`[WORKER] Listening on queue "${QUEUE_NAME}" · USE_MOCKS=${USE_MOCKS} · AI=${useRealClaude() ? MODEL : 'mock'}`);
}

async function shutdown(signal) {
  console.log(`[WORKER] ${signal} received, closing…`);
  server.close();
  await worker.close();
  await connection.eval(DEL_IF_OURS, 1, HEARTBEAT_KEY, `${INSTANCE_ID}@`).catch(() => {});
  await connection.quit().catch(() => {});
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main();
