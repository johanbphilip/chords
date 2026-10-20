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
  name: string | null;
  status: 'invited' | 'active';
}

interface Invite {
  email: string;
  inviteUrl: string | null;
}

export default function AdminPage() {
  const { data: me } = useMe();
  if (me?.role !== 'admin') return <p>Only an Admin can manage who may sign in.</p>;
  return <ApprovedEmails />;
}

function ApprovedEmails() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState<Invite | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['approved-emails'] });

  const { data, error } = useQuery({
    queryKey: ['approved-emails'],
    queryFn: () => apiGet<Approved[]>('/admin/approved-emails'),
  });
  const add = useMutation({
    mutationFn: () => apiPost<Invite>('/admin/approved-emails', { email }),
    onSuccess: (created) => {
      setEmail('');
      setInvite(created);
      return refresh();
    },
  });
  const reissue = useMutation({
    mutationFn: (address: string) => apiPost<Invite>(`/admin/approved-emails/${encodeURIComponent(address)}/invite`),
    onSuccess: setInvite,
  });
  const remove = useMutation({
    mutationFn: (address: string) => apiDelete(`/admin/approved-emails/${encodeURIComponent(address)}`),
    onSuccess: refresh,
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    add.mutate();
  }

  const problem = add.error ?? reissue.error ?? remove.error ?? error;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Who may sign in</h1>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input type="email" placeholder="Email to approve" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={add.isPending}>
          Approve
        </Button>
      </form>
      {invite?.inviteUrl && <InviteLink email={invite.email} url={invite.inviteUrl} />}
      {problem && <p className="text-sm text-destructive">{problem.message}</p>}
      <ul className="flex flex-col gap-2">
        {data?.map((person) => (
          <li key={person.email} className="flex items-center gap-2 text-sm">
            <span>{person.name ?? person.email}</span>
            {person.name && <span className="text-muted-foreground">{person.email}</span>}
            <span className="text-muted-foreground">
              {person.role === 'admin' ? 'Admin' : person.status === 'active' ? 'Member' : 'Invited'}
            </span>
            {person.status === 'invited' && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => reissue.mutate(person.email)}>
                New invite link
              </Button>
            )}
            {person.role !== 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                className={person.status === 'invited' ? undefined : 'ml-auto'}
                onClick={() => remove.mutate(person.email)}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InviteLink({ email, url }: { email: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <p>
        Send this link to {email}. It works once and expires in 7 days. It is shown only now.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" />
        <Button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
