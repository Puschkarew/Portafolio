import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  workers: 1,
  /* 4182 avoids clashing with local preview on 4173 (see .cursor/rules/local-preview-4173.mdc). */
  webServer: {
    command: 'sh -c "cd dist && exec python3 -m http.server 4182 --bind 127.0.0.1"',
    url: "http://127.0.0.1:4182/",
    reuseExistingServer: !process.env.CI,
    timeout: 10_000
  },
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: "http://127.0.0.1:4182",
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
