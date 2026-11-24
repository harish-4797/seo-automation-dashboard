import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuditLive from '@/components/AuditLive';
import AuditReport from '@/components/AuditReport';
import JsonViewer from '@/components/JsonViewer';
import DatabaseRecord from '@/components/DatabaseRecord';
import RunAuditButton from '@/components/RunAuditButton';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage({ params }) {
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: { client: true, notifications: { orderBy: { createdAt: 'asc' } } },
  });
  if (!audit) notFound();

  const { signals, result } = audit;
  const pdfUrl = audit.pdfPath ? `/api/reports/${audit.id}` : null;
  const { _meta, ...claudeJson } = result || {};

  return (
    <div className="space-y-6">
      <Link href={`/admin/clients/${audit.clientId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {audit.client.name}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">SEO audit · {audit.client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {audit.client.websiteUrl} · triggered by <span className="capitalize">{audit.triggeredBy}</span> · {formatDate(audit.createdAt)}
            {audit.completedAt && <> · finished {formatDate(audit.completedAt)}</>}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">audit {audit.id}</p>
        </div>
        {(audit.status === 'COMPLETED' || audit.status === 'FAILED') && <RunAuditButton clientId={audit.clientId} label="Re-run audit" />}
      </div>

      <AuditLive
        key={audit.status}
        initial={{ id: audit.id, status: audit.status, progress: audit.progress, currentStep: audit.currentStep, errorMessage: audit.errorMessage }}
      />

      {result && <AuditReport result={result} pdfUrl={pdfUrl} />}

      {audit.status === 'COMPLETED' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
              <CardDescription>Twilio WhatsApp + email ({audit.notifications.some((n) => n.status === 'mock_sent') ? 'mocked — see worker logs' : 'live'})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {audit.notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="font-medium capitalize">{n.channel}</span>
                  <span className="font-mono text-xs text-muted-foreground">{n.providerId}</span>
                  <Badge variant={n.status === 'failed' ? 'danger' : 'success'}>{n.status}</Badge>
                </div>
              ))}
              {audit.pdfPath && <p className="pt-1 text-xs text-muted-foreground">PDF stored at <code>{audit.pdfPath}</code> (mock R2) and in Postgres.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pipeline diagnostics</CardTitle>
              <CardDescription>Per-step timings and errors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {Object.entries(signals?.timings || {}).map(([k, ms]) => (
                <div key={k} className="flex justify-between">
                  <span className="capitalize">{k}</span>
                  <span className={signals.errors?.[k] ? 'text-red-600' : 'text-muted-foreground'}>
                    {signals.errors?.[k] ? `failed: ${signals.errors[k]}` : `${ms} ms`}
                  </span>
                </div>
              ))}
              {signals?.errors?.pdf && <div className="flex justify-between text-red-600"><span>PDF</span><span>{signals.errors.pdf}</span></div>}
              {_meta && (
                <div className="flex justify-between border-t pt-2">
                  <span>Analysis</span>
                  <span className="text-muted-foreground">
                    {_meta.source}{_meta.model ? ` · ${_meta.model}` : ''}
                    {_meta.usage ? ` · ${_meta.usage.input_tokens} in / ${_meta.usage.output_tokens} out tokens` : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {audit.status === 'COMPLETED' && <DatabaseRecord auditId={audit.id} />}

      {result && (
        <div className="space-y-3">
          <JsonViewer title="Claude JSON output (stored in Audit.result)" data={claudeJson} />
          <JsonViewer title="Prompt sections sent to Claude (signals.sections)" data={signals?.sections} />
          <JsonViewer title="Raw crawl + check data (signals.raw)" data={signals?.raw} />
        </div>
      )}
    </div>
  );
}
