'use client';

import { parseSongTextSchema } from '@chords/shared';
import { useMutation } from '@tanstack/react-query';
import { FormError } from '@/components/form/form-error';
import { formProps, useAppForm } from '@/components/form/form';
import { FieldGroup } from '@/components/ui/field';
import { apiPost } from '@/lib/api';
import type { Parsed } from '@/lib/songs/types';

/** Step one of an import: paste the Song as copied from Tabs. Nothing is saved; the next step is a review. */
export function PasteForm({ initialText, onParsed }: { initialText: string; onParsed: (text: string, parsed: Parsed) => void }) {
  const parse = useMutation({ mutationFn: (text: string) => apiPost<Parsed>('/songs/parse', { text }) });

  const form = useAppForm({
    defaultValues: { text: initialText },
    validators: { onChange: parseSongTextSchema, onSubmit: parseSongTextSchema },
    onSubmit: async ({ value }) => {
      const { text } = parseSongTextSchema.parse(value);
      const parsed = await parse.mutateAsync(text).catch(() => null);
      if (parsed) onParsed(text, parsed);
    },
  });

  return (
    <form {...formProps(form)}>
      <FieldGroup>
        <h1 className="text-xl font-medium">Import a song</h1>
        <form.AppField name="text">
          {(field) => (
            <field.TextareaField
              label="The song as copied from Tabs"
              rows={18}
              spellCheck={false}
              placeholder={'[Verse 1]\nG       C\nAmazing grace...'}
              className="font-mono whitespace-pre"
              description="You will check the Sections, title and Key before anything is saved."
            />
          )}
        </form.AppField>
        <FormError error={parse.error} />
        <form.AppForm>
          <form.SubmitButton pendingLabel="Reading…">Review</form.SubmitButton>
        </form.AppForm>
      </FieldGroup>
    </form>
  );
}
