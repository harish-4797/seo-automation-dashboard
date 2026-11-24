import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Edge middleware: gate the two portals by role. API routes do their own checks.
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('seo_session')?.value;
  let session = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');
      session = (await jwtVerify(token, secret)).payload;
    } catch {
      session = null;
    }
  }

  const needs = pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/client') ? 'client' : null;
  if (needs && (!session || session.role !== needs)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/client/:path*'] };
