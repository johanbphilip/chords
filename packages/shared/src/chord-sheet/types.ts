/** A chord attached to a lyric position (a character offset; may sit past the end of the lyric). */
export interface PlacedChord {
  chord: string;
  at: number;
}

export interface SheetLine {
  lyric: string;
  chords: PlacedChord[];
}

export interface SheetSection {
  /** Empty for text that appears before any header. */
  name: string;
  lines: SheetLine[];
}

/**
 * A Song's content. `sections` holds each Section once, under a unique name; `order` is the original order
 * as Section names, so a Section sung twice appears twice in `order` but is stored (and edited) once.
 */
export interface ChordSheet {
  sections: SheetSection[];
  order: string[];
}
