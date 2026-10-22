'use client';

import { parseChordSheet } from '@chords/shared';
import { useMemo } from 'react';
import { ChordSheet } from '@/components/songs/chord-sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** A live view of the typed text, as the Song will read once saved. Parsed here with the same code the API uses. */
export function SheetPreview({ text }: { text: string }) {
  const content = useMemo(() => parseChordSheet(text), [text]);
  return (
    <Card size="sm" aria-label="Preview">
      <CardHeader>
        <CardTitle className="text-muted-foreground">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {text.trim() === '' ? (
          <p className="text-sm text-muted-foreground">
            Type or paste chords and lyrics to see them here.
          </p>
        ) : (
          <ChordSheet content={content} />
        )}
      </CardContent>
    </Card>
  );
}
