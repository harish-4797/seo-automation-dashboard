# SEO Automation Dashboard

Automated website SEO audits with a BullMQ job pipeline, Claude-powered analysis, PDF reports and WhatsApp/email delivery. The app has two portals: an **internal admin portal** and a **client-facing dashboard**.

> **Live app:** `https://seo-automation-dashboard-woad.vercel.app/login` &nbsp;·&nbsp; **Worker health:** `https://seo-audit-worker-so6i.onrender.com`
>
> | Portal | Email | Password |
> |---|---|---|
> | Admin | `admin@edgelink.demo` | `Admin@123` |
> | Client | `demo@clovedental.test` | `Client@123` |
>
> The login page also shows these credentials (click to fill).

---

## Architecture

```
TRIGGER ─ admin clicks "Run audit"  ──► POST /api/audit ─┐
        └ cron-job.org (every min)  ──► GET /api/cron/audits (monthly audits due)
                                                         │  creates Audit row (QUEUED)
                                                         ▼
                         BullMQ queue "seo-audit-jobs"  [Upstash Redis]
                                                         │
                                                         ▼
                     WORKER  node worker/index.js       [Render, long-running]
                       ├─ Step 1  Fetch + Cheerio crawl            (real)
                       ├─ Step 2  PageSpeed Insights               (MOCK)
                       ├─ Step 3  Google Search Console            (MOCK)
                       ├─ Step 4  Schema.org validator             (real, JSON-LD)
                       ├─ Step 5  On-page analysis                 (real, 18 checks)
                       ├─ Step 6  robots.txt + sitemap.xml         (real)
                       └─ Step 7  DataForSEO rankings              (MOCK)
                                                         │  progress % + currentStep written to the Audit row after every step
                                                         ▼
                     Claude (claude-sonnet-4-6) → JSON, validated with zod   (REAL, or MOCK if no key)
                                                         ▼
                     Postgres (Neon): Audit.signals / result / scores
                                                         ▼
                     Puppeteer → PDF → /tmp/reports (mock R2) + Postgres
                                                         ▼
                     Twilio WhatsApp + Email → console.log mocks → Notification rows

Admin portal polls GET /api/audit/[id] every 2s → live progress bar + step timeline.
```

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, shadcn/ui components |
| API | Next.js route handlers on Vercel. They only enqueue or read, so every route stays under the 10s limit |
| Queue | BullMQ on Upstash Redis (TLS) |
| Worker | Node.js long-running process on Render |
| Crawler | `fetch` + Cheerio |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) via `@anthropic-ai/sdk` |
| Database | Neon Postgres + Prisma (schema exactly as specified, plus one `ReportFile` table, see below) |
| PDF | Puppeteer |
| Scheduler | cron-job.org |

## Mock strategy

All mocks are in `src/mocks/` and controlled by one flag:

```js
// src/mocks/index.js
const USE_MOCKS = process.env.USE_MOCKS === 'true';
```

| Integration | File | With `USE_MOCKS=true` |
|---|---|---|
| PageSpeed Insights | `src/crawlers/pagespeed.js` | `pagespeed.mock.js` (copied verbatim from the brief) |
| Search Console | `src/crawlers/gsc.js` | `gsc.mock.js` (verbatim) |
| DataForSEO | `src/crawlers/dataforseo.js` | `dataforseo.mock.js` (verbatim) |
| Twilio WhatsApp | `src/delivery/whatsapp.js` | `twilio.mock.js` (verbatim, console.log) |
| Email | `src/delivery/email.js` | `email.mock.js` (console.log) |
| Cloudflare R2 | `src/lib/storage.js` | writes to `/tmp/reports/` |
| **Claude** | `src/ai/claude.js` | Real when `ANTHROPIC_API_KEY` is set. With no key (or `MOCK_CLAUDE=true`), `claude.mock.js` builds a realistic response from the actual crawl findings, with the same JSON shape |

Every crawler follows the brief's pattern: `if (USE_MOCKS) return mockData;` followed by a **working real implementation** (PageSpeed v5, Search Analytics API, DataForSEO SERP live, Twilio REST, Resend). Setting `USE_MOCKS=false` and adding keys switches them over.

## Claude prompt and output

- The system prompt and user template are copied verbatim from the brief, in [src/ai/prompt.js](src/ai/prompt.js). All `{VARIABLES}` are replaced at runtime from the collected signals.
- Output is parsed and validated with zod ([src/ai/schema.js](src/ai/schema.js)): code fences are stripped, scores are clamped to 0–100, enums are normalised, and list caps (5/8/5) are enforced.
- If the output is invalid, the model gets **one corrective retry** that includes the validation error.
- If Claude itself fails (rate limit, credits), the audit still completes using the mock analyst, and the result is clearly labelled `mock_fallback` in the UI so it isn't mistaken for a real analysis.

## API routes

