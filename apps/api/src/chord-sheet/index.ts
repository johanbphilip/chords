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

/**
 * A Song's content. `sections` holds each Section once, under a unique name; `order` is the original order
 * as Section names, so a Section sung twice appears twice in `order` but is stored (and edited) once.
 */
export interface ChordSheet {
  sections: SheetSection[];
  order: string[];
}

const HEADER = /^\s*\[\s*([^\]\s][^\]]*)\]\s*$/;
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
  return {
    order: sheet.order,
    sections: sheet.sections.map((section) => ({
      name: section.name,
      lines: section.lines.map((line) => ({
        lyric: line.lyric,
        chords: line.chords.map(({ chord, at }) => ({ chord: transposeChord(chord, semitones, options.toKey), at })),
      })),
    })),
  };
}

/** Transposes a key name such as "G" or "F#m". */
export function transposeKey(key: string, semitones: number): string {
  const root = NOTE.exec(key)![0];
  const suffix = key.slice(root.length);
  const common = suffix.startsWith('m') && !suffix.startsWith('maj') ? COMMON_MINOR_KEY : COMMON_CHORD;
  return transposeNote(root, semitones, 'common', common) + suffix;
}

/** The Key a Song is probably in: its first chord's root, minor if the chord is. Null when there are no chords. */
export function suggestKey({ sections, order }: ChordSheet): string | null {
  const byName = new Map(sections.map((section) => [section.name, section]));
  for (const name of order) {
    for (const line of byName.get(name)?.lines ?? []) {
      const first = line.chords[0]?.chord;
      if (first === undefined) continue;
      const root = NOTE.exec(first)![0];
      const suffix = first.slice(root.length);
      return root + (suffix.startsWith('m') && !suffix.startsWith('maj') ? 'm' : '');
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
      line.chords.length > 0 && line.chords.every(({ chord }) => WORD_CHORDS.has(chord)) ? [{ section: section.name, line: index }] : [],
    ),
  );
}

export const isChord = (text: string): boolean => CHORD.test(text);
