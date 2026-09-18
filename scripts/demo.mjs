import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const production = process.argv.includes('--production');
const port = process.env.PORT || '3000';
const child = spawn(
  process.execPath,
  ['server/index.mjs', ...(production ? ['--production'] : [])],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DEMO_MODE: 'true',
      HOST: '127.0.0.1',
      PORT: port,
      APP_URL: `http://localhost:${port}`,
      DATABASE_PATH: './data/demo.sqlite',
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET || randomBytes(32).toString('hex'),
    },
  },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code || 0));
