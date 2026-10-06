import { deflateRawSync } from "node:zlib";
import type { Page } from "@playwright/test";

// Same value as storageKey in src/lib/storage.ts, which e2e cannot import
// because of the @/ path alias.
export const storageKey = "argmax";

interface ListFixture {
  id: string;
  name: string;
  items?: string[];
  /** Weights in the order of items; 1 where missing. */
  weights?: number[];
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

/** Stored lists as the app saves them. */
export function storedState(lists: ListFixture[]): string {
  return JSON.stringify({
    schemaVersion: 2,
    lists: listsOf(lists).map((list, listIndex) => ({
      ...list,
      items: list.items.map((item, index) => ({
        ...item,
        weight: lists[listIndex]?.weights?.[index] ?? 1,
      })),
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

/**
 * A share link's fragment in format 1, built here with Node's zlib rather
 * than the app's encoder, so the tests also check that the app reads the
 * documented format. Items are in stored order, oldest first.
 */
export function sharedFragment(
  name: string,
  items: [text: string, weight: number][],
): string {
  const json = JSON.stringify({ n: name, i: items });
  return `1.${deflateRawSync(Buffer.from(json)).toString("base64url")}`;
}

/** Replaces the clipboard with a recorder, so tests read what was copied. */
export async function recordClipboard(page: Page) {
  await page.addInitScript(() => {
    const copied: string[] = [];
    Object.defineProperty(window, "copiedTexts", { value: copied });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
    });
  });
  return () =>
    page.evaluate(() => Reflect.get(window, "copiedTexts") as string[]);
}

// The browser opens the production address, but every request to it is
// answered by the local preview build (with its security headers), so the app
// runs exactly as in production. Requests to Umami are intercepted and
// inspected; nothing leaves the machine. (.dev is HTTPS-only in browsers, so
// mapping the hostname to the plain-HTTP preview is not an option.)
export const production = "https://argmax.dev1f965x.workers.dev";

export async function serveProductionLocally(page: Page) {
  await page.route(`${production}/**`, async (route) => {
    const local = route
      .request()
      .url()
      .replace(production, "http://127.0.0.1:4173");
    // Firefox keeps the original Host header when the URL changes, and the
    // preview server rejects hosts it does not serve.
    const headers = { ...route.request().headers(), host: "127.0.0.1:4173" };
    await route.fulfill({
      response: await route.fetch({ url: local, headers }),
    });
  });
}

export type Report = {
  payload: { url: string; title: string; name?: string; data?: object };
};

/** Answers Umami requests locally and returns the reports they carried. */
export async function captureReports(page: Page): Promise<Report[]> {
  const reports: Report[] = [];
  await page.route("https://cloud.umami.is/**", async (route) => {
    reports.push(route.request().postDataJSON() as Report);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: "{}",
    });
  });
  return reports;
}
