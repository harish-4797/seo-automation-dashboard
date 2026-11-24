import { Badge } from '@/components/ui/badge';

const VARIANT = { QUEUED: 'info', RUNNING: 'warning', COMPLETED: 'success', FAILED: 'danger' };

export default function StatusBadge({ status }) {
  return (
    <Badge variant={VARIANT[status] || 'secondary'}>
      {status === 'RUNNING' && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />}
      {status}
    </Badge>
  );
}
