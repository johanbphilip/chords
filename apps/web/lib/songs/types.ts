import type { ChordSheet } from '@chords/shared';

export interface SongSummary {
  id: string;
  title: string;
  artist: string;
  key: string | null;
}

export interface Song extends SongSummary {
  tempo: number | null;
  timeSignature: string | null;
  content: ChordSheet;
  /** The chords-over-lyrics text to edit, in the Song's original order. */
  text: string;
}

/** What `POST /songs/parse` returns for pasted or typed text. Nothing is saved. */
export interface Parsed {
  content: ChordSheet;
  suggestedKey: string | null;
  unnamedSection: boolean;
  ambiguousLines: { section: string; line: number }[];
}

/** Other Songs sharing a title, returned with a saved Song so the Member can be told. */
export interface SimilarSong {
  id: string;
  title: string;
  artist: string;
}

/** A Song as the API returns it right after a save, with any other Songs sharing its title. */
export interface Saved {
  id: string;
  similar: SimilarSong[];
}

export const songLabel = ({ title, artist }: { title: string; artist: string }) => (artist ? `${title} · ${artist}` : title);
