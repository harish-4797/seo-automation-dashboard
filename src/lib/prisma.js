const { PrismaClient } = require('@prisma/client');

// Neon (serverless Postgres) occasionally drops a new connection or is still waking from
// auto-suspend. These codes mean the connection never opened, so the query did not run and
// retrying it is safe, writes included.
const RETRYABLE = new Set(['P1001', 'P1002']);
const UNREACHABLE = /can't reach database server|timed out fetching a new connection/i;
const RETRY_DELAYS_MS = [500, 2000];

// Known request errors carry `code`, initialization errors `errorCode`, and a refused first
// connection sometimes neither, so the message is the fallback.
const isConnectionError = (err) => RETRYABLE.has(err?.code || err?.errorCode) || UNREACHABLE.test(err?.message || '');

function createClient() {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            if (!isConnectionError(err) || attempt >= RETRY_DELAYS_MS.length) throw err;
            await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
          }
        }
      },
    },
  });
}

// One client per process (Next.js dev hot-reload would otherwise leak connections).
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma || createClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

module.exports = { prisma };
