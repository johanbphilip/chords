import fs from 'node:fs';
import net from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';

export interface RunningDb {
  url: string;
  stop: () => Promise<void>;
}

/** Asks the OS for a free port, so tests never collide with the dev database. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

export async function startDb(options: {
  dataDir: string;
  port: number;
  database: string;
  persistent: boolean;
}): Promise<RunningDb> {
  const logs: string[] = [];
  const pg = new EmbeddedPostgres({
    databaseDir: options.dataDir,
    user: 'chords',
    password: 'chords',
    port: options.port,
    persistent: options.persistent,
    onLog: (message) => logs.push(String(message)),
    onError: (message) => logs.push(String(message)),
  });
  try {
    if (!fs.existsSync(`${options.dataDir}/PG_VERSION`)) {
      await pg.initialise();
    }
    await pg.start();
    try {
      await pg.createDatabase(options.database);
    } catch (error) {
      if (!/already exists/i.test(String(error))) {
        await pg.stop();
        throw error;
      }
    }
  } catch (error) {
    // Postgres output is kept quiet unless startup fails.
    console.error(logs.join('\n'));
    throw error;
  }
  return {
    url: `postgres://chords:chords@localhost:${options.port}/${options.database}`,
    stop: () => pg.stop(),
  };
}
