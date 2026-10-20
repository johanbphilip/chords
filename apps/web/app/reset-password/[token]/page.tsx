'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');

  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) throw new Error('This reset link is invalid or has expired. Ask for a new one.');
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    reset.mutate();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        <CardContent>
          {reset.isSuccess ? (
            <p>
              Your password is changed. <Link href="/sign-in" className="underline">Sign in</Link>
            </p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <Input
                type="password"
                placeholder="New password (8+ characters)"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {reset.error && <p className="text-sm text-destructive">{reset.error.message}</p>}
              <Button type="submit" disabled={reset.isPending}>
                Change password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
