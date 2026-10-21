'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ChordSheet } from '@/components/chord-sheet';
import { apiGet } from '@/lib/api';
import type { Song } from '@/lib/songs';

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const { data: song, error } = useQuery({ queryKey: ['song', id], queryFn: () => apiGet<Song>(`/songs/${id}`) });

  if (error) return <p role="alert">{error.message}</p>;
  if (!song) return null;

  const details = [song.key && `Key ${song.key}`, song.tempo && `${song.tempo} bpm`, song.timeSignature].filter(Boolean);
  return (
    <article className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-medium">{song.title}</h1>
        {song.artist && <p className="text-muted-foreground">{song.artist}</p>}
        {details.length > 0 && <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>}
      </header>
      <ChordSheet content={song.content} />
    </article>
  );
}
