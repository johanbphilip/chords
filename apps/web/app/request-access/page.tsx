'use client';

import { requestAccessSchema } from '@chords/shared';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { FormError } from '@/components/form/form-error';
import { settled, formProps, useAppForm } from '@/components/form/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { apiPost } from '@/lib/api';

export default function RequestAccessPage() {
  const ask = useMutation({ mutationFn: (request: { name: string; email: string }) => apiPost('/auth/request-access', request) });

  const form = useAppForm({
    defaultValues: { name: '', email: '' },
    validators: { onChange: requestAccessSchema, onSubmit: requestAccessSchema },
    onSubmit: ({ value }) => settled(ask.mutateAsync(requestAccessSchema.parse(value))),
  });

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Ask for access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ask.isSuccess ? (
            <p>Thank you. Your request was received and is waiting for approval. An Admin will send you an invite link.</p>
          ) : (
            <form {...formProps(form)}>
              <FieldGroup>
                <form.AppField name="name">{(field) => <field.TextField label="Your name" autoComplete="name" />}</form.AppField>
                <form.AppField name="email">
                  {(field) => <field.TextField label="Email" type="email" autoComplete="email" />}
                </form.AppField>
                <FormError error={ask.error} />
                <form.AppForm>
                  <form.SubmitButton pendingLabel="Sending…">Request access</form.SubmitButton>
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
