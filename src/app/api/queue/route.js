import { NextResponse } from 'next/server';
import { getAuditQueue, isWorkerOnline, QUEUE_NAME } from '@/lib/queue';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Live view of the BullMQ queue for the admin portal.
export async function GET(req) {
  const session = await getSessionFromRequest(req);
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const queue = getAuditQueue();
    const [counts, jobs, workerOnline] = await Promise.all([
      queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      queue.getJobs(['active', 'waiting', 'completed', 'failed'], 0, 7, false),
      isWorkerOnline(),
    ]);
    return NextResponse.json({
      queue: QUEUE_NAME,
      counts,
      workerOnline,
      jobs: jobs
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8)
        .map((j) => ({
          id: j.id,
          name: j.name,
          auditId: j.data?.auditId,
          progress: j.progress,
          state: j.finishedOn ? (j.failedReason ? 'failed' : 'completed') : j.processedOn ? 'active' : 'waiting',
          timestamp: j.timestamp,
          processedOn: j.processedOn,
          finishedOn: j.finishedOn,
          failedReason: j.failedReason,
        })),
    });
  } catch (err) {
    return NextResponse.json({ error: `Redis unavailable: ${err.message}` }, { status: 503 });
  }
}
