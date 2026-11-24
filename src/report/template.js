// HTML template rendered to PDF by Puppeteer. Self-contained (inline CSS, no external assets)
// so it renders identically on any host.

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const scoreColor = (n) => (n >= 80 ? '#15803d' : n >= 50 ? '#b45309' : '#b91c1c');
const priorityColor = { CRITICAL: '#b91c1c', HIGH: '#c2410c', MEDIUM: '#a16207', LOW: '#475569' };
const issueText = (i) => (typeof i === 'string' ? i : i.finding || i.title || i.issue || JSON.stringify(i));

const LABELS = {
  technical: 'Technical',
  on_page: 'On-page',
  content: 'Content',
  core_web_vitals: 'Core Web Vitals',
  schema: 'Schema',
};

function renderReportHtml({ client, audit, result, signals }) {
  const date = new Date(audit.completedAt || audit.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const overall = result.overall_score;
  const breakdown = Object.entries(result.score_breakdown || {});
  const gsc = signals?.sections?.gsc;
  const rankings = signals?.sections?.rankings;
  const cwv = signals?.sections?.cwv;
  const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${escapeHtml(issueText(i))}</li>`).join('')}</ul>` : '<p class="muted">None found.</p>');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>SEO Audit — ${escapeHtml(client.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.5; margin: 0; }
  h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #0d9488; color: #0f766e; }
  .muted { color: #64748b; }
  .cover { background: #0d9488; color: #fff; padding: 22px 24px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }
  .cover .muted { color: #ccfbf1; }
  .ring { width: 110px; height: 110px; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring b { font-size: 36px; line-height: 1; color: ${scoreColor(overall)}; } .ring span { color: #475569; font-size: 10px; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 14px; }
  .tile { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
  .tile .v { font-size: 20px; font-weight: 700; } .bar { height: 5px; background: #e2e8f0; border-radius: 3px; margin-top: 4px; overflow: hidden; } .bar i { display: block; height: 100%; }
  .summary { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 10px 14px; border-radius: 4px; font-size: 12px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  ul { margin: 4px 0; padding-left: 18px; } li { margin-bottom: 3px; }
  .rec { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; page-break-inside: avoid; }
  .rec .head { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
  .pill { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 10px; color: #fff; letter-spacing: .3px; }
  .tag { font-size: 9px; padding: 2px 7px; border-radius: 10px; background: #f1f5f9; color: #334155; }
  .rec p { margin: 2px 0; } .rec .k { color: #64748b; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e2e8f0; } th { background: #f8fafc; font-size: 10px; color: #475569; }
  .critical li { color: #991b1b; }
</style></head><body>

<div class="cover">
  <div>
    <div class="muted" style="letter-spacing:3px;font-size:10px">SEO AUDIT REPORT</div>
    <h1>${escapeHtml(client.name)}</h1>
    <div>${escapeHtml(client.websiteUrl)}</div>
    <div class="muted">${escapeHtml(client.businessType)} · ${escapeHtml(client.city)}, ${escapeHtml(client.state)} · ${date}</div>
  </div>
  <div class="ring"><b>${overall}</b><span>out of 100</span></div>
</div>

<div class="grid">
  ${breakdown.map(([k, v]) => `<div class="tile"><div class="muted">${LABELS[k] || k}</div><div class="v" style="color:${scoreColor(v)}">${v}</div><div class="bar"><i style="width:${v}%;background:${scoreColor(v)}"></i></div></div>`).join('')}
</div>

<h2>Executive summary</h2>
<div class="summary">${escapeHtml(result.executive_summary)}</div>

<div class="cols">
  <div class="critical"><h2>Critical issues</h2>${list(result.critical_issues)}</div>
  <div><h2>Quick wins (≤ 2 hours)</h2>${list(result.quick_wins)}</div>
</div>
<h2>Important issues</h2>${list(result.important_issues)}

<h2>Recommendations</h2>
${(result.recommendations || []).map((r, i) => `
  <div class="rec">
    <div class="head"><b>${i + 1}.</b><span class="pill" style="background:${priorityColor[r.priority] || '#475569'}">${r.priority}</span><span class="tag">${escapeHtml(r.category)}</span><span class="tag">Impact: ${escapeHtml(r.estimated_impact)}</span><span class="tag">Effort: ${escapeHtml(r.effort)}</span></div>
    <p><span class="k">Finding:</span> ${escapeHtml(r.finding)}</p>
    <p><span class="k">Fix:</span> ${escapeHtml(r.fix)}</p>
    <p><span class="k">How we'll verify:</span> ${escapeHtml(r.falsifiability_check)}</p>
  </div>`).join('')}

${cwv ? `<h2>Core Web Vitals (mobile)</h2>
<table><tr><th>Metric</th><th>Value</th><th>Score</th></tr>
${Object.entries(cwv.audits || {}).map(([k, a]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(a.displayValue || a.description || '')}</td><td>${Math.round((a.score ?? 0) * 100)}</td></tr>`).join('')}
</table>` : ''}

${gsc?.rows?.length ? `<h2>Search Console — top queries (28 days)</h2>
<table><tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Avg. position</th></tr>
${gsc.rows.map((r) => `<tr><td>${escapeHtml(r.query)}</td><td>${r.clicks}</td><td>${r.impressions}</td><td>${(r.ctr * 100).toFixed(1)}%</td><td>${r.position}</td></tr>`).join('')}
</table>` : ''}

${rankings?.tasks?.[0]?.result?.[0] ? `<h2>Keyword rankings</h2>
<p>Keyword <b>"${escapeHtml(rankings.tasks[0].result[0].keyword)}"</b> — your position: <b>#${rankings.client_rank_position ?? '—'}</b> · search volume: ${rankings.keyword_search_volume ?? '—'}/mo</p>
<table><tr><th>Rank</th><th>Domain</th></tr>${rankings.tasks[0].result[0].items.map((i) => `<tr><td>${i.rank_absolute}</td><td>${escapeHtml(i.domain)}</td></tr>`).join('')}</table>` : ''}

<p class="muted" style="margin-top:20px">Analysis: ${escapeHtml(result._meta?.source === 'claude' ? `Claude (${result._meta.model})` : 'mock analyst')} · Audit ID ${escapeHtml(audit.id)}</p>
</body></html>`;
}

module.exports = { renderReportHtml, escapeHtml };
