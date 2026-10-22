import { describe, expect, it } from 'vitest';
import {
  findAmbiguousLines,
  parseChordSheet,
  renderChordSheet,
  suggestKey,
  transposeChordSheet,
  transposeKey,
} from '../src';

describe('parsing and rendering', () => {
  it('attaches chords above a lyric line to lyric positions', () => {
    const sheet = parseChordSheet('[Verse 1]\nG       D\nAmazing grace');
    expect(sheet).toEqual({
      sections: [
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
      ],
      order: ['Verse 1'],
    });
  });

  it('renders the stored form back into aligned chord-over-lyric lines', () => {
    const text = '[Verse 1]\nG       D\nAmazing grace\n\n[Chorus]\nC\nHow sweet';
    expect(renderChordSheet(parseChordSheet(text))).toBe(text);
  });

  it('keeps a chord positioned past the end of a shorter lyric', () => {
    const text = 'G          D\nOh Lord';
    const [section] = parseChordSheet(text).sections;
    expect(section.lines[0].chords).toEqual([
      { chord: 'G', at: 0 },
      { chord: 'D', at: 11 },
    ]);
    expect(renderChordSheet(parseChordSheet(text))).toBe(text);
  });

  it.each(['C/E', 'Gsus4', 'Cmaj7', 'Am7', 'F#m', 'Bb', 'Dadd9', 'E7(b9)', 'G/B'])(
    'recognises %s as a chord and keeps it aligned',
    (chord) => {
      const text = `${chord}   Am\nSome words here`;
      const [section] = parseChordSheet(text).sections;
      expect(section.lines[0].chords[0]).toEqual({ chord, at: 0 });
      expect(renderChordSheet(parseChordSheet(text))).toBe(text);
    },
  );

  it('treats a line of ordinary words as lyrics, not chords', () => {
    const [section] = parseChordSheet('A Bad day\nAm').sections;
    expect(section.lines[0]).toEqual({ lyric: 'A Bad day', chords: [] });
    expect(section.lines[1]).toEqual({ lyric: '', chords: [{ chord: 'Am', at: 0 }] });
  });

  it('keeps a chord-only line, such as an instrumental, with no lyric', () => {
    const text = '[Intro]\nG  D  Em  C\n\n[Verse]\nG\nHello';
    expect(renderChordSheet(parseChordSheet(text))).toBe(text);
  });

  it('pushes overlapping chords apart rather than running them together', () => {
    const sheet = {
      sections: [
        {
          name: '',
          lines: [
            {
              lyric: 'ab',
              chords: [
                { chord: 'Cmaj7', at: 0 },
                { chord: 'G', at: 2 },
              ],
            },
          ],
        },
      ],
      order: [''],
    };
    expect(renderChordSheet(sheet)).toBe('Cmaj7 G\nab');
  });
});

const names = (text: string) => parseChordSheet(text).sections.map((section) => section.name);

describe('section headers', () => {
  it('detects headers such as [Verse 1] and [Chorus]', () => {
    expect(names('[Verse 1]\nHello\n\n[Chorus]\nWorld')).toEqual(['Verse 1', 'Chorus']);
  });

  it('keeps a repeated header with identical content as one Section used twice in the original order', () => {
    const text = '[Chorus]\nC\nSing\n\n[Verse]\nHi\n\n[Chorus]\nC\nSing';
    const sheet = parseChordSheet(text);
    expect(sheet.sections.map((s) => s.name)).toEqual(['Chorus', 'Verse']);
    expect(sheet.order).toEqual(['Chorus', 'Verse', 'Chorus']);
  });

  it('renders a repeated Section in full each time it occurs, so nothing is lost', () => {
    const text = '[Chorus]\nC\nSing\n\n[Verse]\nHi\n\n[Chorus]\nC\nSing';
    expect(renderChordSheet(parseChordSheet(text))).toBe(text);
  });

  it('shows an edit to a repeated Section everywhere it occurs', () => {
    const sheet = parseChordSheet('[Chorus]\nSing\n\n[Verse]\nHi\n\n[Chorus]\nSing');
    sheet.sections[0].lines[0].lyric = 'Shout';
    expect(renderChordSheet(sheet)).toBe('[Chorus]\nShout\n\n[Verse]\nHi\n\n[Chorus]\nShout');
  });

  it('keeps a repeated header with different content as a separately named Section', () => {
    const sheet = parseChordSheet('[Chorus]\nSing\n\n[Chorus]\nShout');
    expect(sheet.sections.map((s) => s.name)).toEqual(['Chorus', 'Chorus 2']);
    expect(sheet.order).toEqual(['Chorus', 'Chorus 2']);
  });

  it('does not treat an empty header such as [ ] as a Section', () => {
    const sheet = parseChordSheet('[Verse]\nHello\n[ ]\nWorld');
    expect(sheet.sections.map((s) => s.name)).toEqual(['Verse']);
    expect(sheet.sections[0].lines.map((l) => l.lyric)).toEqual(['Hello', '[ ]', 'World']);
  });

  it('puts text before any header into an unnamed Section', () => {
    expect(names('Hello\n[Verse]\nWorld')).toEqual(['', 'Verse']);
  });
});

