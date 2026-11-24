const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const QUEUE_NAME = 'seo-audit-jobs';
const HEARTBEAT_KEY = 'seo:worker:heartbeat';

// Upstash free tier = 500K commands/month (~11/min). Every setting here is chosen
// to keep an idle worker far below that — see worker/index.js for the worker side.
function createConnection() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');
  return new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    family: 0, // Upstash resolves to IPv6 on some hosts
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}

const g = globalThis;

function getConnection() {
  if (!g.__redis) g.__redis = createConnection();
  return g.__redis;
}

function getAuditQueue() {
  if (!g.__auditQueue) {
    g.__auditQueue = new Queue(QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        // Retries cover transient infra errors, e.g. Neon's free tier waking from auto-suspend.
        // Once an audit is claimed, runAudit marks it FAILED itself, so a retry just skips it.
        attempts: 3,
        backoff: { type: 'exponential', delay: 15000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return g.__auditQueue;
}

// jobId = auditId makes enqueueing idempotent and lets the cron fallback remove a job
// it processed inline.
async function enqueueAudit(auditId) {
  return getAuditQueue().add('run-audit', { auditId }, { jobId: auditId });
}

async function isWorkerOnline() {
  return (await getConnection().exists(HEARTBEAT_KEY)) === 1;
}

// Lazy proxy so `import { auditQueue } from '@/lib/queue'` (the brief's snippet) works
// without opening a Redis connection at module load during `next build`.
const auditQueue = new Proxy(
  {},
  { get: (_t, prop) => { const q = getAuditQueue(); const v = q[prop]; return typeof v === 'function' ? v.bind(q) : v; } }
);

module.exports = {
  QUEUE_NAME,
  HEARTBEAT_KEY,
  createConnection,
  getConnection,
  getAuditQueue,
  auditQueue,
  enqueueAudit,
  isWorkerOnline,
};
