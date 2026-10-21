import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates a request body (or any value) against a Zod schema and hands the controller the parsed result, so
 * defaults, trimming and normalising have already happened. A refusal is a 400 saying why, in the schema's own words.
 */
export class ZodPipe<Schema extends z.ZodType> implements PipeTransform<unknown, z.output<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) throw new BadRequestException(result.error.issues[0]!.message);
    return result.data;
  }
}
