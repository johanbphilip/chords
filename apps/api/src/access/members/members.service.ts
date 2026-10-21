import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Database } from '../../infrastructure/database/database.js';
import { normaliseEmail } from '../people.js';
import { AuthService } from '../session/auth.service.js';
import type { Role } from '../session/better-auth.js';

const ADMIN_COUNT_LOCK = 7003;

interface Person {
  id: string;
  role: Role;
  banned: boolean | null;
}

@Injectable()
export class MembersService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  /** Names only: this is what Members see of each other. Revoked people stay listed so their work keeps a name. */
  async names(): Promise<{ id: string; name: string; revoked: boolean }[]> {
    const rows = await this.db.query<{ id: string; name: string; banned: boolean | null }>(
      'SELECT id, name, banned FROM "user" ORDER BY lower(name)',
    );
    return rows.map((row) => ({ id: row.id, name: row.name, revoked: row.banned === true }));
  }

  /** Better Auth's ban: sign-in is refused and every open session ends. The person and their name stay. */
  async revoke(email: string) {
    await this.db.withLock(ADMIN_COUNT_LOCK, async () => {
      const person = await this.find(email);
      if (person.role === 'admin' && !person.banned) await this.requireAnotherAdmin(person.id);
      const context = await this.auth.auth.$context;
      await context.internalAdapter.updateUser(person.id, { banned: true, banReason: 'Access revoked' });
      await this.db.query('DELETE FROM "session" WHERE "userId" = $1', [person.id]);
    });
  }

  async restore(email: string) {
    const person = await this.find(email);
    const context = await this.auth.auth.$context;
    await context.internalAdapter.updateUser(person.id, { banned: false, banReason: null, banExpires: null });
  }

  async setRole(email: string, role: unknown) {
    if (role !== 'admin' && role !== 'member') throw new BadRequestException('Role must be admin or member');
    // The lock makes "count the other Admins, then change this one" atomic, so two Admins cannot demote each other at once.
    await this.db.withLock(ADMIN_COUNT_LOCK, async () => {
      const person = await this.find(email);
      if (person.role === 'admin' && role === 'member' && !person.banned) await this.requireAnotherAdmin(person.id);
      const context = await this.auth.auth.$context;
      await context.internalAdapter.updateUser(person.id, { role });
    });
  }

  private async find(email: string): Promise<Person> {
    const [person] = await this.db.query<Person>('SELECT id, role, banned FROM "user" WHERE email = $1', [normaliseEmail(email)]);
    if (!person) throw new NotFoundException('That person has not joined');
    return person;
  }

  private async requireAnotherAdmin(excludingId: string) {
    const [{ others }] = await this.db.query<{ others: string }>(
      `SELECT count(*) AS others FROM "user" WHERE role = 'admin' AND banned IS NOT TRUE AND id <> $1`,
      [excludingId],
    );
    if (Number(others) === 0) throw new ConflictException('There must always be at least one Admin');
  }
}
