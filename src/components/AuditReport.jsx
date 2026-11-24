import { AlertTriangle, Zap, ListChecks, Sparkles, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreRing, ScoreBreakdown } from '@/components/Scores';
import { issueText } from '@/lib/issues';

const PRIORITY = { CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'info', LOW: 'secondary' };

function IssueList({ items, empty = 'None found.' }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((i, idx) => (
        <li key={idx} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
          <span>{issueText(i)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnalysisSourceBadge({ meta }) {
  if (!meta) return null;
  if (meta.source === 'claude') return <Badge variant="success">Claude · {meta.model}</Badge>;
  if (meta.source === 'mock_fallback') return <Badge variant="danger" title={meta.error}>Mock (Claude failed)</Badge>;
  return <Badge variant="secondary">Mock analyst</Badge>;
}

export default function AuditReport({ result, pdfUrl, header }) {
  if (!result) return null;
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-6 p-5 md:flex-row md:items-center">
          <ScoreRing score={result.overall_score} />
          <div className="flex-1 space-y-3">
            {header}
            <p className="text-sm leading-relaxed text-slate-700">{result.executive_summary}</p>
            <div className="flex flex-wrap items-center gap-2">
              <AnalysisSourceBadge meta={result._meta} />
              <Badge variant="outline">{result.recommendations?.length || 0} recommendations</Badge>
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90">
                  <FileDown className="h-3.5 w-3.5" /> PDF report
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ScoreBreakdown breakdown={result.score_breakdown} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-red-200">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" /> Critical issues</CardTitle></CardHeader>
          <CardContent className="text-red-900"><IssueList items={result.critical_issues} /></CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-amber-700"><ListChecks className="h-4 w-4" /> Important issues</CardTitle></CardHeader>
          <CardContent><IssueList items={result.important_issues} /></CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-green-700"><Zap className="h-4 w-4" /> Quick wins (≤ 2h)</CardTitle></CardHeader>
          <CardContent><IssueList items={result.quick_wins} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Recommendations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(result.recommendations || []).map((r, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">#{i + 1}</span>
                <Badge variant={PRIORITY[r.priority]}>{r.priority}</Badge>
                <Badge variant="outline">{r.category}</Badge>
                <Badge variant="outline">Impact: {r.estimated_impact}</Badge>
                <Badge variant="outline">Effort: {r.effort}</Badge>
              </div>
              <dl className="grid gap-1.5 text-sm sm:grid-cols-[110px_1fr]">
                <dt className="font-medium text-muted-foreground">Finding</dt><dd>{r.finding}</dd>
                <dt className="font-medium text-muted-foreground">Fix</dt><dd>{r.fix}</dd>
                <dt className="font-medium text-muted-foreground">Verify</dt><dd className="text-slate-600">{r.falsifiability_check}</dd>
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
