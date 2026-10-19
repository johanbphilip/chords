import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startDb } from './embedded-db.js';

// Runs jest against a throwaway real Postgres so every API test hits a real database.
async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chords-test-pg-'));
  const db = await startDb({
    dataDir,
    port: 54000 + Math.floor(Math.random() * 900),
    database: 'chords_test',
  });
  const code = await new Promise<number>((resolve) => {
    const child = spawn('pnpm', ['exec', 'vitest', 'run', ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: db.url },
    });
    child.on('exit', (c) => resolve(c ?? 1));
  });
  await db.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(code);
}

main();
