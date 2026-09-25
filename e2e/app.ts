import type { Page } from "@playwright/test";

/** Opens the app with `topics` already stored, as someone returning to it would find it. */
export async function openApp(page: Page, topics: unknown[] = []) {
  await page.addInitScript(
    (stored) => window.localStorage.setItem("argmax.topics", JSON.stringify(stored)),
    topics,
  );
  await page.goto("/");
  await page.getByRole("heading", { name: "argmax", level: 1 }).waitFor();
}

/** What the app has stored right now. */
export function stored(page: Page) {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem("argmax.topics") ?? "[]"));
}
