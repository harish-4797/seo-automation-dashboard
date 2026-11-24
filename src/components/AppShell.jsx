import Link from 'next/link';
import { Activity, LogOut } from 'lucide-react';

export default function AppShell({ session, nav = [], children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="container flex h-14 items-center gap-6">
          <Link href={session.role === 'admin' ? '/admin' : '/client'} className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">SEO Automation</span>
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
              {session.role === 'admin' ? 'Admin' : 'Client'}
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground md:inline">{session.name}</span>
            <form action="/api/auth/logout" method="post">
              <button className="flex items-center gap-1 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
