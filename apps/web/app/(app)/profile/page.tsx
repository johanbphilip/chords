'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPatch } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useMe } from '@/lib/auth';

export default function ProfilePage() {
  const { data: me } = useMe();
  if (!me) return null;
  return <ProfileForm initialName={me.name} email={me.email} />;
}

function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const save = useMutation({
    mutationFn: () => apiPatch('/auth/me', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Profile</h1>
      <p className="text-sm text-muted-foreground">{email}</p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input required value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
        <Button type="submit" disabled={save.isPending}>
          Save
        </Button>
      </form>
      {save.isSuccess && <p className="text-sm text-muted-foreground">Saved.</p>}
      {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}
      <ChangePassword />
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const change = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message ?? 'Could not change the password');
    },
    onSuccess: () => {
      setCurrent('');
      setNext('');
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    change.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <h2 className="font-medium">Change password</h2>
      <Input type="password" placeholder="Current password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Input type="password" placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} />
      <Button type="submit" disabled={change.isPending}>
        Change password
      </Button>
      {change.isSuccess && <p className="text-sm text-muted-foreground">Password changed. Your other devices are signed out.</p>}
      {change.error && <p className="text-sm text-destructive">{change.error.message}</p>}
    </form>
  );
}
