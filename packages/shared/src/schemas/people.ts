import { z } from 'zod';

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 100;

const NAME_MESSAGE = `Enter a display name (up to ${DISPLAY_NAME_MAX_LENGTH} characters)`;
const EMAIL_MESSAGE = 'Enter a valid email address';

/** An email address, trimmed and lowercased, so the same person is always one value. */
export const emailSchema = z
  .string(EMAIL_MESSAGE)
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, EMAIL_MESSAGE);

export const displayNameSchema = z.string(NAME_MESSAGE).trim().min(1, NAME_MESSAGE).max(DISPLAY_NAME_MAX_LENGTH, NAME_MESSAGE);

export const passwordSchema = z
  .string(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);

export const roleSchema = z.enum(['admin', 'member'], 'Role must be admin or member');
export type Role = z.infer<typeof roleSchema>;

/** Sign-in only needs a password to be present: an older, shorter one must still work. */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string('Enter your password').min(1, 'Enter your password'),
});

export const requestAccessSchema = z.object({ email: emailSchema, name: displayNameSchema });
export const approveEmailSchema = z.object({ email: emailSchema });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const renameSchema = z.object({ name: displayNameSchema });
export const setRoleSchema = z.object({ role: roleSchema });

/** Every invite link, used or not, answers a bad token the same way, so the message must not say why. */
export const INVALID_INVITE_MESSAGE = 'This invite link is invalid or has expired';
export const acceptInviteSchema = z.object({
  name: displayNameSchema,
  password: passwordSchema,
  token: z.string(INVALID_INVITE_MESSAGE).min(1, INVALID_INVITE_MESSAGE),
});

export const resetPasswordSchema = z.object({ newPassword: passwordSchema });
export const changePasswordSchema = z.object({
  currentPassword: z.string('Enter your current password').min(1, 'Enter your current password'),
  newPassword: passwordSchema,
});
