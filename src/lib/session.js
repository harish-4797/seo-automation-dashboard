import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, verifySession } from './auth';

// For server components / pages.
export async function getSession() {
  return verifySession(cookies().get(COOKIE_NAME)?.value);
}

export async function requireRole(role) {
  const session = await getSession();
  if (!session || session.role !== role) redirect('/login');
  return session;
}
