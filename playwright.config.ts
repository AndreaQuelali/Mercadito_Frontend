import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Shared with e2e/run.mjs, which starts the database and Redis
// eslint-disable-next-line @typescript-eslint/no-var-requires
const stack = require('./e2e/stack.json') as {
  apiPort: number;
  appPort: number;
  databaseUrl: string;
  redisPort: number;
  jwtSecret: string;
};

const backendDir = path.resolve(process.env['MERCADITO_BACKEND_DIR'] ?? '../Mercadito_Backend');

// Uses the Google Chrome that is already installed. For a machine without it:
//   E2E_BROWSER=chromium npx playwright install chromium
const useBundledChromium = process.env['E2E_BROWSER'] === 'chromium';

export default defineConfig({
  testDir: './e2e/tests',
  // One shared backend and database: run files one after another, each test creates its own data
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${stack.appPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], ...(useBundledChromium ? {} : { channel: 'chrome' }) },
    },
  ],
  webServer: [
    {
      // Real backend on its own port, database and Redis (see docker-compose.e2e.yaml)
      command: 'npx ts-node src/main.ts',
      cwd: backendDir,
      url: `http://localhost:${stack.apiPort}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(stack.apiPort),
        DATABASE_URL: stack.databaseUrl,
        REDIS_HOST: 'localhost',
        REDIS_PORT: String(stack.redisPort),
        JWT_SECRET: stack.jwtSecret,
        CORS_ORIGIN: `http://localhost:${stack.appPort}`,
        NODE_ENV: 'test',
        SMTP_HOST: '',
        // Semantic search without Voyage: deterministic embeddings, and a low limit so the 429 test is quick
        EMBEDDINGS_PROVIDER: 'fake',
        SEARCH_RATE_LIMIT_PER_MIN: '8',
      },
    },
    {
      command: `npx ng serve --configuration e2e --port ${stack.appPort}`,
      url: `http://localhost:${stack.appPort}`,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
