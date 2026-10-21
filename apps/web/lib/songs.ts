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

/** A Song's details as form values, for editing. */
export const songToForm = (song: Song): SongForm => ({
  title: song.title,
  artist: song.artist,
  key: song.key ?? '',
  tempo: song.tempo === null ? '' : String(song.tempo),
  timeSignature: song.timeSignature ?? '',
  text: song.text,
});
