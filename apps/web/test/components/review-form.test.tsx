import { findAmbiguousLines, parseChordSheet, suggestKey } from '@chords/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReviewForm } from '@/components/songs/import/review-form';
import type { Parsed } from '@/lib/songs/types';
import { router } from '../router';
import { mockApi, renderWithQuery } from './render';

/** What `POST /songs/parse` would return for this pasted text. */
function parsedFrom(text: string): Parsed {
  const content = parseChordSheet(text);
  return {
    content,
    suggestedKey: suggestKey(content),
    unnamedSection: content.sections.some((section) => section.name === ''),
    ambiguousLines: findAmbiguousLines(content),
  };
}

const PASTED = [
  'Intro words',
  '',
  '[Verse]',
  'G       C',
  'Amazing grace',
  '',
  '[Chorus]',
  'D',
  'How sweet',
].join('\n');

const setup = (text = PASTED) =>
  renderWithQuery(<ReviewForm parsed={parsedFrom(text)} onBack={() => undefined} />);

const names = () =>
  screen.getAllByLabelText<HTMLInputElement>('Section name').map((input) => input.value);

const type = async (user: ReturnType<typeof setup>['user'], element: HTMLElement, text: string) => {
  await user.click(element);
  await user.paste(text);
};

describe('reviewing an import', () => {
  beforeEach(() => {
    router.push.mockClear();
  });

  it('suggests the Key from the first chord, and starts with the Sections the parser found', () => {
    setup();
    expect(screen.getByLabelText('Key')).toHaveValue('G');
    expect(names()).toEqual(['', 'Verse', 'Chorus']);
  });

  it('says at once that text it could not place needs a name, and will not save until it has one', async () => {
    const requests = mockApi();
    const { user } = setup();
    expect(await screen.findByText(/Every Section needs a name/)).toBeInTheDocument();
    await type(user, screen.getByLabelText('Title'), 'Amazing Grace');
    await user.click(screen.getByRole('button', { name: 'Save song' }));
    expect(await screen.findByText(/Every Section needs a name/)).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('saves the reviewed Song once the unplaced text is named, with the names and order as reviewed', async () => {
    const requests = mockApi((method) =>
      method === 'POST' ? { body: { id: 'abc', similar: [] } } : {},
    );
    const { user } = setup();
    await type(user, screen.getByLabelText('Title'), 'Amazing Grace');
    await type(user, screen.getAllByLabelText('Section name')[0], 'Intro');
    await waitFor(() =>
      expect(screen.queryByText(/Every Section needs a name/)).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Save song' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/songs/abc'));
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'POST', path: '/songs' });
    expect(requests[0].body).toMatchObject({
      title: 'Amazing Grace',
      artist: '',
      key: 'G',
      content: {
        order: ['Intro', 'Verse', 'Chorus'],
        sections: [{ name: 'Intro' }, { name: 'Verse' }, { name: 'Chorus' }],
      },
    });
  });

  it('lets the unplaced text be merged into the next Section instead of named', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: 'Merge into the next' })[0]);
    await waitFor(() => expect(names()).toEqual(['Verse', 'Chorus']));
    expect(screen.queryByText(/Every Section needs a name/)).not.toBeInTheDocument();
  });

  it('splits a Section at a line into a new unnamed one that must be named', async () => {
    const { user } = setup('[Verse]\nG\none\ntwo');
    await user.click(screen.getByRole('button', { name: 'Split the Section here' }));
    await waitFor(() => expect(names()).toEqual(['Verse', '']));
    expect(screen.getByText(/Every Section needs a name/)).toBeInTheDocument();
  });

  it('refuses two Sections with one name, and a Section taken out of the order', async () => {
    const { user } = setup('[Verse]\nG\none\n\n[Chorus]\nD\ntwo');
    await type(user, screen.getAllByLabelText('Section name')[1], '{Verse}'.replace(/[{}]/g, ''));
    // The second Section was "Chorus"; pasting appended to it, so set the name outright.
    const second = screen.getAllByLabelText('Section name')[1];
    await user.clear(second);
    await user.type(second, 'Verse');
    expect(
      await screen.findByText('Two Sections are named "Verse". Rename one, or merge them.'),
    ).toBeInTheDocument();
    await user.clear(second);
    await user.type(second, 'Chorus');
    const order = screen.getByText('Order').closest('fieldset')!;
    await user.click(within(order).getAllByRole('button', { name: 'Remove' })[1]);
    expect(
      await screen.findByText('"Chorus" is not in the order, so it would be lost. Add it.'),
    ).toBeInTheDocument();
  });

  it('can turn a line that may be a word back into lyrics', async () => {
    const { user } = setup('[Verse]\nG\nHello\nA\nI wandered');
    expect(screen.getByText('This may be a word, not a chord.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Treat it as lyrics' }));
    await waitFor(() =>
      expect(screen.queryByText('This may be a word, not a chord.')).not.toBeInTheDocument(),
    );
  });

  it('tells the Member about other Songs with the same title instead of moving on', async () => {
    mockApi(() => ({
      body: { id: 'abc', similar: [{ id: 'x', title: 'Amazing Grace', artist: 'Hillsong' }] },
    }));
    const { user } = setup('[Verse]\nG\nHello');
    await type(user, screen.getByLabelText('Title'), 'Amazing Grace');
    await user.click(screen.getByRole('button', { name: 'Save song' }));
    expect(await screen.findByText(/Other Songs have this title/)).toHaveTextContent(
      'Amazing Grace · Hillsong',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('offers to open or write over a Song that already exists, and writing over replaces it', async () => {
    const requests = mockApi((method) =>
      method === 'POST'
        ? {
            status: 409,
            body: {
              message: 'A Song with this title and artist already exists',
              existingId: 'old-id',
            },
          }
        : { body: { id: 'old-id', similar: [] } },
    );
    const { user } = setup('[Verse]\nG\nHello');
    await type(user, screen.getByLabelText('Title'), 'Amazing Grace');
    await user.click(screen.getByRole('button', { name: 'Save song' }));
    expect(
      await screen.findByText('A Song with this title and artist already exists'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the existing Song' })).toHaveAttribute(
      'href',
      '/songs/old-id',
    );
    await user.click(screen.getByRole('button', { name: 'Write over it' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/songs/old-id'));
    expect(requests.map((request) => `${request.method} ${request.path}`)).toEqual([
      'POST /songs',
      'PUT /songs/old-id',
    ]);
    expect(requests[1].body).toEqual(requests[0].body);
  });
});
