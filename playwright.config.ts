import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export const FIXTURES_PORT = 4173;
export const FIXTURES_BASE_URL = `http://localhost:${FIXTURES_PORT}`;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: "html",
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests/e2e",
  use: {
    baseURL: FIXTURES_BASE_URL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  // Serve tests/e2e/fixtures over http:// so extension content scripts can
  // inject (Chrome extensions cannot inject into file:// URLs without a
  // manual "Allow access to file URLs" toggle that CLI flags cannot set).
  webServer: {
    command: "node tests/e2e/fixtures/serve.mjs",
    env: { E2E_FIXTURES_PORT: String(FIXTURES_PORT) },
    reuseExistingServer: !process.env.CI,
    url: FIXTURES_BASE_URL,
  },
  workers: 1, // Chrome extensions require sequential execution
});
