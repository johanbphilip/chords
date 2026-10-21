'use client';

import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SongForm as SongFormValues } from '@/lib/songs';

const PLACEHOLDER = '[Verse 1]\nG       C\nAmazing grace, how sweet\n\n[Chorus]\nD\nHow sweet the sound';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}

/** Details plus the chords-over-lyrics text. Shared by creating a Song and, later, editing one. */
export function SongForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  pending,
  children,
}: {
  value: SongFormValues;
  onChange: (value: SongFormValues) => void;
  onSubmit: () => void;
  submitLabel: string;
  pending: boolean;
  children?: ReactNode;
}) {
  const set = (field: keyof SongFormValues) => (event: { target: { value: string } }) =>
    onChange({ ...value, [field]: event.target.value });

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Title">
        <Input value={value.title} onChange={set('title')} required />
      </Field>
      <Field label="Artist (optional)">
        <Input value={value.artist} onChange={set('artist')} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Key">
          <Input value={value.key} onChange={set('key')} placeholder="G" />
        </Field>
        <Field label="Tempo">
          <Input value={value.tempo} onChange={set('tempo')} inputMode="numeric" placeholder="72" />
        </Field>
        <Field label="Time">
          <Input value={value.timeSignature} onChange={set('timeSignature')} placeholder="4/4" />
        </Field>
      </div>
      <Field label="Chords and lyrics">
        <textarea
          value={value.text}
          onChange={set('text')}
          placeholder={PLACEHOLDER}
          rows={16}
          spellCheck={false}
          className="w-full rounded-lg border border-input bg-transparent p-2.5 font-mono text-sm whitespace-pre outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <span className="text-xs text-muted-foreground">
          Put each chord line directly above its lyric line, and start a Section with a header like [Chorus].
        </span>
      </Field>
      {children}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
