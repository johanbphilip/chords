import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from './auth/auth.guard.js';
import { Database } from './database.js';

@Controller('hello')
export class HelloController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Public()
  @Get()
  async hello() {
    return { message: await this.db.greeting() };
  }
}
