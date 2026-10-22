import { chordSheetSchema, songDetailsSchema } from '@chords/shared';
import { z } from 'zod';
import { toContent, type Draft } from './review';

const reviewLineSchema = z.object({
  lyric: z.string(),
  chords: z.array(z.object({ chord: z.string(), at: z.number() })),
  ambiguous: z.boolean().optional(),
});

const reviewDetailsSchema = songDetailsSchema.pick({ title: true, artist: true, key: true });

/**
 * What is wrong with the draft Sections and order (an unnamed Section, two with one name, one left out of the
 * order), in words, judged by the same schema the API applies when the reviewed Song is saved.
 */
export function reviewProblems(draft: Draft): string[] {
  const content = chordSheetSchema.safeParse(toContent(draft));
  return content.success ? [] : [...new Set(content.error.issues.map((issue) => issue.message))];
}

/** The import review form: the Song's details and the draft Sections and order being edited. */
export const reviewFormSchema = reviewDetailsSchema
  .extend({
    sections: z.array(
      z.object({ key: z.number(), name: z.string(), lines: z.array(reviewLineSchema) }),
    ),
    order: z.array(z.number()),
  })
  .superRefine((values, context) => {
    for (const message of reviewProblems(values))
      context.addIssue({ code: 'custom', message, path: ['sections'] });
  });

export interface ReviewValues extends Draft {
  title: string;
  artist: string;
  key: string;
}

/** What the API receives for a reviewed import: the details, and the Sections and order exactly as reviewed. */
export function reviewBody(values: ReviewValues) {
  return { ...reviewDetailsSchema.parse(values), content: toContent(values) };
}
