'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useFieldContext, useFormContext } from './context';

interface FieldFrameProps {
  label: string;
  /** Keep the label for screen readers only, for compact inline forms. */
  hideLabel?: boolean;
  description?: ReactNode;
}

/** The shadcn Field around one TanStack Form field: its label, the control, a hint and the first problem. */
function useFieldFrame() {
  const field = useFieldContext<unknown>();
  const id = useId();
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return { field, id, invalid };
}

export function TextField({
  label,
  hideLabel,
  description,
  className,
  ...input
}: FieldFrameProps & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur' | 'name' | 'id' | 'aria-invalid'>) {
  const { field, id, invalid } = useFieldFrame();
  const value = field.state.value as string;
  return (
    <Field data-invalid={invalid || undefined} className={className}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      <Input
        {...input}
        id={id}
        name={field.name}
        value={value}
        aria-invalid={invalid}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export function TextareaField({
  label,
  hideLabel,
  description,
  className,
  ...textarea
}: FieldFrameProps & Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange' | 'onBlur' | 'name' | 'id' | 'aria-invalid'>) {
  const { field, id, invalid } = useFieldFrame();
  const value = field.state.value as string;
  return (
    <Field data-invalid={invalid || undefined} className={className}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      <Textarea
        {...textarea}
        id={id}
        name={field.name}
        value={value}
        aria-invalid={invalid}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

export function SelectField<Value extends string | number>({
  label,
  hideLabel,
  description,
  className,
  options,
  placeholder,
}: FieldFrameProps & { className?: string; options: { value: Value; label: string }[]; placeholder?: string }) {
  const { field, id, invalid } = useFieldFrame();
  return (
    <Field data-invalid={invalid || undefined} className={className}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      <Select items={options} value={field.state.value as Value} onValueChange={(value) => field.handleChange(value as never)}>
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid} onBlur={field.handleBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

/** Disabled while the form is submitting, so a slow request is not sent twice. Errors show once it is clicked. */
export function SubmitButton({ children, pendingLabel, ...button }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" {...button} disabled={isSubmitting || button.disabled}>
          {isSubmitting && pendingLabel ? pendingLabel : children}
        </Button>
      )}
    </form.Subscribe>
  );
}
