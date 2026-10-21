import type { SheetLine } from './songs';

/** A stretch of lyric with the chord that sits over its first letter, if any. */
export interface Piece {
  chord?: string;
  text: string;
}

/** Pieces that must stay together on one row: a word, split wherever a chord falls inside it. */
export type Word = Piece[];

/**
 * Breaks a line into words so the line can wrap on a narrow screen without moving a chord off its syllable.
 * Wrapping is allowed only after a space, never inside a word that has a chord in the middle of it.
 */
export function layoutLine({ lyric, chords }: SheetLine): Word[] {
  const sorted = [...chords].sort((a, b) => a.at - b.at);
  const pieces: Piece[] = [];
  const firstAt = sorted[0]?.at ?? lyric.length;
  if (firstAt > 0) pieces.push({ text: lyric.slice(0, firstAt) });
  sorted.forEach(({ chord, at }, i) => {
    const end = sorted[i + 1]?.at ?? lyric.length;
    pieces.push({ chord, text: lyric.slice(at, Math.max(at, end)) });
  });

  const words: Word[] = [];
  let current: Word = [];
  for (const piece of pieces) {
    const tokens = piece.text.match(/\S+\s*|\s+/g) ?? [''];
    tokens.forEach((text, i) => {
      current.push({ chord: i === 0 ? piece.chord : undefined, text });
      if (/\s$/.test(text)) {
        words.push(current);
        current = [];
      }
    });
  }
  if (current.length > 0) words.push(current);
  return words;
}
