'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function LoginForm({ demo }) {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState(params.get('next')?.startsWith('/client') ? 'client' : 'admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      return setError(data.error || 'Login failed');
    }
    const next = params.get('next');
    router.push(next && next.startsWith(`/${role}`) ? next : data.redirect);
    router.refresh();
  }

  function fillDemo() {
    const d = demo[role];
    setEmail(d.email);
    setPassword(d.password);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 rounded-lg bg-secondary p-1 text-sm">
        {['admin', 'client'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => { setRole(r); setError(null); }}
            className={cn('rounded-md py-2 font-medium capitalize transition', role === r ? 'bg-white shadow-sm' : 'text-muted-foreground')}
          >
            {r === 'admin' ? 'Admin portal' : 'Client dashboard'}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
      </Button>
      {demo?.[role] && (
        <button type="button" onClick={fillDemo} className="w-full rounded-md border border-dashed p-2.5 text-left text-xs text-muted-foreground hover:bg-secondary">
          <span className="font-medium text-foreground">Demo {role} login</span> — {demo[role].email} / {demo[role].password}
          <span className="ml-1 text-primary">(click to fill)</span>
        </button>
      )}
    </form>
  );
}
