'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SongForm } from '@/components/song-form';
import { buttonVariants } from '@/components/ui/button';
import { ApiError, apiPost } from '@/lib/api';
import { emptySongForm, songBody, songLabel, type SimilarSong, type SongForm as SongFormValues } from '@/lib/songs';

interface Created {
  id: string;
  similar: SimilarSong[];
}

export default function NewSongPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SongFormValues>(emptySongForm);
  const [saved, setSaved] = useState<Created | null>(null);

  const create = useMutation({
    mutationFn: () => apiPost<Created>('/songs', songBody(form)),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] });
      // A same-title Song by someone else is allowed, so say so before moving on.
      if (created.similar.length === 0) router.push(`/songs/${created.id}`);
      else setSaved(created);
    },
  });

  if (saved) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-medium">Saved</h1>
        <p role="status">
          Saved. Other Songs have this title, so check this is not a copy of one of them:{' '}
          {saved.similar.map(songLabel).join('; ')}.
        </p>
        <Link href={`/songs/${saved.id}`} className={buttonVariants()}>
          Open the Song
        </Link>
      </div>
    );
  }

  const existingId = create.error instanceof ApiError && create.error.status === 409 ? create.error.payload?.existingId : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">New song</h1>
      <SongForm value={form} onChange={setForm} onSubmit={create.mutate} submitLabel="Save song" pending={create.isPending}>
        {create.error && (
          <p role="alert" className="text-sm text-destructive">
            {create.error.message}
            {typeof existingId === 'string' && (
              <>
                {' '}
                <Link href={`/songs/${existingId}`} className="underline">
                  Open it
                </Link>
              </>
            )}
          </p>
        )}
      </SongForm>
    </div>
  );
}
