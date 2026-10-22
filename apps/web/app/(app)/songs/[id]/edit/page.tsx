'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form/form-error';
import { SavedNotice } from '@/components/songs/saved-notice';
import { SongError } from '@/components/songs/song-error';
import { SongForm } from '@/components/songs/song-form';
import { apiGet, apiPut } from '@/lib/api';
import { songToForm, type SongBody } from '@/lib/songs/form';
import type { Saved, Song } from '@/lib/songs/types';

export default function EditSongPage() {
  const { id } = useParams<{ id: string }>();
  const { data: song, error } = useQuery({
    queryKey: ['song', id],
    queryFn: () => apiGet<Song>(`/songs/${id}`),
  });

  if (error) return <FormError error={error} />;
  if (!song) return null;
  return <Editor song={song} />;
}

function Editor({ song }: { song: Song }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<Saved | null>(null);

  const save = useMutation({
    mutationFn: (body: SongBody) => apiPut<Saved>(`/songs/${song.id}`, body),
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['songs'] }),
        queryClient.invalidateQueries({ queryKey: ['song', song.id] }),
      ]);
      // Changing the title or artist can leave a same-title Song by someone else, so say so before moving on.
      if (updated.similar.length === 0) router.push(`/songs/${song.id}`);
      else setSaved(updated);
    },
  });

  if (saved) return <SavedNotice id={saved.id} similar={saved.similar} />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Edit song</h1>
      <SongForm initial={songToForm(song)} onSave={save.mutateAsync} submitLabel="Save changes">
        <p className="text-xs text-muted-foreground">
          Add, rename or remove a Section by changing its [header]. A Section sung twice appears
          twice; if you change only one copy it becomes its own Section (for example "Chorus 2"), so
          change both.
        </p>
        <SongError error={save.error} />
      </SongForm>
    </div>
  );
}
