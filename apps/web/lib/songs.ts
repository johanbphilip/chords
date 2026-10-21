export interface PlacedChord {
  chord: string;
  at: number;
}

export interface SheetLine {
  lyric: string;
  chords: PlacedChord[];
}

export interface SheetSection {
  name: string;
  lines: SheetLine[];
}

/** A Song's stored content: each Section once, plus the original order as Section names. */
export interface ChordSheet {
  sections: SheetSection[];
  order: string[];
}

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
}

/** Other Songs sharing a title, returned with a saved Song so the Member can be told. */
export interface SimilarSong {
  id: string;
  title: string;
  artist: string;
}

/** What the Song form sends: details as typed, and the chords-over-lyrics text. */
export interface SongForm {
  title: string;
  artist: string;
  key: string;
  tempo: string;
  timeSignature: string;
  text: string;
}

export const emptySongForm: SongForm = { title: '', artist: '', key: '', tempo: '', timeSignature: '', text: '' };

/** The API's request body for a form: blank details become none and tempo becomes a number. */
export function songBody(form: SongForm) {
  return {
    title: form.title,
    artist: form.artist,
    key: form.key,
    tempo: form.tempo.trim() === '' ? null : Number(form.tempo),
    timeSignature: form.timeSignature,
    text: form.text,
  };
}

export const songLabel = ({ title, artist }: { title: string; artist: string }) => (artist ? `${title} · ${artist}` : title);
