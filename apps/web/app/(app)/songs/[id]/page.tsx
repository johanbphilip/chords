'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormError } from '@/components/form/form-error';
import { ChordSheet } from '@/components/songs/chord-sheet';
import { buttonVariants } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import type { Song } from '@/lib/songs/types';

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const { data: song, error } = useQuery({
    queryKey: ['song', id],
    queryFn: () => apiGet<Song>(`/songs/${id}`),
  });

  if (error) return <FormError error={error} />;
  if (!song) return null;

  const details = [
    song.key && `Key ${song.key}`,
    song.tempo && `${song.tempo} bpm`,
    song.timeSignature,
  ].filter(Boolean);
  return (
    <article className="flex flex-col gap-4">
      <header className="flex items-start gap-2">
        <div>
          <h1 className="text-xl font-medium">{song.title}</h1>
          {song.artist && <p className="text-muted-foreground">{song.artist}</p>}
          {details.length > 0 && (
            <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
          )}
        </div>
        <Link
          href={`/songs/${song.id}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' ml-auto'}
        >
          Edit
        </Link>
      </header>
      <ChordSheet content={song.content} />
    </article>
  );
}
