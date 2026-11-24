import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { loadReport, verifyReportToken } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Serves the PDF to: the admin, the owning client, or anyone holding the signed link
// that was sent over WhatsApp/email.
export async function GET(req, { params }) {
  const { id } = params;
  const token = req.nextUrl.searchParams.get('token');
  const session = await getSessionFromRequest(req);

  const audit = await prisma.audit.findUnique({ where: { id }, select: { clientId: true, client: { select: { name: true } } } });
  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed =
    session?.role === 'admin' ||
    (session?.role === 'client' && session.clientId === audit.clientId) ||
    verifyReportToken(id, token);
  if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pdf = await loadReport(id);
  if (!pdf) return NextResponse.json({ error: 'Report not generated yet' }, { status: 404 });

  const filename = `seo-audit-${audit.client.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${id.slice(-6)}.pdf`;
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      // Without a length the response is chunked and Chrome's PDF viewer can sit on its loading bar.
      'Content-Length': String(pdf.length),
      'Content-Disposition': `${req.nextUrl.searchParams.get('download') ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
