import { describe, expect, it } from 'vitest';
import { parseChordSheet, renderChordSheet, transposeChordSheet, transposeKey } from '../src/chord-sheet/index.js';

describe('parsing and rendering', () => {
  it('attaches chords above a lyric line to lyric positions', () => {
    const sheet = parseChordSheet('[Verse 1]\nG       D\nAmazing grace');
    expect(sheet).toEqual([
      {
        name: 'Verse 1',
        lines: [
          {
            lyric: 'Amazing grace',
            chords: [
              { chord: 'G', at: 0 },
              { chord: 'D', at: 8 },
            ],
          },
        ],
      },
    ]);
  });

  it('renders the stored form back into aligned chord-over-lyric lines', () => {
    const text = '[Verse 1]\nG       D\nAmazing grace\n\n[Chorus]\nC\nHow sweet';
    expect(renderChordSheet(parseChordSheet(text))).toBe(text);
  });

  it('keeps a chord positioned past the end of a shorter lyric', () => {
    const text = 'G          D\nOh Lord';
    const [section] = parseChordSheet(text);
    expect(section!.lines[0]!.chords).toEqual([
      { chord: 'G', at: 0 },
      { chord: 'D', at: 11 },
    ]);
    expect(renderChordSheet(parseChordSheet(text))).toBe(text);
  });

  it.each(['C/E', 'Gsus4', 'Cmaj7', 'Am7', 'F#m', 'Bb', 'Dadd9', 'E7(b9)', 'G/B'])(
    'recognises %s as a chord and keeps it aligned',
    (chord) => {
      const text = `${chord}   Am\nSome words here`;
      const [section] = parseChordSheet(text);
      expect(section!.lines[0]!.chords[0]).toEqual({ chord, at: 0 });
      expect(renderChordSheet(parseChordSheet(text))).toBe(text);
    },
  );

  it('treats a line of ordinary words as lyrics, not chords', () => {
    const [section] = parseChordSheet('A Bad day\nAm');
    expect(section!.lines[0]).toEqual({ lyric: 'A Bad day', chords: [] });
    expect(section!.lines[1]).toEqual({ lyric: '', chords: [{ chord: 'Am', at: 0 }] });
  });

  it('keeps a chord-only line, such as an instrumental, with no lyric', () => {
    const text = '[Intro]\nG  D  Em  C\n\n[Verse]\nG\nHello';
    expect(renderChordSheet(parseChordSheet(text))).toBe(text);
  });

  it('pushes overlapping chords apart rather than running them together', () => {
    const sheet = [{ name: '', lines: [{ lyric: 'ab', chords: [{ chord: 'Cmaj7', at: 0 }, { chord: 'G', at: 2 }] }] }];
    expect(renderChordSheet(sheet)).toBe('Cmaj7 G\nab');
  });
});

describe('section headers', () => {
  it('detects headers such as [Verse 1] and [Chorus]', () => {
    const sheet = parseChordSheet('[Verse 1]\nHello\n\n[Chorus]\nWorld');
    expect(sheet.map((s) => s.name)).toEqual(['Verse 1', 'Chorus']);
  });

  it('collapses a repeated header with identical content into one Section', () => {
    const sheet = parseChordSheet('[Chorus]\nC\nSing\n\n[Verse]\nHi\n\n[Chorus]\nC\nSing');
    expect(sheet.map((s) => s.name)).toEqual(['Chorus', 'Verse']);
  });

  it('keeps a repeated header with different content as a separately named Section', () => {
    const sheet = parseChordSheet('[Chorus]\nSing\n\n[Chorus]\nShout');
    expect(sheet.map((s) => s.name)).toEqual(['Chorus', 'Chorus 2']);
  });

  it('puts text before any header into an unnamed Section', () => {
    const sheet = parseChordSheet('Hello\n[Verse]\nWorld');
    expect(sheet.map((s) => s.name)).toEqual(['', 'Verse']);
  });
});

describe('transposing', () => {
  const sheetOf = (...chords: string[]) => [
    { name: 'Verse', lines: [{ lyric: 'la', chords: chords.map((chord, i) => ({ chord, at: i * 3 })) }] },
  ];
  const chordsIn = (sheet: ReturnType<typeof sheetOf>) => sheet[0]!.lines[0]!.chords.map((c) => c.chord);

  it('moves chords up and down, keeping positions and lyrics', () => {
    const up = transposeChordSheet(sheetOf('G', 'D', 'Em', 'C'), 2);
    expect(chordsIn(up)).toEqual(['A', 'E', 'F#m', 'D']);
    expect(up[0]!.lines[0]!.chords.map((c) => c.at)).toEqual([0, 3, 6, 9]);
    expect(up[0]!.lines[0]!.lyric).toBe('la');
    expect(chordsIn(transposeChordSheet(sheetOf('G', 'D', 'Em', 'C'), -2))).toEqual(['F', 'C', 'Dm', 'Bb']);
  });

  it('transposes slash, extended, sharp and flat chords, including the bass note', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('C/E', 'Gsus4', 'F#m7', 'Bbmaj7', 'D/F#'), 2))).toEqual([
      'D/F#',
      'Asus4',
      'G#m7',
      'Cmaj7',
      'E/G#',
    ]);
  });

  it('wraps around the octave and handles any amount', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('A'), 12))).toEqual(['A']);
    expect(chordsIn(transposeChordSheet(sheetOf('A'), -15))).toEqual(['F#']);
    expect(chordsIn(transposeChordSheet(sheetOf('A'), 14))).toEqual(['B']);
  });

  it('spells chords with flats when the target key is a flat key', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'Am', 'G7'), 5, { toKey: 'F' }))).toEqual(['F', 'Dm', 'C7']);
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'F', 'G'), 3, { toKey: 'Eb' }))).toEqual(['Eb', 'Ab', 'Bb']);
  });

  it('spells chords with sharps when the target key is a sharp key', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'F', 'G'), 2, { toKey: 'D' }))).toEqual(['D', 'G', 'A']);
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'F', 'G'), 6, { toKey: 'F#' }))).toEqual(['F#', 'B', 'C#']);
  });

  it('keeps flats for flat chords when no target key is given', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('Bb', 'Eb'), 2))).toEqual(['C', 'F']);
    expect(chordsIn(transposeChordSheet(sheetOf('Bb', 'Eb'), 1))).toEqual(['B', 'E']);
    expect(chordsIn(transposeChordSheet(sheetOf('Ab'), 1))).toEqual(['A']);
    expect(chordsIn(transposeChordSheet(sheetOf('Eb'), 4))).toEqual(['G']);
    expect(chordsIn(transposeChordSheet(sheetOf('Bb', 'Eb'), 3))).toEqual(['Db', 'Gb']);
  });

  it('transposes a key name the same way', () => {
    expect(transposeKey('G', 2)).toBe('A');
    expect(transposeKey('C', 3)).toBe('Eb');
    expect(transposeKey('Em', 3)).toBe('Gm');
    expect(transposeKey('A', 1)).toBe('Bb');
    expect(transposeKey('F#m', -1)).toBe('Fm');
  });
});
