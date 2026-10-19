import EmbeddedPostgres from 'embedded-postgres';

export interface RunningDb {
  url: string;
  stop: () => Promise<void>;
}

export async function startDb(options: {
  dataDir: string;
  port: number;
  database: string;
}): Promise<RunningDb> {
  const pg = new EmbeddedPostgres({
    databaseDir: options.dataDir,
    user: 'chords',
    password: 'chords',
    port: options.port,
    persistent: true,
    onLog: () => {},
    onError: () => {},
  });
  const fs = await import('node:fs');
  if (!fs.existsSync(`${options.dataDir}/PG_VERSION`)) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(options.database);
  } catch {
    // already exists
  }
  return {
    url: `postgres://chords:chords@localhost:${options.port}/${options.database}`,
    stop: () => pg.stop(),
  };
}
