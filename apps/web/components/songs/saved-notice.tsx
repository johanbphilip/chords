import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { songLabel, type SimilarSong } from '@/lib/songs/types';

/** Shown after saving a Song that shares its title with others: allowed, but worth a look before moving on. */
export function SavedNotice({ id, similar }: { id: string; similar: SimilarSong[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Saved</h1>
      <Alert role="status">
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>
          Other Songs have this title, so check this is not a copy of one of them: {similar.map(songLabel).join('; ')}.
        </AlertDescription>
      </Alert>
      <Link href={`/songs/${id}`} className={buttonVariants()}>
        Open the Song
      </Link>
    </div>
  );
}
