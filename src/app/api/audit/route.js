// app/api/audit/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditQueue, wakeWorker } from '@/lib/queue';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const session = await getSessionFromRequest(req);
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId } = await req.json().catch(() => ({}));
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const audit = await prisma.audit.create({ data: { clientId, currentStep: 'Queued' } });
  try {
    await auditQueue.add('run-audit', { auditId: audit.id }, { jobId: audit.id });
    await wakeWorker({ force: true });
  } catch (err) {
    // The row stays QUEUED; the cron route re-enqueues or processes it.
    console.error('[API] Failed to enqueue audit', audit.id, err.message);
  }

  return NextResponse.json({ auditId: audit.id }, { status: 202 });
}
