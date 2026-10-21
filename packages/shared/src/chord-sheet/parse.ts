import type { PlacedChord, SheetLine, SheetSection, ChordSheet } from './types';
import { isChord } from './chord';

const HEADER = /^\s*\[\s*([^\]\s][^\]]*)\]\s*$/;

function chordsOf(line: string): PlacedChord[] | null {
  const chords: PlacedChord[] = [];
  for (const match of line.matchAll(/\S+/g)) {
    if (!isChord(match[0])) return null;
    chords.push({ chord: match[0], at: match.index });
  }
  return chords.length > 0 ? chords : null;
}

export function parseChordSheet(text: string): ChordSheet {
  const sections: SheetSection[] = [];
  let current: SheetSection | undefined;
  const open = (name: string) => {
    current = { name, lines: [] };
    sections.push(current);
  };

  const rows = text.replace(/\r\n?/g, '\n').split('\n').map((row) => row.trimEnd());
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const header = HEADER.exec(row);
    if (header) {
      open(header[1]!.trim());
      continue;
    }
    if (!current) {
      if (row === '') continue;
      open('');
    }
    const chords = chordsOf(row);
    if (!chords) {
      current!.lines.push({ lyric: row, chords: [] });
      continue;
    }
    const next = rows[i + 1];
    if (next !== undefined && next !== '' && !HEADER.test(next) && !chordsOf(next)) {
      current!.lines.push({ lyric: next, chords });
      i++;
    } else {
      current!.lines.push({ lyric: '', chords });
    }
  }
  return resolveRepeatedHeaders(sections.map(trimBlankLines));
}

function trimBlankLines(section: SheetSection): SheetSection {
  const blank = (line: SheetLine) => line.lyric === '' && line.chords.length === 0;
  const lines = [...section.lines];
  while (lines.length > 0 && blank(lines.at(-1)!)) lines.pop();
  while (lines.length > 0 && blank(lines[0]!)) lines.shift();
  return { name: section.name, lines };
}

/** An identical repeat of a Section reuses it; a header repeated with different content gets a number. */
function resolveRepeatedHeaders(raw: SheetSection[]): ChordSheet {
  const sections: SheetSection[] = [];
  const nameOf = new Map<string, string>();
  const taken = new Set<string>();
  const order: string[] = [];
  for (const section of raw) {
    const identity = JSON.stringify([section.name, section.lines]);
    let name = nameOf.get(identity);
    if (name === undefined) {
      name = section.name;
      for (let n = 2; name !== '' && taken.has(name); n++) name = `${section.name} ${n}`;
      nameOf.set(identity, name);
      taken.add(name);
      sections.push({ name, lines: section.lines });
    }
    order.push(name);
  }
  return { sections, order };
}

