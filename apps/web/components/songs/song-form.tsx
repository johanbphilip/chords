'use client';

import type { ReactNode } from 'react';
import { settled, formProps, useAppForm, zodValidators } from '@/components/form/form';
import { FieldGroup } from '@/components/ui/field';
import { songFormSchema, type SongBody, type SongFormValues } from '@/lib/songs/form';
import { SheetPreview } from './sheet-preview';

const PLACEHOLDER =
  '[Verse 1]\nG       C\nAmazing grace, how sweet\n\n[Chorus]\nD\nHow sweet the sound';

/**
 * A Song's details and its chords-over-lyrics text, with a live preview. Used for a new Song and for editing one.
 * `onSave` receives the values already read by the schema (blank details are null, the tempo is a number).
 */
export function SongForm({
  initial,
  onSave,
  submitLabel,
  children,
}: {
  initial: SongFormValues;
  onSave: (body: SongBody) => Promise<unknown>;
  submitLabel: string;
  /** Anything that belongs just above the submit button, such as a hint or what went wrong when saving. */
  children?: ReactNode;
}) {
  const form = useAppForm({
    defaultValues: initial,
    validators: zodValidators<SongFormValues>(songFormSchema),
    onSubmit: ({ value }) => settled(onSave(songFormSchema.parse(value))),
  });

  return (
    <form {...formProps(form)}>
      <FieldGroup>
        <form.AppField name="title">{(field) => <field.TextField label="Title" />}</form.AppField>
        <form.AppField name="artist">
          {(field) => <field.TextField label="Artist (optional)" />}
        </form.AppField>
        <div className="grid grid-cols-3 gap-3">
          <form.AppField name="key">
            {(field) => <field.TextField label="Key" placeholder="G" />}
          </form.AppField>
          <form.AppField name="tempo">
            {(field) => <field.TextField label="Tempo" inputMode="numeric" placeholder="72" />}
          </form.AppField>
          <form.AppField name="timeSignature">
            {(field) => <field.TextField label="Time" placeholder="4/4" />}
          </form.AppField>
        </div>
        <form.AppField name="text">
          {(field) => (
            <field.TextareaField
              label="Chords and lyrics"
              rows={16}
              spellCheck={false}
              placeholder={PLACEHOLDER}
              className="font-mono whitespace-pre"
              description="Put each chord line directly above its lyric line, and start a Section with a header like [Chorus]."
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.text}>
          {(text) => <SheetPreview text={text} />}
        </form.Subscribe>
        {children}
        <form.AppForm>
          <form.SubmitButton pendingLabel="Saving…">{submitLabel}</form.SubmitButton>
        </form.AppForm>
      </FieldGroup>
    </form>
  );
}
