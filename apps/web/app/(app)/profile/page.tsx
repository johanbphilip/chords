'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPatch } from '@/lib/api';
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
    </div>
  );
}
