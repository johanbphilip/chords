import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, bearer, createApp, joinAs, signIn } from '../helpers.js';

let counter = 0;
const uniqueTitle = (name = 'Imported') => `${name} ${Date.now()}-${counter++}`;

const PASTED = [
  '[Verse 1]',
  'G       C',
  'Amazing grace',
  '',
  '[Chorus]',
  'D',
  'How sweet',
  '',
  '[Verse 1]',
  'G       C',
  'Amazing grace',
].join('\n');

describe('importing a pasted Song', () => {
  let app: INestApplication;
  let member: string;
  const http = () => request(app.getHttpServer());
  const put = (id: string, body: object, token = member) =>
    http().put(`/songs/${id}`).set(bearer(token)).send(body);
  const read = async (id: string) =>
    (await http().get(`/songs/${id}`).set(bearer(member)).expect(200)).body;
  const parse = (body: object, token = member) =>
    http().post('/songs/parse').set(bearer(token)).send(body);
  const titles = async () => {
    const res = await http().get('/songs').set(bearer(member)).expect(200);
    const songs: { title: string }[] = res.body;
    return songs.map((song) => song.title);
  };

  beforeAll(async () => {
    app = await createApp();
    member = (await joinAs(app, await signIn(app, ADMIN.email, ADMIN.password))).token;
  });
  afterAll(async () => {
    await app.close();
  });

  const create = (body: object) => http().post('/songs').set(bearer(member)).send(body);
  const verse = {
    name: 'Verse',
    lines: [
      {
        lyric: 'Amazing grace',
        chords: [
          { chord: 'G', at: 0 },
          { chord: 'C', at: 8 },
        ],
      },
    ],
  };
  const chorus = {
    name: 'Chorus',
    lines: [{ lyric: 'How sweet', chords: [{ chord: 'D', at: 0 }] }],
  };

  describe('saving the reviewed Song', () => {
    it('saves the Sections and original order exactly as reviewed', async () => {
      const content = { sections: [verse, chorus], order: ['Verse', 'Chorus', 'Verse'] };
      const created = await create({ title: uniqueTitle(), key: 'G', content }).expect(201);
      const saved = (await http().get(`/songs/${created.body.id}`).set(bearer(member)).expect(200))
        .body;
      expect(saved.content).toEqual(content);
      expect(saved.key).toBe('G');
    });

    it.each([
      ['an unnamed Section', { sections: [{ ...verse, name: '' }], order: [''] }],
      ['two Sections with one name', { sections: [verse, verse], order: ['Verse'] }],
      [
        'an order naming a Section that does not exist',
        { sections: [verse], order: ['Verse', 'Bridge'] },
      ],
      ['a Section that is not in the order', { sections: [verse, chorus], order: ['Verse'] }],
      [
        'a chord that is not a chord',
        {
          sections: [{ ...verse, lines: [{ lyric: 'x', chords: [{ chord: 'H', at: 0 }] }] }],
          order: ['Verse'],
        },
      ],
      [
        'a chord at a negative position',
        {
          sections: [{ ...verse, lines: [{ lyric: 'x', chords: [{ chord: 'G', at: -1 }] }] }],
          order: ['Verse'],
        },
      ],
      [
        'a chord at a fractional position',
        {
          sections: [{ ...verse, lines: [{ lyric: 'x', chords: [{ chord: 'G', at: 1.5 }] }] }],
          order: ['Verse'],
        },
      ],
      [
        'a lyric that is not text',
        { sections: [{ ...verse, lines: [{ lyric: 5, chords: [] }] }], order: ['Verse'] },
      ],
      ['sections that are not a list', { sections: 'Verse', order: [] }],
      ['content that is not an object', 'Verse'],
    ])('refuses %s', async (_name, content) => {
      await create({ title: uniqueTitle(), content }).expect(400);
    });

    it('tidies stray spaces around Section names instead of refusing them', async () => {
      const created = await create({
        title: uniqueTitle(),
        content: { sections: [{ ...verse, name: ' Verse ' }], order: [' Verse '] },
      }).expect(201);
      const saved = (await http().get(`/songs/${created.body.id}`).set(bearer(member)).expect(200))
        .body;
      expect(saved.content.order).toEqual(['Verse']);
      expect(saved.content.sections[0].name).toBe('Verse');
    });

    it('refuses text and content together, since one would silently win', async () => {
      await create({
        title: uniqueTitle(),
        text: 'G\nhi',
        content: { sections: [verse], order: ['Verse'] },
      }).expect(400);
    });
  });

  describe('a Song that already exists', () => {
    const reviewed = { sections: [chorus], order: ['Chorus'] };

    it('refuses the import and points at the existing Song', async () => {
      const title = uniqueTitle();
      const existing = await create({
        title,
        artist: 'John Newton',
        content: { sections: [verse], order: ['Verse'] },
      }).expect(201);
      const again = await create({
        title: title.toUpperCase(),
        artist: 'john newton',
        content: reviewed,
      }).expect(409);
      expect(again.body.existingId).toBe(existing.body.id);
      expect((await read(existing.body.id)).content.order).toEqual(['Verse']);
    });

    it('can be written over with the reviewed import, keeping its place in the list', async () => {
      const title = uniqueTitle();
      const existing = await create({
        title,
        artist: 'John Newton',
        key: 'G',
        content: { sections: [verse], order: ['Verse'] },
      }).expect(201);
      const res = await put(existing.body.id, {
        title,
        artist: 'John Newton',
        key: 'D',
        tempo: 80,
        content: reviewed,
      }).expect(200);
      expect(res.body.id).toBe(existing.body.id);
      expect(await read(existing.body.id)).toMatchObject({
        key: 'D',
        tempo: 80,
        content: reviewed,
      });
    });

    it('cannot be renamed onto another Song', async () => {
      const first = await create({ title: uniqueTitle(), artist: 'A' }).expect(201);
      const other = await create({ title: uniqueTitle(), artist: 'B' }).expect(201);
      const existing = await read(first.body.id);
      const res = await put(other.body.id, {
        title: existing.title,
        artist: existing.artist,
        text: '',
      }).expect(409);
      expect(res.body.existingId).toBe(first.body.id);
    });

    it('answers 404 for a Song that does not exist, 400 for details that make no sense, 401 signed out', async () => {
      await put('00000000-0000-4000-8000-000000000000', { title: 'x', text: '' }).expect(404);
      const song = await create({ title: uniqueTitle() }).expect(201);
      await put(song.body.id, { title: '  ', text: '' }).expect(400);
      await http().put(`/songs/${song.body.id}`).send({ title: 'x', text: '' }).expect(401);
    });
  });

  describe('parsing for review', () => {
    it('finds Sections from their headers and keeps the original order, saving nothing', async () => {
      // Other spec files save Songs at the same time, so check for this title rather than counting.
      const title = uniqueTitle();
      const res = await parse({ text: PASTED, title }).expect(200);
      expect(res.body.content.order).toEqual(['Verse 1', 'Chorus', 'Verse 1']);
      expect(res.body.content.sections.map((section: { name: string }) => section.name)).toEqual([
        'Verse 1',
        'Chorus',
      ]);
      expect(res.body.unnamedSection).toBe(false);
      expect(await titles()).not.toContain(title);
    });

    it('puts text before the first header in an unnamed Section and says it needs resolving', async () => {
      const res = await parse({ text: 'Intro words\n\n[Verse]\nG\nHello' }).expect(200);
      expect(res.body.unnamedSection).toBe(true);
      expect(res.body.content.sections[0]).toMatchObject({ name: '' });
    });

    it('suggests the Key from the first chord, or none without chords', async () => {
      expect(
        (await parse({ text: '[Verse]\nAm7\nI once was lost' }).expect(200)).body.suggestedKey,
      ).toBe('Am');
      expect((await parse({ text: 'only words' }).expect(200)).body.suggestedKey).toBeNull();
    });

    it('lists lines that look like chords but may be words, for the review step', async () => {
      const res = await parse({ text: '[Verse]\nG\nHello\nAm\nI wandered' }).expect(200);
      expect(res.body.ambiguousLines).toEqual([{ section: 'Verse', line: 1 }]);
    });

    it('needs a signed-in Member and some text', async () => {
      await http().post('/songs/parse').send({ text: 'x' }).expect(401);
      await parse({}).expect(400);
      await parse({ text: 5 }).expect(400);
      await parse({ text: 'x'.repeat(50_001) }).expect(400);
    });
  });
});
