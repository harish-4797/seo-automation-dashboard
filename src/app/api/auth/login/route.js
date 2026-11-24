import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAME, MAX_AGE, createSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { role, email, password } = await req.json().catch(() => ({}));
  const normEmail = String(email || '').trim().toLowerCase();
  let session = null;

  if (role === 'admin') {
    if (normEmail === String(process.env.ADMIN_EMAIL || '').toLowerCase() && password === process.env.ADMIN_PASSWORD) {
      session = { role: 'admin', name: 'Admin' };
    }
  } else if (role === 'client') {
    if (password === process.env.CLIENT_PASSWORD) {
      const client = await prisma.client.findFirst({ where: { email: { equals: normEmail, mode: 'insensitive' } } });
      if (client) session = { role: 'client', clientId: client.id, name: client.name };
    }
  }

  if (!session) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const res = NextResponse.json({ ok: true, redirect: role === 'admin' ? '/admin' : '/client' });
  res.cookies.set(COOKIE_NAME, await createSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}
