import { migrate } from '../src/infrastructure/database/migrate.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required (run `pnpm db` to get one)');
  process.exit(1);
}
const applied = await migrate(url);
console.log(applied.length === 0 ? 'Database is up to date.' : `Applied: ${applied.map((m) => m.name).join(', ')}`);
