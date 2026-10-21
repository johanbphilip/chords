'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SavedNotice } from '@/components/saved-notice';
import { SheetPreview } from '@/components/sheet-preview';
import { SongForm } from '@/components/song-form';
import { apiPost, existingSongId } from '@/lib/api';
import { emptySongForm, songBody, type Saved, type SongForm as SongFormValues } from '@/lib/songs';

export default function NewSongPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SongFormValues>(emptySongForm);
  const [saved, setSaved] = useState<Saved | null>(null);

  const create = useMutation({
    mutationFn: () => apiPost<Saved>('/songs', songBody(form)),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] });
      // A same-title Song by someone else is allowed, so say so before moving on.
      if (created.similar.length === 0) router.push(`/songs/${created.id}`);
      else setSaved(created);
    },
  });

  if (saved) return <SavedNotice id={saved.id} similar={saved.similar} />;

  const existingId = existingSongId(create.error);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">New song</h1>
      <SongForm
        value={form}
        onChange={setForm}
        onSubmit={create.mutate}
        submitLabel="Save song"
        pending={create.isPending}
        preview={<SheetPreview text={form.text} />}
      >
        {create.error && (
          <p role="alert" className="text-sm text-destructive">
            {create.error.message}
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
