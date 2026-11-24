import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ClientLayout({ children }) {
  const session = await requireRole('client');
  return (
    <AppShell session={session} nav={[{ href: '/client', label: 'Dashboard' }]}>
      {children}
    </AppShell>
  );
}
