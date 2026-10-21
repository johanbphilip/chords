import { z } from 'zod';
import { isChord } from '../chord-sheet/chord';
import { parseChordSheet } from '../chord-sheet/parse';
import type { ChordSheet } from '../chord-sheet/types';

export const KEY_PATTERN = /^[A-G][#b]?m?$/;
export const TIME_SIGNATURE_PATTERN = /^\d{1,2}\/\d{1,2}$/;
export const TEMPO_MIN = 1;
export const TEMPO_MAX = 400;
/** A long song is a few thousand characters; these stop a pasted file or a mistake with a clear message. */
export const MAX_TEXT_LENGTH = 50_000;
export const MAX_LINES = 5_000;
export const MAX_LYRIC_LENGTH = 1_000;

/** Blank means "none": a form leaves a detail empty, a client leaves it out, and nothing is stored. */
const blankToNull = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '') ? null : value;

const KEY_MESSAGE = 'Key must be a Key such as G, Bb or F#m';
const TEMPO_MESSAGE = `Tempo must be a whole number from ${TEMPO_MIN} to ${TEMPO_MAX}`;
const TIME_SIGNATURE_MESSAGE = 'Time signature must be like 4/4 or 6/8';
const TITLE_MESSAGE = 'A Song needs a title';

export const titleSchema = z.string(TITLE_MESSAGE).trim().min(1, TITLE_MESSAGE);
export const artistSchema = z.preprocess((value) => value ?? undefined, z.string('Artist must be text').trim().default(''));
export const keySchema = z.preprocess(blankToNull, z.string(KEY_MESSAGE).trim().regex(KEY_PATTERN, KEY_MESSAGE).nullable());
export const timeSignatureSchema = z.preprocess(
  blankToNull,
  z.string(TIME_SIGNATURE_MESSAGE).trim().regex(TIME_SIGNATURE_PATTERN, TIME_SIGNATURE_MESSAGE).nullable(),
);
/** A number, or the digits of one as typed into a form. Anything else is refused, never quietly dropped. */
export const tempoSchema = z.preprocess(
  (value) => {
    const given = blankToNull(value);
    return typeof given === 'string' && /^\d+$/.test(given.trim()) ? Number(given) : given;
  },
  z.number(TEMPO_MESSAGE).int(TEMPO_MESSAGE).min(TEMPO_MIN, TEMPO_MESSAGE).max(TEMPO_MAX, TEMPO_MESSAGE).nullable(),
);

/** A Song's details. Works on what a form holds (strings) and on what the API receives (numbers, nulls). */
export const songDetailsSchema = z.object({
  title: titleSchema,
  artist: artistSchema,
  key: keySchema,
  tempo: tempoSchema,
  timeSignature: timeSignatureSchema,
});

const UNNAMED_MESSAGE = 'Every Section needs a name. Name the unplaced text, or merge it into a Section.';

const placedChordSchema = z.object({
  chord: z.string('A chord is not a chord').refine(isChord, 'A chord is not a chord'),
  at: z
    .number('A chord needs a position in the lyric')
    .int('A chord needs a position in the lyric')
    .min(0, 'A chord needs a position in the lyric')
    .max(MAX_LYRIC_LENGTH, 'A chord needs a position in the lyric'),
});

const sheetLineSchema = z.object({
  lyric: z.string('Each line needs a lyric').max(MAX_LYRIC_LENGTH, 'A lyric line is too long'),
  chords: z.array(placedChordSchema),
});

const sheetSectionSchema = z.object({
  name: z.string(UNNAMED_MESSAGE).trim().min(1, UNNAMED_MESSAGE),
  lines: z.array(sheetLineSchema),
});

/**
 * A Song's content once it is structured (a reviewed import): every Section is named once, the order only
 * names Sections that exist, and none is left out of the order, since an unlisted Section would be lost.
 */
export const chordSheetSchema = z
  .object({ sections: z.array(sheetSectionSchema), order: z.array(z.string().trim()) })
  .superRefine((sheet, context) => {
    const issue = (message: string) => context.addIssue({ code: 'custom', message });
    if (sheet.sections.reduce((count, section) => count + section.lines.length, 0) > MAX_LINES) issue('Too many lines');
    const names = sheet.sections.map((section) => section.name);
    for (const name of new Set(names.filter((name, i) => names.indexOf(name) !== i))) {
      issue(`Two Sections are named "${name}". Rename one, or merge them.`);
    }
    if (sheet.order.some((name) => !names.includes(name))) issue('The order names a Section that does not exist');
    for (const name of new Set(names)) {
      if (!sheet.order.includes(name)) issue(`"${name}" is not in the order, so it would be lost. Add it.`);
    }
  }) satisfies z.ZodType<ChordSheet, unknown>;

/** Details plus content: typed `text` to parse, or `content` already structured, never both. */
const songBodySchema = songDetailsSchema
  .extend({
    text: z.string('Text must be text').max(MAX_TEXT_LENGTH, 'Text is too long').nullish(),
    content: chordSheetSchema.nullish(),
  })
  .refine((body) => body.text == null || body.content == null, 'Send either text or content, not both');

export interface SongInput {
  title: string;
  artist: string;
  key: string | null;
  tempo: number | null;
  timeSignature: string | null;
  content: ChordSheet;
}

function toSongInput({ text, content, ...details }: z.output<typeof songBodySchema>): SongInput {
  return { ...details, content: content ?? parseChordSheet(text ?? '') };
}

export const createSongSchema = songBodySchema.transform(toSongInput);

/** An edit replaces the whole Song, so leaving out both `text` and `content` would silently erase it. An empty `text` clears it on purpose. */
export const replaceSongSchema = songBodySchema
  .refine((body) => body.text != null || body.content != null, 'Send the whole Song: its text (or content) as well as its details')
  .transform(toSongInput);

export const parseSongTextSchema = z.object({
  text: z
    .string('Paste the Song text')
    .max(MAX_TEXT_LENGTH, 'Text is too long')
    .refine((text) => text.trim() !== '', 'Paste the Song text'),
});
