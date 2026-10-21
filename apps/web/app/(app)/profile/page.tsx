'use client';

import { changePasswordSchema, renameSchema } from '@chords/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormError } from '@/components/form/form-error';
import { settled, formProps, useAppForm } from '@/components/form/form';
import { FieldGroup } from '@/components/ui/field';
import { apiPatch } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useMe } from '@/lib/auth';

export default function ProfilePage() {
  const { data: me } = useMe();
  if (!me) return null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Profile</h1>
      <p className="text-sm text-muted-foreground">{me.email}</p>
      <RenameForm initialName={me.name} />
      <ChangePasswordForm />
    </div>
  );
}

function RenameForm({ initialName }: { initialName: string }) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (name: string) => apiPatch('/auth/me', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const form = useAppForm({
    defaultValues: { name: initialName },
    validators: { onChange: renameSchema, onSubmit: renameSchema },
    onSubmit: ({ value }) => settled(save.mutateAsync(renameSchema.parse(value).name)),
  });

  return (
    <form {...formProps(form)} className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <form.AppField name="name">
          {(field) => <field.TextField label="Display name" hideLabel className="flex-1" autoComplete="name" />}
        </form.AppField>
        <form.AppForm>
          <form.SubmitButton pendingLabel="Saving…">Save</form.SubmitButton>
        </form.AppForm>
      </div>
      {save.isSuccess && <p className="text-sm text-muted-foreground">Saved.</p>}
      <FormError error={save.error} />
    </form>
  );
}

function ChangePasswordForm() {
  const change = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (error) throw new Error(error.message ?? 'Could not change the password');
    },
  });

  const form = useAppForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    validators: { onChange: changePasswordSchema, onSubmit: changePasswordSchema },
    onSubmit: async ({ value, formApi }) => {
      const changed = await change.mutateAsync(changePasswordSchema.parse(value)).then(() => true, () => false);
      if (changed) formApi.reset();
    },
  });

  return (
    <form {...formProps(form)}>
      <FieldGroup>
        <h2 className="font-medium">Change password</h2>
        <form.AppField name="currentPassword">
          {(field) => <field.TextField label="Current password" type="password" autoComplete="current-password" />}
        </form.AppField>
        <form.AppField name="newPassword">
          {(field) => <field.TextField label="New password" type="password" autoComplete="new-password" description="At least 8 characters." />}
        </form.AppField>
        <FormError error={change.error} />
        {change.isSuccess && <p className="text-sm text-muted-foreground">Password changed. Your other devices are signed out.</p>}
        <form.AppForm>
          <form.SubmitButton pendingLabel="Changing…">Change password</form.SubmitButton>
        </form.AppForm>
      </FieldGroup>
    </form>
  );
}
