// Validates and normalises Claude's JSON so the UI/PDF can rely on its shape.
const { z } = require('zod');

const score = z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n))));
const upper = (allowed, fallback) =>
  z.string().transform((s) => {
    const v = s.trim().toUpperCase();
    return allowed.includes(v) ? v : fallback;
  });
const title = (allowed, fallback) =>
  z.string().transform((s) => allowed.find((a) => a.toLowerCase() === s.trim().toLowerCase()) || fallback);

// Issues are "[<max N items>]" in the prompt with no item shape, so accept strings or objects.
const issue = z.union([z.string(), z.record(z.any())]);

const recommendation = z.object({
  priority: upper(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], 'MEDIUM'),
  category: title(['Technical', 'OnPage', 'Content', 'Schema', 'CWV'], 'Technical'),
  finding: z.string().min(1),
  fix: z.string().min(1),
  estimated_impact: title(['High', 'Medium', 'Low'], 'Medium'),
  effort: title(['Hours', 'Days', 'Weeks'], 'Days'),
  falsifiability_check: z.string().default(''),
});

const auditResultSchema = z.object({
  audit_version: z.string().default('v1.0'),
  overall_score: score,
  score_breakdown: z.object({
    technical: score,
    on_page: score,
    content: score,
    core_web_vitals: score,
    schema: score,
  }),
  critical_issues: z.array(issue).default([]).transform((a) => a.slice(0, 5)),
  important_issues: z.array(issue).default([]).transform((a) => a.slice(0, 8)),
  quick_wins: z.array(issue).default([]).transform((a) => a.slice(0, 5)),
  recommendations: z.array(recommendation).min(1),
  executive_summary: z.string().min(1),
});

// Strips code fences / stray prose and parses the outermost JSON object.
function extractJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function parseAuditResult(text) {
  const raw = typeof text === 'string' ? extractJson(text) : text;
  const parsed = auditResultSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Model JSON failed validation — ${msg}`);
  }
  return parsed.data;
}

module.exports = { auditResultSchema, parseAuditResult, extractJson };
