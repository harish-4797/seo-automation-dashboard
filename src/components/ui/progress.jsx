import { cn } from '@/lib/utils';

export function Progress({ value = 0, className, indicatorClassName }) {
  return (
    <div className={cn('relative h-3 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <div
        className={cn('h-full bg-primary transition-all duration-500', indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
