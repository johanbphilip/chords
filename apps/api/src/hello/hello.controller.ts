import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../access/session/auth.guard.js';
import { Database } from '../infrastructure/database/database.js';

@Controller('hello')
export class HelloController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Public()
  @Get()
  async hello() {
    return { message: await this.db.greeting() };
  }
}
