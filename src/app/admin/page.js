import Link from 'next/link';
import { Building2, ClipboardCheck, Gauge, Send } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import QueuePanel from '@/components/QueuePanel';
import AuditsTable from '@/components/AuditsTable';
import { USE_MOCKS } from '@/mocks';
import { useRealClaude, MODEL } from '@/ai/claude';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}{hint && <> · {hint}</>}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminOverview() {
  const [clientCount, auditCount, completed, avg, recent, notifications] = await Promise.all([
    prisma.client.count(),
    prisma.audit.count(),
    prisma.audit.count({ where: { status: 'COMPLETED' } }),
    prisma.audit.aggregate({ _avg: { overallScore: true }, where: { status: 'COMPLETED' } }),
    prisma.audit.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { client: { select: { name: true, websiteUrl: true } } } }),
    prisma.notification.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { audit: { select: { id: true, client: { select: { name: true } } } } } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Audit pipeline status across all clients.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={USE_MOCKS ? 'warning' : 'success'}>USE_MOCKS={String(USE_MOCKS)}</Badge>
          <Badge variant={useRealClaude() ? 'success' : 'secondary'}>AI: {useRealClaude() ? MODEL : 'mock analyst'}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Building2} label="Clients" value={clientCount} />
        <Stat icon={ClipboardCheck} label="Audits" value={auditCount} hint={`${completed} completed`} />
        <Stat icon={Gauge} label="Average score" value={avg._avg.overallScore ? Math.round(avg._avg.overallScore) : '—'} />
        <Stat icon={Send} label="Reports delivered" value={await prisma.notification.count({ where: { status: { in: ['sent', 'mock_sent'] } } })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Recent audits</CardTitle>
              <CardDescription>Manual runs and monthly cron runs</CardDescription>
            </div>
            <Link href="/admin/clients" className="text-sm font-medium text-primary hover:underline">Run an audit →</Link>
          </CardHeader>
          <AuditsTable audits={recent} />
        </Card>
        <div className="space-y-6">
          <QueuePanel />
          <Card>
            <CardHeader>
              <CardTitle>Delivery log</CardTitle>
              <CardDescription>WhatsApp + email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 && <p className="text-sm text-muted-foreground">Nothing sent yet.</p>}
              {notifications.map((n) => (
                <Link key={n.id} href={`/admin/audits/${n.audit.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
                  <span>
                    <span className="font-medium capitalize">{n.channel}</span>
                    <span className="text-muted-foreground"> → {n.audit.client.name}</span>
                    <div className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</div>
                  </span>
                  <Badge variant={n.status === 'failed' ? 'danger' : 'success'}>{n.status}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