const sheetOf = (...chords: string[]) => ({
  sections: [
    {
      name: 'Verse',
      lines: [{ lyric: 'la', chords: chords.map((chord, i) => ({ chord, at: i * 3 })) }],
    },
  ],
  order: ['Verse'],
});

const chordsIn = (sheet: ReturnType<typeof sheetOf>) =>
  sheet.sections[0].lines[0].chords.map((c) => c.chord);

describe('transposing', () => {
  it('moves chords up and down, keeping positions and lyrics', () => {
    const up = transposeChordSheet(sheetOf('G', 'D', 'Em', 'C'), 2);
    expect(chordsIn(up)).toEqual(['A', 'E', 'F#m', 'D']);
    expect(up.sections[0].lines[0].chords.map((c) => c.at)).toEqual([0, 3, 6, 9]);
    expect(up.sections[0].lines[0].lyric).toBe('la');
    expect(chordsIn(transposeChordSheet(sheetOf('G', 'D', 'Em', 'C'), -2))).toEqual([
      'F',
      'C',
      'Dm',
      'Bb',
    ]);
  });

  it('transposes slash, extended, sharp and flat chords, including the bass note', () => {
    expect(
      chordsIn(transposeChordSheet(sheetOf('C/E', 'Gsus4', 'F#m7', 'Bbmaj7', 'D/F#'), 2)),
    ).toEqual(['D/F#', 'Asus4', 'G#m7', 'Cmaj7', 'E/G#']);
  });

  it('wraps around the octave and handles any amount', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('A'), 12))).toEqual(['A']);
    expect(chordsIn(transposeChordSheet(sheetOf('A'), -15))).toEqual(['F#']);
    expect(chordsIn(transposeChordSheet(sheetOf('A'), 14))).toEqual(['B']);
  });

  it('spells chords with flats when the target key is a flat key', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'Am', 'G7'), 5, { toKey: 'F' }))).toEqual([
      'F',
      'Dm',
      'C7',
    ]);
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'F', 'G'), 3, { toKey: 'Eb' }))).toEqual([
      'Eb',
      'Ab',
      'Bb',
    ]);
  });

  it('spells chords with sharps when the target key is a sharp key', () => {
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'F', 'G'), 2, { toKey: 'D' }))).toEqual([
      'D',
      'G',
      'A',
    ]);
    expect(chordsIn(transposeChordSheet(sheetOf('C', 'F', 'G'), 6, { toKey: 'F#' }))).toEqual([
      'F#',
      'B',
      'C#',
    ]);
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

const suggest = (text: string) => suggestKey(parseChordSheet(text));

describe('suggesting a Key', () => {
  it.each([
    ['G\nAmazing', 'G'],
    ['Am7\nI once was lost', 'Am'],
    ['F#m\nlyric', 'F#m'],
    ['Bb/D\nlyric', 'Bb'],
    ['Gmaj7\nlyric', 'G'],
    ['Dsus4\nlyric', 'D'],
    ['Cmin\nlyric', 'Cm'],
    ['CM7\nlyric', 'C'],
  ])('takes the Key from the first chord of %j: %s', (text, key) => {
    expect(suggest(text)).toBe(key);
  });

  it("uses the first chord in the Song's order, not in the order Sections are stored", () => {
    const sheet = parseChordSheet('[Chorus]\nD\nHow sweet\n\n[Verse]\nG\nAmazing');
    expect(suggestKey({ ...sheet, order: ['Verse', 'Chorus'] })).toBe('G');
  });

  it('has no suggestion when the Song has no chords', () => {
    expect(suggest('just words\nand more')).toBeNull();
    expect(suggest('')).toBeNull();
  });
});

const ambiguous = (text: string) => findAmbiguousLines(parseChordSheet(text));

describe('chord lines that may be words', () => {
  it('flags a line that is only "A" or "Am", since the parser cannot tell a chord from a word', () => {
    expect(ambiguous('[Verse]\nA\nI wandered lonely')).toEqual([{ section: 'Verse', line: 0 }]);
    expect(ambiguous('[Verse]\nG\nHello\nAm')).toEqual([{ section: 'Verse', line: 1 }]);
    expect(ambiguous('[Verse]\nA   Am\nlyric')).toEqual([{ section: 'Verse', line: 0 }]);
  });

  it('does not flag a line that has any other chord', () => {
    expect(ambiguous('[Verse]\nA   D\nlyric')).toEqual([]);
    expect(ambiguous('[Verse]\nG\nlyric\nEm\nlyric')).toEqual([]);
  });

  it('does not flag lyric lines', () => {
    expect(ambiguous('[Verse]\nHello there\nAm I wrong')).toEqual([]);
  });

  it('reports the line by Section name and position within it', () => {
    expect(ambiguous('[Verse]\nG\nlyric\n\n[Chorus]\nlyric\nAm\nmore')).toEqual([
      { section: 'Chorus', line: 1 },
    ]);
  });
});
