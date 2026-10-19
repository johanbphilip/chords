import path from 'node:path';
import { startDb } from './embedded-db.js';

async function main() {
  const db = await startDb({
    dataDir: path.resolve(import.meta.dirname, '../../../.pgdata'),
    port: 54329,
    database: 'chords',
  });
  console.log(`Postgres running.\nDATABASE_URL=${db.url}\nCtrl+C to stop.`);
  const shutdown = async () => {
    await db.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
