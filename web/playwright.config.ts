import { defineConfig } from "@playwright/test";

const chromiumPath =
  process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const useSystemChromium = !!process.env.PW_CHROMIUM_PATH || process.env.CI !== "true";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    launchOptions: useSystemChromium ? { executablePath: chromiumPath } : {},
  },
  webServer: [
    {
      command:
        "cd ../api && PAMROI_DATABASE_URL=sqlite:///$(mktemp -d)/e2e.db sh -c '.venv/bin/python -m alembic upgrade head && .venv/bin/python -m uvicorn app.main:app --port 8000'",
      url: "http://localhost:8000/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run preview",
      url: "http://localhost:4173",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
