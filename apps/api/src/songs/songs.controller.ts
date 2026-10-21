import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { readSongInput } from './song-input.js';
import { SongsService } from './songs.service.js';

@Controller('songs')
export class SongsController {
  constructor(@Inject(SongsService) private readonly songs: SongsService) {}

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.songs.create(readSongInput(body));
  }

  @Get()
  list() {
    return this.songs.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.songs.get(id);
  }
}
