import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { cn, formatDate, scoreTone } from '@/lib/utils';

export default function AuditsTable({ audits, hrefBase = '/admin/audits', showClient = true }) {
  if (!audits.length) return <p className="p-5 text-sm text-muted-foreground">No audits yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            {showClient && <th className="px-5 py-2.5 font-medium">Client</th>}
            <th className="px-5 py-2.5 font-medium">Status</th>
            <th className="px-5 py-2.5 font-medium">Score</th>
            <th className="px-5 py-2.5 font-medium">Trigger</th>
            <th className="px-5 py-2.5 font-medium">Created</th>
            <th className="px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {audits.map((a) => (
            <tr key={a.id} className="border-b last:border-0 hover:bg-secondary/40">
              {showClient && (
                <td className="px-5 py-3">
                  <div className="font-medium">{a.client?.name}</div>
                  <div className="text-xs text-muted-foreground">{a.client?.websiteUrl}</div>
                </td>
              )}
              <td className="px-5 py-3">
                <StatusBadge status={a.status} />
                {a.status === 'RUNNING' && <span className="ml-2 text-xs tabular-nums text-muted-foreground">{a.progress}%</span>}
              </td>
              <td className={cn('px-5 py-3 text-base font-semibold tabular-nums', scoreTone(a.overallScore))}>{a.overallScore ?? '—'}</td>
              <td className="px-5 py-3 capitalize text-muted-foreground">{a.triggeredBy}</td>
              <td className="px-5 py-3 text-muted-foreground">{formatDate(a.createdAt)}</td>
              <td className="px-5 py-3 text-right">
                <Link href={`${hrefBase}/${a.id}`} className="font-medium text-primary hover:underline">View →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
