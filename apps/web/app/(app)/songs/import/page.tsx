'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChordLine } from '@/components/chord-sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, apiPost, apiPut } from '@/lib/api';
import {
  addOrderEntry,
  mergeSection,
  problems,
  removeOrderEntry,
  renameSection,
  setOrderEntry,
  splitSection,
  startReview,
  toContent,
  treatAsLyric,
  type Draft,
} from '@/lib/review';
import { songLabel, type Parsed, type SimilarSong } from '@/lib/songs';

interface Saved {
  id: string;
  similar: SimilarSong[];
}

export default function ImportPage() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);

  const parse = useMutation({
    mutationFn: () => apiPost<Parsed>('/songs/parse', { text }),
    onSuccess: setParsed,
  });

  if (parsed) return <Review parsed={parsed} onBack={() => setParsed(null)} />;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        parse.mutate();
      }}
    >
      <h1 className="text-xl font-medium">Import a song</h1>
      <p className="text-sm text-muted-foreground">
        Paste the song as copied from Tabs. You will check the Sections, title and Key before anything is saved.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={18}
        spellCheck={false}
        placeholder={'[Verse 1]\nG       C\nAmazing grace...'}
        className="w-full rounded-lg border border-input bg-transparent p-2.5 font-mono text-sm whitespace-pre outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
      {parse.error && (
        <p role="alert" className="text-sm text-destructive">
          {parse.error.message}
        </p>
      )}
      <Button type="submit" disabled={parse.isPending || text.trim() === ''}>
        {parse.isPending ? 'Reading…' : 'Review'}
      </Button>
    </form>
  );
}

function Review({ parsed, onBack }: { parsed: Parsed; onBack: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => startReview(parsed.content, parsed.ambiguousLines));
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState(parsed.suggestedKey ?? '');
  const [saved, setSaved] = useState<Saved | null>(null);

  const body = () => ({ title, artist, key, content: toContent(draft) });
  const done = async (song: Saved) => {
    await queryClient.invalidateQueries({ queryKey: ['songs'] });
    await queryClient.invalidateQueries({ queryKey: ['song', song.id] });
    // A same-title Song by someone else is allowed, so say so before moving on.
    if (song.similar.length === 0) router.push(`/songs/${song.id}`);
    else setSaved(song);
  };
  const save = useMutation({ mutationFn: () => apiPost<Saved>('/songs', body()), onSuccess: done });
  const existingId =
    save.error instanceof ApiError && save.error.status === 409 && typeof save.error.payload?.existingId === 'string'
      ? save.error.payload.existingId
      : null;
  const writeOver = useMutation({ mutationFn: () => apiPut<Saved>(`/songs/${existingId}`, body()), onSuccess: done });

  if (saved) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-medium">Saved</h1>
        <p role="status">
          Saved. Other Songs have this title, so check this is not a copy of one of them: {saved.similar.map(songLabel).join('; ')}.
        </p>
        <Link href={`/songs/${saved.id}`} className={buttonVariants()}>
          Open the Song
        </Link>
      </div>
    );
  }

  const issues = problems(draft);
  const nameOf = (sectionKey: number) => draft.sections.find((s) => s.key === sectionKey)?.name.trim() || 'Unnamed';

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex items-center">
        <h1 className="text-xl font-medium">Review the import</h1>
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onBack}>
          Back to the text
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Artist (optional)
            <Input value={artist} onChange={(event) => setArtist(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Key
            <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="G" />
          </label>
        </div>
        {parsed.suggestedKey && (
          <p className="text-xs text-muted-foreground">The Key is suggested from the first chord ({parsed.suggestedKey}). Change it if it is wrong.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Order</h2>
        <p className="text-xs text-muted-foreground">The Sections as the song is sung. A Section sung twice appears twice.</p>
        <ol className="flex flex-col gap-1">
          {draft.order.map((sectionKey, index) => (
            <li key={index} className="flex items-center gap-2">
              <select
                value={sectionKey}
                onChange={(event) => setDraft(setOrderEntry(draft, index, Number(event.target.value)))}
                className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
              >
                {draft.sections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {nameOf(section.key)}
                  </option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(removeOrderEntry(draft, index))}>
                Remove
              </Button>
            </li>
          ))}
        </ol>
        <select
          value=""
          onChange={(event) => event.target.value && setDraft(addOrderEntry(draft, Number(event.target.value)))}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        >
          <option value="">Add a Section to the order…</option>
          {draft.sections.map((section) => (
            <option key={section.key} value={section.key}>
              {nameOf(section.key)}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Sections</h2>
        {draft.sections.map((section, index) => (
          <Card key={section.key} size="sm" className={section.name.trim() === '' ? 'ring-2 ring-destructive' : undefined}>
            <CardHeader className="gap-2">
              <Input
                value={section.name}
                onChange={(event) => setDraft(renameSection(draft, section.key, event.target.value))}
                placeholder={section.name === '' ? 'Name this Section' : undefined}
                aria-label="Section name"
              />
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="xs" disabled={index === 0} onClick={() => setDraft(mergeSection(draft, section.key, 'previous'))}>
                  Merge into the Section before
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={index === draft.sections.length - 1}
                  onClick={() => setDraft(mergeSection(draft, section.key, 'next'))}
                >
                  Merge into the next
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {section.lines.map((line, lineIndex) => (
                <div key={lineIndex} className="flex flex-col gap-1">
                  {lineIndex > 0 && (
                    <button
                      type="button"
                      className="self-start text-xs text-muted-foreground underline"
                      onClick={() => setDraft(splitSection(draft, section.key, lineIndex))}
                    >
                      Split the Section here
                    </button>
                  )}
                  <ChordLine line={line} />
                  {line.ambiguous && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground" role="note">
                      This may be a word, not a chord.
                      <button type="button" className="underline" onClick={() => setDraft(treatAsLyric(draft, section.key, lineIndex))}>
                        Treat it as lyrics
                      </button>
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      {issues.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      {save.error && (
        <div role="alert" className="flex flex-col gap-2 text-sm">
          <p className="text-destructive">{save.error.message}</p>
          {existingId && (
            <div className="flex gap-2">
              <Link href={`/songs/${existingId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Open the existing Song
              </Link>
              <Button type="button" size="sm" disabled={writeOver.isPending || issues.length > 0} onClick={() => writeOver.mutate()}>
                {writeOver.isPending ? 'Writing over…' : 'Write over it'}
              </Button>
            </div>
          )}
        </div>
      )}
      {writeOver.error && (
        <p role="alert" className="text-sm text-destructive">
          {writeOver.error.message}
        </p>
      )}
      <Button type="submit" disabled={save.isPending || issues.length > 0 || title.trim() === ''}>
        {save.isPending ? 'Saving…' : 'Save song'}
      </Button>
    </form>
  );
}
