import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueAudit, isWorkerOnline, getAuditQueue } from '@/lib/queue';
import { runAudit } from '@/pipeline/runAudit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const INTERVAL_DAYS = Number(process.env.CRON_INTERVAL_DAYS || 30);
const MAX_ENQUEUE_PER_RUN = 5;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret;
}

// Called by cron-job.org every minute.
export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const started = Date.now();
  const summary = { enqueued: [], requeued: [], processedInline: [], workerOnline: null };

  // 1) Monthly audits that are due: last audit (or client creation, if never audited) is
  //    older than INTERVAL_DAYS and nothing is already queued/running for the client.
  const cutoff = new Date(Date.now() - INTERVAL_DAYS * 86400000);
  const clients = await prisma.client.findMany({
    include: { audits: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, status: true } } },
  });
  const due = clients
    .filter((c) => {
      const last = c.audits[0];
      if (last && (last.status === 'QUEUED' || last.status === 'RUNNING')) return false;
      return (last?.createdAt || c.createdAt) < cutoff;
    })
    .slice(0, MAX_ENQUEUE_PER_RUN);

  for (const c of due) {
    const audit = await prisma.audit.create({ data: { clientId: c.id, triggeredBy: 'cron', currentStep: 'Queued' } });
    await enqueueAudit(audit.id).catch((e) => console.error('[CRON] enqueue failed', e.message));
    summary.enqueued.push({ auditId: audit.id, client: c.name });
  }

  summary.workerOnline = await isWorkerOnline().catch(() => false);

  if (summary.workerOnline) {
    // 2a) Worker is running: make sure no QUEUED row was lost (e.g. Redis hiccup on enqueue).
    //     jobId = auditId, so re-adding an existing job is a no-op.
    const stale = await prisma.audit.findMany({
      where: { status: 'QUEUED', createdAt: { lt: new Date(Date.now() - 2 * 60000) } },
      select: { id: true },
      take: 10,
    });
    for (const a of stale) {
      await enqueueAudit(a.id).catch(() => {});
      summary.requeued.push(a.id);
    }
  } else {
    // 2b) No dedicated worker: process a bounded batch inline (brief §3.1 fallback).
    const batch = Number(process.env.CRON_INLINE_BATCH || 1);
    const queued = await prisma.audit.findMany({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' }, take: batch, select: { id: true } });
    for (const a of queued) {
      if (Date.now() - started > 15000) break; // leave room for the run inside maxDuration
      try {
        const out = await runAudit(a.id);
        await getAuditQueue().remove(a.id).catch(() => {});
        summary.processedInline.push({ auditId: a.id, ...out });
      } catch (err) {
        summary.processedInline.push({ auditId: a.id, error: err.message });
      }
    }
  }

  return NextResponse.json({ ok: true, ms: Date.now() - started, ...summary });
}
