import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { normalizeUrl } from '@/lib/http';

export const dynamic = 'force-dynamic';

const clientSchema = z.object({
  name: z.string().trim().min(2),
  websiteUrl: z.string().trim().min(4),
  businessType: z.string().trim().min(2),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  whatsapp: z.string().trim().optional().transform((v) => v || null),
  email: z.string().trim().email().optional().or(z.literal('')).transform((v) => v || null),
});

export async function GET(req) {
  const session = await getSessionFromRequest(req);
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ clients });
}

export async function POST(req) {
  const session = await getSessionFromRequest(req);
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = clientSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path[0]}: ${i.message}`).join(', ') }, { status: 400 });
  }
  let websiteUrl;
  try {
    websiteUrl = normalizeUrl(parsed.data.websiteUrl);
  } catch {
    return NextResponse.json({ error: 'websiteUrl: invalid URL' }, { status: 400 });
  }
  try {
    const client = await prisma.client.create({ data: { ...parsed.data, websiteUrl } });
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'A client with this website already exists' }, { status: 409 });
    throw err;
  }
}
