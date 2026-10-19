import path from 'node:path';
import { startDb } from './embedded-db.js';

const db = await startDb({
  dataDir: path.resolve(import.meta.dirname, '../../../.pgdata'),
  port: 54329,
  database: 'chords',
  persistent: true,
});
console.log(`Postgres running.\nDATABASE_URL=${db.url}\nCtrl+C to stop.`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await db.stop();
    process.exit(0);
  });
}
