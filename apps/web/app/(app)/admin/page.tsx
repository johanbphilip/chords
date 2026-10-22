'use client';

import { approveEmailSchema } from '@chords/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FormError } from '@/components/form/form-error';
import { formProps, useAppForm } from '@/components/form/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { useMe, type Role } from '@/lib/auth';

interface Approved {
  email: string;
  role: Role;
  name: string | null;
  status: 'invited' | 'active' | 'revoked';
}

interface Invite {
  email: string;
  inviteUrl: string | null;
}

interface AccessRequest {
  email: string;
  name: string;
  requestedAt: string;
}

interface Reset {
  email: string;
  resetUrl: string;
}

export default function AdminPage() {
  const { data: me } = useMe();
  if (me?.role !== 'admin') return <p>Only an Admin can manage who may sign in.</p>;
  return <ApprovedEmails />;
}

function ApprovedEmails() {
  const queryClient = useQueryClient();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [reset, setReset] = useState<Reset | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['approved-emails'] });

  const { data, error } = useQuery({
    queryKey: ['approved-emails'],
    queryFn: () => apiGet<Approved[]>('/admin/approved-emails'),
  });
  const add = useMutation({
    mutationFn: (email: string) => apiPost<Invite>('/admin/approved-emails', { email }),
    onSuccess: (created) => {
      setInvite(created);
      return refresh();
    },
  });
  const approveForm = useAppForm({
    defaultValues: { email: '' },
    validators: { onChange: approveEmailSchema, onSubmit: approveEmailSchema },
    onSubmit: async ({ value, formApi }) => {
      const approved = await add.mutateAsync(approveEmailSchema.parse(value).email).then(
        () => true,
        () => false,
      );
      if (approved) formApi.reset();
    },
  });
  const reissue = useMutation({
    mutationFn: (address: string) =>
      apiPost<Invite>(`/admin/approved-emails/${encodeURIComponent(address)}/invite`),
    onSuccess: setInvite,
  });
  const requests = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => apiGet<AccessRequest[]>('/admin/access-requests'),
  });
  const approveRequest = useMutation({
    mutationFn: (address: string) =>
      apiPost<Invite>(`/admin/access-requests/${encodeURIComponent(address)}/approve`),
    onSuccess: (created) => {
      setInvite(created);
      return Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: ['access-requests'] }),
      ]);
    },
  });
  const declineRequest = useMutation({
    mutationFn: (address: string) =>
      apiDelete(`/admin/access-requests/${encodeURIComponent(address)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-requests'] }),
  });
  const resetLink = useMutation({
    mutationFn: (address: string) =>
      apiPost<Reset>(`/admin/approved-emails/${encodeURIComponent(address)}/reset-link`),
    onSuccess: setReset,
  });
  const person = useMutation({
    mutationFn: ({
      address,
      action,
      role,
    }: {
      address: string;
      action: 'revoke' | 'restore' | 'role';
      role?: Role;
    }) =>
      action === 'role'
        ? apiPut(`/admin/members/${encodeURIComponent(address)}/role`, { role })
        : apiPost(`/admin/members/${encodeURIComponent(address)}/${action}`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (address: string) =>
      apiDelete(`/admin/approved-emails/${encodeURIComponent(address)}`),
    onSuccess: refresh,
  });

  const problem =
    person.error ??
    approveRequest.error ??
    declineRequest.error ??
    requests.error ??
    add.error ??
    reissue.error ??
    resetLink.error ??
    remove.error ??
    error;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Who may sign in</h1>
      <form {...formProps(approveForm)} className="flex items-start gap-2">
        <approveForm.AppField name="email">
          {(field) => (
            <field.TextField
              label="Email to approve"
              hideLabel
              type="email"
              placeholder="Email to approve"
              className="flex-1"
            />
          )}
        </approveForm.AppField>
        <approveForm.AppForm>
          <approveForm.SubmitButton pendingLabel="Approving…">Approve</approveForm.SubmitButton>
        </approveForm.AppForm>
      </form>
      {invite?.inviteUrl && (
        <CopyLink
          text={`Send this link to ${invite.email}. It works once and expires in 7 days. It is shown only now.`}
          url={invite.inviteUrl}
        />
      )}
      {reset && (
        <CopyLink
          text={`Send this link to ${reset.email} so they can choose a new password. It works once and expires in an hour.`}
          url={reset.resetUrl}
        />
      )}
      <FormError error={problem ?? null} />
      {requests.data && requests.data.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Waiting for approval</h2>
          <ul className="flex flex-col gap-2">
            {requests.data.map((request) => (
              <li key={request.email} className="flex items-center gap-2 text-sm">
                <span>{request.name}</span>
                <span className="text-muted-foreground">{request.email}</span>
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => approveRequest.mutate(request.email)}
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => declineRequest.mutate(request.email)}
                >
                  Decline
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ul className="flex flex-col gap-2">
        {data?.map((p) => (
          <li key={p.email} className="flex flex-wrap items-center gap-2 text-sm">
            <span>{p.name ?? p.email}</span>
            {p.name && <span className="text-muted-foreground">{p.email}</span>}
            <Badge
              variant={
                p.status === 'revoked'
                  ? 'destructive'
                  : p.status === 'invited'
                    ? 'outline'
                    : 'secondary'
              }
            >
              {LABEL[p.status](p.role)}
            </Badge>
            <span className="ml-auto flex gap-1">
              {p.status === 'invited' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => reissue.mutate(p.email)}>
                    New invite link
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(p.email)}>
                    Remove
                  </Button>
                </>
              )}
              {p.status === 'active' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => resetLink.mutate(p.email)}>
                    Reset link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      person.mutate({
                        address: p.email,
                        action: 'role',
                        role: p.role === 'admin' ? 'member' : 'admin',
                      })
                    }
                  >
                    {p.role === 'admin' ? 'Make Member' : 'Make Admin'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => person.mutate({ address: p.email, action: 'revoke' })}
                  >
                    Revoke
                  </Button>
                </>
              )}
              {p.status === 'revoked' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => person.mutate({ address: p.email, action: 'restore' })}
                >
                  Restore
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LABEL = {
  invited: () => 'Invited',
  active: (role: Role) => (role === 'admin' ? 'Admin' : 'Member'),
  revoked: () => 'Revoked',
};

function CopyLink({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2 text-sm">
        <p>{text}</p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Link to send"
          />
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
      </CardContent>
    </Card>
  );
}
