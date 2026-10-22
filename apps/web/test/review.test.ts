import { findAmbiguousLines, parseChordSheet } from '@chords/shared';
import { describe, expect, it } from 'vitest';
import {
  mergeSection,
  removeOrderEntry,
  addOrderEntry,
  splitSection,
  startReview,
  toContent,
  treatAsLyric,
} from '@/lib/songs/review';

const start = (text: string) => {
  const content = parseChordSheet(text);
  return startReview(content, findAmbiguousLines(content));
};
const names = (draft: ReturnType<typeof start>) => draft.sections.map((section) => section.name);

describe('reviewing an import', () => {
  it('keeps text before the first header as an unnamed Section at the front of the order', () => {
    const draft = start('Intro words\n\n[Verse]\nG\nHello');
    expect(names(draft)).toEqual(['', 'Verse']);
    expect(toContent(draft).order).toEqual(['', 'Verse']);
  });

  it('merges unplaced text into the next Section, which keeps its name', () => {
    let draft = start('Intro words\n\n[Verse]\nG\nHello');
    draft = mergeSection(draft, draft.sections[0].key, 'next');
    expect(names(draft)).toEqual(['Verse']);
    expect(draft.sections[0].lines[0].lyric).toBe('Intro words');
    expect(toContent(draft).order).toEqual(['Verse']);
  });

  it('merges a Section into the one before, collapsing the repeats this makes next to each other', () => {
    let draft = start('[Verse]\nG\none\n\n[Chorus]\nD\ntwo\n\n[Verse]\nG\none');
    expect(toContent(draft).order).toEqual(['Verse', 'Chorus', 'Verse']);
    draft = mergeSection(draft, draft.sections[1].key, 'previous');
    expect(names(draft)).toEqual(['Verse']);
    expect(toContent(draft).order).toEqual(['Verse']);
    expect(draft.sections[0].lines).toHaveLength(2);
  });

  it('cannot merge past either end', () => {
    const draft = start('[Verse]\nG\none\n\n[Chorus]\nD\ntwo');
    expect(mergeSection(draft, draft.sections[0].key, 'previous')).toBe(draft);
    expect(mergeSection(draft, draft.sections[1].key, 'next')).toBe(draft);
  });

  it('splits a Section into a new unnamed one that follows it wherever the Song repeats it', () => {
    let draft = start(
      '[Verse]\nG\none\ntwo\nthree\n\n[Chorus]\nD\nx\n\n[Verse]\nG\none\ntwo\nthree',
    );
    draft = splitSection(draft, draft.sections[0].key, 1);
    expect(names(draft)).toEqual(['Verse', '', 'Chorus']);
    draft.sections[1].name = 'Verse B';
    expect(toContent(draft).order).toEqual(['Verse', 'Verse B', 'Chorus', 'Verse', 'Verse B']);
  });

  it('does nothing when asked to split before the first line or after the last', () => {
    const draft = start('[Verse]\nG\none\ntwo');
    expect(splitSection(draft, draft.sections[0].key, 0)).toBe(draft);
    expect(splitSection(draft, draft.sections[0].key, 2)).toBe(draft);
  });

  it('adds to and removes from the order', () => {
    let draft = start('[Verse]\nG\none\n\n[Chorus]\nD\ntwo');
    draft = addOrderEntry(draft, draft.sections[1].key);
    expect(toContent(draft).order).toEqual(['Verse', 'Chorus', 'Chorus']);
    draft = removeOrderEntry(draft, 0);
    expect(toContent(draft).order).toEqual(['Chorus', 'Chorus']);
  });

  it('flags a chord line that may be a word, and turns it back into lyrics with the lyric beneath kept', () => {
    let draft = start('[Verse]\nG\nHello\nA\nI wandered');
    expect(draft.sections[0].lines.map((line) => !!line.ambiguous)).toEqual([false, true]);
    draft = treatAsLyric(draft, draft.sections[0].key, 1);
    expect(toContent(draft).sections[0].lines).toEqual([
      { lyric: 'Hello', chords: [{ chord: 'G', at: 0 }] },
      { lyric: 'A', chords: [] },
      { lyric: 'I wandered', chords: [] },
    ]);
  });

  it('keeps the spacing of a chord row turned into lyrics', () => {
    let draft = start('[Verse]\nA   Am\nlyric');
    draft = treatAsLyric(draft, draft.sections[0].key, 0);
    expect(draft.sections[0].lines[0].lyric).toBe('A   Am');
  });

  it('hands the API names without the review flags', () => {
    const content = toContent(start('[Verse]\nA\nlyric'));
    expect(content.sections[0].lines[0]).toEqual({
      lyric: 'lyric',
      chords: [{ chord: 'A', at: 0 }],
    });
  });
});
