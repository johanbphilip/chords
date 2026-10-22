import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, bearer, createApp, joinAs, signIn } from '../helpers.js';

let counter = 0;
/** A title no other test uses, since every spec shares one database. */
const uniqueTitle = (name = 'Song') => `${name} ${Date.now()}-${counter++}`;

describe('creating and reading a Song', () => {
  let app: INestApplication;
  let member: string;
  const http = () => request(app.getHttpServer());
  const edit = (id: string, body: object, token = member) =>
    http().put(`/songs/${id}`).set(bearer(token)).send(body);
  const create = (body: object, token = member) =>
    http().post('/songs').set(bearer(token)).send(body);
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
    expect(song).toMatchObject({
      id: created.body.id,
      title,
      artist: '',
      key: null,
      tempo: null,
      timeSignature: null,
    });
    expect(song.content).toEqual({ sections: [], order: [] });
  });

  it('stores Sections with each chord attached to the syllable it sits over', async () => {
    const text = ['[Verse 1]', 'G       C', 'Amazing grace', '', '[Chorus]', 'D', 'How sweet'].join(
      '\n',
    );
    const created = await create({
      title: uniqueTitle(),
      key: 'G',
      tempo: 72,
      timeSignature: '3/4',
      text,
    }).expect(201);
    const song = (await read(created.body.id).expect(200)).body;
    expect(song).toMatchObject({ key: 'G', tempo: 72, timeSignature: '3/4' });
    expect(song.content).toEqual({
      order: ['Verse 1', 'Chorus'],
      sections: [
        {
          name: 'Verse 1',
          lines: [
            {
              lyric: 'Amazing grace',
              chords: [
                { chord: 'G', at: 0 },
                { chord: 'C', at: 8 },
              ],
            },
          ],
        },
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
      for (const key of ['F#m', 'Bb', 'Ebm', 'C'])
        await create({ title: uniqueTitle(), key }).expect(201);
    });

    it('stores a blank Key, tempo and time signature as none', async () => {
      const created = await create({
        title: uniqueTitle(),
        key: '',
        tempo: null,
        timeSignature: '',
      }).expect(201);
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
      await create({
        title: `  ${title.toUpperCase().replace('  ', ' ')} `,
        artist: ' john   NEWTON',
      }).expect(409);
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
    const created = await create({ title: uniqueTitle(), text: '    G\nAmazing grace' }).expect(
      201,
    );
    expect(created.body.content.sections[0].lines[0].chords).toEqual([{ chord: 'G', at: 4 }]);
  });

  describe('finding Songs', () => {
    it('lists Songs alphabetically by title, ignoring capitals', async () => {
      const tag = uniqueTitle('List');
      for (const title of [`${tag} banana`, `${tag} Cherry`, `${tag} apple`])
        await create({ title, artist: 'A', key: 'D' }).expect(201);
      const res = await http().get('/songs').set(bearer(member)).expect(200);
      const listed: { title: string }[] = res.body;
      expect(listed.map((song) => song.title).filter((title) => title.startsWith(tag))).toEqual([
        `${tag} apple`,
        `${tag} banana`,
        `${tag} Cherry`,
      ]);
      expect(listed.find((song) => song.title === `${tag} apple`)).toMatchObject({
        artist: 'A',
        key: 'D',
      });
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

  describe('editing a Song', () => {
    const TEXT =
      '[Verse]\nG       C\nAmazing grace\n\n[Chorus]\nD\nHow sweet\n\n[Verse]\nG       C\nAmazing grace';

    it('hands back the text to edit: chords above lyrics, Sections in their original order', async () => {
      const created = await create({ title: uniqueTitle(), text: TEXT }).expect(201);
      expect((await read(created.body.id).expect(200)).body.text).toBe(TEXT);
    });

    it('saves the text exactly as it was sent back, so opening and saving changes nothing', async () => {
      const created = await create({ title: uniqueTitle(), text: TEXT }).expect(201);
      const before = (await read(created.body.id).expect(200)).body;
      await edit(created.body.id, { title: before.title, text: before.text }).expect(200);
      expect((await read(created.body.id).expect(200)).body.content).toEqual(before.content);
    });

    it('updates chords and lyrics, and every Member sees the edit', async () => {
      const created = await create({
        title: uniqueTitle(),
        text: '[Verse]\nG\nAmazing grace',
      }).expect(201);
      const other = (await joinAs(app, await signIn(app, ADMIN.email, ADMIN.password))).token;
      const title = (await read(created.body.id).expect(200)).body.title;
      await edit(
        created.body.id,
        { title, text: '[Verse]\nA     E\nAmazing grace, how sweet' },
        other,
      ).expect(200);
      const seen = (await read(created.body.id, member).expect(200)).body;
      expect(seen.content.sections[0].lines[0]).toEqual({
        lyric: 'Amazing grace, how sweet',
        chords: [
          { chord: 'A', at: 0 },
          { chord: 'E', at: 6 },
        ],
      });
    });

    it('adds, removes and renames Sections by changing the headers', async () => {
      const created = await create({
        title: uniqueTitle(),
        text: '[Verse]\nOne\n\n[Chorus]\nTwo',
      }).expect(201);
      const title = (await read(created.body.id).expect(200)).body.title;
      const sectionNames = async () => (await read(created.body.id).expect(200)).body.content.order;
      await edit(created.body.id, {
        title,
        text: '[Verse]\nOne\n\n[Chorus]\nTwo\n\n[Bridge]\nThree',
      }).expect(200);
      expect(await sectionNames()).toEqual(['Verse', 'Chorus', 'Bridge']);
      await edit(created.body.id, {
        title,
        text: '[Verse]\nOne\n\n[Refrain]\nTwo\n\n[Bridge]\nThree',
      }).expect(200);
      expect(await sectionNames()).toEqual(['Verse', 'Refrain', 'Bridge']);
      await edit(created.body.id, { title, text: '[Verse]\nOne\n\n[Bridge]\nThree' }).expect(200);
      expect(await sectionNames()).toEqual(['Verse', 'Bridge']);
    });

    it('changes details, keeping the title-and-artist rule', async () => {
      const first = await create({ title: uniqueTitle(), artist: 'A' }).expect(201);
      const second = await create({ title: uniqueTitle(), artist: 'B' }).expect(201);
      const firstSong = (await read(first.body.id).expect(200)).body;
      // The Song may be renamed, change case only, or drop its own artist without clashing with itself.
      await edit(first.body.id, {
        title: firstSong.title.toUpperCase(),
        artist: 'a',
        key: 'Em',
        tempo: 90,
        timeSignature: '6/8',
        text: '',
      }).expect(200);
      expect((await read(first.body.id).expect(200)).body).toMatchObject({
        artist: 'a',
        key: 'Em',
        tempo: 90,
        timeSignature: '6/8',
      });
      // But not onto another Song.
      const secondSong = (await read(second.body.id).expect(200)).body;
      const clash = await edit(first.body.id, {
        title: secondSong.title,
        artist: 'b',
        text: '',
      }).expect(409);
      expect(clash.body.existingId).toBe(second.body.id);
    });

    it('refuses an edit that would silently erase the chords and lyrics', async () => {
      const created = await create({ title: uniqueTitle(), text: '[Verse]\nG\nHello' }).expect(201);
      const title = (await read(created.body.id).expect(200)).body.title;
      await edit(created.body.id, { title }).expect(400);
      expect((await read(created.body.id).expect(200)).body.content.order).toEqual(['Verse']);
      // Sending empty text on purpose does clear it.
      await edit(created.body.id, { title, text: '' }).expect(200);
      expect((await read(created.body.id).expect(200)).body.content.order).toEqual([]);
    });
  });

  it('needs a signed-in Member', async () => {
    await http().post('/songs').send({ title: uniqueTitle() }).expect(401);
  });
});
