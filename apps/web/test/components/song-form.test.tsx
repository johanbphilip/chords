import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SongForm } from '@/components/songs/song-form';
import { emptySongForm, type SongBody } from '@/lib/songs/form';
import { renderWithQuery } from './render';

const type = async (
  user: ReturnType<typeof renderWithQuery>['user'],
  label: string,
  text: string,
) => {
  await user.click(screen.getByLabelText(label));
  await user.paste(text);
};

describe('the Song form', () => {
  it('saves a Song with only a title, sending blank details as none', async () => {
    const onSave = vi.fn<(body: SongBody) => Promise<unknown>>(async () => undefined);
    const { user } = renderWithQuery(
      <SongForm initial={emptySongForm} onSave={onSave} submitLabel="Save song" />,
    );
    await type(user, 'Title', 'Amazing Grace');
    await user.click(screen.getByRole('button', { name: 'Save song' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      title: 'Amazing Grace',
      artist: '',
      key: null,
      tempo: null,
      timeSignature: null,
      text: '',
    });
  });

  it('turns the tempo into a number', async () => {
    const onSave = vi.fn<(body: SongBody) => Promise<unknown>>(async () => undefined);
    const { user } = renderWithQuery(
      <SongForm initial={emptySongForm} onSave={onSave} submitLabel="Save song" />,
    );
    await type(user, 'Title', 'x');
    await type(user, 'Tempo', '72');
    await type(user, 'Key', 'F#m');
    await user.click(screen.getByRole('button', { name: 'Save song' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tempo: 72, key: 'F#m' }));
  });

  it('refuses a missing title and a tempo that is not a number, saying why, and does not save', async () => {
    const onSave = vi.fn<(body: SongBody) => Promise<unknown>>(async () => undefined);
    const { user } = renderWithQuery(
      <SongForm initial={emptySongForm} onSave={onSave} submitLabel="Save song" />,
    );
    await type(user, 'Tempo', '72bpm');
    await user.click(screen.getByRole('button', { name: 'Save song' }));
    expect(await screen.findByText('A Song needs a title')).toBeInTheDocument();
    expect(screen.getByText('Tempo must be a whole number from 1 to 400')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('previews the chords over their syllables as the text is typed', async () => {
    const { user } = renderWithQuery(
      <SongForm initial={emptySongForm} onSave={async () => undefined} submitLabel="Save song" />,
    );
    expect(
      screen.getByText('Type or paste chords and lyrics to see them here.'),
    ).toBeInTheDocument();
    await type(user, 'Chords and lyrics', '[Verse]\nG       C\nAmazing grace');
    const preview = screen.getByLabelText('Preview');
    expect(preview).toHaveTextContent('Verse');
    expect(preview).toHaveTextContent('Amazing');
    expect(preview).toHaveTextContent('G');
  });

  it('shows what the page passes in, such as a server error, above the button', async () => {
    renderWithQuery(
      <SongForm initial={emptySongForm} onSave={async () => undefined} submitLabel="Save song">
        <p>from the page</p>
      </SongForm>,
    );
    expect(screen.getByText('from the page')).toBeInTheDocument();
  });
});
