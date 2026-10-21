import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, bearer, createApp, joinAs, signIn } from './helpers.js';

let counter = 0;
/** A title no other test uses, since every spec shares one database. */
const uniqueTitle = (name = 'Song') => `${name} ${Date.now()}-${counter++}`;

describe('creating and reading a Song', () => {
  let app: INestApplication;
  let member: string;
  const http = () => request(app.getHttpServer());
  const create = (body: object, token = member) => http().post('/songs').set(bearer(token)).send(body);
  const read = (id: string, token = member) => http().get(`/songs/${id}`).set(bearer(token));

  beforeAll(async () => {
    app = await createApp();
    member = (await joinAs(app, await signIn(app, ADMIN.email, ADMIN.password))).token;
  });
  afterAll(async () => {
    await app.close();
  });

  it('saves a Song that has only a title', async () => {
    const title = uniqueTitle();
    const created = await create({ title }).expect(201);
    const song = (await read(created.body.id).expect(200)).body;
    expect(song).toMatchObject({ id: created.body.id, title, artist: '', key: null, tempo: null, timeSignature: null });
    expect(song.content).toEqual({ sections: [], order: [] });
  });

  it('stores Sections with each chord attached to the syllable it sits over', async () => {
    const text = ['[Verse 1]', 'G       C', 'Amazing grace', '', '[Chorus]', 'D', 'How sweet'].join('\n');
    const created = await create({ title: uniqueTitle(), key: 'G', tempo: 72, timeSignature: '3/4', text }).expect(201);
    const song = (await read(created.body.id).expect(200)).body;
    expect(song).toMatchObject({ key: 'G', tempo: 72, timeSignature: '3/4' });
    expect(song.content).toEqual({
      order: ['Verse 1', 'Chorus'],
      sections: [
        { name: 'Verse 1', lines: [{ lyric: 'Amazing grace', chords: [{ chord: 'G', at: 0 }, { chord: 'C', at: 8 }] }] },
        { name: 'Chorus', lines: [{ lyric: 'How sweet', chords: [{ chord: 'D', at: 0 }] }] },
      ],
    });
  });

  describe('refuses details that make no sense', () => {
    it.each([
      ['a missing title', {}],
      ['a blank title', { title: '   ' }],
      ['a title that is not text', { title: 7 }],
      ['an artist that is not text', { title: 'x', artist: 7 }],
      ['a Key that is not a Key', { title: 'x', key: 'H' }],
      ['a tempo of zero', { title: 'x', tempo: 0 }],
      ['a tempo with decimals', { title: 'x', tempo: 72.5 }],
      ['a tempo that is not a number', { title: 'x', tempo: 'fast' }],
      ['a time signature that is not one', { title: 'x', timeSignature: 'waltz' }],
      ['text that is not text', { title: 'x', text: 5 }],
    ])('%s', async (_name, body) => {
      await create(body).expect(400);
    });

    it('accepts minor and flat or sharp Keys', async () => {
      for (const key of ['F#m', 'Bb', 'Ebm', 'C']) await create({ title: uniqueTitle(), key }).expect(201);
    });

    it('stores a blank Key, tempo and time signature as none', async () => {
      const created = await create({ title: uniqueTitle(), key: '', tempo: null, timeSignature: '' }).expect(201);
      expect(created.body).toMatchObject({ key: null, tempo: null, timeSignature: null });
    });
  });

  describe('one Song per title and artist', () => {
    it('refuses a second Song with the same title and artist, naming the existing one', async () => {
      const title = uniqueTitle();
      const first = await create({ title, artist: 'John Newton' }).expect(201);
      const second = await create({ title, artist: 'John Newton' }).expect(409);
      expect(second.body.existingId).toBe(first.body.id);
    });

    it('ignores capitals and extra spaces in both title and artist', async () => {
      const title = uniqueTitle('Amazing  Grace');
      await create({ title, artist: 'John Newton' }).expect(201);
      await create({ title: `  ${title.toUpperCase().replace('  ', ' ')} `, artist: ' john   NEWTON' }).expect(409);
    });

    it('treats a blank artist as its own value', async () => {
      const title = uniqueTitle();
      await create({ title }).expect(201);
      await create({ title, artist: '   ' }).expect(409);
      await create({ title, artist: 'Someone' }).expect(201);
    });

    it('saves a same-title Song by a different artist with a notice naming the others', async () => {
      const title = uniqueTitle();
      const original = await create({ title, artist: 'Hillsong' }).expect(201);
      expect(original.body.similar).toEqual([]);
      const cover = await create({ title, artist: 'Elevation' }).expect(201);
      expect(cover.body.similar).toEqual([{ id: original.body.id, title, artist: 'Hillsong' }]);
    });
  });

  it('keeps the spaces that position the first chord line', async () => {
    const created = await create({ title: uniqueTitle(), text: '    G\nAmazing grace' }).expect(201);
    expect(created.body.content.sections[0].lines[0].chords).toEqual([{ chord: 'G', at: 4 }]);
  });

  describe('finding Songs', () => {
    it('lists Songs alphabetically by title, ignoring capitals', async () => {
      const tag = uniqueTitle('List');
      for (const title of [`${tag} banana`, `${tag} Cherry`, `${tag} apple`]) await create({ title, artist: 'A', key: 'D' }).expect(201);
      const listed = (await http().get('/songs').set(bearer(member)).expect(200)).body as { title: string }[];
      expect(listed.map((song) => song.title).filter((title) => title.startsWith(tag))).toEqual([
        `${tag} apple`,
        `${tag} banana`,
        `${tag} Cherry`,
      ]);
      expect(listed.find((song) => song.title === `${tag} apple`)).toMatchObject({ artist: 'A', key: 'D' });
    });

    it('answers 404 for a Song that does not exist, even for an id that is not a UUID', async () => {
      await read('00000000-0000-4000-8000-000000000000').expect(404);
      await read('not-an-id').expect(404);
    });

    it('needs a signed-in Member to read', async () => {
      const created = await create({ title: uniqueTitle() }).expect(201);
      await http().get(`/songs/${created.body.id}`).expect(401);
      await http().get('/songs').expect(401);
    });
  });

  it('needs a signed-in Member', async () => {
    await http().post('/songs').send({ title: uniqueTitle() }).expect(401);
  });
});
