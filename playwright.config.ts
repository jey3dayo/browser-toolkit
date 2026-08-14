import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export const FIXTURES_PORT = 4173;
export const FIXTURES_BASE_URL = `http://localhost:${FIXTURES_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Chrome extensions require sequential execution
  reporter: "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    baseURL: FIXTURES_BASE_URL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Serve tests/e2e/fixtures over http:// so extension content scripts can
  // inject (Chrome extensions cannot inject into file:// URLs without a
  // manual "Allow access to file URLs" toggle that CLI flags cannot set).
  webServer: {
    command: "node tests/e2e/fixtures/serve.mjs",
    url: FIXTURES_BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: { E2E_FIXTURES_PORT: String(FIXTURES_PORT) },
  },
});
