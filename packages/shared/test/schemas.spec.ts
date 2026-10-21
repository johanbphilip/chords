import { describe, expect, it } from 'vitest';
import {
  acceptInviteSchema,
  chordSheetSchema,
  createSongSchema,
  emailSchema,
  parseSongTextSchema,
  replaceSongSchema,
  requestAccessSchema,
  songDetailsSchema,
} from '../src';

/** The first message an invalid value produces, or null when it is valid. */
const refusal = (schema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? null : result.error!.issues[0]!.message;
};

describe('people', () => {
  it('normalises an email so one person is one value', () => {
    expect(emailSchema.parse('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(refusal(emailSchema, 'not an email')).toBe('Enter a valid email address');
    expect(refusal(emailSchema, 5)).toBe('Enter a valid email address');
  });

  it('asks for a display name of up to 100 characters, and a password of at least 8', () => {
    expect(requestAccessSchema.parse({ email: 'a@b.co', name: '  Ada ' })).toEqual({ email: 'a@b.co', name: 'Ada' });
    expect(refusal(requestAccessSchema, { email: 'a@b.co', name: '   ' })).toMatch(/display name/);
    expect(refusal(requestAccessSchema, { email: 'a@b.co', name: 'x'.repeat(101) })).toMatch(/display name/);
    expect(refusal(acceptInviteSchema, { token: 't', name: 'Ada', password: 'short' })).toBe('Password must be at least 8 characters');
  });

  it('answers a missing or non-text invite token like any other bad link', () => {
    expect(refusal(acceptInviteSchema, { name: 'Ada', password: 'long enough' })).toBe('This invite link is invalid or has expired');
    expect(refusal(acceptInviteSchema, { token: 7, name: 'Ada', password: 'long enough' })).toBe('This invite link is invalid or has expired');
  });
});

describe('Song details', () => {
  it('needs only a title: everything else is none', () => {
    expect(songDetailsSchema.parse({ title: ' Amazing Grace ' })).toEqual({
      title: 'Amazing Grace',
      artist: '',
      key: null,
      tempo: null,
      timeSignature: null,
    });
  });

  it('reads blank form fields as none and tempo digits as a number', () => {
    expect(songDetailsSchema.parse({ title: 'x', artist: ' John ', key: ' ', tempo: ' 72 ', timeSignature: '' })).toEqual({
      title: 'x',
      artist: 'John',
      key: null,
      tempo: 72,
      timeSignature: null,
    });
  });

  it.each([
    [{}, 'A Song needs a title'],
    [{ title: '   ' }, 'A Song needs a title'],
    [{ title: 7 }, 'A Song needs a title'],
    [{ title: 'x', artist: 7 }, 'Artist must be text'],
    [{ title: 'x', key: 'H' }, 'Key must be a Key such as G, Bb or F#m'],
    [{ title: 'x', tempo: 0 }, 'Tempo must be a whole number from 1 to 400'],
    [{ title: 'x', tempo: 401 }, 'Tempo must be a whole number from 1 to 400'],
    [{ title: 'x', tempo: 72.5 }, 'Tempo must be a whole number from 1 to 400'],
    [{ title: 'x', tempo: '72bpm' }, 'Tempo must be a whole number from 1 to 400'],
    [{ title: 'x', tempo: 'fast' }, 'Tempo must be a whole number from 1 to 400'],
    [{ title: 'x', timeSignature: 'waltz' }, 'Time signature must be like 4/4 or 6/8'],
  ])('refuses %j', (value, message) => {
    expect(refusal(songDetailsSchema, value)).toBe(message);
  });

  it.each(['G', 'Bb', 'F#m', 'Ebm', 'C'])('accepts the Key %s', (key) => {
    expect(songDetailsSchema.parse({ title: 'x', key }).key).toBe(key);
  });
});

describe('reviewed content', () => {
  const verse = { name: 'Verse', lines: [{ lyric: 'Amazing grace', chords: [{ chord: 'G', at: 0 }] }] };
  const chorus = { name: 'Chorus', lines: [{ lyric: 'How sweet', chords: [] }] };

  it('accepts Sections and an order that repeats one', () => {
    const content = { sections: [verse, chorus], order: ['Verse', 'Chorus', 'Verse'] };
    expect(chordSheetSchema.parse(content)).toEqual(content);
  });

  it('tidies spaces around Section names, in the sections and the order alike', () => {
    expect(chordSheetSchema.parse({ sections: [{ ...verse, name: ' Verse ' }], order: ['Verse '] })).toEqual({ sections: [verse], order: ['Verse'] });
  });

  it('drops fields it does not know, such as a review flag on a line', () => {
    const flagged = { sections: [{ ...verse, lines: [{ ...verse.lines[0], ambiguous: true }] }], order: ['Verse'] };
    expect(chordSheetSchema.parse(flagged)).toEqual({ sections: [verse], order: ['Verse'] });
  });

  it.each([
    ['an unnamed Section', { sections: [{ ...verse, name: '' }], order: [''] }, expect.stringMatching(/Every Section needs a name/)],
    ['two Sections with one name', { sections: [verse, verse], order: ['Verse'] }, 'Two Sections are named "Verse". Rename one, or merge them.'],
    ['an order naming a missing Section', { sections: [verse], order: ['Verse', 'Bridge'] }, 'The order names a Section that does not exist'],
    ['a Section left out of the order', { sections: [verse, chorus], order: ['Verse'] }, '"Chorus" is not in the order, so it would be lost. Add it.'],
    ['a chord that is not a chord', { sections: [{ ...verse, lines: [{ lyric: 'x', chords: [{ chord: 'H', at: 0 }] }] }], order: ['Verse'] }, 'A chord is not a chord'],
    ['a negative position', { sections: [{ ...verse, lines: [{ lyric: 'x', chords: [{ chord: 'G', at: -1 }] }] }], order: ['Verse'] }, 'A chord needs a position in the lyric'],
    ['a fractional position', { sections: [{ ...verse, lines: [{ lyric: 'x', chords: [{ chord: 'G', at: 1.5 }] }] }], order: ['Verse'] }, 'A chord needs a position in the lyric'],
    ['a lyric that is not text', { sections: [{ ...verse, lines: [{ lyric: 5, chords: [] }] }], order: ['Verse'] }, 'Each line needs a lyric'],
    ['sections that are not a list', { sections: 'Verse', order: [] }, expect.any(String)],
    ['content that is not an object', 'Verse', expect.any(String)],
  ])('refuses %s', (_name, content, message) => {
    expect(refusal(chordSheetSchema, content)).toEqual(message);
  });
});

describe('a Song as sent to the API', () => {
  const content = { sections: [{ name: 'Verse', lines: [{ lyric: 'Hi', chords: [] }] }], order: ['Verse'] };

  it('parses typed text into the stored form', () => {
    const song = createSongSchema.parse({ title: 'x', text: '[Verse]\nG\nHi' });
    expect(song.content).toEqual({ sections: [{ name: 'Verse', lines: [{ lyric: 'Hi', chords: [{ chord: 'G', at: 0 }] }] }], order: ['Verse'] });
  });

  it('takes structured content as it is, and an empty Song when neither is sent', () => {
    expect(createSongSchema.parse({ title: 'x', content }).content).toEqual(content);
    expect(createSongSchema.parse({ title: 'x' }).content).toEqual({ sections: [], order: [] });
  });

  it('refuses text and content together, since one would silently win', () => {
    expect(refusal(createSongSchema, { title: 'x', text: 'G\nhi', content })).toBe('Send either text or content, not both');
  });

  it('refuses an edit with neither, but allows empty text to clear the Song', () => {
    expect(refusal(replaceSongSchema, { title: 'x' })).toMatch(/Send the whole Song/);
    expect(replaceSongSchema.parse({ title: 'x', text: '' }).content).toEqual({ sections: [], order: [] });
  });

  it('needs some text to parse for review, and not too much', () => {
    expect(parseSongTextSchema.parse({ text: 'G\nhi' }).text).toBe('G\nhi');
    expect(refusal(parseSongTextSchema, {})).toBe('Paste the Song text');
    expect(refusal(parseSongTextSchema, { text: '   ' })).toBe('Paste the Song text');
    expect(refusal(parseSongTextSchema, { text: 5 })).toBe('Paste the Song text');
    expect(refusal(parseSongTextSchema, { text: 'x'.repeat(50_001) })).toBe('Text is too long');
  });
});
