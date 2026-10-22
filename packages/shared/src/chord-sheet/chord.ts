const CHORD =
  /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|\+|-|°|ø|\d+|[#b]\d+|\([^)\s]*\))*(?:\/[A-G][#b]?)?$/;

export const isChord = (text: string): boolean => CHORD.test(text);

/** A chord or Key's root note: a letter and an optional sharp or flat. */
export const NOTE = /^([A-G])([#b]?)/;

/** Whether what follows a root (the "m" in "Am7", not the "maj" in "Cmaj7") makes a chord or Key minor. */
export const isMinorSuffix = (suffix: string): boolean =>
  suffix.startsWith('m') && !suffix.startsWith('maj');
