/** A chord attached to a lyric position (a character offset; may sit past the end of the lyric). */
export interface PlacedChord {
  chord: string;
  at: number;
}

export interface SheetLine {
  lyric: string;
  chords: PlacedChord[];
}

export interface SheetSection {
  /** Empty for text that appears before any header. */
  name: string;
  lines: SheetLine[];
}

export type ChordSheet = SheetSection[];

const HEADER = /^\s*\[([^\]]+)\]\s*$/;
const CHORD =
  /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|\+|-|°|ø|\d+|[#b]\d+|\([^)\s]*\))*(?:\/[A-G][#b]?)?$/;

function chordsOf(line: string): PlacedChord[] | null {
  const chords: PlacedChord[] = [];
  for (const match of line.matchAll(/\S+/g)) {
    if (!CHORD.test(match[0])) return null;
    chords.push({ chord: match[0], at: match.index });
  }
  return chords.length > 0 ? chords : null;
}

export function parseChordSheet(text: string): ChordSheet {
  const sections: ChordSheet = [];
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

/** A repeat of a Section is an Arrangement concern, so identical repeats collapse; differing ones get a number. */
function resolveRepeatedHeaders(sections: SheetSection[]): ChordSheet {
  const kept: ChordSheet = [];
  const names = new Set<string>();
  for (const section of sections) {
    const twin = kept.find(
      (other) => other.name === section.name && JSON.stringify(other.lines) === JSON.stringify(section.lines),
    );
    if (twin) continue;
    let name = section.name;
    for (let n = 2; name !== '' && names.has(name); n++) name = `${section.name} ${n}`;
    names.add(name);
    kept.push({ name, lines: section.lines });
  }
  return kept;
}

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

export function renderChordSheet(sheet: ChordSheet): string {
  return sheet
    .map((section) => {
      const lines = section.lines.flatMap(renderLine);
      while (lines.at(-1) === '') lines.pop();
      while (lines[0] === '') lines.shift();
      return (section.name ? [`[${section.name}]`, ...lines] : lines).join('\n');
    })
    .join('\n\n');
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Spellings used when nothing says otherwise: the ones musicians usually write. */
const COMMON_CHORD = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const COMMON_MINOR_KEY = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

const NOTE = /^([A-G])([#b]?)/;

function noteIndex(letter: string, accidental: string): number {
  const base = SHARPS.indexOf(letter);
  return (base + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12;
}

type Spelling = 'sharps' | 'flats' | 'common';

const TABLES = { sharps: SHARPS, flats: FLATS };
const ACCIDENTAL_SPELLING: Record<string, Spelling> = { '#': 'sharps', b: 'flats', '': 'common' };

/** A note keeps its own sharp or flat style unless the caller forces one; plain notes use the common table. */
function transposeNote(note: string, semitones: number, forced: Spelling, common: string[]): string {
  const [, letter, accidental] = NOTE.exec(note)!;
  const index = (noteIndex(letter!, accidental!) + (semitones % 12) + 12) % 12;
  const spelling = forced === 'common' ? ACCIDENTAL_SPELLING[accidental!]! : forced;
  return (spelling === 'common' ? common : TABLES[spelling])[index]!;
}

export function transposeChord(chord: string, semitones: number, toKey?: string): string {
  const forced: Spelling = toKey === undefined ? 'common' : FLAT_KEYS.has(toKey) ? 'flats' : 'sharps';
  const [main, bass] = chord.split('/') as [string, string | undefined];
  const root = NOTE.exec(main)![0];
  const result = transposeNote(root, semitones, forced, COMMON_CHORD) + main.slice(root.length);
  return bass === undefined ? result : `${result}/${transposeNote(bass, semitones, forced, COMMON_CHORD)}`;
}

/** Transposes every chord. With `toKey`, sharps or flats follow that key; otherwise each chord's own style is kept. */
export function transposeChordSheet(sheet: ChordSheet, semitones: number, options: { toKey?: string } = {}): ChordSheet {
  return sheet.map((section) => ({
    name: section.name,
    lines: section.lines.map((line) => ({
      lyric: line.lyric,
      chords: line.chords.map(({ chord, at }) => ({ chord: transposeChord(chord, semitones, options.toKey), at })),
    })),
  }));
}

/** Transposes a key name such as "G" or "F#m". */
export function transposeKey(key: string, semitones: number): string {
  const root = NOTE.exec(key)![0];
  const suffix = key.slice(root.length);
  const common = suffix.startsWith('m') && !suffix.startsWith('maj') ? COMMON_MINOR_KEY : COMMON_CHORD;
  return transposeNote(root, semitones, 'common', common) + suffix;
}
