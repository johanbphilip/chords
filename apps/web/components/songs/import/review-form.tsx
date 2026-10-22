'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form/form-error';
import { settled, formProps, useAppForm, zodValidators } from '@/components/form/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiPost, apiPut, existingSongId } from '@/lib/api';
import {
  reviewBody,
  reviewFormSchema,
  reviewProblems,
  type ReviewValues,
} from '@/lib/songs/import-form';
import {
  addOrderEntry,
  mergeSection,
  removeOrderEntry,
  splitSection,
  startReview,
  treatAsLyric,
  type Draft,
} from '@/lib/songs/review';
import type { Parsed, Saved } from '@/lib/songs/types';
import { ChordLine } from '../chord-sheet';
import { SavedNotice } from '../saved-notice';

type ReviewBody = ReturnType<typeof reviewBody>;

/**
 * Step two of an import: the parsed Song to check and fix before it is saved. Rename, split and merge Sections,
 * edit the order, and fill in the details. What is wrong is reported by the same schema the API applies on save.
 */
export function ReviewForm({ parsed, onBack }: { parsed: Parsed; onBack: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<Saved | null>(null);

  const finish = async (song: Saved) => {
    await queryClient.invalidateQueries({ queryKey: ['songs'] });
    await queryClient.invalidateQueries({ queryKey: ['song', song.id] });
    // A same-title Song by someone else is allowed, so say so before moving on.
    if (song.similar.length === 0) router.push(`/songs/${song.id}`);
    else setSaved(song);
  };
  const save = useMutation({
    mutationFn: (body: ReviewBody) => apiPost<Saved>('/songs', body),
    onSuccess: finish,
  });
  const writeOver = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReviewBody }) =>
      apiPut<Saved>(`/songs/${id}`, body),
    onSuccess: finish,
  });

  const [defaults] = useState<ReviewValues>(() => ({
    title: '',
    artist: '',
    key: parsed.suggestedKey ?? '',
    ...startReview(parsed.content, parsed.ambiguousLines),
  }));
  const form = useAppForm({
    defaultValues: defaults,
    validators: zodValidators<ReviewValues>(reviewFormSchema),
    onSubmit: ({ value }) => settled(save.mutateAsync(reviewBody(value))),
  });

  /** Applies one of the pure review operations to the Sections and order the form holds. */
  const edit = (change: (draft: Draft) => Draft) => {
    const next = change({
      sections: form.getFieldValue('sections'),
      order: form.getFieldValue('order'),
    });
    // Validate once both are set, so no check sees Sections and an order that disagree.
    form.setFieldValue('sections', next.sections, { dontValidate: true });
    form.setFieldValue('order', next.order);
  };

  if (saved) return <SavedNotice id={saved.id} similar={saved.similar} />;
  const existingId = existingSongId(save.error);

  return (
    <form {...formProps(form)}>
      <FieldGroup>
        <div className="flex items-center">
          <h1 className="text-xl font-medium">Review the import</h1>
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onBack}>
            Back to the text
          </Button>
        </div>

        <FieldSet>
          <form.AppField name="title">{(field) => <field.TextField label="Title" />}</form.AppField>
          <div className="grid grid-cols-2 gap-3">
            <form.AppField name="artist">
              {(field) => <field.TextField label="Artist (optional)" />}
            </form.AppField>
            <form.AppField name="key">
              {(field) => (
                <field.TextField
                  label="Key"
                  placeholder="G"
                  description={
                    parsed.suggestedKey
                      ? `Suggested from the first chord (${parsed.suggestedKey}).`
                      : undefined
                  }
                />
              )}
            </form.AppField>
          </div>
        </FieldSet>

        <form.Subscribe selector={(state) => state.values.sections}>
          {(sections) => {
            const options = sections.map((section) => ({
              value: section.key,
              label: section.name.trim() || 'Unnamed',
            }));
            return (
              <FieldSet>
                <FieldLegend variant="label">Order</FieldLegend>
                <FieldDescription>
                  The Sections as the song is sung. A Section sung twice appears twice.
                </FieldDescription>
                <form.Field name="order" mode="array">
                  {(orderField) => (
                    <>
                      <ol className="flex flex-col gap-2">
                        {orderField.state.value.map((_, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <form.AppField name={`order[${index}]`}>
                              {(field) => (
                                <field.SelectField
                                  label={`Position ${index + 1}`}
                                  hideLabel
                                  className="flex-1"
                                  options={options}
                                />
                              )}
                            </form.AppField>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => edit((draft) => removeOrderEntry(draft, index))}
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ol>
                      <Select
                        items={options}
                        value={null}
                        onValueChange={(key) =>
                          key !== null && edit((draft) => addOrderEntry(draft, key))
                        }
                      >
                        <SelectTrigger className="w-full" aria-label="Add a Section to the order">
                          <SelectValue placeholder="Add a Section to the order…" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </form.Field>
              </FieldSet>
            );
          }}
        </form.Subscribe>

        <FieldSet>
          <FieldLegend variant="label">Sections</FieldLegend>
          <form.Field name="sections" mode="array">
            {(sectionsField) => (
              <>
                {sectionsField.state.value.map((section, index, all) => (
                  <Card
                    key={section.key}
                    size="sm"
                    className={section.name.trim() === '' ? 'ring-2 ring-destructive' : undefined}
                  >
                    <CardHeader className="gap-2">
                      <form.AppField name={`sections[${index}].name`}>
                        {(field) => (
                          <field.TextField
                            label="Section name"
                            hideLabel
                            placeholder="Name this Section"
                          />
                        )}
                      </form.AppField>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={index === 0}
                          onClick={() =>
                            edit((draft) => mergeSection(draft, section.key, 'previous'))
                          }
                        >
                          Merge into the Section before
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={index === all.length - 1}
                          onClick={() => edit((draft) => mergeSection(draft, section.key, 'next'))}
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
                              onClick={() =>
                                edit((draft) => splitSection(draft, section.key, lineIndex))
                              }
                            >
                              Split the Section here
                            </button>
                          )}
                          <ChordLine line={line} />
                          {line.ambiguous && (
                            <p
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                              role="note"
                            >
                              This may be a word, not a chord.
                              <button
                                type="button"
                                className="underline"
                                onClick={() =>
                                  edit((draft) => treatAsLyric(draft, section.key, lineIndex))
                                }
                              >
                                Treat it as lyrics
                              </button>
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
                <form.Subscribe selector={(state) => reviewProblems(state.values)}>
                  {(problems) => <FieldError errors={problems.map((message) => ({ message }))} />}
                </form.Subscribe>
              </>
            )}
          </form.Field>
        </FieldSet>

        {existingId ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col gap-2">
              <span>{save.error?.message}</span>
              <span className="flex gap-2">
                <Link
                  href={`/songs/${existingId}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Open the existing Song
                </Link>
                <Button
                  type="button"
                  size="sm"
                  disabled={writeOver.isPending}
                  onClick={() =>
                    writeOver.mutate({ id: existingId, body: reviewBody(form.state.values) })
                  }
                >
                  {writeOver.isPending ? 'Writing over…' : 'Write over it'}
                </Button>
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <FormError error={save.error} />
        )}
        <FormError error={writeOver.error} />
        <form.AppForm>
          <form.SubmitButton pendingLabel="Saving…">Save song</form.SubmitButton>
        </form.AppForm>
      </FieldGroup>
    </form>
  );
}
