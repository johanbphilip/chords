import type { ChordSheet } from './types';
import { isMinorSuffix, NOTE } from './chord';

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Spellings used when nothing says otherwise: the ones musicians usually write. */
const COMMON_CHORD = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const COMMON_MINOR_KEY = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

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
  const common = isMinorSuffix(suffix) ? COMMON_MINOR_KEY : COMMON_CHORD;
  return transposeNote(root, semitones, 'common', common) + suffix;
}
