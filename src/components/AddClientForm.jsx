'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FIELDS = [
  ['name', 'Business name', 'Smile Dental Care', true],
  ['websiteUrl', 'Website URL', 'https://example.com', true],
  ['businessType', 'Business type', 'Dental Clinic', true],
  ['city', 'City', 'Pune', true],
  ['state', 'State', 'Maharashtra', true],
  ['whatsapp', 'WhatsApp', '+919876543210', false],
  ['email', 'Email (client login)', 'owner@clinic.com', false],
];

export default function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || 'Failed to create client');
    e.target.reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add client
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New client</CardTitle>
        <CardDescription>The client can log in to the client dashboard with this email and the shared demo password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map(([name, label, placeholder, required]) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name}>{label}{required && ' *'}</Label>
              <Input id={name} name={name} placeholder={placeholder} required={required} type={name === 'email' ? 'email' : 'text'} />
            </div>
          ))}
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save client
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
