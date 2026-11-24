import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const session = await requireRole('admin');
  return (
    <AppShell session={session} nav={[{ href: '/admin', label: 'Overview' }, { href: '/admin/clients', label: 'Clients' }]}>
      {children}
    </AppShell>
  );
}
