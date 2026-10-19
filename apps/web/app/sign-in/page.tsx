'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [settingPassword, setSettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      if (settingPassword) await apiPost('/auth/register', { email, password });
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        // Registering a second time is refused, so tell them their password is already set.
        throw new Error(
          settingPassword
            ? 'Your password is set, but signing in failed. Use "Already have a password? Sign in".'
            : (error.message ?? 'Wrong email or password'),
        );
      }
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
          <CardTitle>{settingPassword ? 'Set your password' : 'Sign in to Chords'}</CardTitle>
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
              placeholder={settingPassword ? 'Choose a password (8+ characters)' : 'Password'}
              autoComplete={settingPassword ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {submit.error && <p className="text-sm text-destructive">{submit.error.message}</p>}
            <Button type="submit" disabled={submit.isPending}>
              {settingPassword ? 'Set password and sign in' : 'Sign in'}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                submit.reset();
                setSettingPassword(!settingPassword);
              }}
            >
              {settingPassword ? 'Already have a password? Sign in' : 'First time here? Set your password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
