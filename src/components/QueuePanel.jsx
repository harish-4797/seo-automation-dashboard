'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATE_VARIANT = { waiting: 'info', active: 'warning', completed: 'success', failed: 'danger' };

// Live BullMQ view. Polls every 10s, only while the tab is visible (Upstash command budget).
export default function QueuePanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/queue', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2"><Server className="h-4 w-4 text-primary" /> BullMQ queue</CardTitle>
          <CardDescription>{data?.queue || 'seo-audit-jobs'} · Upstash Redis</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <Badge variant={data.workerOnline ? 'success' : 'warning'}>
              {data.workerOnline ? 'Worker online' : 'Worker offline · cron fallback'}
            </Badge>
          )}
          <button onClick={load} className="rounded p-1 text-muted-foreground hover:bg-secondary" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-4 gap-2 text-center">
          {['waiting', 'active', 'completed', 'failed'].map((k) => (
            <div key={k} className="rounded-md border p-2">
              <div className="text-xl font-bold tabular-nums">{data?.counts?.[k] ?? '–'}</div>
              <div className="text-xs capitalize text-muted-foreground">{k}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {data?.jobs?.length === 0 && <p className="text-sm text-muted-foreground">No jobs yet.</p>}
          {data?.jobs?.map((j) => (
            <Link key={j.id} href={`/admin/audits/${j.auditId}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
              <span className="font-mono text-xs text-muted-foreground">{j.name} · {String(j.id).slice(-8)}</span>
              <span className="flex items-center gap-2">
                {j.state === 'active' && typeof j.progress === 'object' && <span className="text-xs tabular-nums">{j.progress.progress}%</span>}
                <Badge variant={STATE_VARIANT[j.state]}>{j.state}</Badge>
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
