import type { Page } from "@playwright/test";

// Same value as storageKey in src/lib/storage.ts, which e2e cannot import
// because of the @/ path alias.
export const storageKey = "argmax";

/** Stored lists as the app saves them. */
export function storedState(
  lists: { id: string; name: string; items?: string[] }[],
): string {
  return JSON.stringify({
    schemaVersion: 1,
    lists: lists.map(({ id, name, items = [] }) => ({
      id,
      name,
      items: items.map((text, index) => ({ id: `${id}-${index}`, text })),
      createdAt: "2026-10-04T00:00:00.000Z",
      updatedAt: "2026-10-04T00:00:00.000Z",
    })),
  });
}

/** Writes raw stored data before the app reads it, then opens path. */
export async function openWithStorage(page: Page, value: string, path = "/") {
  await page.goto("/");
  await page.evaluate(([key, stored]) => localStorage.setItem(key, stored), [
    storageKey,
    value,
  ] as const);
  await page.goto(path);
}

/** Creates a list with the keyboard on the lists screen. */
export async function createList(page: Page, name: string) {
  await page.getByRole("textbox", { name: "New list name" }).fill(name);
  await page.keyboard.press("Enter");
}
