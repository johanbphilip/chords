import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { existingSongId } from '@/lib/api';

/** Why a Song could not be saved. When another Song already has the title and artist, it links to that Song. */
export function SongError({ error }: { error: Error | null }) {
  if (!error) return null;
  const existingId = existingSongId(error);
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {error.message}
        {existingId && (
          <>
            {' '}
            <Link href={`/songs/${existingId}`} className="underline">
              Open it
            </Link>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
