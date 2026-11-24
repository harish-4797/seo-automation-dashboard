import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Polled by the admin portal every ~2s while an audit runs.
export async function GET(req, { params }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      clientId: true,
      status: true,
      progress: true,
      currentStep: true,
      triggeredBy: true,
      overallScore: true,
      scoreBreakdown: true,
      result: true,
      pdfPath: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
      notifications: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.role === 'client' && session.clientId !== audit.clientId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { pdfPath, ...rest } = audit;
  return NextResponse.json({ ...rest, pdfReady: !!pdfPath, pdfUrl: pdfPath ? `/api/reports/${audit.id}` : null });
}
