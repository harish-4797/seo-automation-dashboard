import { Suspense } from 'react';
import { Activity, Bot, FileText, Gauge } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

async function demoLogins() {
  if (process.env.SHOW_DEMO_LOGINS === 'false') return null;
  const client = await prisma.client.findFirst({ where: { email: { not: null } }, orderBy: { createdAt: 'asc' } }).catch(() => null);
  return {
    admin: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    client: client ? { email: client.email, password: process.env.CLIENT_PASSWORD } : null,
  };
}

export default async function LoginPage() {
  const demo = await demoLogins();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-teal-700 to-teal-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" /> SEO Automation Dashboard
        </div>
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight">Automated SEO audits, AI recommendations, and client-ready reports.</h1>
          <ul className="space-y-3 text-teal-50">
            <li className="flex gap-3"><Gauge className="h-5 w-5 shrink-0" /> 7-step crawl pipeline on a BullMQ queue</li>
            <li className="flex gap-3"><Bot className="h-5 w-5 shrink-0" /> Claude turns signals into prioritised, falsifiable fixes</li>
            <li className="flex gap-3"><FileText className="h-5 w-5 shrink-0" /> PDF report delivered over WhatsApp + email</li>
          </ul>
        </div>
        <p className="text-sm text-teal-200">Edgelink Technology · Technical Assessment</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Choose the admin portal or the client dashboard.</p>
          </div>
          <Suspense>
            <LoginForm demo={demo} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
