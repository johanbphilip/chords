import { Module } from '@nestjs/common';
import { Database } from './database.js';
import { HelloController } from './hello.controller.js';

@Module({
  controllers: [HelloController],
  providers: [Database],
})
export class AppModule {}
