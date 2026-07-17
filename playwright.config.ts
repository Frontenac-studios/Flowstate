import { defineConfig, devices } from "@playwright/test";

/**
 * Calendar / Integrations E2E.
 *
 * Default baseURL is the local Next server (desktop:dev or npm run dev).
 * Desktop SQLite cannot persist Google Calendar connections — those cases assert
 * the unsupported UI / redirect. Web mode (no DATABASE_MODE=sqlite) can exercise
 * the OAuth connect redirect to Google.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
});
