import { MAX_TEXT_LENGTH, songDetailsSchema } from '@chords/shared';
import { z } from 'zod';
import type { Song } from './types';

/** The Song form's rules: the shared details rules, plus the chords-over-lyrics text. */
export const songFormSchema = songDetailsSchema.extend({
  text: z.string().max(MAX_TEXT_LENGTH, 'Text is too long'),
});

/** What the form holds: every field as typed, so a tempo is still text here. */
export interface SongFormValues {
  title: string;
  artist: string;
  key: string;
  tempo: string;
  timeSignature: string;
  text: string;
}

/** What the API receives once the schema has read the form: blank details are null and the tempo is a number. */
export type SongBody = z.output<typeof songFormSchema>;

export const emptySongForm: SongFormValues = {
  title: '',
  artist: '',
  key: '',
  tempo: '',
  timeSignature: '',
  text: '',
};

export const songToForm = (song: Song): SongFormValues => ({
  title: song.title,
  artist: song.artist,
  key: song.key ?? '',
  tempo: song.tempo === null ? '' : String(song.tempo),
  timeSignature: song.timeSignature ?? '',
  text: song.text,
});
