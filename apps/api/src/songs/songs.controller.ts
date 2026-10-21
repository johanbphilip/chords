import { findAmbiguousLines, parseChordSheet, suggestKey, createSongSchema, parseSongTextSchema, replaceSongSchema, type SongInput } from '@chords/shared';
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { ZodPipe } from '../infrastructure/validation/zod.pipe.js';
import { SongsService } from './songs.service.js';

@Controller('songs')
export class SongsController {
  constructor(@Inject(SongsService) private readonly songs: SongsService) {}

  @Post()
  create(@Body(new ZodPipe(createSongSchema)) body: SongInput) {
    return this.songs.create(body);
  }

  /** Turns pasted text into a draft for review. Nothing is saved until the Member saves the reviewed Song. */
  @Post('parse')
  @HttpCode(200)
  parse(@Body(new ZodPipe(parseSongTextSchema)) { text }: { text: string }) {
    const content = parseChordSheet(text);
    return {
      content,
      suggestedKey: suggestKey(content),
      unnamedSection: content.sections.some((section) => section.name === ''),
      ambiguousLines: findAmbiguousLines(content),
    };
  }

  @Get()
  list() {
    return this.songs.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.songs.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body(new ZodPipe(replaceSongSchema)) body: SongInput) {
    return this.songs.update(id, body);
  }
}
