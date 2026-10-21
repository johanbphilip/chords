'use client';

import { ChordSheet } from '@/components/chord-sheet';
import { useSheetPreview } from '@/lib/preview';

/** A live view of the typed text, as the Song will read once saved. */
export function SheetPreview({ text }: { text: string }) {
  const { data, error } = useSheetPreview(text);
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3" aria-label="Preview">
      <h2 className="text-sm font-medium text-muted-foreground">Preview</h2>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {text.trim() === '' ? (
        <p className="text-sm text-muted-foreground">Type or paste chords and lyrics to see them here.</p>
      ) : (
        data && <ChordSheet content={data.content} />
      )}
    </div>
  );
}
