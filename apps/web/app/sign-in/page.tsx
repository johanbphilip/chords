'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message ?? 'Wrong email or password');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/');
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit.mutate();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Chords</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {submit.error && <p className="text-sm text-destructive">{submit.error.message}</p>}
            <Button type="submit" disabled={submit.isPending}>
              Sign in
            </Button>
            <Link href="/forgot-password" className="text-sm underline">
              Forgot your password?
            </Link>
            <p className="text-sm text-muted-foreground">
              New here? Open the invite link an Admin sent you, or{' '}
              <Link href="/request-access" className="underline">
                ask for access
              </Link>
              .
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
