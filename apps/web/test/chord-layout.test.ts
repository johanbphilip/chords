import { describe, expect, it } from 'vitest';
import { layoutLine } from '@/lib/songs/chord-layout';

/** Words as "chord:text" pieces, `_` where a piece has no chord. */
const words = (line: Parameters<typeof layoutLine>[0]) => layoutLine(line).map((word) => word.map((piece) => `${piece.chord ?? '_'}:${piece.text}`));

describe('laying out a line so it can wrap', () => {
  it('puts each chord over the first letter it sits above, and wraps only between words', () => {
    expect(words({ lyric: 'Amazing grace', chords: [{ chord: 'G', at: 0 }, { chord: 'C', at: 8 }] })).toEqual([['G:Amazing '], ['C:grace']]);
  });

  it('keeps a word together when chords fall inside it', () => {
    expect(words({ lyric: 'A-ma-zing', chords: [{ chord: 'G', at: 2 }, { chord: 'D', at: 5 }] })).toEqual([['_:A-', 'G:ma-', 'D:zing']]);
  });

  it('keeps a chord that sits past the end of a short lyric', () => {
    expect(words({ lyric: 'Hi', chords: [{ chord: 'G', at: 6 }] })).toEqual([['_:Hi', 'G:']]);
  });

  it('lays out a line of chords with no lyric', () => {
    expect(words({ lyric: '', chords: [{ chord: 'G', at: 0 }, { chord: 'C', at: 4 }] })).toEqual([['G:', 'C:']]);
  });

  it('splits a line without chords into plain words', () => {
    expect(words({ lyric: 'no chords here', chords: [] })).toEqual([['_:no '], ['_:chords '], ['_:here']]);
  });

  it('starts a chord part-way through a word', () => {
    expect(words({ lyric: 'ab cd', chords: [{ chord: 'G', at: 1 }] })).toEqual([['_:a', 'G:b '], ['_:cd']]);
  });

  it('copes with chords listed out of order', () => {
    expect(words({ lyric: 'ab cd', chords: [{ chord: 'D', at: 3 }, { chord: 'G', at: 0 }] })).toEqual([['G:ab '], ['D:cd']]);
  });
});
