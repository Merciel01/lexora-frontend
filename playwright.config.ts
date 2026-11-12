import { defineConfig } from "@playwright/test";
const demoPort = Number(process.env.LEXORA_E2E_PORT || 5173);
const serverPort = demoPort + 1;
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 40000,
  use: {
    baseURL: `http://127.0.0.1:${demoPort}`,
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
      command: `npm run dev -- --host 127.0.0.1 --port ${demoPort} --strictPort`,
      url: `http://127.0.0.1:${demoPort}`,
      env: { VITE_APP_MODE: "demo" },
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        `npm run dev -- --host 127.0.0.1 --port ${serverPort} --strictPort`,
      env: { VITE_APP_MODE: "server" },
      url: `http://127.0.0.1:${serverPort}`,
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
        baseURL: `http://127.0.0.1:${serverPort}`,
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
});
