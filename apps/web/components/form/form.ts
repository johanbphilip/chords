import { createFormHook } from '@tanstack/react-form';
import type { FormEvent } from 'react';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { z } from 'zod';
import { fieldContext, formContext } from './context';
import { SelectField, SubmitButton, TextareaField, TextField } from './fields';

/**
 * TanStack Form with our shadcn fields attached: `form.AppField` hands its children `field.TextField`,
 * `field.TextareaField` and `field.SelectField`, and `form.AppForm` provides `form.SubmitButton`.
 * Validate with a Zod schema from @chords/shared: `validators: { onChange: schema, onSubmit: schema }`.
 */
export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, TextareaField, SelectField },
  formComponents: { SubmitButton },
});

/**
 * Props for the `<form>` element: submit through the form's own validation and handler instead of a page
 * reload, and switch off the browser's built-in validation (the bubble for `type="email"`), so the one set of
 * Zod rules and messages is what the Member sees.
 */
export const formProps = (form: { handleSubmit: () => unknown }) => ({
  noValidate: true,
  onSubmit: (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  },
});

/**
 * Waits for a mutation without rethrowing its failure. The form stays "submitting" until the request ends, and
 * the mutation keeps the error for `<FormError>` to show.
 */
export const settled = (request: Promise<unknown>) =>
  request.then(
    () => undefined,
    () => undefined,
  );

/**
 * `validators` for a schema that accepts loose input (blank, missing or numeric values), which Zod types as
 * `unknown`. TanStack Form wants the form's own value type, so say it here: `zodValidators<MyValues>(schema)`.
 */
export const zodValidators = <Values>(schema: z.ZodType) => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Zod types loose input as unknown; this says the form's own value type
  const validator = schema as unknown as StandardSchemaV1<Values, unknown>;
  return { onChange: validator, onSubmit: validator };
};
