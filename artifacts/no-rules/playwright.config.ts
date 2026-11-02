import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.NO_RULES_TEST_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  projects: [
    {name:'Desktop-Chromium',testMatch:['**/systems.spec.ts','**/prototype.spec.ts'],use:{...devices['Desktop Chrome']}},
    { name: 'iPhone-Chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: process.env.NO_RULES_TEST_URL
    ? undefined
    : {
        command: 'pnpm run dev',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        env: { PORT: '5173', BASE_PATH: '/' },
      },
});
