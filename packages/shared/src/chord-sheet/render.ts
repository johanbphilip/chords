import type { ChordSheet, SheetLine } from './types';

function renderLine({ lyric, chords }: SheetLine): string[] {
  if (chords.length === 0) return [lyric];
  let chordLine = '';
  for (const { chord, at } of chords) {
    // A chord that would overlap the previous one is pushed right, keeping a space between.
    const column = Math.max(at, chordLine === '' ? 0 : chordLine.length + 1);
    chordLine = chordLine.padEnd(column) + chord;
  }
  return lyric === '' ? [chordLine] : [chordLine, lyric];
}

export function renderChordSheet({ sections, order }: ChordSheet): string {
  const byName = new Map(sections.map((section) => [section.name, section]));
  return order
    .map((name) => {
      const lines = byName.get(name)!.lines.flatMap(renderLine);
      while (lines.at(-1) === '') lines.pop();
      while (lines[0] === '') lines.shift();
      return (name ? [`[${name}]`, ...lines] : lines).join('\n');
    })
    .join('\n\n');
}
