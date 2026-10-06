import type { Page } from "@playwright/test";

// Same value as storageKey in src/lib/storage.ts, which e2e cannot import
// because of the @/ path alias.
export const storageKey = "argmax";

interface ListFixture {
  id: string;
  name: string;
  items?: string[];
}

function listsOf(lists: ListFixture[]) {
  return lists.map(({ id, name, items = [] }) => ({
    id,
    name,
    items: items.map((text, index) => ({ id: `${id}-${index}`, text })),
    createdAt: "2026-10-04T00:00:00.000Z",
    updatedAt: "2026-10-04T00:00:00.000Z",
  }));
}

/** Stored lists as the app saves them, every item at weight 1. */
export function storedState(lists: ListFixture[]): string {
  return JSON.stringify({
    schemaVersion: 2,
    lists: listsOf(lists).map((list) => ({
      ...list,
      items: list.items.map((item) => ({ ...item, weight: 1 })),
    })),
  });
}

/** Stored lists as 0.1.0 saved them: schema version 1, without weights. */
export function storedStateV1(lists: ListFixture[]): string {
  return JSON.stringify({ schemaVersion: 1, lists: listsOf(lists) });
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

/** Creates a list with the keyboard on the lists screen, which then opens it. */
export async function createList(page: Page, name: string) {
  await page.getByRole("textbox", { name: "New list name" }).fill(name);
  await page.keyboard.press("Enter");
}
