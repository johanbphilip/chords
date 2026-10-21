'use client';

import { parseChordSheet } from '@chords/shared';
import { useMemo } from 'react';
import { ChordSheet } from '@/components/chord-sheet';

/** A live view of the typed text, as the Song will read once saved. Parsed here with the same code the API uses. */
export function SheetPreview({ text }: { text: string }) {
  const content = useMemo(() => parseChordSheet(text), [text]);
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3" aria-label="Preview">
      <h2 className="text-sm font-medium text-muted-foreground">Preview</h2>
      {text.trim() === '' ? (
        <p className="text-sm text-muted-foreground">Type or paste chords and lyrics to see them here.</p>
      ) : (
        <ChordSheet content={content} />
      )}
    </div>
  );
}
