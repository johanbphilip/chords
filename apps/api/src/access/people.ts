import { BadRequestException } from '@nestjs/common';

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

export function validName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name === '' || name.length > 100) throw new BadRequestException('Enter a display name (up to 100 characters)');
  return name;
}

export function validEmail(value: unknown): string {
  if (typeof value !== 'string' || !EMAIL.test(normaliseEmail(value))) {
    throw new BadRequestException('Enter a valid email address');
  }
  return normaliseEmail(value);
}
