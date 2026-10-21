'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FormError } from '@/components/form/form-error';
import { buttonVariants } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import type { SongSummary } from '@/lib/songs/types';

export default function SongsPage() {
  const { data: songs, error } = useQuery({ queryKey: ['songs'], queryFn: () => apiGet<SongSummary[]>('/songs') });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-xl font-medium">Songs</h1>
        <div className="ml-auto flex gap-2">
          <Link href="/songs/import" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Import
          </Link>
          <Link href="/songs/new" className={buttonVariants({ size: 'sm' })}>
            New song
          </Link>
        </div>
      </div>
      <FormError error={error} />
      {songs?.length === 0 && <p className="text-muted-foreground">No Songs yet.</p>}
      <ul className="flex flex-col divide-y">
        {songs?.map((song) => (
          <li key={song.id}>
            <Link href={`/songs/${song.id}`} className="flex items-baseline gap-2 py-2">
              <span className="font-medium">{song.title}</span>
              {song.artist && <span className="text-sm text-muted-foreground">{song.artist}</span>}
              {song.key && <span className="ml-auto text-sm text-muted-foreground">{song.key}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
