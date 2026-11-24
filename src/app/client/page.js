import Link from 'next/link';
import { Clock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AuditReport from '@/components/AuditReport';
import AuditsTable from '@/components/AuditsTable';
import { cn, formatDate, scoreBg } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function ScoreTrend({ audits }) {
  const points = audits.filter((a) => a.overallScore != null).slice(0, 12).reverse();
  if (points.length < 2) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score history</CardTitle>
        <CardDescription>Overall SEO score per audit</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-2">
          {points.map((a) => (
            <div key={a.id} className="flex flex-1 flex-col items-center gap-1" title={formatDate(a.createdAt)}>
              <span className="text-xs font-semibold tabular-nums">{a.overallScore}</span>
              <div className={cn('w-full max-w-10 rounded-t', scoreBg(a.overallScore))} style={{ height: `${a.overallScore}%` }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ClientDashboard() {
  const session = await requireRole('client');
  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    include: { audits: { orderBy: { createdAt: 'desc' }, take: 24 } },
  });
  if (!client) return <p>Client not found.</p>;

  const latest = client.audits.find((a) => a.status === 'COMPLETED');
  const inProgress = client.audits.find((a) => a.status === 'QUEUED' || a.status === 'RUNNING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <p className="text-sm text-muted-foreground">{client.websiteUrl} · {client.businessType} · {client.city}, {client.state}</p>
      </div>

      {inProgress && (
        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          <Clock className="h-4 w-4" /> A new audit is in progress ({inProgress.progress}%). Your report will appear here when it's ready.
        </div>
      )}

      {latest ? (
        <AuditReport
          result={latest.result}
          pdfUrl={latest.pdfPath ? `/api/reports/${latest.id}` : null}
          header={<div className="text-sm text-muted-foreground">Latest audit · {formatDate(latest.completedAt)}</div>}
        />
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Your first SEO audit hasn't been completed yet.</CardContent></Card>
      )}

      <ScoreTrend audits={client.audits} />

      <Card>
        <CardHeader><CardTitle>All reports</CardTitle></CardHeader>
        <CardContent className="p-0">
          <AuditsTable audits={client.audits} hrefBase="/client/audits" showClient={false} />
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Questions about your report? <Link href="mailto:hello@edgelinktechnology.com" className="text-primary hover:underline">Contact your account manager</Link>.
      </p>
    </div>
  );
}