| Route | Auth | Behaviour |
|---|---|---|
| `POST /api/audit` | admin | `{ clientId }` → creates Audit (QUEUED), adds `run-audit` job (jobId = auditId), returns `202 { auditId }` |
| `GET /api/audit/[id]` | admin / owning client | status, progress, currentStep, overallScore, result, notifications |
| `GET /api/cron/audits` | `Authorization: Bearer $CRON_SECRET` | Enqueues monthly audits that are due (last audit older than `CRON_INTERVAL_DAYS`, default 30). If the worker heartbeat is missing, it processes a bounded batch inline (`CRON_INLINE_BATCH`, default 1). If the worker is online, it re-enqueues any QUEUED rows that were lost |
| `GET /api/reports/[id]` | admin / owning client / signed `?token=` | Streams the PDF. WhatsApp and email links carry an HMAC token, so recipients don't need to log in |
| `GET/POST /api/clients` | admin | List / create clients |
| `GET /api/queue` | admin | BullMQ job counts, recent jobs and worker status (the "BullMQ queue" panel) |

## Project structure

```
src/
├── mocks/          USE_MOCKS toggle + all mock data
├── crawlers/       site (Fetch+Cheerio), pagespeed, gsc, dataforseo, robots/sitemap
├── analyzers/      schema.org validator, on-page + technical checks
├── ai/             verbatim prompt, Claude client, zod output schema
├── pipeline/       runAudit (the 3.2 pipeline), shared step list
├── report/         HTML template + Puppeteer PDF
├── delivery/       WhatsApp + email
├── lib/            prisma, BullMQ queue, auth (JWT cookie), storage
├── components/     shadcn/ui + dashboard components
└── app/            Next.js pages (admin, client, login) + API routes
worker/index.js     BullMQ worker + /health server
scripts/dry-run.js  run the pipeline for any URL without a DB/Redis
prisma/             schema.prisma + seed.js
```

## Local setup

```bash
npm install                     # also runs prisma generate and downloads Chrome for Puppeteer
cp .env.example .env            # fill DATABASE_URL, DIRECT_URL, REDIS_URL, AUTH_SECRET (+ ANTHROPIC_API_KEY)
npx prisma db push              # create the tables
npm run db:seed                 # 3 demo clients
npm run dev                     # Next.js on http://localhost:3000
npm run worker                  # in a second terminal: the BullMQ worker
```

To try the pipeline with no database or Redis, which writes `signals.json`, `result.json` and `report.pdf` to `dry-run-output/`:

```bash
USE_MOCKS=true npm run dry-run -- https://www.clovedental.in "Dental Clinic" Pune Maharashtra
```

## Deployment (all free tiers)

1. **Neon**: create a project. Copy the *pooled* connection string to `DATABASE_URL` and the *direct* one to `DIRECT_URL`. Run `npx prisma db push && npm run db:seed` locally against it.
2. **Upstash**: create a Redis database. Copy the `rediss://…` URL (not the REST URL) to `REDIS_URL`.
3. **Vercel** (web app): import the repo. Framework is Next.js, and `npm run build` is the default. Add the env vars: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLIENT_PASSWORD`, `CRON_SECRET`, `USE_MOCKS=true`, `APP_URL=https://<app>.vercel.app`, `ANTHROPIC_API_KEY`. Puppeteer's Chrome download is skipped automatically on Vercel (`.puppeteerrc.cjs`).
4. **Render** (worker): New → Blueprint → this repo (`render.yaml`). Set the same `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `APP_URL`, `AUTH_SECRET` and `ANTHROPIC_API_KEY`. `AUTH_SECRET` must match Vercel, because it signs the report links.
5. **cron-job.org**: create two jobs.
   - `GET https://<app>.vercel.app/api/cron/audits` every minute, with header `Authorization: Bearer <CRON_SECRET>`
   - `GET https://<worker>.onrender.com/` every 10 minutes, to keep the free Render instance awake

## Design decisions and notes

- **Upstash command budget.** The free tier allows about 11 commands per minute averaged over a month, and default BullMQ settings would burn through that while idle. The worker uses `drainDelay: 60s` (a blocking pop, so new jobs are still picked up instantly), a 5-minute `stalledInterval`, and a 5-minute heartbeat. The admin queue panel polls only while the tab is visible.
- **Exactly-once processing.** `jobId = auditId` makes enqueueing idempotent. The pipeline claims an audit with an atomic `UPDATE … WHERE status = 'QUEUED'`, so the worker and the cron fallback can never run the same audit twice.
- **Graceful degradation.** Each of the 7 steps is isolated. An unreachable site or a failing API is recorded in `signals.errors`, and the audit still completes with that finding flagged. PDF or delivery failures don't fail the audit either.
- **PDF storage.** R2 is mocked with `/tmp/reports/` as the brief specifies. Because the worker (Render) and the web app (Vercel) are on different machines, the PDF bytes are also stored in a separate `ReportFile` table so the app can serve them. The six specified models are unchanged.
- **Orphan recovery.** On start, the worker marks audits stuck in `RUNNING` for more than 15 minutes as `FAILED` (for example after a redeploy mid-job).
- **Auth.** A signed JWT in an httpOnly cookie, with role-gated middleware for `/admin/*` and `/client/*`. Clients only ever see their own audits.
- **Mock data context.** The provided GSC and DataForSEO mocks describe a Pune dental clinic, so the demo clients are dental clinics in Maharashtra and the mock findings read naturally.

## Environment variables

See [.env.example](.env.example) for the full list, with comments.
