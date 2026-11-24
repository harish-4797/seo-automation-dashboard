import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { Card, CardContent } from '@/components/ui/card';
import AuditReport from '@/components/AuditReport';
import StatusBadge from '@/components/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ClientAuditPage({ params }) {
  const session = await requireRole('client');
  const audit = await prisma.audit.findFirst({ where: { id: params.id, clientId: session.clientId } });
  if (!audit) notFound();

  return (
    <div className="space-y-6">
      <Link href="/client" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Audit · {formatDate(audit.createdAt)}</h1>
        <StatusBadge status={audit.status} />
      </div>
      {audit.result ? (
        <AuditReport result={audit.result} pdfUrl={audit.pdfPath ? `/api/reports/${audit.id}` : null} />
      ) : (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">
              {audit.status === 'FAILED' ? 'This audit could not be completed. Your account manager has been notified.' : `${audit.currentStep || 'Queued'} — ${audit.progress}%`}
            </p>
            {audit.status !== 'FAILED' && <Progress value={audit.progress} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
