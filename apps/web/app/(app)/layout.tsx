'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { clearToken } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useMe } from '@/lib/auth';

/** Every page inside this group needs a signed-in Member; signed-out visitors are sent to sign in. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending } = useMe();

  useEffect(() => {
    if (!isPending && !me) router.replace('/sign-in');
  }, [isPending, me, router]);

  if (!me) return null;

  const signOut = useMutation({
    mutationFn: () => authClient.signOut(),
    // Even if the server call fails, this device must forget the token.
    onSettled: () => {
      clearToken();
      queryClient.clear();
      router.replace('/sign-in');
    },
  });

  return (
    <>
      <header className="mx-auto flex max-w-2xl items-center gap-2 p-4">
        <Link href="/" className="font-medium">
          Explore
        </Link>
        {me.role === 'admin' && (
          <Link href="/admin" className="text-sm text-muted-foreground">
            Admin
          </Link>
        )}
        <Link href="/profile" className="ml-auto text-sm text-muted-foreground">
          {me.name}
        </Link>
        <Button variant="ghost" size="sm" onClick={() => signOut.mutate()}>
          Sign out
        </Button>
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </>
  );
}
