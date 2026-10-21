import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller.js';
import { SongsService } from './songs.service.js';

@Module({ controllers: [SongsController], providers: [SongsService] })
export class SongsModule {}
