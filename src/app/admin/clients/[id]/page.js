import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, MessageCircle, Globe } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RunAuditButton from '@/components/RunAuditButton';
import AuditsTable from '@/components/AuditsTable';
import { ScoreBreakdown } from '@/components/Scores';

export const dynamic = 'force-dynamic';

export default async function ClientDetail({ params }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { audits: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!client) notFound();
  const latest = client.audits.find((a) => a.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <a href={client.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-4 w-4" />{client.websiteUrl}</a>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{client.businessType} · {client.city}, {client.state}</span>
            {client.whatsapp && <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{client.whatsapp}</span>}
            {client.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{client.email}</span>}
          </div>
        </div>
        <RunAuditButton clientId={client.id} size="default" label="Run new audit" />
      </div>

      {latest && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Latest completed audit · overall {latest.overallScore}/100</h2>
          <ScoreBreakdown breakdown={latest.scoreBreakdown} />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Audit history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <AuditsTable audits={client.audits} showClient={false} />
        </CardContent>
      </Card>
    </div>
  );
}
