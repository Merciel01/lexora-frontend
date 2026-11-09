import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 40000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: {
      args: [
        "--disable-dev-shm-usage",
        "--disable-features=BackForwardCache",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "VITE_APP_MODE=server npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "desktop",
      testIgnore: "**/server.spec.ts",
      use: { viewport: { width: 1440, height: 960 } },
    },
    {
      name: "mobile",
      testIgnore: "**/server.spec.ts",
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: "django-contract",
      testMatch: "**/server.spec.ts",
      use: {
        baseURL: "http://127.0.0.1:5174",
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
});
