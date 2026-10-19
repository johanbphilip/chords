import { Controller, Get, Inject } from '@nestjs/common';
import { Database } from './database.js';

@Controller('hello')
export class HelloController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get()
  async hello() {
    return { message: await this.db.greeting() };
  }
}
