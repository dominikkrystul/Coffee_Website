import { defineConfig } from "@playwright/test";

const origin = "http://localhost:3210";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: origin,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: "npm exec -- next dev --hostname localhost --port 3210",
    url: origin,
    timeout: 60_000,
  },
});
