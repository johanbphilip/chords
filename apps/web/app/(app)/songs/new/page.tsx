'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SavedNotice } from '@/components/songs/saved-notice';
import { SongError } from '@/components/songs/song-error';
import { SongForm } from '@/components/songs/song-form';
import { apiPost } from '@/lib/api';
import { emptySongForm, type SongBody } from '@/lib/songs/form';
import type { Saved } from '@/lib/songs/types';

export default function NewSongPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<Saved | null>(null);

  const create = useMutation({
    mutationFn: (body: SongBody) => apiPost<Saved>('/songs', body),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] });
      // A same-title Song by someone else is allowed, so say so before moving on.
      if (created.similar.length === 0) router.push(`/songs/${created.id}`);
      else setSaved(created);
    },
  });

  if (saved) return <SavedNotice id={saved.id} similar={saved.similar} />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">New song</h1>
      <SongForm initial={emptySongForm} onSave={create.mutateAsync} submitLabel="Save song">
        <SongError error={create.error} />
      </SongForm>
    </div>
  );
}
