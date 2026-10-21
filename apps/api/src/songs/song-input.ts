import { BadRequestException } from '@nestjs/common';
import { isChord, parseChordSheet, type ChordSheet, type SheetSection } from '../chord-sheet/index.js';

/** A Song's details and content once checked: what the service stores. */
export interface SongInput {
  title: string;
  artist: string;
  key: string | null;
  tempo: number | null;
  timeSignature: string | null;
  content: ChordSheet;
}

const KEY = /^[A-G][#b]?m?$/;
const TIME_SIGNATURE = /^\d{1,2}\/\d{1,2}$/;
const MAX_TEMPO = 400;
/** A long song is a few thousand characters; this stops a pasted file or a mistake with a clear message (Express itself refuses 100 KB). */
const MAX_TEXT = 50_000;

function text(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadRequestException(`${field} must be text`);
  if (value.length > MAX_TEXT) throw new BadRequestException(`${field} is too long`);
  return value;
}

/** The pasted text to turn into a draft Song. */
export function readPastedText(body: Record<string, unknown> | undefined): string {
  const pasted = text(body?.text, 'text');
  if (!pasted?.trim()) throw new BadRequestException('Paste the Song text');
  return pasted;
}

/** Reads an optional detail where blank or null means "none". */
function optional(value: unknown, field: string, valid: (value: string) => boolean, what: string): string | null {
  const given = text(value, field)?.trim();
  if (!given) return null;
  if (!valid(given)) throw new BadRequestException(`${field} must be ${what}`);
  return given;
}

const MAX_LINES = 5_000;
const MAX_LYRIC = 1_000;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks content that arrives already structured (a reviewed import), since nothing but the shape guards it:
 * every Section is named once, the order only names Sections that exist, and none is left out of the order.
 */
function readContent(value: unknown): ChordSheet {
  const bad = (message: string) => new BadRequestException(`content: ${message}`);
  if (!isObject(value) || !Array.isArray(value.sections) || !Array.isArray(value.order)) {
    throw bad('needs sections and order lists');
  }
  let lineCount = 0;
  const sections = value.sections.map((raw: unknown): SheetSection => {
    if (!isObject(raw) || typeof raw.name !== 'string' || !Array.isArray(raw.lines)) throw bad('each Section needs a name and lines');
    if (raw.name === '' || raw.name !== raw.name.trim()) throw bad('every Section needs a name, without spaces around it');
    lineCount += raw.lines.length;
    if (lineCount > MAX_LINES) throw bad('too many lines');
    const lines = raw.lines.map((line: unknown) => {
      if (!isObject(line) || typeof line.lyric !== 'string' || !Array.isArray(line.chords)) throw bad('each line needs a lyric and chords');
      if (line.lyric.length > MAX_LYRIC) throw bad('a lyric line is too long');
      const chords = line.chords.map((placed: unknown) => {
        if (!isObject(placed) || typeof placed.chord !== 'string' || !isChord(placed.chord)) throw bad('a chord is not a chord');
        if (typeof placed.at !== 'number' || !Number.isInteger(placed.at) || placed.at < 0 || placed.at > MAX_LYRIC) {
          throw bad('a chord needs a position in the lyric');
        }
        return { chord: placed.chord, at: placed.at };
      });
      return { lyric: line.lyric, chords };
    });
    return { name: raw.name, lines };
  });

  const names = new Set(sections.map((section) => section.name));
  if (names.size !== sections.length) throw bad('two Sections share a name');
  const order = value.order.map((name: unknown) => {
    if (typeof name !== 'string' || !names.has(name)) throw bad('the order names a Section that does not exist');
    return name;
  });
  if ([...names].some((name) => !order.includes(name))) throw bad('every Section must appear in the order');
  return { sections, order };
}

export function readSongInput(body: Record<string, unknown> | undefined): SongInput {
  const input = body ?? {};
  const title = text(input.title, 'title')?.trim();
  if (!title) throw new BadRequestException('A Song needs a title');

  let tempo: number | null = null;
  if (input.tempo !== undefined && input.tempo !== null) {
    if (typeof input.tempo !== 'number' || !Number.isInteger(input.tempo) || input.tempo < 1 || input.tempo > MAX_TEMPO) {
      throw new BadRequestException(`tempo must be a whole number from 1 to ${MAX_TEMPO}`);
    }
    tempo = input.tempo;
  }

  return {
    title,
    artist: text(input.artist, 'artist')?.trim() ?? '',
    key: optional(input.key, 'key', (key) => KEY.test(key), 'a Key such as G, Bb or F#m'),
    tempo,
    timeSignature: optional(input.timeSignature, 'timeSignature', (value) => TIME_SIGNATURE.test(value), 'like 4/4 or 6/8'),
    content: readBody(input),
  };
}

/** A Song's content comes either as text to parse (typing) or already structured (a reviewed import), never both. */
function readBody(input: Record<string, unknown>): ChordSheet {
  const typed = text(input.text, 'text');
  if (input.content !== undefined && input.content !== null) {
    if (typed !== undefined) throw new BadRequestException('Send either text or content, not both');
    return readContent(input.content);
  }
  return parseChordSheet(typed ?? '');
}
