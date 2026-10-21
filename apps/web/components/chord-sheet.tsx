import { layoutLine } from '@/lib/chord-layout';
import type { ChordSheet as ChordSheetContent, SheetLine } from '@/lib/songs';

export function ChordLine({ line }: { line: SheetLine }) {
  if (line.lyric === '' && line.chords.length === 0) return <div className="h-4" />;
  return (
    <div className="leading-tight">
      {layoutLine(line).map((word, w) => (
        <span key={w} className="inline-flex align-bottom whitespace-pre">
          {word.map((piece, p) => (
            <span key={p} className="inline-flex flex-col">
              <span className="min-h-[1.25em] pr-[0.4em] font-semibold text-primary">{piece.chord ?? ' '}</span>
              <span>{piece.text === '' ? ' ' : piece.text}</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

/** A Song's Sections in their original order, with each chord over the syllable it belongs to. */
export function ChordSheet({ content }: { content: ChordSheetContent }) {
  const byName = new Map(content.sections.map((section) => [section.name, section]));
  return (
    <div className="flex flex-col gap-6">
      {content.order.map((name, i) => (
        <section key={i} className="flex flex-col gap-1">
          {name && <h2 className="text-sm font-medium text-muted-foreground">{name}</h2>}
          {byName.get(name)?.lines.map((line, l) => <ChordLine key={l} line={line} />)}
        </section>
      ))}
    </div>
  );
}
