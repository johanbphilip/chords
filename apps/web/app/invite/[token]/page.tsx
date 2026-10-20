'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

interface Accepted {
  member: { email: string };
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const join = useMutation({
    mutationFn: async () => {
      const { member } = await apiPost<Accepted>('/auth/accept-invite', { token, name, password });
      const { error } = await authClient.signIn.email({ email: member.email, password });
      // The invite is spent by now, so a failed sign-in here must send them to the normal form.
      if (error) throw new Error('Your account is ready. Go to the sign-in page and sign in with your email and password.');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/');
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    join.mutate();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Chords</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input placeholder="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              type="password"
              placeholder="Choose a password (8+ characters)"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {join.error && <p className="text-sm text-destructive">{join.error.message}</p>}
            <Button type="submit" disabled={join.isPending}>
              Join
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
