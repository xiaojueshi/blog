import { defineConfig, devices } from '@playwright/test'
const runId = String(process.pid)
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 60000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [{ command: 'node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 120000, env: { DATA_DIR: `.data/e2e-runs/${runId}/source`, NUXT_BUILD_DIR: '.nuxt-e2e' } }, { command: 'node .output/server/index.mjs', url: 'http://127.0.0.1:3101', reuseExistingServer: false, timeout: 30000, env: { HOST: '127.0.0.1', PORT: '3101', DATA_DIR: `.data/e2e-runs/${runId}/restore` } }],
})
