import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  workers: 1,
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory dist",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 10_000
  },
  expect: {
    timeout: 5_000
  },
  use: {
    headless: true,
    viewport: { width: 1512, height: 900 }
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" }
    },
    {
      name: "firefox",
      use: { browserName: "firefox" }
    },
    {
      name: "webkit",
      use: { browserName: "webkit" }
    }
  ],
  reporter: [["list"]]
});
