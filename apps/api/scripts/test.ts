import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrate } from '../src/infrastructure/database/migrate.js';
import { freePort, startDb } from './embedded-db.js';

// Runs vitest against a throwaway real Postgres so every API test hits a real database.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chords-test-pg-'));
let db: Awaited<ReturnType<typeof startDb>> | undefined;
let code = 1;

async function cleanup() {
  await db?.stop().catch(() => {});
  fs.rmSync(dataDir, { recursive: true, force: true });
}

try {
  db = await startDb({
    dataDir,
    port: await freePort(),
    database: 'chords_test',
    persistent: false,
  });
  await migrate(db.url);
  const child = spawn('pnpm', ['exec', 'vitest', 'run', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: db.url },
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => child.kill(signal));
  }
  code = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (c) => resolve(c ?? 1));
  });
} catch (error) {
  console.error(error);
} finally {
  await cleanup();
}
process.exit(code);
