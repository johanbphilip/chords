'use client';

import { forgotPasswordSchema } from '@chords/shared';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { FormError } from '@/components/form/form-error';
import { settled, formProps, useAppForm } from '@/components/form/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const ask = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authClient.requestPasswordReset({ email });
      if (error) throw new Error('Too many requests. Try again in a minute.');
    },
  });

  const form = useAppForm({
    defaultValues: { email: '' },
    validators: { onChange: forgotPasswordSchema, onSubmit: forgotPasswordSchema },
    onSubmit: ({ value }) => settled(ask.mutateAsync(forgotPasswordSchema.parse(value).email)),
  });

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ask.isSuccess ? (
            <p>
              If that email is registered, a reset link is on its way. If nothing arrives, ask an
              Admin to send you a link.
            </p>
          ) : (
            <form {...formProps(form)}>
              <FieldGroup>
                <form.AppField name="email">
                  {(field) => <field.TextField label="Email" type="email" autoComplete="email" />}
                </form.AppField>
                <FormError error={ask.error} />
                <form.AppForm>
                  <form.SubmitButton pendingLabel="Sending…">Send reset link</form.SubmitButton>
                </form.AppForm>
              </FieldGroup>
            </form>
          )}
          <Link href="/sign-in" className="text-sm underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
