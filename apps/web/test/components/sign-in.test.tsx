import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPage from '@/app/sign-in/page';
import { router } from '../router';
import { renderWithQuery } from './render';

const signIn = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth-client', () => ({ authClient: { signIn: { email: signIn } } }));

describe('the sign-in page', () => {
  beforeEach(() => {
    signIn.mockReset();
    router.replace.mockClear();
  });

  const fill = async (user: ReturnType<typeof renderWithQuery>['user'], email: string, password: string) => {
    if (email) {
      await user.click(screen.getByLabelText('Email'));
      await user.paste(email);
    }
    if (password) {
      await user.click(screen.getByLabelText('Password'));
      await user.paste(password);
    }
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
  };

  it('says what is missing and does not try to sign in', async () => {
    const { user } = renderWithQuery(<SignInPage />);
    await fill(user, 'not an email', '');
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(await screen.findByText('Enter your password')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in with the email tidied, and goes to the app', async () => {
    signIn.mockResolvedValue({ error: null });
    const { user } = renderWithQuery(<SignInPage />);
    await fill(user, '  Ada@Example.com ', 'correct horse');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(signIn).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct horse' });
  });

  it('shows why sign-in failed and stays on the page', async () => {
    signIn.mockResolvedValue({ error: { message: 'Invalid email or password' } });
    const { user } = renderWithQuery(<SignInPage />);
    await fill(user, 'ada@example.com', 'wrong');
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
