'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { useMe, type Role } from '@/lib/auth';

interface Approved {
  email: string;
  role: Role;
  hasPassword: boolean;
}

export default function AdminPage() {
  const { data: me } = useMe();
  if (me?.role !== 'admin') return <p>Only an Admin can manage who may sign in.</p>;
  return <ApprovedEmails />;
}

function ApprovedEmails() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['approved-emails'] });

  const { data, error } = useQuery({
    queryKey: ['approved-emails'],
    queryFn: () => apiGet<Approved[]>('/admin/approved-emails'),
  });
  const add = useMutation({
    mutationFn: () => apiPost('/admin/approved-emails', { email }),
    onSuccess: () => {
      setEmail('');
      return refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (address: string) => apiDelete(`/admin/approved-emails/${encodeURIComponent(address)}`),
    onSuccess: refresh,
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    add.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Who may sign in</h1>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input type="email" placeholder="Email to approve" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={add.isPending}>
          Approve
        </Button>
      </form>
      {(add.error || remove.error || error) && (
        <p className="text-sm text-destructive">{(add.error ?? remove.error ?? error)?.message}</p>
      )}
      <ul className="flex flex-col gap-2">
        {data?.map((person) => (
          <li key={person.email} className="flex items-center gap-2 text-sm">
            <span>{person.email}</span>
            <span className="text-muted-foreground">
              {person.role === 'admin' ? 'Admin' : person.hasPassword ? 'Member' : 'Waiting to set a password'}
            </span>
            {person.role !== 'admin' && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => remove.mutate(person.email)}>
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
