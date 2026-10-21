'use client';

import { signInSchema } from '@chords/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormError } from '@/components/form/form-error';
import { settled, formProps, useAppForm } from '@/components/form/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const signIn = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { error } = await authClient.signIn.email(credentials);
      if (error) throw new Error(error.message ?? 'Wrong email or password');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/');
    },
  });

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validators: { onChange: signInSchema, onSubmit: signInSchema },
    onSubmit: ({ value }) => settled(signIn.mutateAsync(signInSchema.parse(value))),
  });

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Chords</CardTitle>
        </CardHeader>
        <CardContent>
          <form {...formProps(form)}>
            <FieldGroup>
              <form.AppField name="email">
                {(field) => <field.TextField label="Email" type="email" autoComplete="email" />}
              </form.AppField>
              <form.AppField name="password">
                {(field) => <field.TextField label="Password" type="password" autoComplete="current-password" />}
              </form.AppField>
              <FormError error={signIn.error} />
              <form.AppForm>
                <form.SubmitButton pendingLabel="Signing in…">Sign in</form.SubmitButton>
              </form.AppForm>
              <Link href="/forgot-password" className="text-sm underline">
                Forgot your password?
              </Link>
              <p className="text-sm text-muted-foreground">
                New here? Open the invite link an Admin sent you, or{' '}
                <Link href="/request-access" className="underline">
                  ask for access
                </Link>
                .
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
