import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // The app sends Cross-Origin-Opener-Policy: same-origin, so Firefox
        // replaces the browsing context on the first navigation from
        // about:blank. Playwright 1.63's Firefox agent can then lose the
        // navigationCommitted message, and page.goto waits forever for a page
        // that has loaded (microsoft/playwright#42731, fixed for 1.64). Turning
        // COOP enforcement off in the test browser avoids the swap; the header
        // itself is still checked in security.spec.ts, and Chromium and WebKit
        // still enforce it. Remove this once Playwright is 1.64 or later.
        launchOptions: {
          firefoxUserPrefs: {
            "browser.tabs.remote.useCrossOriginOpenerPolicy": false,
          },
        },
      },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // Tests run against the production build, not the dev server. A server
  // already on the port is never reused: it may be another worktree's build,
  // and it may stop in the middle of the run.
  webServer: {
    command: `pnpm build && pnpm preview --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
