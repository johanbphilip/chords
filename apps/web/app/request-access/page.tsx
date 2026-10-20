'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/api';

export default function RequestAccessPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const ask = useMutation({ mutationFn: () => apiPost('/auth/request-access', { name, email }) });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask.mutate();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Ask for access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ask.isSuccess ? (
            <p>Thank you. Your request was received and is waiting for approval. An Admin will send you an invite link.</p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <Input placeholder="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
              <Input type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              {ask.error && <p className="text-sm text-destructive">{ask.error.message}</p>}
              <Button type="submit" disabled={ask.isPending}>
                Request access
              </Button>
            </form>
          )}
          <Link href="/sign-in" className="text-sm underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
