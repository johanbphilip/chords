import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Database } from '../database.js';
import type { SongInput } from './song-input.js';

interface SongRow {
  id: string;
  title: string;
  artist: string;
  musical_key: string | null;
  tempo: number | null;
  time_signature: string | null;
  content: { sections: unknown[]; order: string[] };
}

const toSong = (row: SongRow) => ({
  id: row.id,
  title: row.title,
  artist: row.artist,
  key: row.musical_key,
  tempo: row.tempo,
  timeSignature: row.time_signature,
  content: row.content,
});

/** The same normalisation the `songs` table uses for its generated columns (see migration 004). */
const normalised = (param: string) => `lower(regexp_replace(btrim(${param}), '\\s+', ' ', 'g'))`;

const UNIQUE_VIOLATION = '23505';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SongsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async create(body: SongInput) {
    return this.saved(
      this.db.query<SongRow>(
        `INSERT INTO songs (title, artist, musical_key, tempo, time_signature, content)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [body.title, body.artist, body.key, body.tempo, body.timeSignature, JSON.stringify(body.content)],
      ),
      body,
    );
  }

  /** Replaces a Song's details and content, which is how an edit and "write over" an existing Song both work. */
  async update(id: string, body: SongInput) {
    if (!UUID.test(id)) throw new NotFoundException('Song not found');
    return this.saved(
      this.db.query<SongRow>(
        `UPDATE songs SET title = $2, artist = $3, musical_key = $4, tempo = $5, time_signature = $6, content = $7,
           updated_at = now() WHERE id = $1 RETURNING *`,
        [id, body.title, body.artist, body.key, body.tempo, body.timeSignature, JSON.stringify(body.content)],
      ),
      body,
    );
  }

  /** Waits for a write, turning "another Song has this title and artist" into a 409 that names that Song. */
  private async saved(write: Promise<SongRow[]>, body: SongInput) {
    let row: SongRow | undefined;
    try {
      [row] = await write;
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error;
      const [existing] = await this.db.query<{ id: string }>(
        `SELECT id FROM songs WHERE title_normalised = ${normalised('$1')} AND artist_normalised = ${normalised('$2')}`,
        [body.title, body.artist],
      );
      throw new ConflictException({
        message: 'A Song with this title and artist already exists',
        existingId: existing?.id,
      });
    }
    if (!row) throw new NotFoundException('Song not found');
    return { ...toSong(row), similar: await this.sameTitleByOthers(row) };
  }

  /** Songs with this title but a different artist: allowed, but worth a gentle notice. */
  private sameTitleByOthers(song: SongRow) {
    return this.db.query<{ id: string; title: string; artist: string }>(
      `SELECT id, title, artist FROM songs
       WHERE title_normalised = ${normalised('$1')} AND id <> $2 ORDER BY artist`,
      [song.title, song.id],
    );
  }

  /** Every Song, alphabetical. The Songs page (ticket 10) adds filters; this is what reading needs now. */
  async list() {
    const rows = await this.db.query<SongRow>('SELECT * FROM songs ORDER BY title_normalised, artist_normalised');
    return rows.map(({ id, title, artist, musical_key }) => ({ id, title, artist, key: musical_key }));
  }

  async get(id: string) {
    if (!UUID.test(id)) throw new NotFoundException('Song not found');
    const [row] = await this.db.query<SongRow>('SELECT * FROM songs WHERE id = $1', [id]);
    if (!row) throw new NotFoundException('Song not found');
    return toSong(row);
  }
}
