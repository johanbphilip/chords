import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasteForm } from '@/components/songs/import/paste-form';
import { mockApi, renderWithQuery } from './render';

describe('pasting a Song to import', () => {
  const paste = async (user: ReturnType<typeof renderWithQuery>['user'], text: string) => {
    await user.click(screen.getByLabelText('The song as copied from Tabs'));
    await user.paste(text);
  };

  it('asks for some text before reviewing, and sends nothing', async () => {
    const requests = mockApi();
    const { user } = renderWithQuery(<PasteForm initialText="" onParsed={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(await screen.findByText('Paste the Song text')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('sends the text to be parsed and hands back what the API found', async () => {
    const parsed = { content: { sections: [], order: [] }, suggestedKey: 'G', unnamedSection: false, ambiguousLines: [] };
    const requests = mockApi(() => ({ body: parsed }));
    const onParsed = vi.fn();
    const { user } = renderWithQuery(<PasteForm initialText="" onParsed={onParsed} />);
    await paste(user, '[Verse]\nG\nHello');
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await waitFor(() => expect(onParsed).toHaveBeenCalledWith('[Verse]\nG\nHello', parsed));
    expect(requests).toEqual([{ method: 'POST', path: '/songs/parse', body: { text: '[Verse]\nG\nHello' } }]);
  });

  it('shows the API\'s message when it refuses, and stays on the text', async () => {
    mockApi(() => ({ status: 400, body: { message: 'Text is too long' } }));
    const onParsed = vi.fn();
    const { user } = renderWithQuery(<PasteForm initialText="some text" onParsed={onParsed} />);
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(await screen.findByText('Text is too long')).toBeInTheDocument();
    expect(onParsed).not.toHaveBeenCalled();
  });

  it('keeps the text it was given, so going back from the review loses nothing', () => {
    renderWithQuery(<PasteForm initialText={'[Verse]\nG\nHello'} onParsed={vi.fn()} />);
    expect(screen.getByLabelText('The song as copied from Tabs')).toHaveValue('[Verse]\nG\nHello');
  });
});
