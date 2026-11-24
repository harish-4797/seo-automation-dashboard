import { cn, scoreBg, scoreTone } from '@/lib/utils';

const LABELS = {
  technical: 'Technical',
  on_page: 'On-page',
  content: 'Content',
  core_web_vitals: 'Core Web Vitals',
  schema: 'Schema',
};

export function ScoreRing({ score, size = 120 }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : score / 100;
  const color = score == null ? '#cbd5e1' : score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold', scoreTone(score))}>{score ?? '—'}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {Object.entries(LABELS).map(([key, label]) => {
        const v = breakdown[key];
        return (
          <div key={key} className="rounded-lg border bg-white p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn('mt-1 text-2xl font-bold', scoreTone(v))}>{v ?? '—'}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full', scoreBg(v))} style={{ width: `${v || 0}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
