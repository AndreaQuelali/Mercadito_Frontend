/**
 * Runs the Playwright suite against a real, disposable stack:
 *   1. starts Postgres + Redis from the backend's docker-compose.e2e.yaml (own ports, no volumes)
 *   2. applies the Prisma migrations to the empty e2e database
 *   3. runs `playwright test` (its webServer config starts the backend on :3100 and the app on :4201)
 *   4. always tears the containers down (set E2E_KEEP_INFRA=1 to keep them while debugging)
 *
 * Extra arguments go to Playwright:  npm run e2e -- --grep "checkout"
 * Backend location: ../Mercadito_Backend, or MERCADITO_BACKEND_DIR.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const stack = JSON.parse(readFileSync(new URL('./stack.json', import.meta.url), 'utf8'));
const backendDir = resolve(process.env.MERCADITO_BACKEND_DIR ?? '../Mercadito_Backend');
const composeFile = join(backendDir, 'docker-compose.e2e.yaml');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  return result.status ?? 1;
}

if (!existsSync(composeFile)) {
  console.error(`Cannot find ${composeFile}. Set MERCADITO_BACKEND_DIR to the Mercadito_Backend folder.`);
  process.exit(1);
}

let exitCode = 1;
try {
  console.log('> Starting the e2e database and Redis');
  if (run('docker', ['compose', '-f', `"${composeFile}"`, 'up', '-d', '--wait']) !== 0) {
    throw new Error('Could not start the e2e containers (is Docker running, and are ports 5434 and 6380 free?)');
  }

  console.log('> Applying migrations');
  const migrate = run('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: stack.databaseUrl },
  });
  if (migrate !== 0) throw new Error('prisma migrate deploy failed');

  console.log('> Running Playwright');
  exitCode = run('npx', ['playwright', 'test', ...process.argv.slice(2)]);
} catch (error) {
  console.error(error.message);
} finally {
  if (process.env.E2E_KEEP_INFRA) {
    console.log('> E2E_KEEP_INFRA is set: leaving the containers running');
  } else {
    console.log('> Removing the e2e containers');
    run('docker', ['compose', '-f', `"${composeFile}"`, 'down', '-v']);
  }
}
process.exit(exitCode);
