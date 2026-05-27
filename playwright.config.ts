import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, "e2e/.auth/user.json");
const e2eEnvFile = path.join(__dirname, ".env.e2e");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: path.join(__dirname, "e2e/global-setup.ts"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    storageState: authFile,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `node -r dotenv/config node_modules/next/dist/bin/next dev`,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DOTENV_CONFIG_PATH: e2eEnvFile,
      DOTENV_CONFIG_OVERRIDE: "true",
    },
  },
});
