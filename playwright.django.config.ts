import { defineConfig } from "@playwright/test";
const python = process.env.LEXORA_BACKEND_PYTHON || "python";
export default defineConfig({
  testDir: "./integration",
  workers: 1,
  timeout: 90000,
  use: { baseURL: "http://127.0.0.1:18762", viewport: { width: 1440, height: 960 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ["--disable-dev-shm-usage"] } },
  webServer: [
    { command: `"${python}" ../lexora-backend/scripts/integration_server.py`, url: "http://127.0.0.1:18761/api/auth/csrf", timeout: 120000, reuseExistingServer: false },
    { command: "npm run dev -- --host 127.0.0.1 --port 18762 --strictPort", env: { VITE_APP_MODE: "server", LEXORA_DJANGO_PROXY: "http://127.0.0.1:18761" }, url: "http://127.0.0.1:18762", reuseExistingServer: false },
  ],
});

