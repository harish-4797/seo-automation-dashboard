'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import StatusBadge from '@/components/StatusBadge';
import { STEPS } from '@/pipeline/steps';

const TIMELINE = [['queued', [0, 'Job queued in BullMQ (seo-audit-jobs)']], ...Object.entries(STEPS), ['done', [100, 'Completed']]];

// Polls GET /api/audit/[id] every 2s while the audit is QUEUED/RUNNING, then refreshes the
// server-rendered page so the full report appears.
export default function AuditLive({ initial }) {
  const router = useRouter();
  const [audit, setAudit] = useState(initial);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const active = audit.status === 'QUEUED' || audit.status === 'RUNNING';

  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/audit/${initial.id}`, { cache: 'no-store' });
        if (res.ok) {
          const next = await res.json();
          if (stop) return;
          setAudit(next);
          if (next.status === 'COMPLETED' || next.status === 'FAILED') router.refresh();
        }
      } catch {
        /* transient network error — keep polling */
      }
    };
    const poll = setInterval(tick, 2000);
    const clock = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [active, initial.id, router]);

  const progress = audit.progress || 0;
  const failed = audit.status === 'FAILED';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            Pipeline progress <StatusBadge status={audit.status} />
          </CardTitle>
          <CardDescription>
            {audit.currentStep || 'Waiting for worker…'}
            {active && <span className="ml-2 text-xs">· live, {elapsed}s</span>}
          </CardDescription>
        </div>
        <span className="text-3xl font-bold tabular-nums text-primary">{progress}%</span>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={progress} indicatorClassName={failed ? 'bg-red-500' : undefined} />
        {failed && audit.errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{audit.errorMessage}</div>
        )}
        {audit.status === 'QUEUED' && (
          <p className="rounded-md bg-sky-50 p-3 text-sm text-sky-800">
            Job is waiting in the queue. The worker picks it up immediately; if no worker is online, the cron route
            (cron-job.org, every minute) processes it.
          </p>
        )}
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {TIMELINE.map(([key, [at, label]], i) => {
            const nextAt = TIMELINE[i + 1]?.[1][0] ?? 101;
            const done = audit.status === 'COMPLETED' || progress >= nextAt || (key === 'queued' && audit.status !== 'QUEUED');
            const current = !done && audit.status === 'RUNNING' && progress >= at;
            return (
              <li key={key} className="flex items-center gap-2 text-sm">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : current ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : failed ? (
                  <XCircle className="h-4 w-4 text-slate-300" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" />
                )}
                <span className={done ? 'text-foreground' : current ? 'font-medium text-primary' : 'text-muted-foreground'}>{label}</span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
