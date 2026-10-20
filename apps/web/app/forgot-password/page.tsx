'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const ask = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.requestPasswordReset({ email });
      if (error) throw new Error('Too many requests. Try again in a minute.');
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask.mutate();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ask.isSuccess ? (
            <p>
              If that email is registered, a reset link is on its way. If nothing arrives, ask an Admin to send you a link.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              {ask.error && <p className="text-sm text-destructive">{ask.error.message}</p>}
              <Button type="submit" disabled={ask.isPending}>
                Send reset link
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
