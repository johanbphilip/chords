import { BadRequestException } from '@nestjs/common';
import { parseChordSheet, type ChordSheet } from '../chord-sheet/index.js';

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

function text(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadRequestException(`${field} must be text`);
  return value;
}

/** Reads an optional detail where blank or null means "none". */
function optional(value: unknown, field: string, valid: (value: string) => boolean, what: string): string | null {
  const given = text(value, field)?.trim();
  if (!given) return null;
  if (!valid(given)) throw new BadRequestException(`${field} must be ${what}`);
  return given;
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
    content: parseChordSheet(text(input.text, 'text') ?? ''),
  };
}
