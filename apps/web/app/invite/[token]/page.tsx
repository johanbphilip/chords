'use client';

import { acceptInviteSchema } from '@chords/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { FormError } from '@/components/form/form-error';
import { settled, formProps, useAppForm } from '@/components/form/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { apiPost } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

interface Accepted {
  member: { email: string };
}

/** What the person types; the invite's token comes from the link. */
const joinSchema = acceptInviteSchema.pick({ name: true, password: true });

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const join = useMutation({
    mutationFn: async ({ name, password }: { name: string; password: string }) => {
      const { member } = await apiPost<Accepted>('/auth/accept-invite', { token, name, password });
      const { error } = await authClient.signIn.email({ email: member.email, password });
      // The invite is spent by now, so a failed sign-in here must send them to the normal form.
      if (error) throw new Error('Your account is ready. Go to the sign-in page and sign in with your email and password.');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/');
    },
  });

  const form = useAppForm({
    defaultValues: { name: '', password: '' },
    validators: { onChange: joinSchema, onSubmit: joinSchema },
    onSubmit: ({ value }) => settled(join.mutateAsync(joinSchema.parse(value))),
  });

  return (
    <main className="mx-auto max-w-sm p-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Chords</CardTitle>
        </CardHeader>
        <CardContent>
          <form {...formProps(form)}>
            <FieldGroup>
              <form.AppField name="name">
                {(field) => <field.TextField label="Your name" autoComplete="name" description="Shown to other Members next to your work." />}
              </form.AppField>
              <form.AppField name="password">
                {(field) => <field.TextField label="Choose a password" type="password" autoComplete="new-password" description="At least 8 characters." />}
              </form.AppField>
              <FormError error={join.error} />
              <form.AppForm>
                <form.SubmitButton pendingLabel="Joining…">Join</form.SubmitButton>
              </form.AppForm>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
