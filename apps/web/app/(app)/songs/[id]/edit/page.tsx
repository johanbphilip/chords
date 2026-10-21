'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SavedNotice } from '@/components/saved-notice';
import { SheetPreview } from '@/components/sheet-preview';
import { SongForm } from '@/components/song-form';
import { apiGet, apiPut, existingSongId } from '@/lib/api';
import { songBody, songToForm, type Saved, type Song, type SongForm as SongFormValues } from '@/lib/songs';

export default function EditSongPage() {
  const { id } = useParams<{ id: string }>();
  const { data: song, error } = useQuery({ queryKey: ['song', id], queryFn: () => apiGet<Song>(`/songs/${id}`) });

  if (error) return <p role="alert">{error.message}</p>;
  if (!song) return null;
  return <Editor song={song} />;
}

function Editor({ song }: { song: Song }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SongFormValues>(() => songToForm(song));
  const [saved, setSaved] = useState<Saved | null>(null);

  const save = useMutation({
    mutationFn: () => apiPut<Saved>(`/songs/${song.id}`, songBody(form)),
    onSuccess: async (updated) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['songs'] }), queryClient.invalidateQueries({ queryKey: ['song', song.id] })]);
      // Changing the title or artist can leave a same-title Song by someone else, so say so before moving on.
      if (updated.similar.length === 0) router.push(`/songs/${song.id}`);
      else setSaved(updated);
    },
  });
  if (saved) return <SavedNotice id={saved.id} similar={saved.similar} />;
  const existingId = existingSongId(save.error);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Edit song</h1>
      <SongForm
        value={form}
        onChange={setForm}
        onSubmit={save.mutate}
        submitLabel="Save changes"
        pending={save.isPending}
        preview={<SheetPreview text={form.text} />}
      >
        <p className="text-xs text-muted-foreground">
          Add, rename or remove a Section by changing its [header]. A Section sung twice appears twice; if you change only one copy it becomes its own
          Section (for example "Chorus 2"), so change both.
        </p>
        {save.error && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
            {existingId && (
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
