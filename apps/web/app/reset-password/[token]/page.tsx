'use client';

import { resetPasswordSchema } from '@chords/shared';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormError } from '@/components/form/form-error';
import { settled, formProps, useAppForm } from '@/components/form/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();

  const reset = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) throw new Error('This reset link is invalid or has expired. Ask for a new one.');
    },
  });

  const form = useAppForm({
    defaultValues: { newPassword: '' },
    validators: { onChange: resetPasswordSchema, onSubmit: resetPasswordSchema },
    onSubmit: ({ value }) => settled(reset.mutateAsync(resetPasswordSchema.parse(value).newPassword)),
  });

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
            <form {...formProps(form)}>
              <FieldGroup>
                <form.AppField name="newPassword">
                  {(field) => <field.TextField label="New password" type="password" autoComplete="new-password" description="At least 8 characters." />}
                </form.AppField>
                <FormError error={reset.error} />
                <form.AppForm>
                  <form.SubmitButton pendingLabel="Changing…">Change password</form.SubmitButton>
                </form.AppForm>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
