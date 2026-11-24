import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function scoreTone(n) {
  if (n == null) return 'text-muted-foreground';
  return n >= 80 ? 'text-green-700' : n >= 50 ? 'text-amber-600' : 'text-red-600';
}

export function scoreBg(n) {
  if (n == null) return 'bg-slate-300';
  return n >= 80 ? 'bg-green-600' : n >= 50 ? 'bg-amber-500' : 'bg-red-600';
}
