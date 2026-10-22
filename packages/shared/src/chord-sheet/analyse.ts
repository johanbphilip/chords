import type { ChordSheet } from './types';
import { isMinorSuffix, NOTE } from './chord';

/** The Key a Song is probably in: its first chord's root, minor if the chord is. Null when there are no chords. */
export function suggestKey({ sections, order }: ChordSheet): string | null {
  const byName = new Map(sections.map((section) => [section.name, section]));
  for (const name of order) {
    for (const line of byName.get(name)?.lines ?? []) {
      const first = line.chords[0]?.chord;
      if (first === undefined) continue;
      const root = NOTE.exec(first)![0];
      const suffix = first.slice(root.length);
      return root + (isMinorSuffix(suffix) ? 'm' : '');
    }
  }
  return null;
}

/** English words that are also chord names, so a line made only of them may be lyrics the parser read as chords. */
const WORD_CHORDS = new Set(['A', 'Am']);

/** Lines the parser read as chords but that could be words, by Section name and line position, for a Member to check. */
export function findAmbiguousLines({ sections }: ChordSheet): { section: string; line: number }[] {
  return sections.flatMap((section) =>
    section.lines.flatMap((line, index) =>
      line.chords.length > 0 && line.chords.every(({ chord }) => WORD_CHORDS.has(chord))
        ? [{ section: section.name, line: index }]
        : [],
    ),
  );
}
