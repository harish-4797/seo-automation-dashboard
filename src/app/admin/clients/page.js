import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import AddClientForm from '@/components/AddClientForm';
import RunAuditButton from '@/components/RunAuditButton';
import StatusBadge from '@/components/StatusBadge';
import { cn, formatDate, scoreTone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      audits: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { audits: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">Trigger an audit manually, or let the monthly cron do it.</p>
        </div>
        <AddClientForm />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Client</th>
                <th className="px-5 py-2.5 font-medium">Business</th>
                <th className="px-5 py-2.5 font-medium">Latest audit</th>
                <th className="px-5 py-2.5 font-medium">Score</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const last = c.audits[0];
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-5 py-3">
                      <Link href={`/admin/clients/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                      <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                        {c.websiteUrl} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <div>{c.businessType}</div>
                      <div className="text-xs text-muted-foreground">{c.city}, {c.state}</div>
                    </td>
                    <td className="px-5 py-3">
                      {last ? (
                        <Link href={`/admin/audits/${last.id}`} className="space-y-1">
                          <StatusBadge status={last.status} />
                          <div className="text-xs text-muted-foreground">{formatDate(last.createdAt)} · {c._count.audits} total</div>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never audited</span>
                      )}
                    </td>
                    <td className={cn('px-5 py-3 text-base font-semibold tabular-nums', scoreTone(last?.overallScore))}>{last?.overallScore ?? '—'}</td>
                    <td className="px-5 py-3 text-right"><RunAuditButton clientId={c.id} /></td>
                  </tr>
                );
              })}
              {clients.length === 0 && (
                <tr><td colSpan={5} className="p-5 text-sm text-muted-foreground">No clients yet — add one above or run <code>npm run db:seed</code>.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
