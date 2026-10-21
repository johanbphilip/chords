import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { songLabel, type SimilarSong } from '@/lib/songs';

/** Shown after saving a Song that shares its title with others: allowed, but worth a look before moving on. */
export function SavedNotice({ id, similar }: { id: string; similar: SimilarSong[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Saved</h1>
      <p role="status">
        Saved. Other Songs have this title, so check this is not a copy of one of them: {similar.map(songLabel).join('; ')}.
      </p>
      <Link href={`/songs/${id}`} className={buttonVariants()}>
        Open the Song
      </Link>
    </div>
  );
}
