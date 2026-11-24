import { Database } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Read-only proof that the audit is persisted: runs the SQL shown on screen against Postgres
// at render time (server component) and prints the row as stored.
export default async function DatabaseRecord({ auditId }) {
  const [row] = await prisma.$queryRaw`
    SELECT id, "clientId", status::text AS status, progress, "currentStep", "triggeredBy", "overallScore",
           "scoreBreakdown", "pdfPath", "errorMessage", "createdAt", "completedAt",
           pg_column_size(signals) AS signals_bytes, pg_column_size(result) AS result_bytes
    FROM "Audit" WHERE id = ${auditId}`;
  if (!row) return null;
  const notifications = await prisma.$queryRaw`
    SELECT channel, status, "providerId" FROM "Notification" WHERE "auditId" = ${auditId} ORDER BY "createdAt"`;

  const kb = (b) => (b == null ? 'NULL' : `jsonb · ${(Number(b) / 1024).toFixed(1)} KB`);
  const show = (v) => (v == null ? 'NULL' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const columns = [
    ['id', row.id],
    ['clientId', row.clientId],
    ['status', row.status],
    ['progress', row.progress],
    ['currentStep', row.currentStep],
    ['triggeredBy', row.triggeredBy],
    ['overallScore', row.overallScore],
    ['scoreBreakdown', row.scoreBreakdown],
    ['signals', kb(row.signals_bytes)],
    ['result', kb(row.result_bytes)],
    ['pdfPath', row.pdfPath],
    ['errorMessage', row.errorMessage],
    ['createdAt', row.createdAt],
    ['completedAt', row.completedAt],
  ];

  return (
    <Card id="database-record">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Database record</CardTitle>
        <CardDescription>Live from Neon Postgres, queried when this page loaded</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-xs text-emerald-300">
          SELECT * FROM &quot;Audit&quot; WHERE id = &apos;{row.id}&apos;;
        </pre>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <tbody>
              {columns.map(([k, v]) => (
                <tr key={k} className="border-b last:border-0">
                  <td className="w-40 bg-secondary/50 px-3 py-1.5 font-mono font-medium">{k}</td>
                  <td className={`break-all px-3 py-1.5 font-mono ${v == null ? 'text-muted-foreground' : ''}`}>{show(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {notifications.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 text-left font-mono">
                <tr><th className="px-3 py-1.5" colSpan={3}>&quot;Notification&quot; rows for this audit</th></tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.providerId || n.channel} className="border-t font-mono">
                    <td className="px-3 py-1.5">{n.channel}</td>
                    <td className="px-3 py-1.5">{n.status}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{n.providerId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
