import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { findAmbiguousLines, parseChordSheet, suggestKey } from '@chords/shared';
import { readPastedText, readSongInput } from './song-input.js';
import { SongsService } from './songs.service.js';

@Controller('songs')
export class SongsController {
  constructor(@Inject(SongsService) private readonly songs: SongsService) {}

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.songs.create(readSongInput(body));
  }

  /** Turns pasted text into a draft for review. Nothing is saved until the Member saves the reviewed Song. */
  @Post('parse')
  @HttpCode(200)
  parse(@Body() body: Record<string, unknown>) {
    const content = parseChordSheet(readPastedText(body));
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
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.songs.update(id, readSongInput(body, { requireContent: true }));
  }
}
