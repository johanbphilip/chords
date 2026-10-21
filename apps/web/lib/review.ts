import type { ChordSheet, PlacedChord, SheetLine } from '@chords/shared';

/** A line in review, flagged when the parser read it as chords but it may be words. */
export interface ReviewLine extends SheetLine {
  ambiguous?: boolean;
}

/**
 * Sections get a stable `key` while being reviewed, so a name can be empty or clash for a moment while it is
 * typed. `order` lists keys, with a Section repeated wherever the Song repeats it.
 */
export interface ReviewSection {
  key: number;
  name: string;
  lines: ReviewLine[];
}

export interface Draft {
  sections: ReviewSection[];
  order: number[];
}

export function startReview(content: ChordSheet, ambiguous: { section: string; line: number }[]): Draft {
  const keyOf = new Map(content.sections.map((section, key) => [section.name, key]));
  return {
    sections: content.sections.map((section, key) => ({
      key,
      name: section.name,
      lines: section.lines.map((line, index) => ({
        ...line,
        ambiguous: ambiguous.some((flag) => flag.section === section.name && flag.line === index) || undefined,
      })),
    })),
    order: content.order.map((name) => keyOf.get(name)!),
  };
}

/** The stored form the API validates: names instead of keys, and no review flags. */
export function toContent(draft: Draft): ChordSheet {
  const name = (key: number) => draft.sections.find((section) => section.key === key)!.name.trim();
  return {
    sections: draft.sections.map((section) => ({
      name: section.name.trim(),
      lines: section.lines.map(({ lyric, chords }) => ({ lyric, chords })),
    })),
    order: draft.order.map(name),
  };
}

/** Why the draft cannot be saved yet, in words for the Member. Empty when it can. */
export function problems(draft: Draft): string[] {
  const found: string[] = [];
  const names = draft.sections.map((section) => section.name.trim());
  if (names.includes('')) found.push('Every Section needs a name. Name the unplaced text, or merge it into a Section.');
  for (const name of new Set(names.filter((name, i) => name !== '' && names.indexOf(name) !== i))) {
    found.push(`Two Sections are named "${name}". Rename one, or merge them.`);
  }
  for (const section of draft.sections) {
    if (!draft.order.includes(section.key)) found.push(`"${section.name.trim() || 'Unnamed'}" is not in the order, so it would be lost. Add it.`);
  }
  return found;
}

export const renameSection = (draft: Draft, key: number, name: string): Draft => ({
  ...draft,
  sections: draft.sections.map((section) => (section.key === key ? { ...section, name } : section)),
});

/** Lines from `at` onward become a new unnamed Section straight after, wherever the Song repeats the original. */
export function splitSection(draft: Draft, key: number, at: number): Draft {
  const index = draft.sections.findIndex((section) => section.key === key);
  const section = draft.sections[index]!;
  if (at <= 0 || at >= section.lines.length) return draft;
  const newKey = Math.max(...draft.sections.map((s) => s.key)) + 1;
  const sections = [...draft.sections];
  sections.splice(index, 1, { ...section, lines: section.lines.slice(0, at) }, { key: newKey, name: '', lines: section.lines.slice(at) });
  return { sections, order: draft.order.flatMap((k) => (k === key ? [key, newKey] : [k])) };
}

const collapseRepeats = (order: number[]) => order.filter((key, i) => key !== order[i - 1]);

/** Joins a Section onto its neighbour. The neighbour keeps its name, and the order follows the move. */
export function mergeSection(draft: Draft, key: number, into: 'previous' | 'next'): Draft {
  const index = draft.sections.findIndex((section) => section.key === key);
  const target = draft.sections[into === 'previous' ? index - 1 : index + 1];
  if (!target) return draft;
  const section = draft.sections[index]!;
  const lines = into === 'previous' ? [...target.lines, ...section.lines] : [...section.lines, ...target.lines];
  return {
    sections: draft.sections.filter((s) => s.key !== key).map((s) => (s.key === target.key ? { ...s, lines } : s)),
    order: collapseRepeats(draft.order.map((k) => (k === key ? target.key : k))),
  };
}

function chordRow(chords: PlacedChord[]): string {
  let row = '';
  for (const { chord, at } of [...chords].sort((a, b) => a.at - b.at)) row = row.padEnd(Math.max(at, row === '' ? 0 : row.length + 1)) + chord;
  return row;
}

/** Turns a line the parser read as chords back into words, keeping any lyric that sat under it as its own line. */
export function treatAsLyric(draft: Draft, key: number, lineIndex: number): Draft {
  return {
    ...draft,
    sections: draft.sections.map((section) => {
      if (section.key !== key) return section;
      const line = section.lines[lineIndex]!;
      const words: ReviewLine[] = [{ lyric: chordRow(line.chords), chords: [] }];
      if (line.lyric !== '') words.push({ lyric: line.lyric, chords: [] });
      return { ...section, lines: section.lines.flatMap((l, i) => (i === lineIndex ? words : [l])) };
    }),
  };
}

export const setOrderEntry = (draft: Draft, index: number, key: number): Draft => ({
  ...draft,
  order: draft.order.map((k, i) => (i === index ? key : k)),
});
export const removeOrderEntry = (draft: Draft, index: number): Draft => ({
  ...draft,
  order: draft.order.filter((_, i) => i !== index),
});
export const addOrderEntry = (draft: Draft, key: number): Draft => ({ ...draft, order: [...draft.order, key] });
